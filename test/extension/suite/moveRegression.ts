import * as vscode from 'vscode';
import * as assert from 'node:assert';
async function waitFor(check: () => Promise<boolean>, message: string): Promise<void> {
  const deadline = Date.now() + 30000;
  while (Date.now() < deadline) { if (await check()) return; await new Promise<void>((done) => setTimeout(done, 100)); }
  throw new Error(message);
}
export async function run(): Promise<void> {
  await vscode.extensions.getExtension('sohophp.php-companion')!.activate();
  const root = vscode.workspace.workspaceFolders![0]!.uri;
  const oldUri = vscode.Uri.joinPath(root, 'src', 'Bridge', 'Subscriber.php');
  const newUri = vscode.Uri.joinPath(root, 'src', 'Subscriber.php');
  const consumer = vscode.Uri.joinPath(root, 'src', 'Consumer.php');
  let document = await vscode.workspace.openTextDocument(oldUri);
  await vscode.window.showTextDocument(document);
  if (process.env.PHP_COMPANION_COLD_MOVE !== '1') {
  const references = await vscode.commands.executeCommand<vscode.Location[]>('vscode.executeReferenceProvider', oldUri, document.positionAt(document.getText().indexOf('Subscriber') + 2));
  assert.ok(references?.some((location) => location.uri.toString() === consumer.toString()), 'References omitted unopened consumer in onDemand mode');
  }
  const dirty = new vscode.WorkspaceEdit(); dirty.insert(oldUri, document.positionAt(document.getText().length), '\n// preserve unsaved content\n');
  await vscode.workspace.applyEdit(dirty);
  const move = new vscode.WorkspaceEdit(); move.renameFile(oldUri, newUri);
  assert.ok(await vscode.workspace.applyEdit(move));
  await waitFor(async () => {
    try { document = await vscode.workspace.openTextDocument(newUri); return document.getText().includes('namespace App;'); } catch { return false; }
  }, 'Forward Explorer move did not update namespace');
  assert.ok(document.getText().includes('// preserve unsaved content'));
  await waitFor(async () => (await vscode.workspace.openTextDocument(consumer)).getText().includes('use App\\Subscriber;'), 'Consumer import did not follow move');
  assert.match((await vscode.workspace.openTextDocument(newUri)).getText(), /^namespace App;$/m, 'Reconciliation removed namespace delimiter');
  const reverse = new vscode.WorkspaceEdit(); reverse.renameFile(newUri, oldUri);
  assert.ok(await vscode.workspace.applyEdit(reverse));
  await waitFor(async () => {
    try { return (await vscode.workspace.openTextDocument(oldUri)).getText().includes('namespace App\\Bridge;') && (await vscode.workspace.openTextDocument(consumer)).getText().includes('use App\\Bridge\\Subscriber;'); } catch { return false; }
  }, 'Reverse Explorer move did not reconcile');
  assert.match((await vscode.workspace.openTextDocument(oldUri)).getText(), /^namespace App\\Bridge;$/m, 'Reverse reconciliation damaged namespace');
  console.log('PASS: onDemand references, dual PSR-4 mapping, dirty Explorer move and reverse');
}
