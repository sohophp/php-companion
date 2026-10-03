import assert from 'node:assert/strict';
import { join } from 'node:path';
import * as vscode from 'vscode';

export async function run(): Promise<void> {
  assert.equal(process.platform, 'win32');
  const folder = vscode.workspace.workspaceFolders?.[0]; assert.ok(folder);
  const portable = process.env.SOPHP_WINDOWS_PORTABLE_ROOT; assert.ok(portable);
  const core = vscode.extensions.getExtension('sohophp.php-companion'); assert.ok(core); await core.activate();
  const testUri = vscode.Uri.joinPath(folder.uri, 'TaskTest.php');
  const marker = vscode.Uri.joinPath(folder.uri, 'task-result.txt');
  const source = (passes: boolean): string => `<?php
final class TaskTest extends PHPUnit\\Framework\\TestCase {
    public function testTask(): void {
        file_put_contents(__DIR__ . '/task-result.txt', getcwd());
        self::assertSame(1234, ${passes ? '1234' : '0'});
    }
}
`;
  const codes: number[] = [];
  for (const passes of [true, false]) {
    await vscode.workspace.fs.writeFile(testUri, Buffer.from(source(passes)));
    const name = `SoPHP Windows PHPUnit ${passes ? 'pass' : 'fail'}`;
    const task = new vscode.Task({ type: 'process' }, folder, name, 'SoPHP acceptance',
      new vscode.ProcessExecution(join(portable, 'php with spaces', 'php.exe'), ['-c', join(portable, 'isolated ini', 'php.ini'),
        join(portable, 'tools', 'vendor', 'phpunit', 'phpunit', 'phpunit'), '--no-coverage', '--colors=never', testUri.fsPath],
      { cwd: folder.uri.fsPath }), []);
    task.presentationOptions = { reveal: vscode.TaskRevealKind.Always, panel: vscode.TaskPanelKind.New };
    let listener: vscode.Disposable | undefined;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const completion = new Promise<number | undefined>((done, reject) => {
      listener = vscode.tasks.onDidEndTaskProcess(event => { if (event.execution.task.name === name) done(event.exitCode); });
      timer = setTimeout(() => reject(new Error('Native Windows PHPUnit task timed out')), 30_000);
    });
    let execution: vscode.TaskExecution | undefined;
    try {
      execution = await vscode.tasks.executeTask(task);
      const code = await completion;
      execution = undefined;
      assert.equal(code, passes ? 0 : 1, 'Task exit code must distinguish success from an assertion failure');
      codes.push(code!);
      const workingDirectory = Buffer.from(await vscode.workspace.fs.readFile(marker)).toString('utf8');
      assert.equal(workingDirectory.toLowerCase(), folder.uri.fsPath.toLowerCase());
    } finally { if (timer) clearTimeout(timer); listener?.dispose(); execution?.terminate(); }
  }
  console.log(`Windows test task proof: ${JSON.stringify({ platform: process.platform, node: process.version,
    exitCodes: codes, pathWithSpaces: folder.uri.fsPath.includes(' '), workingDirectoryMatches: true,
    scope: 'Native VS Code ProcessExecution tasks with real PHPUnit; no custom Core runner or full Pack claim' })}`);
}
