import assert from 'node:assert/strict';
import * as vscode from 'vscode';

export async function run(): Promise<void> {
  const core = vscode.extensions.getExtension('sohophp.php-companion'); assert.ok(core); await core.activate();
  const folder = vscode.workspace.workspaceFolders?.[0]; assert.ok(folder);
  const uri = vscode.Uri.joinPath(folder.uri, 'src', 'CombineConsumer.php');
  const sourceFor = (_name: string, valueType: string): string => `<?php
class Item { public function memberItem(): void {} } class Other { public function memberOther(): void {} }
/** @param array<string, string> $keys
 * @param array<string, ${valueType}> $values */
function read(array $keys, array $values): void { $result = array_combine($keys, $values); $result; if ($result !== false) { foreach ($result as $item) { $item->member; } } }`;
  const original = sourceFor('array_combine', 'Item');
  await vscode.workspace.fs.writeFile(uri, Buffer.from(original));
  const document = await vscode.workspace.openTextDocument(uri); const editor = await vscode.window.showTextDocument(document);
  const results: object[] = [];
  for (const name of ['array_combine']) {
    for (const suffix of ['Item', 'Other', 'mixed', 'Item']) {
      const source = sourceFor(name, suffix);
      if (document.getText() !== source) assert.equal(await editor.edit(edit => edit.replace(
        new vscode.Range(document.positionAt(0), document.positionAt(document.getText().length)), source)), true);
      let text = ''; const deadline = Date.now() + 20_000;
      const expected = `array<int|string, ${suffix}>`;
      do {
        const hovers = await vscode.commands.executeCommand<vscode.Hover[]>('vscode.executeHoverProvider', uri,
          document.positionAt(source.indexOf('$result;') + 3));
        text = hovers?.flatMap(hover => hover.contents.map(content => typeof content === 'string' ? content : content.value)).join('\n') ?? '';
        if (text.includes(`$result: ${expected}\n`)) break;
        await new Promise(done => setTimeout(done, 50));
      } while (Date.now() < deadline);
      assert.ok(text.includes(`$result: ${expected}\n`), JSON.stringify({ name, suffix, expected, text }));
      const completion = await vscode.commands.executeCommand<vscode.CompletionList>('vscode.executeCompletionItemProvider', uri,
        document.positionAt(source.indexOf('$item->member') + '$item->member'.length));
      const labels = completion?.items.map(item => typeof item.label === 'string' ? item.label : item.label.label) ?? [];
      for (const type of ['Item', 'Other']) assert.equal(labels.includes('member' + type), suffix === type);
      results.push({ name, suffix, expected, matched: true });
    }
  }
  assert.equal(document.isDirty, true); assert.equal(Buffer.from(await vscode.workspace.fs.readFile(uri)).toString(), original);
  console.log('Array combine host proof: ' + JSON.stringify({ platform: process.platform, results, diskUnchanged: true }));
}
