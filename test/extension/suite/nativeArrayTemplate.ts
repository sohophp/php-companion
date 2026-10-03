import assert from 'node:assert/strict';
import * as vscode from 'vscode';

export async function run(): Promise<void> {
  const core = vscode.extensions.getExtension('sohophp.php-companion'); assert.ok(core); await core.activate();
  const folder = vscode.workspace.workspaceFolders?.[0]; assert.ok(folder);
  const uri = vscode.Uri.joinPath(folder.uri, 'src', 'ArraysConsumer.php');
  const sourceFor = (variant: string, name: string): string => `<?php
${variant === 'known' ? '/** @param array<string, int> $input */' : ''}
function read(array $input): void { $result = ${name}(${variant === 'invalid' ? '42' : '$input'}); $result; }`;
  const original = sourceFor('native', 'array_keys');
  await vscode.workspace.fs.writeFile(uri, Buffer.from(original));
  const document = await vscode.workspace.openTextDocument(uri); const editor = await vscode.window.showTextDocument(document);
  const results: object[] = [];
  for (const name of ['array_keys', 'array_filter', 'array_unique', 'array_replace']) {
    for (const variant of ['known', 'native', 'invalid', 'native', 'known']) {
      const source = sourceFor(variant, name);
      const expected = name === 'array_keys' ? variant === 'known' ? 'list<string>' : 'list<int|string>'
        : variant === 'known' ? 'array<string, int>' : 'array<int|string, mixed>';
      if (document.getText() !== source) assert.equal(await editor.edit(edit => edit.replace(
        new vscode.Range(document.positionAt(0), document.positionAt(document.getText().length)), source)), true);
      let text = ''; let matched = false; const deadline = Date.now() + 20_000;
      do {
        const hovers = await vscode.commands.executeCommand<vscode.Hover[]>('vscode.executeHoverProvider', uri,
          document.positionAt(source.indexOf('$result;') + 3));
        text = hovers?.flatMap(hover => hover.contents.map(content => typeof content === 'string' ? content : content.value)).join('\n') ?? '';
        matched = variant === 'invalid' ? !/\$result: (?:array|list)/.test(text) : text.includes(`$result: ${expected}\n`);
        if (matched) break;
        await new Promise(done => setTimeout(done, 50));
      } while (Date.now() < deadline);
      assert.ok(matched, JSON.stringify({ name, variant, text }));
      results.push({ name, variant, expected: variant === 'invalid' ? 'no array return' : expected, matched });
    }
  }
  assert.equal(document.isDirty, true); assert.equal(Buffer.from(await vscode.workspace.fs.readFile(uri)).toString(), original);
  console.log('Native array template host proof: ' + JSON.stringify({ platform: process.platform, results, diskUnchanged: true }));
}
