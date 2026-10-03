import assert from 'node:assert/strict';
import * as vscode from 'vscode';

export async function run(): Promise<void> {
  const core = vscode.extensions.getExtension('sohophp.php-companion'); assert.ok(core); await core.activate();
  const folder = vscode.workspace.workspaceFolders?.[0]; assert.ok(folder);
  const uri = vscode.Uri.joinPath(folder.uri, 'src', 'ColumnConsumer.php');
  const sourceFor = (variant: string): string => {
    const suffix = variant === 'omitted' ? '' : variant === 'null' ? ', null' : variant === 'unknown' ? ', $index' : ", 'id'";
    return `<?php
/** @param array<string, array<string, mixed>> $rows */
function read(array $rows, string $key, ?string $index): void { $result = array_column($rows, $key${suffix}); $result; }`;
  };
  const original = sourceFor('omitted');
  await vscode.workspace.fs.writeFile(uri, Buffer.from(original));
  const document = await vscode.workspace.openTextDocument(uri); const editor = await vscode.window.showTextDocument(document);
  const results: object[] = [];
  for (const variant of ['omitted', 'indexed', 'null', 'unknown', 'indexed', 'omitted']) {
    const source = sourceFor(variant);
    const expected = variant === 'indexed' ? 'array<int|string, mixed>' : variant === 'unknown' ? 'array<int|string, mixed>|list<mixed>' : 'list<mixed>';
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
    results.push({ variant, expected, matched: true });
  }
  assert.equal(document.isDirty, true); assert.equal(Buffer.from(await vscode.workspace.fs.readFile(uri)).toString(), original);
  console.log('Array column return host proof: ' + JSON.stringify({ platform: process.platform, results, diskUnchanged: true }));
}
