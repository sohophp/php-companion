import assert from 'node:assert/strict';
import { join } from 'node:path';
import * as vscode from 'vscode';

export async function run(): Promise<void> {
  assert.equal(process.platform, 'win32');
  const folder = vscode.workspace.workspaceFolders?.[0]; assert.ok(folder);
  const portable = process.env.SOPHP_WINDOWS_PORTABLE_ROOT; assert.ok(portable);
  const port = Number(process.env.SOPHP_WINDOWS_DEBUG_PORT); assert.ok(port > 0 && port < 65536);
  const core = vscode.extensions.getExtension('sohophp.php-companion'); assert.ok(core); await core.activate();
  const debuggerExtension = vscode.extensions.getExtension('xdebug.php-debug'); assert.ok(debuggerExtension); await debuggerExtension.activate();
  assert.equal(debuggerExtension.packageJSON.version, '1.40.1');
  const program = vscode.Uri.joinPath(folder.uri, 'debug-program.php');
  const result = vscode.Uri.joinPath(folder.uri, 'debug-result.json');
  await vscode.workspace.fs.writeFile(program, Buffer.from("<?php\nfile_put_contents(__DIR__ . '/debug-result.json', json_encode(['cwd' => getcwd(), 'version' => PHP_VERSION, 'sapi' => PHP_SAPI]));\n"));
  const name = 'SoPHP Windows actual PHP launch';
  let sessionId: string | undefined;
  const started = vscode.debug.onDidStartDebugSession(session => { if (session.type === 'php' && session.name === name) sessionId = session.id; });
  let endedListener: vscode.Disposable | undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const terminated = new Promise<void>((done, reject) => {
    endedListener = vscode.debug.onDidTerminateDebugSession(session => { if (session.type === 'php' && session.name === name) done(); });
    timer = setTimeout(() => reject(new Error('Native Windows PHP launch did not terminate')), 20_000);
  });
  try {
    assert.ok(await vscode.debug.startDebugging(folder, { type: 'php', request: 'launch', name, program: program.fsPath,
      cwd: folder.uri.fsPath, runtimeExecutable: join(portable, 'php with spaces', 'php.exe'),
      runtimeArgs: ['-c', join(portable, 'isolated ini', 'php.ini')], port, stopOnEntry: false }));
    await terminated; assert.ok(sessionId, 'No PHP debug session start event');
    const actual = JSON.parse(Buffer.from(await vscode.workspace.fs.readFile(result)).toString('utf8')) as { cwd: string; version: string; sapi: string };
    assert.equal(actual.cwd.toLowerCase(), folder.uri.fsPath.toLowerCase());
    assert.match(actual.version, /^8\.5\./u); assert.equal(actual.sapi, 'cli');
    assert.equal(vscode.debug.activeDebugSession, undefined);
    console.log(`Windows debug launch proof: ${JSON.stringify({ platform: process.platform, node: process.version,
      debuggerVersion: debuggerExtension.packageJSON.version, version: actual.version, sessionStarted: true,
      programExecuted: true, workingDirectoryMatches: true, sessionTerminated: true,
      scope: 'Actual launch and exit through PHP Debug; no Xdebug breakpoint or full Pack claim' })}`);
  } finally {
    if (timer) clearTimeout(timer); started.dispose(); endedListener?.dispose();
    if (vscode.debug.activeDebugSession?.id === sessionId) await vscode.debug.stopDebugging(vscode.debug.activeDebugSession);
  }
}
