import assert from 'node:assert/strict';
import * as vscode from 'vscode';

export async function run(): Promise<void> {
  const folder = vscode.workspace.workspaceFolders?.[0]; assert.ok(folder);
  const php = process.env.SOPHP_DEBUG_PHP; assert.ok(php);
  const ini = process.env.SOPHP_DEBUG_INI;
  const zendExtension = process.env.SOPHP_DEBUG_EXTENSION;
  const port = Number(process.env.SOPHP_DEBUG_PORT); assert.ok(port > 0 && port < 65536);
  const core = vscode.extensions.getExtension('sohophp.php-companion'); assert.ok(core); await core.activate();
  const extension = vscode.extensions.getExtension('xdebug.php-debug'); assert.ok(extension); await extension.activate();
  assert.equal(extension.packageJSON.version, '1.40.1');
  const name = 'SoPHP actual Xdebug breakpoint';
  const program = vscode.Uri.joinPath(folder.uri, 'debug with spaces.php');
  const marker = vscode.Uri.joinPath(folder.uri, 'debug-result.json');
  await vscode.workspace.fs.writeFile(program, Buffer.from("<?php\n$value = 40;\n$value += 2;\nfile_put_contents(__DIR__ . '/debug-result.json', json_encode(['value' => $value, 'cwd' => getcwd()]));\n"));
  const breakpoint = new vscode.SourceBreakpoint(new vscode.Location(program, new vscode.Position(2, 0)));
  vscode.debug.addBreakpoints([breakpoint]);
  const stops: { reason: string; threadId: number }[] = [];
  let session: vscode.DebugSession | undefined;
  let ended = false;
  const tracker = vscode.debug.registerDebugAdapterTrackerFactory('php', {
    createDebugAdapterTracker(candidate): vscode.DebugAdapterTracker | undefined {
      if (candidate.name !== name) return undefined;
      session = candidate;
      return { onDidSendMessage(message): void {
        if (message.type === 'event' && message.event === 'stopped') stops.push(message.body);
      } };
    },
  });
  const terminated = vscode.debug.onDidTerminateDebugSession((candidate): void => { if (candidate.name === name) ended = true; });
  const wait = async (predicate: () => boolean, description: string): Promise<void> => {
    const deadline = Date.now() + 20_000;
    while (!predicate()) {
      assert.ok(Date.now() < deadline, `Timed out: ${description}`);
      await new Promise(done => setTimeout(done, 25));
    }
  };
  try {
    assert.ok(await vscode.debug.startDebugging(folder, { type: 'php', request: 'launch', name,
      program: program.fsPath, cwd: folder.uri.fsPath, runtimeExecutable: php, port, stopOnEntry: false,
      runtimeArgs: [...(ini ? ['-c', ini] : []), ...(zendExtension ? ['-d', `zend_extension=${zendExtension}`] : []),
        '-d', 'xdebug.mode=debug', '-d', 'xdebug.start_with_request=yes', '-d', 'xdebug.client_host=127.0.0.1', '-d', `xdebug.client_port=${port}`] }));
    await wait(() => stops.length > 0, 'breakpoint hit'); assert.ok(session);
    assert.equal(stops[0].reason, 'breakpoint');
    const stack = await session.customRequest('stackTrace', { threadId: stops[0].threadId }) as { stackFrames: { id: number; line: number; source: { path: string } }[] };
    const frame = stack.stackFrames[0]; assert.equal(frame.line, 3);
    assert.equal(process.platform === 'win32' ? frame.source.path.toLowerCase() : frame.source.path,
      process.platform === 'win32' ? program.fsPath.toLowerCase() : program.fsPath);
    const scopes = await session.customRequest('scopes', { frameId: frame.id }) as { scopes: { variablesReference: number }[] };
    const variables = await session.customRequest('variables', { variablesReference: scopes.scopes[0].variablesReference }) as { variables: { name: string; value: string }[] };
    assert.ok(variables.variables.some(variable => variable.name === '$value' && variable.value === '40'));
    const before = await session.customRequest('evaluate', { expression: '$value', frameId: frame.id, context: 'watch' }) as { result: string };
    assert.equal(before.result, '40');
    await session.customRequest('next', { threadId: stops[0].threadId });
    await wait(() => stops.length > 1, 'step over'); assert.equal(stops[1].reason, 'step');
    const nextStack = await session.customRequest('stackTrace', { threadId: stops[1].threadId }) as typeof stack;
    assert.equal(nextStack.stackFrames[0].line, 4);
    const after = await session.customRequest('evaluate', { expression: '$value', frameId: nextStack.stackFrames[0].id, context: 'watch' }) as { result: string };
    assert.equal(after.result, '42');
    await session.customRequest('continue', { threadId: stops[1].threadId });
    await wait(() => ended && !vscode.debug.activeDebugSession, 'session exit');
    const result = JSON.parse(Buffer.from(await vscode.workspace.fs.readFile(marker)).toString('utf8')) as { value: number; cwd: string };
    assert.equal(result.value, 42); assert.equal(result.cwd, folder.uri.fsPath);
    console.log(`Xdebug breakpoint proof: ${JSON.stringify({ platform: process.platform, debuggerVersion: extension.packageJSON.version,
      breakpointLine: frame.line, stepLine: nextStack.stackFrames[0].line, before: before.result, after: after.result,
      scopeVariable: true, programResult: result.value, workingDirectoryMatches: true, sessionTerminated: ended,
      scope: 'Actual Xdebug breakpoint, step over, scopes and watch evaluation in an isolated editor host' })}`);
  } finally {
    if (session && vscode.debug.activeDebugSession?.id === session.id) await vscode.debug.stopDebugging(session);
    vscode.debug.removeBreakpoints([breakpoint]); tracker.dispose(); terminated.dispose();
  }
}
