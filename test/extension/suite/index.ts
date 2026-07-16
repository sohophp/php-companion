import * as assert from 'node:assert';
import * as vscode from 'vscode';

export async function run(): Promise<void> {
  const extension = vscode.extensions.getExtension('sohophp.php-companion');
  assert.ok(extension, 'PHP Companion extension was not discovered');
  await extension.activate();
  if (process.env.PHP_COMPANION_TEST_WITH_INTELEPHENSE === '1') {
    const intelephense = vscode.extensions.getExtension('bmewburn.vscode-intelephense-client');
    assert.ok(intelephense, 'Intelephense was not discovered in the compatibility profile');
    await intelephense.activate();
    assert.ok(intelephense.isActive, 'Intelephense did not activate');
  }
  const commands = await vscode.commands.getCommands(true);
  assert.ok(commands.includes('phpCompanion.selectPhpVersion'));
  assert.ok(commands.includes('phpCompanion.renameClassLike'));
  assert.ok(commands.includes('phpCompanion.resolvePastedImports'));

  const workspace = vscode.workspace.workspaceFolders?.[0];
  assert.ok(workspace, 'Fixture workspace was not opened');
  const uri = vscode.Uri.joinPath(workspace.uri, 'src', 'Controller', 'UserController.php');
  const serviceUri = vscode.Uri.joinPath(workspace.uri, 'src', 'Service', 'UserService.php');
  const renamedServiceUri = vscode.Uri.joinPath(workspace.uri, 'src', 'Service', 'AccountService.php');
  const originalController = await vscode.workspace.fs.readFile(uri);
  const originalService = await vscode.workspace.fs.readFile(serviceUri);
  const document = await vscode.workspace.openTextDocument(uri);
  const serviceDocument = await vscode.workspace.openTextDocument(serviceUri);
  const serviceEditor = await vscode.window.showTextDocument(serviceDocument);
  assert.ok(await serviceEditor.edit((builder) => builder.insert(new vscode.Position(serviceDocument.lineCount, 0), "\n")), 'Could not make declaration document dirty');
  assert.ok(serviceDocument.isDirty, 'Declaration document was expected to be dirty');
  const offset = serviceDocument.getText().indexOf('UserService');
  assert.ok(offset >= 0);
  const edit = await vscode.commands.executeCommand<vscode.WorkspaceEdit>(
    'vscode.executeDocumentRenameProvider',
    serviceUri,
    serviceDocument.positionAt(offset + 2),
    'AccountService',
  );
  assert.ok(edit, 'Rename provider returned no edit');
  assert.ok(edit.entries().length >= 2, 'Rename did not include cross-file edits');
  try {
    assert.ok(await vscode.workspace.applyEdit(edit), 'Rename failed to apply edits');
    const updatedController = document.getText();
    assert.ok(updatedController.includes('AccountService'), 'Cross-file reference was not updated');
    await vscode.workspace.fs.stat(renamedServiceUri);
  } finally {
    try {
      await vscode.workspace.fs.delete(renamedServiceUri);
    } catch {
      // The rename may have failed before creating the target file.
    }
    await vscode.workspace.fs.writeFile(serviceUri, originalService);
    await vscode.workspace.fs.writeFile(uri, originalController);
  }
}
