import assert from 'node:assert/strict';
import * as vscode from 'vscode';
import { pressWorkbenchEnter, pressWorkbenchTab, visibleCompletionLabels } from './c1Ui.js';

async function until<T>(read: () => PromiseLike<T>, ready: (value: T) => boolean): Promise<T> {
  const deadline = Date.now() + 20_000;
  while (Date.now() < deadline) { const value = await read(); if (ready(value)) return value; await new Promise(done => setTimeout(done, 50)); }
  throw new Error('Timed out waiting for actual call completion acceptance');
}
export async function run(): Promise<void> {
  const core = vscode.extensions.getExtension('sohophp.php-companion'); assert.ok(core); await core.activate();
  const folder = vscode.workspace.workspaceFolders?.[0]; assert.ok(folder);
  const port = Number(process.env.PHP_COMPANION_TEST_C1_DEBUG_PORT); assert.ok(port > 0);
  const cases = [
    {prefix:'__ca',label:'__callStatic',forbidden:'__construct',addCall:false,addStatic:true,
      marked:'<?php class Current { public function __ca§($name,$args){} }'},
    {prefix:'__',label:'__callStatic',forbidden:'__construct',addCall:false,addStatic:false,
      marked:'<?php class Current { public static function __§($name,$args){} }'},
    {prefix:'__ca',label:'__callStatic',forbidden:'__construct',addCall:false,addStatic:true,
      marked:'<?php enum Current { case One; public function __ca§($name,$args){} }'},
    {prefix:'__set_',label:'__set_state',forbidden:'__construct',addCall:false,addStatic:true,
      marked:'<?php class Current { public /* before */ function /* name */ __set_§($properties){} }'},
  ];
  const results: object[] = [];
  for (const item of cases) for (const key of ['Enter', 'Tab'] as const) {
    console.log('Magic modifier case: ' + JSON.stringify({ index: cases.indexOf(item), key, marked: item.marked }));
    const uri = vscode.Uri.joinPath(folder.uri, 'src', `MagicModifier${cases.indexOf(item)}${key}.php`);
    const suffix = `${cases.indexOf(item)}${key}`;
    const marked = item.marked.replace(/\b(Base|Current|Methods)\b/g, name => `${name}${suffix}`);
    const offset = marked.indexOf('§'); const source = marked.replace('§', '');
    let accepted = source.slice(0, offset - item.prefix.length) + item.label + (item.addCall ? '()' : '') + source.slice(offset);
    if(item.addStatic) accepted=accepted.replace('function','static function');
    await vscode.workspace.fs.writeFile(uri, Buffer.from(source));
    const document = await vscode.workspace.openTextDocument(uri); const editor = await vscode.window.showTextDocument(document);
    const position = document.positionAt(offset); editor.selection = new vscode.Selection(position, position);
    const provided = await until(() => vscode.commands.executeCommand<vscode.CompletionList>('vscode.executeCompletionItemProvider', uri, position),
      list => list?.items.some(value => value.label === item.label) === true);
    if (item.forbidden) assert.equal(provided.items.some(value => value.label === item.forbidden), false);
    await vscode.commands.executeCommand('workbench.action.focusActiveEditorGroup');
    const popupStarted = performance.now();
    await vscode.commands.executeCommand('editor.action.triggerSuggest');
    const labels = await until(() => visibleCompletionLabels(port), values => values.some(value => value.startsWith(item.label)));
    const popupMs = performance.now() - popupStarted;
    if (item.forbidden) assert.equal(labels.some(value => value.startsWith(item.forbidden)), false);
    const targetIndex = labels.findIndex(value => value.startsWith(item.label));
    for (let index = 0; index < targetIndex; index++) await vscode.commands.executeCommand('selectNextSuggestion');
    if (key === 'Enter') await pressWorkbenchEnter(port); else await pressWorkbenchTab(port);
    await until(async () => document.getText(), text => text === accepted);
    assert.equal(document.offsetAt(editor.selection.active), offset - item.prefix.length + item.label.length + (item.addCall ? 1 : 0) + (item.addStatic ? 7 : 0));
    assert.equal(editor.selection.isEmpty, true);
    await vscode.commands.executeCommand('undo'); await until(async () => document.getText(), text => text === source);
    await vscode.commands.executeCommand('redo'); await until(async () => document.getText(), text => text === accepted);
    assert.equal(Buffer.from(await vscode.workspace.fs.readFile(uri)).toString(), source);
    results.push({ label: item.label, key, exactText: true, caretMatched: true, addCall: item.addCall, addStatic:item.addStatic, popupMs, undoRedo: true, diskUnchanged: true });
  }
  console.log('Magic modifier acceptance proof: ' + JSON.stringify({ platform: process.platform, results }));
}
