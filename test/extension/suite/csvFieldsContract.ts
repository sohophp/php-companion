import assert from 'node:assert/strict';
import * as vscode from 'vscode';

export async function run(): Promise<void> {
  const core = vscode.extensions.getExtension('sohophp.php-companion'); assert.ok(core); await core.activate();
  const folder = vscode.workspace.workspaceFolders?.[0]; assert.ok(folder);
  const uri = vscode.Uri.joinPath(folder.uri, 'src', 'CsvConsumer.php');
  const sourceFor = (variant: string, method = false): string => {
    const fieldsType = variant === 'list' ? 'list<string>' : variant === 'boolean' ? 'list<int|bool>' : variant === 'mixed' ? 'array<string, mixed>' : variant === 'scalar' ? 'string' : 'array<string, string>';
    const expression = method ? '$file->fputcsv($fields)' : 'fputcsv($stream, $fields)';
    return `<?php
/** @param resource $stream
 * @param ${fieldsType} $fields */
function write($stream, SplFileObject $file, $fields): void { $count = ${expression}; $count; }`;
  };
  const original = sourceFor('associated');
  await vscode.workspace.fs.writeFile(uri, Buffer.from(original));
  const document = await vscode.workspace.openTextDocument(uri); const editor = await vscode.window.showTextDocument(document);
  const results: object[] = [];
  for (const method of [false, true])
  for (const variant of ['list', 'associated', 'boolean', 'mixed', 'scalar', 'list']) {
    const source = sourceFor(variant, method);
    if (document.getText() !== source) assert.equal(await editor.edit(edit => edit.replace(
      new vscode.Range(document.positionAt(0), document.positionAt(document.getText().length)), source)), true);
    let text = ''; const deadline = Date.now() + 20_000;
    do {
      const hovers = await vscode.commands.executeCommand<vscode.Hover[]>('vscode.executeHoverProvider', uri,
        document.positionAt(source.indexOf('$count;') + 3));
      text = hovers?.flatMap(hover => hover.contents.map(content => typeof content === 'string' ? content : content.value)).join('\n') ?? '';
      const typed = /\$count: (?:false\|int|int\|false)\n/.test(text);
      if (variant === 'scalar' ? !typed && text.length > 0 : typed) break;
      await new Promise(done => setTimeout(done, 50));
    } while (Date.now() < deadline);
    assert.equal(/\$count: (?:false\|int|int\|false)\n/.test(text), variant !== 'scalar', JSON.stringify({ method, variant, text }));
    results.push({ method, variant, typed: variant !== 'scalar', matched: true });
  }
  assert.equal(document.isDirty, true); assert.equal(Buffer.from(await vscode.workspace.fs.readFile(uri)).toString(), original);
  console.log('CSV fields host proof: ' + JSON.stringify({ platform: process.platform, results, diskUnchanged: true }));
}
