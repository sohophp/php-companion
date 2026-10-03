import assert from 'node:assert/strict';
import * as vscode from 'vscode';

export async function run(): Promise<void> {
  const core = vscode.extensions.getExtension('sohophp.php-companion'); assert.ok(core); await core.activate();
  const folder = vscode.workspace.workspaceFolders?.[0]; assert.ok(folder);
  const uri = vscode.Uri.joinPath(folder.uri, 'src', 'XmlConsumer.php');
  const names = ['simplexml_load_string', 'simplexml_load_file', 'simplexml_import_dom'];
  const declarations = '<?php namespace App; class CustomXml extends \\SimpleXMLElement { public function customOnly(): void {} } class OtherXml extends \\SimpleXMLElement { public function otherOnly(): void {} }';
  const text = (type: string): string => declarations + names.map((name, index) =>
    ` function consume${index}(string $input, \\DOMNode $node): void { $xml = ${name}(${index === 2 ? '$node' : '$input'}, ${type}); if ($xml === ${index === 2 ? 'null' : 'false'}) return; $xml->customO; }`).join('\n');
  const original = text('CustomXml::class'); await vscode.workspace.fs.writeFile(uri, Buffer.from(original));
  const document = await vscode.workspace.openTextDocument(uri); const editor = await vscode.window.showTextDocument(document);
  for (const [type, expected] of [['CustomXml::class', true], ['OtherXml::class', false], ['CustomXml::class', true], ['null', false]] as const) {
    if (document.getText() !== text(type)) assert.equal(await editor.edit(edit => edit.replace(
      new vscode.Range(document.positionAt(0), document.positionAt(document.getText().length)), text(type))), true);
    for (const name of names) {
      let matched = false; const deadline = Date.now() + 20_000;
      while (Date.now() < deadline) {
        const source = document.getText(); const offset = source.indexOf('customO;', source.indexOf(name + '(')) + 7;
        const result = await vscode.commands.executeCommand<vscode.CompletionList>('vscode.executeCompletionItemProvider', uri, document.positionAt(offset));
        matched = (result?.items.some(item => (typeof item.label === 'string' ? item.label : item.label.label) === 'customOnly') ?? false) === expected;
        if (matched) break;
        await new Promise(done => setTimeout(done, 50));
      }
      assert.equal(matched, true, `${name}: ${type}`);
    }
  }
  assert.equal(document.isDirty, true); assert.equal(Buffer.from(await vscode.workspace.fs.readFile(uri)).toString(), original);
  console.log('SimpleXML factory host proof: ' + JSON.stringify({ platform: process.platform, names, subclassMembers: true, unsavedReplacement: true, nullWithdrawsSubclass: true, diskUnchanged: true }));
}
