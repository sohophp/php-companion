import assert from 'node:assert/strict';
import * as vscode from 'vscode';
import { pressWorkbenchEnter, pressWorkbenchTab, visibleCompletionLabels } from './c1Ui.js';

async function until<T>(read: () => PromiseLike<T>, ready: (value: T) => boolean): Promise<T> {
  const deadline = Date.now() + 20_000;
  while (Date.now() < deadline) { const value = await read(); if (ready(value)) return value; await new Promise(done => setTimeout(done, 50)); }
  throw new Error('Timed out waiting for comparison condition completion acceptance');
}
export async function run(): Promise<void> {
  const core = vscode.extensions.getExtension('sohophp.php-companion'); assert.ok(core); await core.activate();
  const folder = vscode.workspace.workspaceFolders?.[0]; assert.ok(folder);
  const port = Number(process.env.PHP_COMPANION_TEST_C1_DEBUG_PORT); assert.ok(port > 0);
  const cases = [
    {prefix:'rea',label:'Current::Ready',forbidden:'try',addCall:false,
      marked:'<?php enum Current { case Ready; } function choose(Current $status): string { return match($status) { rea§ => "yes", default => "no" }; }'},
    {prefix:'rea',label:'Current::Ready',forbidden:'try',addCall:false,
      marked:'<?php enum Current { case Ready; } function choose(Current $status): string { switch($status) { case rea§: return "yes"; default: return "no"; } }'},
    {prefix:'tr',label:'true',forbidden:'try',addCall:false,
      marked:'<?php function choose(bool $status): string { switch($status) { case tr§: return "yes"; default: return "no"; } }'},
    {prefix:'tr',label:'true',forbidden:'try',addCall:false,
      marked:'<?php function choose(bool $status): string { return match($status) { tr§ => "yes", default => "no" }; }'},
  ];
  const results: object[] = [];
  for (const item of cases) for (const key of ['Enter', 'Tab'] as const) {
    console.log('Comparison condition case: ' + JSON.stringify({ index: cases.indexOf(item), key, marked: item.marked }));
    const uri = vscode.Uri.joinPath(folder.uri, 'src', `ComparisonCondition${cases.indexOf(item)}${key}.php`);
    const suffix = `${cases.indexOf(item)}${key}`;
    const marked = item.marked.replace(/\b(Current|choose)\b/g, name => `${name}${suffix}`);
    const offset = marked.indexOf('§'); const source = marked.replace('§', '');
    const label = item.label.replace('Current', `Current${suffix}`);
    const accepted = source.slice(0, offset - item.prefix.length) + label + (item.addCall ? '()' : '') + source.slice(offset);
    await vscode.workspace.fs.writeFile(uri, Buffer.from(source));
    const document = await vscode.workspace.openTextDocument(uri); const editor = await vscode.window.showTextDocument(document);
    const position = document.positionAt(offset); editor.selection = new vscode.Selection(position, position);
    const provided = await until(() => vscode.commands.executeCommand<vscode.CompletionList>('vscode.executeCompletionItemProvider', uri, position),
      list => list?.items.some(value => value.label === label) === true);
    console.log('Comparison provided target: ' + JSON.stringify(provided.items.find(value => value.label === label)));
    if (item.forbidden) assert.equal(provided.items.some(value => value.label === item.forbidden), false);
    await vscode.commands.executeCommand('workbench.action.focusActiveEditorGroup');
    const visibleStarted = Date.now();
    await vscode.commands.executeCommand('editor.action.triggerSuggest');
    let lastLabels: string[] = [];
    const labels = await until(async () => { const next = await visibleCompletionLabels(port); if (JSON.stringify(next) !== JSON.stringify(lastLabels)) console.log('Comparison visible labels: ' + JSON.stringify(next)); lastLabels = next; return lastLabels; }, values => values.some(value => value.startsWith(label)));
    if (item.forbidden) assert.equal(labels.some(value => value.startsWith(item.forbidden)), false);
    const visibleMs = Date.now() - visibleStarted;
    assert.equal(labels.findIndex(value => value.startsWith(label)), 0, `Expected first visible candidate ${label}, got ${JSON.stringify(labels)}`);
    if (key === 'Enter') await pressWorkbenchEnter(port); else await pressWorkbenchTab(port);
    await until(async () => document.getText(), text => text === accepted);
    assert.equal(document.offsetAt(editor.selection.active), offset - item.prefix.length + label.length + (item.addCall ? 1 : 0));
    assert.equal(editor.selection.isEmpty, true);
    await vscode.commands.executeCommand('undo'); await until(async () => document.getText(), text => text === source);
    await vscode.commands.executeCommand('redo'); await until(async () => document.getText(), text => text === accepted);
    assert.equal(Buffer.from(await vscode.workspace.fs.readFile(uri)).toString(), source);
    results.push({ label, key, visibleMs, visibleLabels: labels, exactText: true, caretMatched: true, addCall: item.addCall, undoRedo: true, diskUnchanged: true });
  }
  console.log('Comparison condition acceptance proof: ' + JSON.stringify({ platform: process.platform, results }));
}
