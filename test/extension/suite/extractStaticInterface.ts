import assert from 'node:assert/strict';
import * as vscode from 'vscode';

export async function run(): Promise<void> {
  const core = vscode.extensions.getExtension('sohophp.php-companion'); assert.ok(core); await core.activate();
  const folder = vscode.workspace.workspaceFolders?.[0]; assert.ok(folder);
  const uri = vscode.Uri.joinPath(folder.uri, 'src', 'Builder.php');
  const target = vscode.Uri.joinPath(folder.uri, 'src', 'BuilderInterface.php');
  const source = '<?php\nnamespace App;\nclass Builder { public function with(): static { return $this; } public static function create(): static { return new static(); } }\n';
  await vscode.workspace.fs.writeFile(uri, Buffer.from(source));
  const document = await vscode.workspace.openTextDocument(uri); await vscode.window.showTextDocument(document);
  const position = document.positionAt(source.indexOf('Builder') + 1);
  let action: vscode.CodeAction | undefined;
  const deadline = Date.now() + 20_000;
  while (!action && Date.now() < deadline) {
    const actions = await vscode.commands.executeCommand<Array<vscode.CodeAction | vscode.Command>>('vscode.executeCodeActionProvider', uri,
      new vscode.Range(position, position), vscode.CodeActionKind.RefactorExtract.value);
    action = actions.find((item): item is vscode.CodeAction => item.title === 'Extract interface BuilderInterface' && 'command' in item);
    if (!action) await new Promise(done => setTimeout(done, 50));
  }
  assert.ok(action?.command, 'Late-static Extract Interface action was unavailable');
  assert.equal(await vscode.commands.executeCommand(action.command.command, ...action.command.arguments ?? [],
    { testPreviewAction: async (): Promise<'apply'> => 'apply' }), true);
  const targetDocument = await vscode.workspace.openTextDocument(target);
  const targetEol = targetDocument.eol;
  assert.equal(targetEol, process.platform === 'win32' ? vscode.EndOfLine.CRLF : vscode.EndOfLine.LF,
    'The fixture must exercise the platform default EOL');
  const generated = targetDocument.getText();
  assert.ok(generated.includes('public function with(): static;'));
  assert.ok(generated.includes('public static function create(): static;'));
  const modified = document.getText(); assert.ok(modified.includes('implements BuilderInterface'));
  await vscode.window.showTextDocument(document); await vscode.commands.executeCommand('undo');
  assert.equal(document.getText(), source); await assert.rejects(async () => vscode.workspace.fs.stat(target));
  await vscode.commands.executeCommand('redo');
  assert.equal(document.getText(), modified);
  assert.equal((await vscode.workspace.openTextDocument(target)).getText(), generated);
  assert.equal((await vscode.workspace.openTextDocument(target)).eol, targetEol);
  console.log(`Extract static interface host proof: ${JSON.stringify({ platform: process.platform, extracted: true,
    staticReturnsPreserved: true, targetEol: targetEol === vscode.EndOfLine.CRLF ? 'CRLF' : 'LF',
    undoRestoresSourceAndDeletesFile: true, redoRestoresSourceAndFile: true, redoPreservesTargetEol: true })}`);
}
