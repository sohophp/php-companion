import assert from 'node:assert/strict';
import * as vscode from 'vscode';

export async function run(): Promise<void> {
  const core = vscode.extensions.getExtension('sohophp.php-companion'); assert.ok(core); await core.activate();
  const folder = vscode.workspace.workspaceFolders?.[0]; assert.ok(folder);
  const uri = vscode.Uri.joinPath(folder.uri, 'src', 'HeadersConsumer.php');
  const sourceFor = (name: string, suffix: string): string => `<?php function read(string $input, bool $capture): void { $result = ${name}($input${suffix}); $result; }`;
  const original = sourceFor('get_headers', '');
  await vscode.workspace.fs.writeFile(uri, Buffer.from(original));
  const document = await vscode.workspace.openTextDocument(uri); const editor = await vscode.window.showTextDocument(document);
  const results: object[] = [];
  for (const name of ['get_headers']) {
    for (const suffix of ['', ', true', ', $capture', '']) {
      const source = sourceFor(name, suffix);
      if (document.getText() !== source) assert.equal(await editor.edit(edit => edit.replace(
        new vscode.Range(document.positionAt(0), document.positionAt(document.getText().length)), source)), true);
      let text = ''; const deadline = Date.now() + 20_000;
      const expected = suffix === '' ? 'false|list<string>' : suffix === ', true'
        ? 'array<int|string, list<string>|string>|false' : 'array<int|string, list<string>|string>|false|list<string>';
      do {
        const hovers = await vscode.commands.executeCommand<vscode.Hover[]>('vscode.executeHoverProvider', uri,
          document.positionAt(source.lastIndexOf('$result') + 3));
        text = hovers?.flatMap(hover => hover.contents.map(content => typeof content === 'string' ? content : content.value)).join('\n') ?? '';
        if (text.includes(`$result: ${expected}\n`)) break;
        await new Promise(done => setTimeout(done, 50));
      } while (Date.now() < deadline);
      assert.ok(text.includes(`$result: ${expected}\n`), JSON.stringify({ name, suffix, expected, text }));
      results.push({ name, suffix, expected, matched: true });
    }
  }
  assert.equal(document.isDirty, true); assert.equal(Buffer.from(await vscode.workspace.fs.readFile(uri)).toString(), original);
  console.log('Headers return host proof: ' + JSON.stringify({ platform: process.platform, results, diskUnchanged: true }));
}
