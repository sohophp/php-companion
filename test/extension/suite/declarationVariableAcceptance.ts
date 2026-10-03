import assert from 'node:assert/strict';
import * as vscode from 'vscode';
import { pressWorkbenchEnter, pressWorkbenchTab, visibleCompletionLabels } from './c1Ui.js';

async function until<T>(read: () => PromiseLike<T>, ready: (value: T) => boolean): Promise<T> {
  const deadline = Date.now() + 20_000;
  while (Date.now() < deadline) { const value = await read(); if (ready(value)) return value; await new Promise(done => setTimeout(done, 50)); }
  throw new Error('Timed out waiting for declaration variable acceptance');
}
export async function run(): Promise<void> {
  const core = vscode.extensions.getExtension('sohophp.php-companion'); assert.ok(core); await core.activate();
  const folder = vscode.workspace.workspaceFolders?.[0]; assert.ok(folder);
  const port = Number(process.env.PHP_COMPANION_TEST_C1_DEBUG_PORT); assert.ok(port > 0);
  const cases: Array<[string, string]> = [
    ['<?php class C { public mixed $name { get => $th§; } }', '$this'],
    ['<?php class C { public string $name { get { $other = "text"; return $ot§her; } } }', '$other'],
    ['<?php class C { public string $name { set { $va§; } } }', '$value'],
    ['<?php class C { public string $name { set(string $incoming) { $in§; } } }', '$incoming'],
  ];
  const results: object[] = [];
  for (const [marked, label] of cases) for (const key of ['Enter', 'Tab'] as const) {
    const index = cases.findIndex(item => item[0] === marked);
    const uri = vscode.Uri.joinPath(folder.uri, 'src', `DeclarationVariable${index}${key}.php`);
    const source = marked.replace('§', '').replace('class C', `class DeclarationVariable${index}${key}`);
    const adjusted = marked.replace('class C', `class DeclarationVariable${index}${key}`);
    const offset = adjusted.indexOf('§'); const accepted = adjusted.replace(/\$[A-Za-z_]*§[A-Za-z_]*/u, label);
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
    assert.equal(document.offsetAt(editor.selection.active), adjusted.match(/\$[A-Za-z_]*§[A-Za-z_]*/u)!.index! + label.length);
    assert.equal(editor.selection.isEmpty, true);
    await vscode.commands.executeCommand('undo'); await until(async () => document.getText(), text => text === source);
    await vscode.commands.executeCommand('redo'); await until(async () => document.getText(), text => text === accepted);
    assert.equal(Buffer.from(await vscode.workspace.fs.readFile(uri)).toString(), source);
    results.push({ label, key, exactText: true, caretMatched: true, undoRedo: true, diskUnchanged: true });
  }
  const declarations = [
    '<?php $namedGlobal = 1; function f(string $na§) {}',
    '<?php $namedGlobal = 1; class D { public string $na§; }',
    '<?php class E { public string $name { set(string $na§) {} } }',
  ];
  for (let index = 0; index < declarations.length; index++) {
    const marked = declarations[index]!.replace('<?php', '<?php $namedGlobal = 1; $namedGlobal;'); const source = marked.replace('§', '');
    const uri = vscode.Uri.joinPath(folder.uri, 'src', `DeclarationName${index}.php`);
    await vscode.workspace.fs.writeFile(uri, Buffer.from(source)); const document = await vscode.workspace.openTextDocument(uri);
    await until(() => vscode.commands.executeCommand<vscode.CompletionList>('vscode.executeCompletionItemProvider', uri,
      document.positionAt(source.indexOf('$namedGlobal;') + '$named'.length)),
    value => value?.items.some(item => item.label === '$namedGlobal') === true);
    const list = await vscode.commands.executeCommand<vscode.CompletionList>('vscode.executeCompletionItemProvider', uri, document.positionAt(marked.indexOf('§')));
    assert.deepEqual(list?.items ?? [], [], marked);
  }
  console.log('Declaration variable acceptance proof: ' + JSON.stringify({ platform: process.platform, results, suppressedNames: declarations.length }));
}
