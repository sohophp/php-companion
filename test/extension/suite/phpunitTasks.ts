import * as assert from 'node:assert';
import { execFileSync } from 'node:child_process';
import * as vscode from 'vscode';

export async function verifyPhpunitTasks(
  workspace: vscode.WorkspaceFolder, php: string, phpunit: string,
): Promise<void> {
  const expectedRuntime = JSON.parse(execFileSync(php, [
    '-d', 'auto_prepend_file=', '-d', 'auto_append_file=', '-r',
    'echo json_encode(["binary" => PHP_BINARY, "version" => PHP_VERSION]);',
  ], { encoding: 'utf8', timeout: 3_000 })) as { binary: string; version: string };
  assert.ok(expectedRuntime.binary && expectedRuntime.version, 'The configured PHP command did not identify its runtime');
  const directory = vscode.Uri.joinPath(workspace.uri, 'tests', 'tasks with spaces');
  const testUri = vscode.Uri.joinPath(directory, 'ProfileTaskTest.php');
  const markerUri = vscode.Uri.joinPath(workspace.uri, 'phpunit-task-runtime.jsonl');
  await assert.rejects(async () => vscode.workspace.fs.stat(markerUri),
    (error: unknown) => error instanceof vscode.FileSystemError && error.code === 'FileNotFound');
  await vscode.workspace.fs.createDirectory(directory);
  await vscode.workspace.fs.writeFile(testUri, Buffer.from(`<?php
final class ProfileTaskTest extends PHPUnit\\Framework\\TestCase {
    public function testTaskRuntime(): void {
        $value = (int) getenv('SOPHP_PROFILE_TASK_VALUE');
        file_put_contents(dirname(__DIR__, 2) . '/phpunit-task-runtime.jsonl', json_encode([
            'value' => $value, 'cwd' => getcwd(), 'version' => PHP_VERSION,
            'binary' => PHP_BINARY, 'sapi' => PHP_SAPI, 'pid' => getmypid(),
        ]) . "\\n", FILE_APPEND);
        self::assertSame(42, $value);
    }
}
`));
  const results: Array<{ scenario: string; exitCode: number; processId: number }> = [];
  for (const [index, scenario] of ['pass', 'assertion-failure', 'recovery'].entries()) {
    const name = `SoPHP Profile PHPUnit ${scenario}`;
    const task = new vscode.Task({ type: 'process' }, workspace, name, 'SoPHP acceptance',
      new vscode.ProcessExecution(php, [phpunit, '--configuration', 'phpunit.xml', '--no-coverage', '--colors=never', testUri.fsPath],
        { cwd: workspace.uri.fsPath, env: { SOPHP_PROFILE_TASK_VALUE: index === 1 ? '41' : '42' } }), []);
    task.group = vscode.TaskGroup.Test;
    task.presentationOptions = { reveal: vscode.TaskRevealKind.Always, panel: vscode.TaskPanelKind.New };
    let processId: number | undefined; let exitCode: number | undefined;
    let processEnded = false; let taskEnded = false;
    let execution: vscode.TaskExecution | undefined;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const subscriptions: vscode.Disposable[] = [];
    const completion = new Promise<void>((resolve, reject) => {
      const finish = (): void => { if (processEnded && taskEnded) resolve(); };
      subscriptions.push(vscode.tasks.onDidStartTaskProcess(event => {
        if (event.execution.task.name === name) processId = event.processId;
      }), vscode.tasks.onDidEndTaskProcess(event => {
        if (event.execution.task.name === name) { exitCode = event.exitCode; processEnded = true; finish(); }
      }), vscode.tasks.onDidEndTask(event => {
        if (event.execution.task.name === name) { taskEnded = true; finish(); }
      }));
      timer = setTimeout(() => reject(new Error(`PHPUnit editor task timed out: ${scenario}`)), 30_000);
    });
    try {
      execution = await vscode.tasks.executeTask(task);
      await completion;
      assert.ok(processId && processId > 0, 'The editor task did not start a real process');
      assert.strictEqual(exitCode, index === 1 ? 1 : 0, 'PHPUnit task must distinguish a passing test from an assertion failure');
      results.push({ scenario, exitCode: exitCode!, processId });
    } finally {
      if (timer) clearTimeout(timer);
      for (const subscription of subscriptions) subscription.dispose();
      if (execution && !taskEnded) execution.terminate();
    }
  }
  const witnesses = Buffer.from(await vscode.workspace.fs.readFile(markerUri)).toString('utf8').trim().split('\n')
    .map(line => JSON.parse(line) as { value: number; cwd: string; version: string; binary: string; sapi: string; pid: number });
  assert.strictEqual(witnesses.length, 3);
  assert.deepStrictEqual(witnesses.map(row => row.value), [42, 41, 42]);
  for (const witness of witnesses) {
    assert.strictEqual(witness.cwd, workspace.uri.fsPath); assert.strictEqual(witness.sapi, 'cli');
    assert.strictEqual(witness.binary, expectedRuntime.binary);
    assert.strictEqual(witness.version, expectedRuntime.version); assert.match(witness.version, /^\d+\.\d+\.\d+/u);
    assert.ok(witness.pid > 0);
  }
  assert.ok(!vscode.tasks.taskExecutions.some(item => results.some(row => item.task.name === `SoPHP Profile PHPUnit ${row.scenario}`)),
    'PHPUnit left an active editor task');
  console.log('Open Source Profile PHPUnit editor tasks proof: ' + JSON.stringify({
    results, witnesses, argumentPathWithSpaces: testUri.fsPath.includes(' '),
    realProcessExecution: true, expectedAssertionFailureExitCode: 1, recoveryPassed: true,
    workingDirectoryAndRuntimeMatched: true, taskAndProcessEndObserved: true, noActiveOwnedTasks: true,
  }));
}
