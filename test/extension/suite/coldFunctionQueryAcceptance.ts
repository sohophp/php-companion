import assert from 'node:assert/strict';
import * as vscode from 'vscode';
import { pressWorkbenchEnter, pressWorkbenchTab, typeWorkbenchText, visibleCompletionState } from './c1Ui.js';

async function until<T>(get: () => Promise<T>, ready: (value: T) => boolean): Promise<T> {
  const deadline = Date.now() + 10_000;
  while (Date.now() < deadline) {
    const value = await get(); if (ready(value)) return value;
    await new Promise<void>(done => setTimeout(done, 30));
  }
  throw new Error('Function query editor result did not settle');
}

export async function run(): Promise<void> {
  const core = vscode.extensions.getExtension('sohophp.php-companion'); assert.ok(core); await core.activate();
  const folder = vscode.workspace.workspaceFolders?.[0]; assert.ok(folder);
  const port = Number(process.env.PHP_COMPANION_TEST_C1_DEBUG_PORT); assert.ok(port > 0);
  const indexingMode = vscode.workspace.getConfiguration('phpCompanion', folder.uri).get('indexing.mode');
  assert.equal(indexingMode, process.env.SOPHP_AUTOMATIC_INDEXING_MODE);
  const phpVersion = vscode.workspace.getConfiguration('phpCompanion', folder.uri).get('phpVersion');
  assert.equal(phpVersion, process.env.PHP_COMPANION_TEST_C1_PHP_VERSION);
  const uri = vscode.Uri.joinPath(folder.uri, 'ColdFunctionConsumer.php');
  const original = Buffer.from(await vscode.workspace.fs.readFile(uri)).toString();
  const document = await vscode.workspace.openTextDocument(uri), editor = await vscode.window.showTextDocument(document);
  const hoverOffset = original.indexOf('$value->name');
  const firstSemanticRequest = process.env.SOPHP_FIRST_FUNCTION_QUERY ?? 'variableHover';
  assert.ok(['variableHover', 'typeDefinition', 'implementation'].includes(firstSemanticRequest));
  const navigation = async (method: 'typeDefinition' | 'implementation'): Promise<void> => {
    const queryOffset = hoverOffset + (method === 'typeDefinition' ? 2 : '$value->na'.length);
    const locations = await vscode.commands.executeCommand<Array<vscode.Location | vscode.LocationLink>>(
      method === 'typeDefinition' ? 'vscode.executeTypeDefinitionProvider' : 'vscode.executeImplementationProvider',
      uri, document.positionAt(queryOffset));
    assert.equal(locations?.length, 1);
    const location = locations[0]!;
    const targetUri = 'targetUri' in location ? location.targetUri : location.uri;
    const targetRange = 'targetUri' in location ? location.targetSelectionRange ?? location.targetRange : location.range;
    const targetName = method === 'typeDefinition' ? 'Row' : 'Child';
    assert.equal(targetUri.toString(), vscode.Uri.joinPath(folder.uri, 'src', 'ColdQuery', `${targetName}.php`).toString());
    const targetText = Buffer.from(await vscode.workspace.fs.readFile(targetUri)).toString();
    const targetDocument = await vscode.workspace.openTextDocument(targetUri);
    const symbol = method === 'typeDefinition' ? 'Row' : 'name';
    const targetOffset = targetText.indexOf(method === 'typeDefinition' ? 'Row' : 'name():');
    assert.deepEqual(targetRange, new vscode.Range(targetDocument.positionAt(targetOffset), targetDocument.positionAt(targetOffset + symbol.length)));
  };
  if (firstSemanticRequest !== 'variableHover') await navigation(firstSemanticRequest as 'typeDefinition' | 'implementation');
  const firstHovers = await vscode.commands.executeCommand<vscode.Hover[]>('vscode.executeHoverProvider', uri, document.positionAt(hoverOffset + 2));
  const text = (firstHovers ?? []).flatMap(hover => hover.contents.map(content => typeof content === 'string' ? content : 'value' in content ? content.value : '')).join('\n');
  assert.ok(text.includes('$value: App\\ColdQuery\\Row\n'), text);
  const definitions = await vscode.commands.executeCommand<Array<vscode.Location | vscode.LocationLink>>('vscode.executeDefinitionProvider', uri,
    document.positionAt(hoverOffset + '$value->na'.length));
  assert.equal(definitions?.length, 1);
  const target = definitions[0]!;
  const targetUri = 'targetUri' in target ? target.targetUri : target.uri;
  assert.equal(targetUri.toString(), vscode.Uri.joinPath(folder.uri, 'src', 'ColdQuery', 'Row.php').toString());
  const signature = await vscode.commands.executeCommand<vscode.SignatureHelp>('vscode.executeSignatureHelpProvider', uri,
    document.positionAt(hoverOffset + '$value->name('.length));
  assert.equal(signature?.signatures[0]?.label, 'name(): string');
  if (firstSemanticRequest !== 'typeDefinition') await navigation('typeDefinition');
  if (firstSemanticRequest !== 'implementation') await navigation('implementation');

  const offset = original.lastIndexOf('$value->') + '$value->'.length;
  const results: object[] = [];
  for (const key of ['Enter', 'Tab'] as const) {
    if (key === 'Tab') {
      await vscode.commands.executeCommand('undo');
      await until(async () => document.getText(), value => value === original.slice(0, offset) + 'na' + original.slice(offset));
      await editor.edit(edit => edit.delete(new vscode.Range(document.positionAt(offset), document.positionAt(offset + 2))));
      assert.equal(document.getText(), original);
    }
    const position = document.positionAt(offset); editor.selection = new vscode.Selection(position, position);
    await vscode.commands.executeCommand('workbench.action.focusActiveEditorGroup');
    for (const [index, character] of [...'na'].entries()) {
      await typeWorkbenchText(port, character);
      await until(async () => document.getText(), value => value === original.slice(0, offset) + 'na'.slice(0, index + 1) + original.slice(offset));
    }
    const started = Date.now();
    const visible = await until(() => visibleCompletionState(port), state => state.visible && state.labels[0]?.startsWith('name') === true);
    assert.equal(visible.labels.length, 1);
    const visibleWaitMs = Date.now() - started;
    if (key === 'Enter') await pressWorkbenchEnter(port); else await pressWorkbenchTab(port);
    const accepted = original.slice(0, offset) + 'name()' + original.slice(offset);
    await until(async () => document.getText(), value => value === accepted);
    assert.equal(document.offsetAt(editor.selection.active), offset + 'name()'.length);
    assert.equal(editor.selection.isEmpty, true);
    await vscode.commands.executeCommand('undo');
    await until(async () => document.getText(), value => value === original.slice(0, offset) + 'na' + original.slice(offset));
    await vscode.commands.executeCommand('redo'); await until(async () => document.getText(), value => value === accepted);
    results.push({ key, visible, visibleWaitMs, exactText: true, caretMatched: true, undoRedo: true });
  }
  assert.equal(Buffer.from(await vscode.workspace.fs.readFile(uri)).toString(), original);
  console.log('Cold function query acceptance proof: ' + JSON.stringify({ platform: process.platform,
    phpVersion, indexingMode,
    firstSemanticRequest, firstRequestRetried: false, definitionMatched: true, signatureMatched: true,
    typeDefinitionMatched: true, implementationMatched: true,
    completionProviderPrewarm: false, otherQueriesBeforeTyping: [...new Set([firstSemanticRequest, 'variableHover', 'definition', 'signatureHelp', 'typeDefinition', 'implementation'])],
    explicitTriggerSuggest: false, diskUnchanged: true, results }));
}
