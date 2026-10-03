import assert from 'node:assert/strict';
import * as vscode from 'vscode';
export async function run(): Promise<void> {
  const core = vscode.extensions.getExtension('sohophp.php-companion'); assert.ok(core); await core.activate();
  const folder = vscode.workspace.workspaceFolders?.[0]; assert.ok(folder);
  const uri = vscode.Uri.joinPath(folder.uri, 'src', 'NullableConsumer.php');
  const sourceFor = (value: string): string => `<?php
declare(strict_types=1);
class Result { public function resultOnly(): void {} }
function take(array $args = ${value}): Result { return new Result(); }
$result = take(null); $result->result;`;
  const original = sourceFor('null'); await vscode.workspace.fs.writeFile(uri, Buffer.from(original));
  const document = await vscode.workspace.openTextDocument(uri); const editor = await vscode.window.showTextDocument(document);
  const results: object[] = [];
  for (const value of ['null', '[]', 'NULL', '[]', 'null']) {
    const source = sourceFor(value);
    if (document.getText() !== source) assert.equal(await editor.edit(edit => edit.replace(new vscode.Range(document.positionAt(0), document.positionAt(document.getText().length)), source)), true);
    const expected = value === '[]' ? 1 : 0; let count = -1; const deadline = Date.now() + 20000;
    do {
      await vscode.commands.executeCommand('vscode.executeCompletionItemProvider', uri, document.positionAt(source.indexOf('$result->result') + '$result->result'.length));
      count = vscode.languages.getDiagnostics(uri).filter(item => (typeof item.code === 'object' ? item.code.value : item.code) === 'php.argument.type-mismatch').length;
      if (count === expected) break;
      await new Promise(done => setTimeout(done, 50));
    } while (Date.now() < deadline);
    assert.equal(count, expected, JSON.stringify({ value, diagnostics: vscode.languages.getDiagnostics(uri) }));
    results.push({ value, mismatches: count });
  }
  assert.equal(document.isDirty, true); assert.equal(Buffer.from(await vscode.workspace.fs.readFile(uri)).toString(), original);
  console.log('Implicit nullable host proof: ' + JSON.stringify({ platform: process.platform, results, diskUnchanged: true }));
}
