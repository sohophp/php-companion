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
  await vscode.commands.executeCommand('phpCompanion.rebuildIndex');
  const uri = vscode.Uri.joinPath(workspace.uri, 'src', 'Controller', 'UserController.php');
  const document = await vscode.workspace.openTextDocument(uri);
  const offset = document.getText().indexOf('UserService');
  assert.ok(offset >= 0);
  const edit = await vscode.commands.executeCommand<vscode.WorkspaceEdit>(
    'vscode.executeDocumentRenameProvider',
    uri,
    document.positionAt(offset + 2),
    'AccountService',
  );
  assert.ok(edit, 'Rename provider returned no edit');
  assert.ok(edit.entries().length >= 2, 'Rename did not include cross-file edits');
}
