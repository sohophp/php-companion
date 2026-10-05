import assert from 'node:assert/strict';
import * as vscode from 'vscode';
import { pressWorkbenchEnter, pressWorkbenchTab, visibleCompletionLabels } from './c1Ui.js';

async function until<T>(read: () => PromiseLike<T>, ready: (value: T) => boolean, description = 'captured array completion'): Promise<T> {
  let last: T | undefined; const deadline = Date.now() + 20_000;
  while (Date.now() < deadline) { const value = await read(); last = value; if (ready(value)) return value; await new Promise(done => setTimeout(done, 50)); }
  throw new Error(`Timed out waiting for ${description}; last=${JSON.stringify(last)}`);
}
export async function run(): Promise<void> {
  const core = vscode.extensions.getExtension('sohophp.php-companion'); assert.ok(core); await core.activate();
  const folder = vscode.workspace.workspaceFolders?.[0]; assert.ok(folder);
  const port = Number(process.env.PHP_COMPANION_TEST_C1_DEBUG_PORT); assert.ok(port > 0);
  const phpVersion = process.env.PHP_COMPANION_TEST_C1_PHP_VERSION;
  assert.ok(phpVersion === '7.2' || phpVersion === '8.5');
  const uri = vscode.Uri.joinPath(folder.uri, 'src', 'CapturedArrayConsumer.php'), original = '<?php';
  await vscode.workspace.fs.writeFile(uri, Buffer.from(original));
  const document = await vscode.workspace.openTextDocument(uri), editor = await vscode.window.showTextDocument(document);
  const owner = vscode.Uri.joinPath(folder.uri, 'src', 'ColdCapturedOptions.php');
  const ownerSource = "<?php namespace App; class ColdCapturedOptions {/** @var array{mode:string} */ public static $options=['mode'=>'x']; /** @return array{mode:string} */ public static function options():array{return ['mode'=>'x'];}}";
  await vscode.workspace.fs.writeFile(owner, Buffer.from(ownerSource));
  const cases: Array<[string, string, string]> = [
    ['literal', "<?php function read(){$options=['mode'=>1];$f=function()use($options){$options['mo§'];};}", 'mode'],
    ['sequential closures', "<?php function read(){$options=['mode'=>1];$a=function()use($options){return $options;};$b=function()use($options){$options['mo§'];};}", 'mode'],
    ['snapshot', "<?php function read(){$options=['mode'=>1];$f=function()use($options){$options['mo§'];};$options=['later'=>2];}", 'mode'],
    ['alias', "<?php function read(){$options=['mode'=>1];$copy=$options;$f=function()use($copy){$copy['mo§'];};}", 'mode'],
    ['nested closure', "<?php function read(){$options=['mode'=>1];$f=function()use($options){$g=function()use($options){$options['mo§'];};};}", 'mode'],
    ['cold property', "<?php function read(){$options=App\\ColdCapturedOptions::$options;$f=function()use($options){$options['mo§'];};}", 'mode'],
    ['cold method', "<?php function read(){$options=App\\ColdCapturedOptions::options();$f=function()use($options){$options['mo§'];};}", 'mode'],
    ['local replacement', "<?php function read(){$options=['mode'=>1];$f=function()use($options){$options=['more'=>2];$options['mo§'];};}", 'more'],
    ['documented parameter', "<?php /** @param array{mode:string} $options */ function read($options){$f=function()use($options){$options['mo§'];};}", 'mode'],
  ];
  if (phpVersion === '8.5') cases.push(
    ['arrow', "<?php function read(){$options=['mode'=>1];$f=fn()=>$options['mo§'];}", 'mode'],
    ['cold arrow', "<?php function read(){$options=App\\ColdCapturedOptions::$options;$f=fn()=>$options['mo§'];}", 'mode'],
  );
  const results: object[] = [];
  for (const [name, marked, label] of cases) for (const accept of ['Enter', 'Tab']) {
    const source = marked.replace('§', ''), offset = marked.indexOf('§');
    await vscode.commands.executeCommand('hideSuggestWidget');
    assert.equal(await editor.edit(edit => edit.replace(new vscode.Range(document.positionAt(0), document.positionAt(document.getText().length)), source)), true);
    const position = document.positionAt(offset); editor.selection = new vscode.Selection(position, position);
    await until(() => vscode.commands.executeCommand<vscode.CompletionList>('vscode.executeCompletionItemProvider', uri, position),
      result => result?.items[0]?.label === label);
    const started = performance.now(); await vscode.commands.executeCommand('editor.action.triggerSuggest');
    const labels = await until(() => visibleCompletionLabels(port), values => values[0]?.startsWith(label) === true);
    assert.equal(labels.length, 1, JSON.stringify(labels));
    const visibleWaitMs = Math.round(performance.now() - started);
    const start = source.lastIndexOf('[', offset) + 1, end = offset + (source[offset] === "'" ? 1 : 0), insertion = `'${label}'`;
    const accepted = source.slice(0, start) + insertion + source.slice(end);
    if (accept === 'Enter') await pressWorkbenchEnter(port); else await pressWorkbenchTab(port);
    await until(async () => document.getText(), text => text === accepted);
    assert.equal(editor.selection.active.line, document.positionAt(start + insertion.length).line);
    assert.equal(editor.selection.active.character, document.positionAt(start + insertion.length).character);
    await vscode.commands.executeCommand('undo'); await until(async () => document.getText(), text => text === source);
    await vscode.commands.executeCommand('redo'); await until(async () => document.getText(), text => text === accepted);
    results.push({ name, accept, label, visibleWaitMs, accepted, exactText: true, caret: true, undoRedo: true });
  }
  const retraction = [];
  for (const [name, body] of [
    ['reference', "$f=function()use(&$options){$options['mo§'];};"],
    ['shadow', "$f=function($options){$options['mo§'];};"],
    ['unknown call', "$f=function()use($options){unknown($options);$options['mo§'];};"],
    ['unset', "$f=function()use($options){unset($options);$options['mo§'];};"],
  ]) {
    const marked = "<?php function read(){$options=['mode'=>1];" + body + '}';
    const source = marked.replace('§', '');
    await vscode.commands.executeCommand('hideSuggestWidget');
    assert.equal(await editor.edit(edit => edit.replace(new vscode.Range(document.positionAt(0), document.positionAt(document.getText().length)), source)), true);
    const position = document.positionAt(marked.indexOf('§')); editor.selection = new vscode.Selection(position, position);
    await until(async () => (await vscode.commands.executeCommand<vscode.CompletionList>('vscode.executeCompletionItemProvider', uri,
      position))?.items.some(item => item.label === 'mode' || item.label === 'more') ?? false, present => !present, `retracted ${name}`);
    await vscode.commands.executeCommand('editor.action.triggerSuggest');
    const visible = await until(() => visibleCompletionLabels(port), values => values.length === 0, `visible ${name}`);
    retraction.push({name, visibleCount:visible.length});
  }
  assert.equal(document.isDirty, true); assert.equal(Buffer.from(await vscode.workspace.fs.readFile(uri)).toString(), original);
  assert.equal(Buffer.from(await vscode.workspace.fs.readFile(owner)).toString(), ownerSource);
  console.log('Captured array host proof: ' + JSON.stringify({platform:process.platform, phpVersion,
    results, retraction, diskUnchanged:true, explicitTriggerSuggest:true, providerPrewarm:true}));
}
