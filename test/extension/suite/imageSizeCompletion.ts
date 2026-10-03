import assert from 'node:assert/strict';
import * as vscode from 'vscode';

export async function run(): Promise<void> {
  const core = vscode.extensions.getExtension('sohophp.php-companion'); assert.ok(core); await core.activate();
  const folder = vscode.workspace.workspaceFolders?.[0]; assert.ok(folder); const results: object[] = [];
  for (const name of ['getimagesize', 'getimagesizefromstring']) {
    const uri = vscode.Uri.joinPath(folder.uri, 'src', `${name}Consumer.php`);
    const sourceFor = (guard: string): string => `<?php function ${name}Consumer(string $input): void { $metadata = ${name}($input); ${guard} $metadata['mi']; }`;
    const original = sourceFor('if ($metadata === false) return;');
    await vscode.workspace.fs.writeFile(uri, Buffer.from(original));
    const document = await vscode.workspace.openTextDocument(uri); const editor = await vscode.window.showTextDocument(document);
    for (const guard of ['if ($metadata === false) return;', '', 'if (!is_array($metadata)) return;']) {
      const source = sourceFor(guard);
      if (document.getText() !== source) assert.equal(await editor.edit(edit => edit.replace(
        new vscode.Range(document.positionAt(0), document.positionAt(document.getText().length)), source)), true);
      let labels: string[] = []; const deadline = Date.now() + 20_000;
      do {
        const completion = await vscode.commands.executeCommand<vscode.CompletionList>('vscode.executeCompletionItemProvider', uri,
          document.positionAt(source.indexOf("['mi") + 4));
        labels = completion?.items.map(item => typeof item.label === 'string' ? item.label : item.label.label) ?? [];
        if (JSON.stringify(labels) === JSON.stringify(guard ? ['mime'] : [])) break;
        await new Promise(done => setTimeout(done, 50));
      } while (Date.now() < deadline);
      assert.deepEqual(labels, guard ? ['mime'] : []);
    }
    assert.equal(document.isDirty, true); assert.equal(Buffer.from(await vscode.workspace.fs.readFile(uri)).toString(), original);
    results.push({ name, guardedKeys: true, unguardedWithdrawsKeys: true, arrayGuardRestoresKeys: true, diskUnchanged: true });
  }
  console.log('Image size completion host proof: ' + JSON.stringify({ platform: process.platform, results }));
}
