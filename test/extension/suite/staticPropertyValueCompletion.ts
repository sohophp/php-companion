import assert from 'node:assert/strict';
import * as vscode from 'vscode';
import { pressWorkbenchEnter, pressWorkbenchTab, visibleCompletionLabels } from './c1Ui.js';

async function until<T>(read: () => PromiseLike<T>, ready: (value: T) => boolean, description = 'static property completion'): Promise<T> {
  let last: T | undefined;
  const deadline = Date.now() + 20_000;
  while (Date.now() < deadline) { const value = await read(); last = value; if (ready(value)) return value; await new Promise(done => setTimeout(done, 50)); }
  throw new Error(`Timed out waiting for ${description}; last=${JSON.stringify(last)}`);
}
export async function run(): Promise<void> {
  const core = vscode.extensions.getExtension('sohophp.php-companion'); assert.ok(core); await core.activate();
  const folder = vscode.workspace.workspaceFolders?.[0]; assert.ok(folder);
  const port = Number(process.env.PHP_COMPANION_TEST_C1_DEBUG_PORT); assert.ok(port > 0);
  const uri = vscode.Uri.joinPath(folder.uri, 'src', 'StaticPropertyConsumer.php'), original = '<?php';
  await vscode.workspace.fs.writeFile(uri, Buffer.from(original));
  const document = await vscode.workspace.openTextDocument(uri), editor = await vscode.window.showTextDocument(document);
  const coldStatic = vscode.Uri.joinPath(folder.uri, 'src', 'ColdStaticOptions.php');
  const coldInstance = vscode.Uri.joinPath(folder.uri, 'src', 'ColdInstanceOptions.php');
  const coldMethod = vscode.Uri.joinPath(folder.uri, 'src', 'ColdMethodOptions.php');
  await vscode.workspace.fs.writeFile(coldStatic, Buffer.from('<?php namespace App; class ColdStaticOptions {/** @var array{mode:string} */ public static $options;}'));
  await vscode.workspace.fs.writeFile(coldInstance, Buffer.from('<?php namespace App; class ColdInstanceOptions {/** @var array{mode:string} */ public $options;}'));
  await vscode.workspace.fs.writeFile(coldMethod, Buffer.from('<?php namespace App; class ColdMethodOptions {/** @return array{mode:string} */ public static function options():array{return [];} }'));
  const property = '/** @var array{mode:string,payload:array{trace:string}} */ public static $options;';
  const instanceProperties = '/** @var array{mode:string} */ public $options; /** @var array{upper:string} */ public $Options;';
  const cases = [
    ['instance lower case', `<?php class Config {${instanceProperties}} function read(Config $c){$c->options['mo§'];}`, 'mode'],
    ['instance distinct case', `<?php class Config {${instanceProperties}} function read(Config $c){$c->Options['up§'];}`, 'upper'],
    ['cold static alias', "<?php function read(){$data=App\\ColdStaticOptions::$options; $copy=$data; $copy['mo§'];}", 'mode'],
    ['cold instance property', "<?php function read(){$holder=new App\\ColdInstanceOptions(); $holder->options['mo§'];}", 'mode'],
    ['cold instance local', "<?php function read(){$holder=new App\\ColdInstanceOptions(); $data=$holder->options; $data['mo§'];}", 'mode'],
    ['cold static method', "<?php function read(){$data=App\\ColdMethodOptions::options(); $data['mo§'];}", 'mode'],
    ['direct', `<?php class Config {${property}} function read(){Config::$options['mo§'];}`, 'mode'],
    ['inherited parenthesis', `<?php class Config {${property}} class Child extends Config {} function read(){(Child::$options)['mo§'];}`, 'mode'],
    ['nested recovery', `<?php class Config {${property}} function read(){Config::$options['payload']['tr§];}`, 'trace'],
    ['assigned value', `<?php class Config {${property}} function read(){ $data=Config::$options; $data['mo§'];}`, 'mode'],
  ] as const;
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
  for (const key of ['mode', 'other', 'mode']) {
    const marked = `<?php class Config {/** @var array{${key}:string} */ public static $options;} function read(){Config::$options['mo§'];}`;
    const source = marked.replace('§', '');
    await vscode.commands.executeCommand('hideSuggestWidget');
    assert.equal(await editor.edit(edit => edit.replace(new vscode.Range(document.positionAt(0), document.positionAt(document.getText().length)), source)), true);
    const position = document.positionAt(marked.indexOf('§')); editor.selection = new vscode.Selection(position, position);
    // executeCompletionItemProvider includes unfiltered built-in snippets; the
    // Workbench performs their prefix filtering. Check Core key retraction and
    // then the actual visible list, rather than requiring all providers empty.
    await until(async () => (await vscode.commands.executeCommand<vscode.CompletionList>('vscode.executeCompletionItemProvider', uri,
      position))?.items.some(item => item.label === 'mode') ?? false, present => present === (key === 'mode'), `refreshed ${key} key fact`);
    await vscode.commands.executeCommand('editor.action.triggerSuggest');
    const visible = await until(() => visibleCompletionLabels(port), values => key === 'mode'
      ? values.length === 1 && values[0]!.startsWith('mode') : values.length === 0, `visible refreshed ${key} keys`);
    assert.equal(visible.length, key === 'mode' ? 1 : 0);

  }
  const retraction = [];
  for (const [name, marked] of [
    ['wrong property', "<?php class Config {/** @var array{mode:string} */ public $options;} function read(Config $c){$c->OPTIONS['mo§'];}"],
    ['wrong local property', "<?php class Config {/** @var array{mode:string} */ public $options;} function read(Config $c){$data=$c->OPTIONS;$data['mo§'];}"],
    ['wrong intermediate', "<?php class Inner {/** @var array{mode:string} */ public $options;} class Config {/** @var Inner */ public $inner;} function read(Config $c){$c->INNER->options['mo§'];}"],
  ]) {
    const source = marked!.replace('§', '');
    await vscode.commands.executeCommand('hideSuggestWidget');
    assert.equal(await editor.edit(edit => edit.replace(new vscode.Range(document.positionAt(0), document.positionAt(document.getText().length)), source)), true);
    const position = document.positionAt(marked!.indexOf('§')); editor.selection = new vscode.Selection(position, position);
    await until(async () => (await vscode.commands.executeCommand<vscode.CompletionList>('vscode.executeCompletionItemProvider', uri,
      position))?.items.some(item => item.label === 'mode') ?? false, present => !present, `case-sensitive ${name}`);
    await vscode.commands.executeCommand('editor.action.triggerSuggest');
    const visible = await until(() => visibleCompletionLabels(port), values => values.length === 0, `visible case-sensitive ${name}`);
    retraction.push({name, visibleCount:visible.length});
  }
  assert.equal(document.isDirty, true); assert.equal(Buffer.from(await vscode.workspace.fs.readFile(uri)).toString(), original);
  console.log('Static property value host proof: ' + JSON.stringify({platform:process.platform, phpVersion:process.env.PHP_COMPANION_TEST_C1_PHP_VERSION,
    results, refresh:['mode','other','mode'], retraction, diskUnchanged:true, explicitTriggerSuggest:true, providerPrewarm:true}));
}
