import assert from 'node:assert/strict';
import * as vscode from 'vscode';
import { pressWorkbenchEnter, pressWorkbenchTab, visibleCompletionLabels } from './c1Ui.js';

async function until<T>(read: () => PromiseLike<T>, ready: (value: T) => boolean): Promise<T> {
  const deadline = Date.now() + 20_000;
  while (Date.now() < deadline) { const value = await read(); if (ready(value)) return value; await new Promise(done => setTimeout(done, 50)); }
  throw new Error('Timed out waiting for hook keyword acceptance');
}
export async function run(): Promise<void> {
  const core = vscode.extensions.getExtension('sohophp.php-companion'); assert.ok(core); await core.activate();
  const folder = vscode.workspace.workspaceFolders?.[0]; assert.ok(folder);
  const port = Number(process.env.PHP_COMPANION_TEST_C1_DEBUG_PORT); assert.ok(port > 0);
  const cases: Array<[string, string]> = [
    ['<?php class C { public mixed $name { get { r§; } } }', 'return'],
    ['<?php class C { public mixed $name { set { r§; } } }', 'return'],
  ];
  const results: object[] = [];
  for (const [marked, label] of cases) for (const key of ['Enter', 'Tab'] as const) {
    const index = cases.findIndex(item => item[0] === marked);
    const uri = vscode.Uri.joinPath(folder.uri, 'src', `HookKeyword${index}${key}.php`);
    const source = marked.replace('§', '').replace('class C', `class HookKeyword${index}${key}`);
    const adjusted = marked.replace('class C', `class HookKeyword${index}${key}`);
    const offset = adjusted.indexOf('§'); const accepted = adjusted.replace('r§', 'return ');
    await vscode.workspace.fs.writeFile(uri, Buffer.from(source));
    const document = await vscode.workspace.openTextDocument(uri); const editor = await vscode.window.showTextDocument(document);
    const position = document.positionAt(offset); editor.selection = new vscode.Selection(position, position);
    await until(() => vscode.commands.executeCommand<vscode.CompletionList>('vscode.executeCompletionItemProvider', uri, position),
      list => list?.items.some(item => item.label === label) === true);
    await vscode.commands.executeCommand('workbench.action.focusActiveEditorGroup');
    await vscode.commands.executeCommand('editor.action.triggerSuggest');
    const labels = await until(() => visibleCompletionLabels(port), values => values.some(value => value.startsWith(label)));
    const target = labels.findIndex(value => value.startsWith(label));
    for (let index = 0; index < target; index++) await vscode.commands.executeCommand('selectNextSuggestion');
    if (key === 'Enter') await pressWorkbenchEnter(port); else await pressWorkbenchTab(port);
    await until(async () => document.getText(), text => text === accepted);
    assert.equal(document.offsetAt(editor.selection.active), adjusted.indexOf('r§') + 'return '.length);
    assert.equal(editor.selection.isEmpty, true);
    await vscode.commands.executeCommand('undo'); await until(async () => document.getText(), text => text === source);
    await vscode.commands.executeCommand('redo'); await until(async () => document.getText(), text => text === accepted);
    assert.equal(Buffer.from(await vscode.workspace.fs.readFile(uri)).toString(), source);
    results.push({ label, key, exactText: true, caretMatched: true, undoRedo: true, diskUnchanged: true });
  }
  console.log('Hook keyword acceptance proof: ' + JSON.stringify({ platform: process.platform, results }));
}
