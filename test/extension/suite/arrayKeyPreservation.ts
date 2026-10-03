import assert from 'node:assert/strict';
import * as vscode from 'vscode';

export async function run(): Promise<void> {
  const core = vscode.extensions.getExtension('sohophp.php-companion'); assert.ok(core); await core.activate();
  const folder = vscode.workspace.workspaceFolders?.[0]; assert.ok(folder);
  const uri = vscode.Uri.joinPath(folder.uri, 'src', 'OrderingConsumer.php');
  const sourceFor = (variant: string, expression = 'array_reverse($input)'): string => `<?php
/** @param ${variant} $input */
function read(array $input): void { $result = ${expression}; $result; }`;
  const original = sourceFor('array<string, string>');
  await vscode.workspace.fs.writeFile(uri, Buffer.from(original));
  const document = await vscode.workspace.openTextDocument(uri); const editor = await vscode.window.showTextDocument(document);
  const results: object[] = [];
  for (const [variant, expression, expected] of [
    ['array<int, string>', 'array_reverse($input)', 'array<int, string>'],
    ['array<string, string>', 'array_reverse($input, true)', 'array<string, string>'],
    ['array<int, string>', 'array_slice($input, 0, null)', 'array<int, string>'],
    ['array<string, string>', 'array_slice($input, 0, null, true)', 'array<string, string>'],
    ['array<string, string>', 'array_chunk($input, 2)', 'list<array<int, string>>'],
    ['array<string, string>', 'array_chunk($input, 2, true)', 'list<array<string, string>>'],
    ['array', 'array_reverse($input)', 'array<int|string, mixed>'],
    ['array<int, string>', 'array_reverse($input)', 'array<int, string>'],
  ]) {
    const source = sourceFor(variant, expression);
    if (document.getText() !== source) assert.equal(await editor.edit(edit => edit.replace(
      new vscode.Range(document.positionAt(0), document.positionAt(document.getText().length)), source)), true);
    let text = ''; const deadline = Date.now() + 20_000;
    do {
      const hovers = await vscode.commands.executeCommand<vscode.Hover[]>('vscode.executeHoverProvider', uri,
        document.positionAt(source.indexOf('$result;') + 3));
      text = hovers?.flatMap(hover => hover.contents.map(content => typeof content === 'string' ? content : content.value)).join('\n') ?? '';
      if (text.includes(`$result: ${expected}\n`)) break;
      await new Promise(done => setTimeout(done, 50));
    } while (Date.now() < deadline);
    assert.ok(text.includes(`$result: ${expected}\n`), JSON.stringify({ variant, text }));
    results.push({ variant, expression, expected, matched: true });
  }
  assert.equal(document.isDirty, true); assert.equal(Buffer.from(await vscode.workspace.fs.readFile(uri)).toString(), original);
  console.log('Array key preservation host proof: ' + JSON.stringify({ platform: process.platform, results, diskUnchanged: true }));
}
