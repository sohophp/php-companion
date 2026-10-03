import assert from 'node:assert/strict';
import * as vscode from 'vscode';

export async function run(): Promise<void> {
  const core = vscode.extensions.getExtension('sohophp.php-companion'); assert.ok(core); await core.activate();
  const folder = vscode.workspace.workspaceFolders?.[0]; assert.ok(folder);
  const results: object[] = [];
  for (const name of ['stat', 'lstat']) {
    const uri = vscode.Uri.joinPath(folder.uri, 'src', `${name}Consumer.php`);
    const text = (guard: string): string => `<?php function ${name}Consumer(string $path): void { $metadata = ${name}($path); ${guard} $metadata['si']; }`;
    const original = text('if ($metadata === false) return;');
    await vscode.workspace.fs.writeFile(uri, Buffer.from(original));
    const document = await vscode.workspace.openTextDocument(uri); const editor = await vscode.window.showTextDocument(document);
    for (const [guard, expected] of [['if ($metadata === false) return;', true], ['', false], ['if (!is_array($metadata)) return;', true]] as const) {
      if (document.getText() !== text(guard)) assert.equal(await editor.edit(edit => edit.replace(
        new vscode.Range(document.positionAt(0), document.positionAt(document.getText().length)), text(guard))), true);
      let matched = false; const deadline = Date.now() + 20_000;
      while (Date.now() < deadline) {
        const result = await vscode.commands.executeCommand<vscode.CompletionList>('vscode.executeCompletionItemProvider', uri,
          document.positionAt(document.getText().indexOf("['si") + 4));
        const labels = result?.items.map(item => typeof item.label === 'string' ? item.label : item.label.label) ?? [];
        matched = labels.includes('size') === expected;
        if (matched) break;
        await new Promise(done => setTimeout(done, 50));
      }
      assert.equal(matched, true, `${name}: guard ${guard}`);
    }
    assert.equal(document.isDirty, true);
    assert.equal(Buffer.from(await vscode.workspace.fs.readFile(uri)).toString(), original);
    results.push({ name, falseGuardKeys: true, unguardedWithdrawsKeys: true, arrayGuardKeys: true, diskUnchanged: true });
  }
  console.log('Stat completion host proof: ' + JSON.stringify({ platform: process.platform, results }));
}
