import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { expect, it } from 'vitest';
import { encodeLspMessage, LspMessageDecoder } from '../../testkit/src/index.js';

const cases = ['7.2', '8.5'].flatMap(phpVersion => [false, true].flatMap(versioned =>
  ['bool', 'int'].map(latestType => ({ phpVersion, versioned, latestType }))));

it.each(cases)('keeps the latest $latestType diagnostic at PHP $phpVersion (versioned=$versioned) after an obsolete same-version refresh resumes', async ({ phpVersion, versioned, latestType }) => {
  const root = await mkdtemp(join(tmpdir(), 'sophp-diagnostic-publication-'));
  await mkdir(join(root, 'src')); await mkdir(join(root, 'origin'));
  await writeFile(join(root, 'composer.json'), JSON.stringify({ autoload: { 'psr-4': { 'Consumer\\': 'src/', 'Origin\\': 'origin/' } } }));
  const file = join(root, 'src/Editing.php'), dependency = join(root, 'origin/Init.php');
  const uri = pathToFileURL(file).toString(), dependencyUri = pathToFileURL(dependency).toString();
  const disk = '<?php namespace Consumer; // unchanged disk baseline\n';
  const original = '<?php namespace Origin; trait Init {public function __construct(int $value){}}';
  const source = "<?php declare(strict_types=1); namespace Consumer; class C {use \\Origin\\Init;} new C('wrong');";
  await writeFile(file, disk); await writeFile(dependency, original);
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
        waiters.splice(waiters.indexOf(waiter), 1); reject(Error(`Diagnostic publication timed out: ${stderr}`));
      }, 15_000) }; waiters.push(waiter);
    });
  };
  const request = async (method: string, params: object | null): Promise<any> => {
    const requestId = ++id, after = messages.length; send({ id: requestId, method, params });
    const response = await waitFor(message => message.id === requestId && !message.method, after);
    expect(response.error).toBeUndefined(); return response.result;
  };
  const channel = versioned ? 'phpCompanion/versionedDiagnostics' : 'textDocument/publishDiagnostics';
  const diagnostic = (message: any, target = uri, version = 1): boolean => message.method === channel
    && message.params.uri === target && message.params.version === version;
  const mismatch = (message: any): any[] => message.params.diagnostics.filter((item: any) => item.code === 'php.argument.type-mismatch');
  const log = (message: any, prefix: string): boolean => message.method === 'window/logMessage' && message.params.message.startsWith(prefix);
  const editDependency = (version: number, target: string): void => send({ method: 'textDocument/didChange', params: {
    textDocument: { uri: dependencyUri, version }, contentChanges: [{ text: original.replace('int $value', target + ' $value') }],
  } });
  try {
    await request('initialize', { processId: null, rootUri: pathToFileURL(root).toString(), capabilities: {},
      initializationOptions: { phpVersion, indexingMode: 'onDemand', testMode: true, versionedDiagnostics: versioned, cacheDirectory: join(root, '.cache') } });
    send({ method: 'initialized', params: {} });
    send({ method: 'textDocument/didOpen', params: { textDocument: { uri: dependencyUri, languageId: 'php', version: 1, text: original } } });
    await waitFor(message => diagnostic(message, dependencyUri));
    send({ method: 'textDocument/didOpen', params: { textDocument: { uri, languageId: 'php', version: 1, text: source } } });
    const initial = await waitFor(message => diagnostic(message) && mismatch(message).length === 1);
    expect(mismatch(initial)[0].message).toContain('int');
    // Wait for actual completion, including a superseded initial validation.
    // Publication count is not a completion signal when stale results are discarded.
    const initialDeadline = Date.now() + 5_000;
    while (true) {
      const state = await request('phpCompanion/testQueryState', { method: 'diagnostics', uri });
      expect(state.version).toBe(1);
      if (state.pending === 0) break;
      expect(Date.now()).toBeLessThan(initialDeadline);
      await new Promise(done => setTimeout(done, 20));
    }
    expect(await request('phpCompanion/testPauseNextQuery', { method: 'constructorDiagnostics' })).toBe(true);
    editDependency(2, 'float');
    await waitFor(message => diagnostic(message, dependencyUri, 2));
    await waitFor(message => log(message, '[test-query-paused] method=constructorDiagnostics'));
    const changedAt = messages.length;
    editDependency(3, latestType);
    await waitFor(message => diagnostic(message, dependencyUri, 3));
    let latest = initial;
    if (latestType === 'bool') latest = await waitFor(message => diagnostic(message)
      && mismatch(message).some(item => item.message.includes('bool')), changedAt);
    else {
      // The current int result is byte-identical to the initial publication.
      // Wait for its actual suppression, without adding a timing-based sleep.
      await waitFor(message => log(message, `[test-diagnostics-unchanged] uri=${uri} version=1`), changedAt);
      expect(messages.slice(changedAt).filter(message => diagnostic(message))).toEqual([]);
    }
    expect(mismatch(latest)).toHaveLength(1);
    const releasedAt = messages.length;
    expect(await request('phpCompanion/testReleaseQuery', { method: 'constructorDiagnostics' })).toBe(true);
    const finished = await waitFor(message => diagnostic(message)
      || log(message, `[test-diagnostics-superseded] uri=${uri} version=1`), releasedAt);
    // On the original implementation, this is the obsolete empty publication.
    // The new terminal signal proves the old task finished without publishing.
    expect(finished.method, JSON.stringify(finished)).toBe('window/logMessage');
    expect(finished.params.message).toContain('[test-diagnostics-superseded]');
    const current = messages.filter(message => diagnostic(message)).at(-1);
    expect(current.params.diagnostics).toEqual(latest.params.diagnostics);
    expect(messages.slice(releasedAt).filter(message => diagnostic(message))).toEqual([]);
    expect(await readFile(file, 'utf8')).toBe(disk); expect(await readFile(dependency, 'utf8')).toBe(original);
    expect(stderr).toBe('');
  } finally {
    if (server.exitCode === null && server.signalCode === null) {
      await request('phpCompanion/testReleaseQuery', { method: 'constructorDiagnostics' });
      await request('shutdown', null); send({ method: 'exit', params: null });
    }
    await closed;
    for (const waiter of waiters.splice(0)) clearTimeout(waiter.timer);
    await rm(root, { recursive: true, force: true });
  }
});
