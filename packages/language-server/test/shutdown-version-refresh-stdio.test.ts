import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { mkdtemp, writeFile, mkdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { expect, it } from 'vitest';
import { isSemanticProviderDescriptor } from '@php-companion/semantic-provider';
import { isRouteProviderDescriptor } from '@php-companion/route-provider';

function encode(message: object): string {
  const body = JSON.stringify(message);
  return `Content-Length: ${Buffer.byteLength(body)}\r\n\r\n${body}`;
}

function messagesFrom(process: ChildProcessWithoutNullStreams): {
  messages: object[];
  waitFor: (predicate: (message: any) => boolean, timeoutMs?: number) => Promise<any>;
} {
  const messages: object[] = [];
  const waiters: Array<{ predicate: (message: any) => boolean; resolve: (message: any) => void }> = [];
  let buffer = Buffer.alloc(0);
  process.stdout.on('data', (chunk: Buffer) => {
    buffer = Buffer.concat([buffer, chunk]);
    while (true) {
      const headerEnd = buffer.indexOf('\r\n\r\n');
      if (headerEnd < 0) return;
      const match = /Content-Length: (\d+)/i.exec(buffer.subarray(0, headerEnd).toString('ascii'));
      if (!match) throw new Error('Language server emitted an invalid LSP header.');
      const length = Number(match[1]);
      const bodyStart = headerEnd + 4;
      if (buffer.length < bodyStart + length) return;
      const message = JSON.parse(buffer.subarray(bodyStart, bodyStart + length).toString('utf8'));
      buffer = buffer.subarray(bodyStart + length);
      messages.push(message);
      if (message.method && message.id !== undefined) {
        process.stdin.write(encode({ jsonrpc: '2.0', id: message.id, ...(message.method === 'client/registerCapability'
          ? { result: null } : { error: { code: -32601, message: 'Unsupported client request.' } }) }));
        continue;
      }
      for (const waiter of [...waiters]) {
        if (waiter.predicate(message)) {
          waiters.splice(waiters.indexOf(waiter), 1);
          waiter.resolve(message);
        }
      }
    }
  });
  return {
    messages,
    waitFor: (predicate, timeoutMs = 15_000): Promise<any> => {
      const existing = messages.find(predicate);
      if (existing) return Promise.resolve(existing);
      return new Promise((resolvePromise, reject) => {
        const timer = setTimeout(() => reject(new Error(`Timed out waiting for language server response; logs: ${JSON.stringify(messages.filter((message) => message.method === 'window/logMessage').slice(-12))}; recent messages: ${JSON.stringify(messages.slice(-5))}`)), timeoutMs);
        waiters.push({ predicate, resolve: (message) => { clearTimeout(timer); resolvePromise(message); } });
      });
    },
  };
}

it.each([
  ['onDemand', false], ['progressive', false], ['onDemand', true], ['progressive', true],
] as const)('stops a pending multi-root version refresh in %s mode with waiting completion=%s',
  (indexingMode, waitingCompletion) => assertMultiRootShutdown(indexingMode, waitingCompletion), 60_000);

it.each(['onDemand', 'progressive'] as const)('stops fragmented version/completion/shutdown transport in %s mode',
  indexingMode => assertMultiRootShutdown(indexingMode, true, 5), 60_000);

async function assertMultiRootShutdown(indexingMode: 'onDemand' | 'progressive', waitingCompletion: boolean, gapMs = 0): Promise<void> {
  const base = await mkdtemp(join(tmpdir(), 'sophp-shutdown-refresh-'));
  let server: ChildProcessWithoutNullStreams | undefined;
  try {
    const roots = Array.from({ length: 5 }, (_, index) => join(base, `root${index}`));
    await Promise.all(roots.map(async root => {
      await mkdir(root);
      await writeFile(join(root, 'composer.json'), JSON.stringify({ require: { php: '>=7.2' } }));
    }));
    server = spawn(process.execPath, [resolve('../../dist/language-server.js'), '--stdio',
      '--parser-core-wasm', resolve('../../dist/web-tree-sitter.wasm'), '--php-wasm', resolve('../../dist/tree-sitter-php.wasm')], { stdio: 'pipe' });
    const output = messagesFrom(server);
    server.stdin.write(encode({ jsonrpc: '2.0', id: 1, method: 'initialize', params: {
      processId: null, capabilities: {}, workspaceFolders: roots.map(root => ({ uri: pathToFileURL(root).toString(), name: root })),
      initializationOptions: { phpVersion: '7.2', indexingMode, testMode: true,
        phpVersions: roots.map(root => ({ uri: pathToFileURL(root).toString(), version: '7.2' })) },
    } }));
    expect((await output.waitFor(message => message.id === 1)).error).toBeUndefined();
    server.stdin.write(encode({ jsonrpc: '2.0', method: 'initialized', params: {} }));
    const uri = pathToFileURL(join(roots[0]!, 'Consumer.php')).toString();
    if (waitingCompletion) {
      server.stdin.write(encode({ jsonrpc: '2.0', method: 'textDocument/didOpen', params: {
        textDocument: { uri, languageId: 'php', version: 1, text: '<?php str_con;' },
      } }) + encode({ jsonrpc: '2.0', id: 10, method: 'phpCompanion/testQueryState', params: {
        method: 'textDocument/completion', uri,
      } }));
      expect((await output.waitFor(message => message.id === 10)).result.version).toBe(1);
    }
    const started = performance.now();
    const changed = encode({ jsonrpc: '2.0', method: 'phpCompanion/phpVersions', params: {
      fallback: '8.5', versions: roots.map(root => ({ uri: pathToFileURL(root).toString(), version: '8.5' })),
    } }) + (waitingCompletion ? encode({ jsonrpc: '2.0', id: 3, method: 'textDocument/completion', params: {
      textDocument: { uri }, position: { line: 0, character: 13 },
    } }) : '');
    const stopped = encode({ jsonrpc: '2.0', id: 2, method: 'shutdown', params: {} });
    if (gapMs) {
      server.stdin.write(changed);
      await new Promise<void>(done => setTimeout(done, gapMs));
      server.stdin.write(stopped);
    } else server.stdin.write(changed + stopped);
    expect((await output.waitFor(message => message.id === 2, 30_000)).error).toBeUndefined();
    const elapsedMs = performance.now() - started;
    console.log('Multi-root shutdown response: ' + JSON.stringify({ indexingMode, waitingCompletion, gapMs, roots: roots.length, elapsedMs }));
    const timingDirectory = process.env.PHP_COMPANION_TEST_SHUTDOWN_TIMING_DIR;
    if (timingDirectory) {
      await mkdir(timingDirectory, { recursive: true });
      await writeFile(join(timingDirectory, `${indexingMode}-${waitingCompletion}${gapMs ? `-gap${gapMs}` : ''}.json`), JSON.stringify({ indexingMode, waitingCompletion, gapMs, roots: roots.length, elapsedMs }));
    }
    expect(elapsedMs).toBeLessThan(2_000);
    if (waitingCompletion) expect((await output.waitFor(message => message.id === 3)).error.code).toBe(-32800);
    server.stdin.write(encode({ jsonrpc: '2.0', method: 'exit', params: {} }));
  } finally { server?.kill(); await rm(base, { recursive: true, force: true }); }
}

it.each(['onDemand', 'progressive'] as const)('exits cleanly with pending opened-document diagnostics in %s mode', async indexingMode => {
  const base = await mkdtemp(join(tmpdir(), 'sophp-shutdown-diagnostics-'));
  let server: ChildProcessWithoutNullStreams | undefined;
  try {
    await writeFile(join(base, 'composer.json'), JSON.stringify({ autoload: { 'psr-4': { 'App\\': './' } } }));
    const text = '<?php namespace App; class Item{function onlyItem(){}}$item=new Item();$item->only;';
    const uri = pathToFileURL(join(base, 'Item.php')).toString();
    await writeFile(join(base, 'Item.php'), text);
    server = spawn(process.execPath, [resolve('../../dist/language-server.js'), '--stdio',
      '--parser-core-wasm', resolve('../../dist/web-tree-sitter.wasm'), '--php-wasm', resolve('../../dist/tree-sitter-php.wasm')], { stdio: 'pipe' });
    let stderr = '';
    server.stderr.on('data', (chunk: Buffer) => { stderr += chunk.toString(); });
    const exited = new Promise<number | null>(done => server!.once('exit', code => done(code)));
    const output = messagesFrom(server);
    server.stdin.write(encode({ jsonrpc: '2.0', id: 1, method: 'initialize', params: {
      processId: null, capabilities: {}, rootUri: pathToFileURL(base).toString(),
      initializationOptions: { phpVersion: '8.5', indexingMode },
    } }));
    expect((await output.waitFor(message => message.id === 1)).error).toBeUndefined();
    server.stdin.write(encode({ jsonrpc: '2.0', method: 'initialized', params: {} })
      + encode({ jsonrpc: '2.0', method: 'textDocument/didOpen', params: {
        textDocument: { uri, languageId: 'php', version: 1, text },
      } }) + encode({ jsonrpc: '2.0', id: 2, method: 'textDocument/completion', params: {
        textDocument: { uri }, position: { line: 0, character: text.lastIndexOf('only;') + 4 },
      } }));
    const completion = await output.waitFor(message => message.id === 2);
    expect(completion.error).toBeUndefined();
    expect((Array.isArray(completion.result) ? completion.result : completion.result.items)
      .map((item: { label: string }) => item.label)).toEqual(['onlyItem']);
    // Do not wait for the diagnostic or document-open continuation before shutdown.
    server.stdin.write(encode({ jsonrpc: '2.0', id: 3, method: 'shutdown', params: {} }));
    expect((await output.waitFor(message => message.id === 3)).error).toBeUndefined();
    server.stdin.write(encode({ jsonrpc: '2.0', method: 'exit', params: {} }));
    expect(await exited, stderr).toBe(0);
    expect(stderr).not.toContain('memory access out of bounds');
  } finally { server?.kill(); await rm(base, { recursive: true, force: true }); }
}, 30_000);

// A language-client restart replays retained documents and can stop again before
// their semantic setup finishes. TextDocuments does not await event callbacks.
it.each(['onDemand', 'progressive'] as const)('cancels replayed open/change publications cleanly in %s mode', async indexingMode => {
  for (const phpVersion of ['7.2', '8.5']) for (const event of ['open', 'change']) {
    const base = await mkdtemp(join(tmpdir(), 'sophp-replayed-publication-'));
    let server: ChildProcessWithoutNullStreams | undefined;
    try {
      const text = '<?php namespace App; class Item { public function ping(): int { return 1; } }';
      const uri = pathToFileURL(join(base, 'Item.php')).toString();
      await writeFile(join(base, 'composer.json'), JSON.stringify({ autoload: { 'psr-4': { 'App\\': './' } } }));
      await writeFile(join(base, 'Item.php'), text);
      server = spawn(process.execPath, [resolve('../../dist/language-server.js'), '--stdio',
        '--parser-core-wasm', resolve('../../dist/web-tree-sitter.wasm'), '--php-wasm', resolve('../../dist/tree-sitter-php.wasm')], { stdio: 'pipe' });
      let stderr = '';
      server.stderr.on('data', (chunk: Buffer) => { stderr += chunk.toString(); });
      const exited = new Promise<number | null>(done => server!.once('exit', code => done(code)));
      const output = messagesFrom(server);
      server.stdin.write(encode({ jsonrpc: '2.0', id: 1, method: 'initialize', params: {
        processId: null, capabilities: {}, rootUri: pathToFileURL(base).toString(),
        initializationOptions: { phpVersion, indexingMode, testMode: true },
      } }));
      expect((await output.waitFor(message => message.id === 1)).error).toBeUndefined();
      server.stdin.write(encode({ jsonrpc: '2.0', method: 'initialized', params: {} }));
      const opened = encode({ jsonrpc: '2.0', method: 'textDocument/didOpen', params: {
        textDocument: { uri, languageId: 'php', version: 1, text },
      } });
      if (event === 'change') {
        server.stdin.write(opened + encode({ jsonrpc: '2.0', id: 2, method: 'textDocument/documentSymbol', params: { textDocument: { uri } } }));
        expect((await output.waitFor(message => message.id === 2)).error).toBeUndefined();
      }
      server.stdin.write(encode({ jsonrpc: '2.0', id: 3, method: 'phpCompanion/testPauseNextQuery', params: { method: 'openSourcePublication' } }));
      expect((await output.waitFor(message => message.id === 3)).result).toBe(true);
      server.stdin.write(event === 'open' ? opened : encode({ jsonrpc: '2.0', method: 'textDocument/didChange', params: {
        textDocument: { uri, version: 2 }, contentChanges: [{ text: text.replace('return 1;', 'return 2;') }],
      } }));
      await output.waitFor(message => message.method === 'window/logMessage'
        && message.params.message === '[test-query-paused] method=openSourcePublication');
      server.stdin.write(encode({ jsonrpc: '2.0', id: 4, method: 'shutdown', params: {} }));
      expect((await output.waitFor(message => message.id === 4)).error).toBeUndefined();
      const cancellationMessage = `[test-open-publication-cancelled] uri=${uri}`;
      const cancellationCount = (): number => output.messages.filter(message =>
        (message as { params?: { message?: string } }).params?.message === cancellationMessage).length;
      const cancellationsBeforeRelease = cancellationCount();
      server.stdin.write(encode({ jsonrpc: '2.0', id: 5, method: 'phpCompanion/testReleaseQuery', params: { method: 'openSourcePublication' } }));
      expect((await output.waitFor(message => message.id === 5)).result).toBe(true);
      await output.waitFor(message => message.method === 'window/logMessage'
        && message.params.message === cancellationMessage && cancellationCount() > cancellationsBeforeRelease, 2_000);
      server.stdin.write(encode({ jsonrpc: '2.0', method: 'exit', params: {} }));
      expect(await exited, `PHP ${phpVersion} ${event}: ${stderr.slice(-500)}`).toBe(0);
      expect(stderr).toBe('');
      console.log('Cancelled open publication: ' + JSON.stringify({ indexingMode, phpVersion, event }));
    } finally { server?.kill(); await rm(base, { recursive: true, force: true }); }
  }
}, 60_000);

// JSON-RPC does not await notification handlers. A reference selection that is
// already waiting when a folder restart stops the server must not reject globally.
it.each(['onDemand', 'progressive'] as const)('cancels waiting reference selections cleanly in %s mode', async indexingMode => {
  for (const phpVersion of ['7.2', '8.5']) {
    const base = await mkdtemp(join(tmpdir(), 'sophp-reference-selection-shutdown-'));
    let server: ChildProcessWithoutNullStreams | undefined;
    try {
      const text = '<?php namespace App; class Item { public function ping(): int { return 1; } }';
      const uri = pathToFileURL(join(base, 'Item.php')).toString();
      await writeFile(join(base, 'composer.json'), JSON.stringify({ autoload: { 'psr-4': { 'App\\': './' } } }));
      await writeFile(join(base, 'Item.php'), text);
      server = spawn(process.execPath, [resolve('../../dist/language-server.js'), '--stdio',
        '--parser-core-wasm', resolve('../../dist/web-tree-sitter.wasm'), '--php-wasm', resolve('../../dist/tree-sitter-php.wasm')], { stdio: 'pipe' });
      let stderr = '';
      server.stderr.on('data', (chunk: Buffer) => { stderr += chunk.toString(); });
      const exited = new Promise<number | null>(done => server!.once('exit', code => done(code)));
      const output = messagesFrom(server);
      server.stdin.write(encode({ jsonrpc: '2.0', id: 1, method: 'initialize', params: {
        processId: null, capabilities: {}, rootUri: pathToFileURL(base).toString(),
        initializationOptions: { phpVersion, indexingMode, testMode: true },
      } }));
      expect((await output.waitFor(message => message.id === 1)).error).toBeUndefined();
      server.stdin.write(encode({ jsonrpc: '2.0', method: 'initialized', params: {} })
        + encode({ jsonrpc: '2.0', method: 'textDocument/didOpen', params: {
          textDocument: { uri, languageId: 'php', version: 1, text },
        } }) + encode({ jsonrpc: '2.0', id: 2, method: 'textDocument/documentSymbol', params: { textDocument: { uri } } }));
      expect((await output.waitFor(message => message.id === 2)).error).toBeUndefined();
      server.stdin.write(encode({ jsonrpc: '2.0', id: 3, method: 'phpCompanion/testPauseNextQuery', params: { method: 'prewarmReferenceAt' } }));
      expect((await output.waitFor(message => message.id === 3)).result).toBe(true);
      const selection = { uri, version: 1, position: { line: 0, character: text.indexOf('ping') } };
      server.stdin.write(encode({ jsonrpc: '2.0', method: 'phpCompanion/prewarmReferenceAt', params: selection }));
      await output.waitFor(message => message.method === 'window/logMessage'
        && message.params.message === '[test-query-paused] method=prewarmReferenceAt');
      server.stdin.write(encode({ jsonrpc: '2.0', id: 4, method: 'shutdown', params: {} }));
      expect((await output.waitFor(message => message.id === 4)).error).toBeUndefined();
      server.stdin.write(encode({ jsonrpc: '2.0', id: 5, method: 'phpCompanion/testReleaseQuery', params: { method: 'prewarmReferenceAt' } }));
      expect((await output.waitFor(message => message.id === 5)).result).toBe(true);
      await output.waitFor(message => message.method === 'window/logMessage'
        && message.params.message === `[test-reference-selection-cancelled] uri=${uri}`, 2_000);
      // The editor can also send a late selection after shutdown completed.
      server.stdin.write(encode({ jsonrpc: '2.0', method: 'phpCompanion/prewarmReferenceAt', params: selection })
        + encode({ jsonrpc: '2.0', id: 6, method: 'phpCompanion/testQueryState', params: { method: 'prewarmReferenceAt', uri } }));
      expect((await output.waitFor(message => message.id === 6)).result.paused).toBe(false);
      server.stdin.write(encode({ jsonrpc: '2.0', method: 'exit', params: {} }));
      expect(await exited, `PHP ${phpVersion}: ${stderr.slice(-500)}`).toBe(0);
      expect(stderr).toBe('');
      expect(output.messages.filter(message => (message as { method?: string; params?: { type?: number } }).method === 'window/logMessage'
        && (message as { params?: { type?: number } }).params?.type === 2)).toEqual([]);
      expect(output.messages.filter(message => (message as { params?: { message?: string } }).params?.message?.includes('[reference-prewarm] semantic count='))).toEqual([]);
      console.log('Cancelled reference selection: ' + JSON.stringify({ indexingMode, phpVersion }));
    } finally { server?.kill(); await rm(base, { recursive: true, force: true }); }
  }
}, 60_000);


type LifecycleFixture = {
  base: string; uri: string; rootUri: string; text: string; provider: string;
  request: (method: string, params?: unknown) => Promise<any>;
  notify: (method: string, params: unknown) => void;
  state: () => Promise<any>; output: ReturnType<typeof messagesFrom>;
  close: () => Promise<void>; cleanup: () => Promise<void>;
};

async function lifecycleFixture(indexingMode: 'onDemand' | 'progressive', phpVersion: string): Promise<LifecycleFixture> {
  const base = await mkdtemp(join(tmpdir(), 'sophp-closed-semantic-lifecycle-'));
  let server: ChildProcessWithoutNullStreams | undefined;
  try {
    const text = '<?php namespace App; class Item { public function ping(): int { return 1; } }';
    const rootUri = pathToFileURL(base).toString();
    const uri = pathToFileURL(join(base, 'Item.php')).toString();
    await writeFile(join(base, 'composer.json'), JSON.stringify({ autoload: { 'psr-4': { 'App\\': './' } } }));
    await writeFile(join(base, 'Item.php'), text);
    const provider = join(base, 'provider.mjs');
    await writeFile(provider, `let input='';for await(const part of process.stdin)input+=part;const request=JSON.parse(input);process.stdout.write(JSON.stringify({protocolVersion:1,id:request.id,result:{schema:1,providerId:'lifecycle.fixture',generation:request.params.generation,complete:true,methods:[],properties:[],literalMethodReturns:[],controllerContexts:[]}}));`);
    server = spawn(process.execPath, [resolve('../../dist/language-server.js'), '--stdio',
      '--parser-core-wasm', resolve('../../dist/web-tree-sitter.wasm'), '--php-wasm', resolve('../../dist/tree-sitter-php.wasm')], { stdio: 'pipe' });
    let stderr = '';
    server.stderr.on('data', (chunk: Buffer) => { stderr += chunk.toString(); });
    const exited = new Promise<number | null>(done => server!.once('exit', code => done(code)));
    const output = messagesFrom(server);
    let nextId = 0;
    const notify = (method: string, params: unknown): void => { server!.stdin.write(encode({ jsonrpc: '2.0', method, params })); };
    const request = async (method: string, params: unknown = {}): Promise<any> => {
      const id = `lifecycle-${++nextId}`;
      server!.stdin.write(encode({ jsonrpc: '2.0', id, method, params }));
      const reply = await output.waitFor(message => message.id === id && message.method === undefined);
      expect(reply.error, `${method}: ${stderr}`).toBeUndefined();
      return reply.result;
    };
    const state = (): Promise<any> => request('phpCompanion/testSemanticLifecycle');
    await request('initialize', { processId: null, capabilities: {}, rootUri,
      initializationOptions: { phpVersion, indexingMode, testMode: true } });
    notify('initialized', {});
    const before = await state();
    expect(before).toMatchObject({ shuttingDown: false, parserCreated: true });
    expect(before.workspaceCount).toBeGreaterThan(0);
    return { base, uri, rootUri, text, provider, request, notify, state, output,
      close: async (): Promise<void> => {
        notify('exit', {});
        expect(await exited, stderr).toBe(0);
        expect(stderr).toBe('');
      },
      cleanup: async (): Promise<void> => { server?.kill(); await rm(base, { recursive: true, force: true }); } };
  } catch (error) { server?.kill(); await rm(base, { recursive: true, force: true }); throw error; }
}

function expectClosedSemanticState(state: unknown): void {
  expect(state).toEqual({ shuttingDown: true, parserCreated: false, workspaceCount: 0, pendingBuiltinRoots: 0 });
}

it.each(['onDemand', 'progressive'] as const)('keeps semantic resources closed after pending open/change interop in %s mode', async indexingMode => {
  for (const phpVersion of ['7.2', '8.5']) for (const event of ['open', 'change']) {
    const fixture = await lifecycleFixture(indexingMode, phpVersion);
    try {
      const opened = { textDocument: { uri: fixture.uri, languageId: 'php', version: 1, text: fixture.text } };
      if (event === 'change') {
        fixture.notify('textDocument/didOpen', opened);
        await fixture.output.waitFor(message => message.method === 'window/logMessage'
          && message.params.message === `[test-interop-document-refreshed] uri=${fixture.uri} version=1`);
      }
      expect(await fixture.request('phpCompanion/testPauseNextQuery', { method: 'interopDocument' })).toBe(true);
      fixture.notify(event === 'open' ? 'textDocument/didOpen' : 'textDocument/didChange', event === 'open' ? opened : {
        textDocument: { uri: fixture.uri, version: 2 }, contentChanges: [{ text: fixture.text.replace('return 1;', 'return 2;') }],
      });
      await fixture.output.waitFor(message => message.method === 'window/logMessage'
        && message.params.message === '[test-query-paused] method=interopDocument');
      await fixture.request('shutdown');
      expectClosedSemanticState(await fixture.state());
      const invalidations = (): number => fixture.output.messages.filter((message: any) => message.method === 'phpCompanion/interop/invalidated').length;
      const invalidationsBeforeRelease = invalidations();
      const cancelled = `[test-open-publication-cancelled] uri=${fixture.uri}`;
      const cancellations = (): number => fixture.output.messages.filter((message: any) => message.method === 'window/logMessage'
        && message.params.message === cancelled).length;
      const cancellationsBeforeRelease = cancellations();
      expect(await fixture.request('phpCompanion/testReleaseQuery', { method: 'interopDocument' })).toBe(true);
      // Observe the released continuation itself, not an arbitrary timer delay.
      await fixture.output.waitFor(message => message.method === 'window/logMessage'
        && message.params.message === cancelled && cancellations() > cancellationsBeforeRelease);
      expectClosedSemanticState(await fixture.state());
      expect(invalidations()).toBe(invalidationsBeforeRelease);
      await fixture.close();
    } finally { await fixture.cleanup(); }
  }
}, 60_000);

const lateNotifications = [
  'phpCompanion/phpVersions', 'phpCompanion/phpExtensionAvailability', 'phpCompanion/symfonyRouteProviders',
  'phpCompanion/frameworkDocumentSnapshots', 'phpCompanion/bundledSemanticProviders',
  'phpCompanion/bundledRouteProviders', 'phpCompanion/prewarmReferenceAt',
] as const;
it.each((['onDemand', 'progressive'] as const).flatMap(mode => lateNotifications.map(method => [mode, method] as const)))(
  'keeps semantic resources closed after late %s / %s notifications', async (indexingMode, method) => {
    for (const phpVersion of ['7.2', '8.5']) {
      const fixture = await lifecycleFixture(indexingMode, phpVersion);
      try {
        // No didOpen: distinguish provider notification allocation from the
        // independently tested open/change continuation.
        await fixture.request('shutdown');
        expectClosedSemanticState(await fixture.state());
        const semanticProvider = { providerId: 'lifecycle.fixture', command: process.execPath,
          args: [fixture.provider], replacesControllerContexts: true };
        const routeProvider = { providerId: 'lifecycle.fixture', command: process.execPath, args: [fixture.provider] };
        expect(isSemanticProviderDescriptor(semanticProvider)).toBe(true);
        expect(isRouteProviderDescriptor(routeProvider)).toBe(true);
        const version = phpVersion === '7.2' ? '8.5' : '7.2';
        const payloads: Record<typeof lateNotifications[number], unknown> = {
          'phpCompanion/phpVersions': { fallback: version, versions: [{ uri: fixture.rootUri, version }] },
          'phpCompanion/phpExtensionAvailability': { roots: [{ uri: fixture.rootUri, disabledExtensions: ['bcmath'] }] },
          'phpCompanion/symfonyRouteProviders': { providers: [{ uri: fixture.rootUri, external: false, environment: 'prod' }] },
          'phpCompanion/frameworkDocumentSnapshots': { complete: true, documents: [] },
          'phpCompanion/bundledSemanticProviders': { providers: [semanticProvider] },
          'phpCompanion/bundledRouteProviders': { providers: [routeProvider] },
          'phpCompanion/prewarmReferenceAt': { uri: fixture.uri, version: 1, position: { line: 0, character: fixture.text.indexOf('ping') } },
        };
        fixture.notify(method, payloads[method]);
        expectClosedSemanticState(await fixture.state());
        expectClosedSemanticState(await fixture.state());
        await fixture.close();
      } finally { await fixture.cleanup(); }
    }
  }, 60_000);
