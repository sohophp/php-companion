import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import * as vscode from 'vscode';

export async function run(): Promise<void> {
  assert.equal(process.platform, 'win32');
  const folder = vscode.workspace.workspaceFolders?.[0]; assert.ok(folder);
  const formatter = vscode.extensions.getExtension('junstyle.php-cs-fixer'); assert.ok(formatter); await formatter.activate();
  const uri = vscode.Uri.joinPath(folder.uri, 'src', 'Invalid.php');
  const original = '<?php\nfunction invalid( {\n';
  await vscode.workspace.fs.writeFile(uri, Buffer.from(original));
  const portable = process.env.SOPHP_WINDOWS_PORTABLE_ROOT; assert.ok(portable);
  const config = vscode.workspace.getConfiguration('php-cs-fixer', uri).get<string>('config'); assert.ok(config);
  const cli = spawnSync(join(portable, 'php with spaces', 'php.exe'), ['-c', join(portable, 'isolated ini', 'php.ini'),
    join(portable, 'tools', 'vendor', 'friendsofphp', 'php-cs-fixer', 'php-cs-fixer'), 'fix', '--format=json',
    '--using-cache=no', '--dry-run', `--config=${config}`, uri.fsPath], { cwd: folder.uri.fsPath, encoding: 'utf8', timeout: 30_000, windowsHide: true });
  assert.ifError(cli.error); assert.equal(cli.status, 4, 'Actual syntax error must retain CS Fixer dry-run exit code 4');
  const document = await vscode.workspace.openTextDocument(uri); await vscode.window.showTextDocument(document);
  const edits = await vscode.commands.executeCommand<vscode.TextEdit[]>('vscode.executeFormatDocumentProvider', uri,
    { tabSize: 4, insertSpaces: true });
  assert.ok(!edits || edits.length === 0, 'Syntax errors must not produce edits');
  assert.equal(document.getText(), original); assert.equal(document.isDirty, false);
  assert.equal(Buffer.from(await vscode.workspace.fs.readFile(uri)).toString('utf8'), original);
  console.log(`Windows formatting failure proof: ${JSON.stringify({ platform: process.platform,
    noEdits: true, bufferUnchanged: true, diskUnchanged: true, dirty: document.isDirty, cliExitCode: cli.status })}`);
}
