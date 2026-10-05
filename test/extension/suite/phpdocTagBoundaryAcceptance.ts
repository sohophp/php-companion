import assert from 'node:assert/strict';
import * as vscode from 'vscode';
import { pressWorkbenchEnter, pressWorkbenchTab, typeWorkbenchText, visibleCompletionState } from './c1Ui.js';

async function until<T>(get: () => Promise<T>, ready: (value: T) => boolean): Promise<T> {
  const deadline = Date.now() + 10_000;
  while (Date.now() < deadline) {
    const value = await get(); if (ready(value)) return value;
    await new Promise<void>(done => setTimeout(done, 30));
  }
  throw new Error('PHPDoc tag boundary editor result did not settle');
}

export async function run(): Promise<void> {
  const core = vscode.extensions.getExtension('sohophp.php-companion'); assert.ok(core); await core.activate();
  const folder = vscode.workspace.workspaceFolders?.[0]; assert.ok(folder);
  const port = Number(process.env.PHP_COMPANION_TEST_C1_DEBUG_PORT); assert.ok(port > 0);
  const indexingMode = vscode.workspace.getConfiguration('phpCompanion', folder.uri).get('indexing.mode');
  assert.equal(indexingMode, process.env.SOPHP_AUTOMATIC_INDEXING_MODE);
  const results: object[] = [];
  for (const kind of ['property', 'function', 'method'] as const) for (const key of ['Enter', 'Tab']) {
    const index = results.length;
    const doc = `/**\n * @${kind === 'property' ? 'var' : 'return'} Row\n * @${kind === 'property' ? 'phpstan-var' : kind === 'method' ? 'psalm-return' : 'return'}-extra metadata\n */`;
    const declaration = kind === 'property' ? `class Api { ${doc} public $row; }`
      : kind === 'method' ? `class Api { ${doc} public function read() { return new Row(); } }`
      : `class Api {} ${doc} function rows() { return new Row(); }`;
    const expression = kind === 'property' ? '$api->row' : kind === 'method' ? '$api->read()' : 'rows()';
    const marked = `<?php\nnamespace TagBoundary${index};\nclass Row { public function name(): string { return 'row'; } }\n${declaration}\nfunction run(Api $api): void {\n    $value = ${expression};\n    $value->|;\n}\n`;
    const offset = marked.indexOf('|'); const original = marked.replace('|', '');
    const uri = vscode.Uri.joinPath(folder.uri, `DocTagBoundary${index}.php`);
    await vscode.workspace.fs.writeFile(uri, Buffer.from(original));
    const document = await vscode.workspace.openTextDocument(uri); const editor = await vscode.window.showTextDocument(document);
    const position = document.positionAt(offset); editor.selection = new vscode.Selection(position, position);
    await vscode.commands.executeCommand('workbench.action.focusActiveEditorGroup');
    let typed = original;
    for (const [index, character] of [...'na'].entries()) {
      await typeWorkbenchText(port, character);
      typed = original.slice(0, offset) + 'na'.slice(0, index + 1) + original.slice(offset);
      await until(async () => document.getText(), value => value === typed);
    }
    const started = Date.now();
    const visible = await until(() => visibleCompletionState(port), state => state.visible && state.labels[0]?.startsWith('name') === true);
    const visibleWaitMs = Date.now() - started;
    assert.equal(visible.labels.length, 1);
    if (key === 'Enter') await pressWorkbenchEnter(port); else await pressWorkbenchTab(port);
    const accepted = original.slice(0, offset) + 'name()' + original.slice(offset);
    await until(async () => document.getText(), value => value === accepted);
    assert.equal(document.offsetAt(editor.selection.active), offset + 'name()'.length); assert.equal(editor.selection.isEmpty, true);
    await vscode.commands.executeCommand('undo'); await until(async () => document.getText(), value => value === typed);
    await vscode.commands.executeCommand('redo'); await until(async () => document.getText(), value => value === accepted);
    assert.equal(Buffer.from(await vscode.workspace.fs.readFile(uri)).toString(), original);
    results.push({ kind, key, visible, visibleWaitMs, exactText: true, caretMatched: true, undoRedo: true, diskUnchanged: true });
  }
  console.log('PHPDoc tag boundary acceptance proof: ' + JSON.stringify({ platform: process.platform,
    phpVersion: process.env.PHP_COMPANION_TEST_C1_PHP_VERSION, indexingMode, providerPrewarm: false, explicitTriggerSuggest: false, results }));
}
