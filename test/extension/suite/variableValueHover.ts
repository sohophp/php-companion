import assert from 'node:assert/strict';
import * as vscode from 'vscode';
import { visibleHoverText } from './c1Ui.js';

export async function run(): Promise<void> {
  const core = vscode.extensions.getExtension('sohophp.php-companion'); assert.ok(core); await core.activate();
  const folder = vscode.workspace.workspaceFolders?.[0]; assert.ok(folder);
  const port = Number(process.env.PHP_COMPANION_TEST_C1_DEBUG_PORT); assert.ok(port > 0);
  const phpVersion = process.env.PHP_COMPANION_TEST_C1_PHP_VERSION;
  assert.ok(phpVersion === '7.2' || phpVersion === '8.5');
  const uri = vscode.Uri.joinPath(folder.uri, 'src', 'VariableHoverConsumer.php'), disk = '<?php';
  await vscode.workspace.fs.writeFile(uri, Buffer.from(disk));
  const document = await vscode.workspace.openTextDocument(uri);
  let editor = await vscode.window.showTextDocument(document);
  const results: object[] = [], owners: Array<[vscode.Uri, string]> = [];
  async function replace(source: string): Promise<void> {
    editor = await vscode.window.showTextDocument(document);
    assert.equal(await editor.edit(edit => edit.replace(new vscode.Range(document.positionAt(0), document.positionAt(document.getText().length)), source)), true);
  }
  async function show(name: string, expected: string): Promise<void> {
    editor = await vscode.window.showTextDocument(document);
    await vscode.commands.executeCommand('editor.action.hideHover');
    const source = document.getText(), position = document.positionAt(source.lastIndexOf('$options') + 2);
    editor.selection = new vscode.Selection(position, position);
    const started = performance.now();
    // One trigger only: do not warm the provider or retry the request to hide a cold failure.
    await vscode.commands.executeCommand('editor.action.showHover');
    const deadline = Date.now() + 15_000; let visible: string[] = [];
    while (Date.now() < deadline) {
      visible = await visibleHoverText(port);
      if (visible.some(text => text.includes('$options: ' + expected))) break;
      await new Promise(done => setTimeout(done, 30));
    }
    assert.ok(visible.some(text => text.includes('$options: ' + expected)), `${name}: ${JSON.stringify(visible)}`);
    results.push({name, expected, visible, visibleWaitMs: Math.round(performance.now() - started), singleTrigger: true});
  }
  for (const [name, captured, type] of [
    ['ordinary cold array', false, 'array{mode: int}'],
    ['captured cold array', true, 'array{mode: int}'],
    ['captured cold scalar', true, 'string'],
  ] as const) {
    const typeName = `ColdHoverOwner${owners.length}`;
    const owner = vscode.Uri.joinPath(folder.uri, 'src', typeName + '.php');
    const source = `<?php namespace App;class ${typeName}{/** @var ${type} */public static $options;}`;
    await vscode.workspace.fs.writeFile(owner, Buffer.from(source)); owners.push([owner, source]);
    await replace(`<?php function run(){$options=App\\${typeName}::$options;${captured ? '$f=function()use($options){send($options);};' : 'send($options);'}}`);
    await show(name, type);
  }
  const [owner, ownerDisk] = owners[2];
  const ownerDocument = await vscode.workspace.openTextDocument(owner);
  const ownerEditor = await vscode.window.showTextDocument(ownerDocument);
  assert.equal(await ownerEditor.edit(edit => edit.replace(new vscode.Range(ownerDocument.positionAt(0), ownerDocument.positionAt(ownerDocument.getText().length)), ownerDisk.replace('string', 'int'))), true);
  await vscode.window.showTextDocument(document); await show('unsaved owner int', 'int');
  await vscode.window.showTextDocument(ownerDocument); await vscode.commands.executeCommand('undo');
  assert.equal(ownerDocument.getText(), ownerDisk);
  await vscode.window.showTextDocument(document); await show('owner Undo string', 'string');
  await vscode.window.showTextDocument(ownerDocument); await vscode.commands.executeCommand('redo');
  assert.equal(ownerDocument.getText(), ownerDisk.replace('string', 'int'));
  await vscode.window.showTextDocument(document); await show('owner Redo int', 'int');
  const captured = document.getText();
  await replace(captured.replace('send($options)', "$options='local';send($options)"));
  await show('local overwrite', 'string');
  await vscode.commands.executeCommand('undo'); assert.equal(document.getText(), captured);
  await show('consumer Undo', 'int');
  await vscode.commands.executeCommand('redo'); assert.ok(document.getText().includes("$options='local'"));
  await show('consumer Redo', 'string');
  assert.equal(Buffer.from(await vscode.workspace.fs.readFile(uri)).toString(), disk);
  for (const [path, original] of owners) assert.equal(Buffer.from(await vscode.workspace.fs.readFile(path)).toString(), original);
  console.log('Variable value Hover host proof: ' + JSON.stringify({platform: process.platform, phpVersion,
    results, diskUnchanged: true, providerPrewarm: false, explicitShowHover: true}));
}
