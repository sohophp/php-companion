import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { expect, it } from 'vitest';
import { encodeLspMessage, LspMessageDecoder } from '../../testkit/src/index.js';

const cases = ['7.2', '8.5'].flatMap(phpVersion => [false, true].map(versioned => ({ phpVersion, versioned })));

it.each(cases)('withdraws and restores an unchanged caller diagnostic for conflicting functions at PHP $phpVersion (versioned=$versioned)', async ({ phpVersion, versioned }) => {
  const root = await mkdtemp(join(tmpdir(), 'sophp-ambiguous-arguments-'));
  const file = join(root, 'Caller.php'), dependency = join(root, 'Duplicate.php');
  const uri = pathToFileURL(file).toString(), dependencyUri = pathToFileURL(dependency).toString();
  const disk = '<?php // unchanged caller disk baseline\n', empty = '<?php // no duplicate on disk\n';
  const source = "<?php declare(strict_types=1); namespace AmbiguousArguments; function accept(int $value): void {} accept('bad');";
  const duplicate = '<?php namespace AmbiguousArguments; function ACCEPT(string $value, int $second): void {}';
  await writeFile(join(root, 'composer.json'), JSON.stringify({ autoload: { files: ['Duplicate.php'] } }));
  await writeFile(file, disk); await writeFile(dependency, empty);
  const server = spawn(process.execPath, [process.env.PHP_COMPANION_TEST_CANONICAL_SERVER ?? resolve('dist/server.js'), '--stdio',
    '--parser-core-wasm', resolve('../../dist/web-tree-sitter.wasm'), '--php-wasm', resolve('../../dist/tree-sitter-php.wasm')], { stdio: 'pipe' });
  const closed = once(server, 'close'), decoder = new LspMessageDecoder(), messages: any[] = [];
  const waiters: Array<{ after: number; matches: (message: any) => boolean; done: (message: any) => void; timer: ReturnType<typeof setTimeout> }> = [];
  let id = 0, stderr = '';
  const send = (message: object): void => { server.stdin.write(encodeLspMessage({ jsonrpc: '2.0', ...message })); };
  server.stderr.on('data', chunk => { stderr += chunk.toString(); });
  server.stdout.on('data', chunk => {
    for (const message of decoder.push(chunk) as any[]) {
      messages.push(message);
      if (message.method && message.id !== undefined) send({ id: message.id, result: null });
      for (const waiter of [...waiters]) if (messages.length - 1 >= waiter.after && waiter.matches(message)) {
        clearTimeout(waiter.timer); waiters.splice(waiters.indexOf(waiter), 1); waiter.done(message);
      }
    }
  });
  const waitFor = (matches: (message: any) => boolean, after = 0): Promise<any> => {
    const existing = messages.slice(after).find(matches); if (existing) return Promise.resolve(existing);
    return new Promise((done, reject) => {
      const waiter = { after, matches, done, timer: setTimeout(() => {
        waiters.splice(waiters.indexOf(waiter), 1); reject(Error(`Ambiguous function publication timed out: ${stderr}`));
      }, 15_000) }; waiters.push(waiter);
    });
  };
  const request = async (method: string, params: object | null): Promise<any> => {
    const requestId = ++id, after = messages.length; send({ id: requestId, method, params });
    const response = await waitFor(message => message.id === requestId && !message.method, after);
    expect(response.error).toBeUndefined(); return response.result;
  };
  const channel = versioned ? 'phpCompanion/versionedDiagnostics' : 'textDocument/publishDiagnostics';
  const diagnostic = (message: any): boolean => message.method === channel && message.params.uri === uri && message.params.version === 1;
  const mismatch = (message: any): any[] => message.params.diagnostics.filter((item: any) => item.code === 'php.argument.type-mismatch');
  const idle = async (): Promise<void> => {
    const deadline = Date.now() + 5_000;
    while (true) {
      const state = await request('phpCompanion/testQueryState', { method: 'diagnostics', uri });
      expect(state.version).toBe(1); if (state.pending === 0) return;
      expect(Date.now()).toBeLessThan(deadline); await new Promise(done => setTimeout(done, 20));
    }
  };
  const refresh = async (action: () => void, expected: number): Promise<void> => {
    const after = messages.length; action();
    await waitFor(message => diagnostic(message) || message.method === 'window/logMessage'
      && message.params.message.startsWith(`[test-diagnostics-unchanged] uri=${uri} version=1`), after);
    await idle();
    expect(mismatch(messages.filter(diagnostic).at(-1))).toHaveLength(expected);
  };
  try {
    await request('initialize', { processId: null, rootUri: pathToFileURL(root).toString(), capabilities: {},
      initializationOptions: { phpVersion, indexingMode: 'onDemand', testMode: true, versionedDiagnostics: versioned, cacheDirectory: join(root, '.cache') } });
    send({ method: 'initialized', params: {} });
    send({ method: 'textDocument/didOpen', params: { textDocument: { uri, languageId: 'php', version: 1, text: source } } });
    await waitFor(message => diagnostic(message) && mismatch(message).length === 1); await idle();
    await refresh(() => send({ method: 'textDocument/didOpen', params: {
      textDocument: { uri: dependencyUri, languageId: 'php', version: 1, text: duplicate },
    } }), 0);
    await refresh(() => send({ method: 'textDocument/didChange', params: {
      textDocument: { uri: dependencyUri, version: 2 }, contentChanges: [{ text: duplicate.replace('ACCEPT', 'unrelated') }],
    } }), 1);
    await refresh(() => send({ method: 'textDocument/didChange', params: {
      textDocument: { uri: dependencyUri, version: 3 }, contentChanges: [{ text: duplicate }],
    } }), 0);
    await refresh(() => send({ method: 'textDocument/didClose', params: { textDocument: { uri: dependencyUri } } }), 1);
    expect(await readFile(file, 'utf8')).toBe(disk); expect(await readFile(dependency, 'utf8')).toBe(empty);
    expect(stderr).toBe('');
  } finally {
    if (server.exitCode === null && server.signalCode === null) {
      await request('shutdown', null); send({ method: 'exit', params: null });
    }
    await closed;
    for (const waiter of waiters.splice(0)) clearTimeout(waiter.timer);
    await rm(root, { recursive: true, force: true });
  }
});
