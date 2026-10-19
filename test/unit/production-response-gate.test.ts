import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { expect, it } from 'vitest';
import { LspMessageDecoder, encodeLspMessage } from '../../packages/testkit/dist/index.js';
import { currentDocumentQuery } from '../../src/extension/documentQuery.js';
import { attachProductionResponseGate } from '../extension/support/productionResponseGate.js';

it('delays real production Hover responses without enabling server Test controls or changing their bytes', async () => {
  const runtime = resolve('dist');
  const root = await mkdtemp(join(tmpdir(), 'sophp-production-response-'));
  const uri = pathToFileURL(join(root, 'Probe.php')).toString();
  const source = '<?php $value = 1; echo $value;';
  await writeFile(join(root, 'Probe.php'), source);
  const child = spawn(process.execPath, [join(runtime, 'language-server.js'), '--stdio', '--parser-core-wasm',
    join(runtime, 'web-tree-sitter.wasm'), '--php-wasm', join(runtime, 'tree-sitter-php.wasm')], { stdio: 'pipe' });
  const closed = once(child, 'close');
  const gate = attachProductionResponseGate(child), decoder = new LspMessageDecoder();
  const messages: Array<{ id?: number | string; method?: string; params?: any; result?: unknown; error?: unknown }> = [];
  const waiters: Array<{ predicate: (message: typeof messages[number]) => boolean;
    resolve: (message: typeof messages[number]) => void; reject: (error: Error) => void; timer: ReturnType<typeof setTimeout> }> = [];
  let id = 1;
  child.stdout.on('data', chunk => {
    for (const decoded of decoder.push(chunk)) {
      const message = decoded as typeof messages[number];
      messages.push(message);
      for (const waiter of [...waiters]) if (waiter.predicate(message)) {
        clearTimeout(waiter.timer); waiters.splice(waiters.indexOf(waiter), 1); waiter.resolve(message);
      }
    }
  });
  child.on('exit', () => {
    for (const waiter of waiters.splice(0)) { clearTimeout(waiter.timer); waiter.reject(new Error('Server exited during a query')); }
  });
  const wait = (predicate: (message: typeof messages[number]) => boolean): Promise<typeof messages[number]> => {
    const found = messages.find(predicate); if (found) return Promise.resolve(found);
    return new Promise((resolveWait, reject) => {
      const waiter = { predicate, resolve: resolveWait, reject, timer: setTimeout(() => {
        waiters.splice(waiters.indexOf(waiter), 1); reject(new Error('Production transport response timeout'));
      }, 10_000) }; waiters.push(waiter);
    });
  };
  const send = (message: object): void => {
    const frame = encodeLspMessage({ jsonrpc: '2.0', ...message });
    // Exercise fragmented headers and bodies, including the held real response's request.
    child.stdin.write(frame.subarray(0, 9)); child.stdin.write(frame.subarray(9, 28)); child.stdin.write(frame.subarray(28));
  };
  const request = async (method: string, params: unknown): Promise<unknown> => {
    const next = id++, pending = wait(message => message.id === next);
    send({ id: next, method, params }); const response = await pending;
    expect(response.error).toBeUndefined(); return response.result;
  };
  try {
    await request('initialize', { processId: null, rootUri: pathToFileURL(root).toString(), capabilities: {},
      initializationOptions: { phpVersion: '8.5', indexingMode: 'onDemand', versionedDiagnostics: true,
        testMode: false, cacheDirectory: join(root, 'cache') } });
    send({ method: 'initialized', params: {} });
    send({ method: 'textDocument/didOpen', params: { textDocument: { uri, languageId: 'php', version: 1, text: source } } });
    await wait(message => message.method === 'phpCompanion/versionedDiagnostics' && message.params.version === 1);
    expect(await request('phpCompanion/testReleaseQuery', { method: 'hover' })).toBe(false);
    expect(await request('phpCompanion/testPauseNextQuery', { method: 'hover' })).toBe(true);
    const document = { version: 1, isClosed: false }, token = { isCancellationRequested: false };
    const pendingHover = currentDocumentQuery(document, token, () => request('textDocument/hover', {
      textDocument: { uri }, position: { line: 0, character: source.lastIndexOf('$value') + 3 },
    }));
    let paused = false;
    for (let attempt = 0; attempt < 100; attempt++) {
      const state = await request('phpCompanion/testQueryState', { method: 'hover', uri }) as { paused: boolean };
      if (state.paused) { paused = true; break; }
      await new Promise(resolveWait => setTimeout(resolveWait, 20));
    }
    expect(paused).toBe(true);
    const held = gate.snapshot().held!;
    expect(messages.some(message => message.id === held.id)).toBe(false);
    const changed = "<?php $value = 'new'; echo $value;";
    document.version = 2;
    send({ method: 'textDocument/didChange', params: { textDocument: { uri, version: 2 }, contentChanges: [{ text: changed }] } });
    await wait(message => message.method === 'phpCompanion/versionedDiagnostics' && message.params.version === 2);
    expect(await request('phpCompanion/testQueryState', { method: 'hover', uri })).toEqual({ paused: true, version: 2 });
    expect(await request('phpCompanion/testReleaseQuery', { method: 'hover' })).toBe(true);
    expect(await pendingHover).toBeUndefined();
    // The real response is still old: only the client guard discards it.
    expect(JSON.stringify(messages.find(message => message.id === held.id)?.result)).toContain('int');
    expect(gate.snapshot().events.find(event => event.kind === 'release-real-response')?.sha256).toBe(held.sha256);
    const fresh = await currentDocumentQuery(document, token, () => request('textDocument/hover', {
      textDocument: { uri }, position: { line: 0, character: changed.lastIndexOf('$value') + 3 },
    }));
    expect(JSON.stringify(fresh)).toContain('string');
    expect(gate.snapshot().backendGuardRejections).toBe(1);
    expect(gate.snapshot().initializations).toHaveLength(1);
    expect(gate.snapshot().initializations[0]?.testMode).toBe(false);
    expect(gate.snapshot().held).toBeNull(); expect(gate.snapshot().transportErrors).toEqual([]);
    await request('shutdown', null); send({ method: 'exit', params: null }); await closed;
    expect(gate.snapshot().backendExit).toEqual({ code: 0, signal: null });
    expect(gate.snapshot().inputBufferedBytes).toBe(0); expect(gate.snapshot().outputBufferedBytes).toBe(0);
  } finally {
    for (const waiter of waiters.splice(0)) clearTimeout(waiter.timer);
    if (child.exitCode === null && child.signalCode === null) { child.kill(); await closed; }
    await rm(root, { recursive: true, force: true });
  }
}, 30_000);
