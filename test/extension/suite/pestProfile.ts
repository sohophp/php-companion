import assert from 'node:assert/strict';
import * as vscode from 'vscode';

async function marker(folder: vscode.WorkspaceFolder): Promise<string | undefined> {
  try {
    return Buffer.from(await vscode.workspace.fs.readFile(vscode.Uri.joinPath(folder.uri, 'pest-source.txt'))).toString('utf8');
  } catch (error) {
    if (error instanceof vscode.FileSystemError && error.code === 'FileNotFound') return undefined;
    throw error;
  }
}

async function runUntil(folder: vscode.WorkspaceFolder, command: 'phpunit.run-file' | 'phpunit.run-all',
  expectedFile: string, uri?: vscode.Uri): Promise<void> {
  const markerUri = vscode.Uri.joinPath(folder.uri, 'pest-source.txt');
  try { await vscode.workspace.fs.delete(markerUri); }
  catch (error) {
    if (!(error instanceof vscode.FileSystemError && error.code === 'FileNotFound')) throw error;
  }
  for (let attempt = 0; attempt < 3; attempt += 1) {
    await vscode.commands.executeCommand(command, ...(uri ? [uri] : []));
    for (let poll = 0; poll < 40; poll += 1) {
      if (await marker(folder) === expectedFile) return;
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
  }
  assert.fail(`${command} did not execute ${expectedFile} through Pest`);
}

export async function run(): Promise<void> {
  const folder = vscode.workspace.workspaceFolders?.[0];
  assert.ok(folder, 'Pest Profile requires a workspace folder');
  const phpunit = vscode.extensions.getExtension('recca0120.vscode-phpunit');
  assert.ok(phpunit, 'Installed patched PHPUnit/Pest extension was missing');
  await vscode.workspace.getConfiguration('phpunit', folder.uri).update('php', process.env.PHP_COMPANION_PHP_EXECUTABLE,
    vscode.ConfigurationTarget.Workspace);
  await phpunit.activate();
  const commands = await vscode.commands.getCommands(true);
  assert.ok(commands.includes('phpunit.reload') && commands.includes('phpunit.run-file') && commands.includes('phpunit.run-all'),
    'PHPUnit/Pest Testing commands were missing');
  await vscode.commands.executeCommand('phpunit.reload');
  const original = vscode.Uri.joinPath(folder.uri, 'tests', 'PestProfileTest.php');
  const renamed = vscode.Uri.joinPath(folder.uri, 'tests', 'PestRenamedTest.php');
  await vscode.window.showTextDocument(await vscode.workspace.openTextDocument(original));
  await runUntil(folder, 'phpunit.run-file', 'PestProfileTest.php', original);
  await runUntil(folder, 'phpunit.run-all', 'PestProfileTest.php');
  const errors: string[] = [];
  const onUnhandled = (reason: unknown): void => { errors.push(reason instanceof Error ? reason.message : String(reason)); };
  process.on('unhandledRejection', onUnhandled);
  try {
    const edit = new vscode.WorkspaceEdit();
    edit.renameFile(original, renamed);
    assert.ok(await vscode.workspace.applyEdit(edit), 'Could not rename Pest test file');
    await vscode.window.showTextDocument(await vscode.workspace.openTextDocument(renamed));
    await vscode.commands.executeCommand('phpunit.reload');
    await runUntil(folder, 'phpunit.run-all', 'PestRenamedTest.php');
    await new Promise((resolve) => setTimeout(resolve, 1_200));
    assert.deepStrictEqual(errors, [], 'Pest file events caused an unhandled extension error');
  } finally {
    process.removeListener('unhandledRejection', onUnhandled);
  }
  console.log('Pest Profile: file, suite and renamed suite executed through the installed extension.');
}
