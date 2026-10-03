import assert from 'node:assert/strict';
import * as vscode from 'vscode';

export async function run(): Promise<void> {
  const core = vscode.extensions.getExtension('sohophp.php-companion'); assert.ok(core); await core.activate();
  const folder = vscode.workspace.workspaceFolders?.[0]; assert.ok(folder);
  const uri = vscode.Uri.joinPath(folder.uri, 'src', 'PathConsumer.php');
  const source = "<?php function inspect(string $path): void { $parts = pathinfo($path); $parts['']; }";
  await vscode.workspace.fs.writeFile(uri, Buffer.from(source));
  const document = await vscode.workspace.openTextDocument(uri); const editor = await vscode.window.showTextDocument(document);
  const labels = async (): Promise<string[]> => {
    const text = document.getText();
    const result = await vscode.commands.executeCommand<vscode.CompletionList>('vscode.executeCompletionItemProvider', uri,
      document.positionAt(text.indexOf("['") + 2));
    return result?.items.map(item => typeof item.label === 'string' ? item.label : item.label.label) ?? [];
  };
  const deadline = Date.now() + 20_000;
  let result: string[] = [];
  while (Date.now() < deadline) {
    result = await labels(); if (result.includes('extension')) break;
    await new Promise(done => setTimeout(done, 50));
  }
  for (const key of ['dirname', 'basename', 'extension', 'filename']) assert.ok(result.includes(key), `Missing ${key}`);
  for (const [flag, hasKeys] of [['PATHINFO_EXTENSION', false], ['PATHINFO_ALL', true]] as const) {
    const text = source.replace('pathinfo($path)', `pathinfo($path, ${flag})`);
    assert.equal(await editor.edit(edit => edit.replace(new vscode.Range(document.positionAt(0), document.positionAt(document.getText().length)), text)), true);
    const end = Date.now() + 10_000; let matched = false;
    while (Date.now() < end) {
      result = await labels(); matched = result.includes('extension') === hasKeys;
      if (matched) break;
      await new Promise(done => setTimeout(done, 50));
    }
    assert.equal(matched, true, `Unsaved ${flag} did not refresh`);
  }
  assert.equal(document.isDirty, true);
  assert.equal(Buffer.from(await vscode.workspace.fs.readFile(uri)).toString(), source);
  console.log('Pathinfo completion host proof: ' + JSON.stringify({ platform: process.platform, keys: true, unsavedScalarWithdrawsKeys: true, unsavedAllRestoresKeys: true, diskUnchanged: true }));
}
