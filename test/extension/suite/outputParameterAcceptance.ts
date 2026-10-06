import assert from 'node:assert/strict';
import * as vscode from 'vscode';
import { pressWorkbenchEnter, pressWorkbenchTab, typeWorkbenchText, visibleCompletionState } from './c1Ui.js';

async function until<T>(get: () => Promise<T>, ready: (value: T) => boolean): Promise<T> {
  const deadline = Date.now() + 10_000;
  while (Date.now() < deadline) {
    const value = await get();
    if (ready(value)) return value;
    await new Promise<void>(done => setTimeout(done, 30));
  }
  throw new Error('Output parameter editor result did not settle');
}

export async function run(): Promise<void> {
  const core = vscode.extensions.getExtension('sohophp.php-companion'); assert.ok(core); await core.activate();
  const folder = vscode.workspace.workspaceFolders?.[0]; assert.ok(folder);
  const port = Number(process.env.PHP_COMPANION_TEST_C1_DEBUG_PORT); assert.ok(port > 0);
  const indexingMode = vscode.workspace.getConfiguration('phpCompanion', folder.uri).get('indexing.mode');
  assert.equal(indexingMode, process.env.SOPHP_AUTOMATIC_INDEXING_MODE);
  const phpVersion = vscode.workspace.getConfiguration('phpCompanion', folder.uri).get('phpVersion');
  assert.equal(phpVersion, process.env.PHP_COMPANION_TEST_C1_PHP_VERSION);
  const uri = vscode.Uri.joinPath(folder.uri, 'OutputParameterConsumer.php');
  const original = Buffer.from(await vscode.workspace.fs.readFile(uri)).toString();
  const document = await vscode.workspace.openTextDocument(uri);
  const editor = await vscode.window.showTextDocument(document);
  const offset = original.indexOf('$value->') + '$value->'.length;
  const results: object[] = [];
  for (const key of ['Enter', 'Tab'] as const) {
    const prefixed = original.slice(0, offset) + 'na' + original.slice(offset);
    if (key === 'Tab') {
      await vscode.commands.executeCommand('undo');
      await until(async () => document.getText(), value => value === prefixed);
      await editor.edit(edit => edit.delete(new vscode.Range(document.positionAt(offset), document.positionAt(offset + 2))));
      assert.equal(document.getText(), original);
    }
    const position = document.positionAt(offset); editor.selection = new vscode.Selection(position, position);
    await vscode.commands.executeCommand('workbench.action.focusActiveEditorGroup');
    await typeWorkbenchText(port, 'na');
    await until(async () => document.getText(), value => value === prefixed);
    const started = Date.now();
    const visible = await until(() => visibleCompletionState(port), state => state.visible && state.labels[0]?.startsWith('name') === true);
    const visibleWaitMs = Date.now() - started;
    if (key === 'Enter') await pressWorkbenchEnter(port); else await pressWorkbenchTab(port);
    const accepted = original.slice(0, offset) + 'name()' + original.slice(offset);
    await until(async () => document.getText(), value => value === accepted);
    assert.equal(document.offsetAt(editor.selection.active), offset + 'name()'.length);
    assert.equal(editor.selection.isEmpty, true);
    await vscode.commands.executeCommand('undo'); await until(async () => document.getText(), value => value === prefixed);
    await vscode.commands.executeCommand('redo'); await until(async () => document.getText(), value => value === accepted);
    results.push({ key, visible, visibleWaitMs, exactText: true, caretMatched: true, undoRedo: true });
  }
  // Semantic commands follow natural acceptance; they do not prewarm its list.
  const hovers = await vscode.commands.executeCommand<vscode.Hover[]>('vscode.executeHoverProvider', uri,
    document.positionAt(document.getText().indexOf('$value->') + 1));
  assert.ok(hovers?.some(hover => hover.contents.some(value => (typeof value === 'string' ? value : value.value).includes('Row'))));
  const definitions = await vscode.commands.executeCommand<Array<vscode.Location | vscode.LocationLink>>('vscode.executeDefinitionProvider', uri,
    document.positionAt(offset + 1));
  assert.equal(definitions?.length, 1);
  const target = definitions[0]!, targetUri = 'targetUri' in target ? target.targetUri : target.uri;
  assert.equal(targetUri.toString(), vscode.Uri.joinPath(folder.uri, 'src', 'OutputQuery', 'Row.php').toString());
  const text = Buffer.from(await vscode.workspace.fs.readFile(targetUri)).toString();
  const targetDocument = await vscode.workspace.openTextDocument(targetUri), start = text.indexOf('function name') + 'function '.length;
  assert.deepEqual('targetUri' in target ? target.targetSelectionRange ?? target.targetRange : target.range,
    new vscode.Range(targetDocument.positionAt(start), targetDocument.positionAt(start + 4)));
  assert.equal(Buffer.from(await vscode.workspace.fs.readFile(uri)).toString(), original);
  console.log('Output parameter acceptance proof: ' + JSON.stringify({ platform: process.platform, phpVersion, indexingMode,
    otherQueriesBeforeTyping: [], completionProviderPrewarm: false, explicitTriggerSuggest: false,
    hoverMatched: true, definitionMatched: true, diskUnchanged: true, results }));
}
