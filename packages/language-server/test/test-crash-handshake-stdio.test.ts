import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { once } from 'node:events';
import { Buffer } from 'node:buffer';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { expect, it } from 'vitest';
import { encodeLspMessage, LspMessageDecoder } from '../../testkit/dist/index.js';

function clientFor(server: ChildProcessWithoutNullStreams): {
  send: (message: object) => void;
  start: (method: string, params: unknown) => { result: Promise<any> };
  request: (method: string, params: unknown) => Promise<any>;
} {
  let nextId = 0;
  const decoder = new LspMessageDecoder();
  const pending = new Map<number, { resolve: (result: any) => void; reject: (error: Error) => void; timer: ReturnType<typeof setTimeout> }>();
  const send = (message: object): void => { server.stdin.write(encodeLspMessage({ jsonrpc: '2.0', ...message })); };
  server.stdout.on('data', chunk => {
    for (const message of decoder.push(chunk) as any[]) {
      if (message.method && message.id !== undefined) send({ id: message.id, result: null });
      const waiter = pending.get(message.id);
      if (!waiter || message.method) continue;
      clearTimeout(waiter.timer); pending.delete(message.id);
      if (message.error) waiter.reject(new Error(JSON.stringify(message.error))); else waiter.resolve(message.result);
    }
  });
  server.on('exit', (code, signal) => {
    for (const waiter of pending.values()) {
      clearTimeout(waiter.timer); waiter.reject(new Error(`LSP exited ${code}/${signal}`));
    }
    pending.clear();
  });
  const start = (method: string, params: unknown): { result: Promise<any> } => {
    const id = ++nextId;
    const result = new Promise<any>((resolveRequest, reject) => {
      const timer = setTimeout(() => { pending.delete(id); reject(new Error(`${method} timed out`)); }, 15_000);
      pending.set(id, { resolve: resolveRequest, reject, timer }); send({ id, method, params });
    });
    // A deliberately held reader may outlive the old server's premature exit.
    // Keep that rejection handled until the explicit process assertion runs.
    void result.catch(() => undefined);
    return { result };
  };
  return { send, start, request: (method, params) => start(method, params).result };
}

async function until(check: () => boolean, label: string): Promise<void> {
  const deadline = Date.now() + 10_000;
  while (Date.now() < deadline) {
    if (check()) return;
    await new Promise(done => setTimeout(done, 5));
  }
  throw new Error(`State not reached: ${label}`);
}

it.each([false, true])('acknowledges the crash handshake before client termination, with held reader %s', async readerHeld => {
  const root = await mkdtemp(join(tmpdir(), 'sophp-crash-handshake-'));
  const source = '<?php\n' + Array.from({ length: 2_000 }, (_, i) => `function f${i}_${'x'.repeat(128)}(): void {}\n`).join('');
  await writeFile(join(root, 'Pressure.php'), source);
  await writeFile(join(root, 'composer.json'), JSON.stringify({ autoload: { classmap: ['Pressure.php'] } }));
  const runtime = resolve('../../dist');
  const server = spawn(process.execPath, [resolve('dist/server.js'), '--stdio',
    '--parser-core-wasm', join(runtime, 'web-tree-sitter.wasm'), '--php-wasm', join(runtime, 'tree-sitter-php.wasm')], { stdio: 'pipe' });
  const exited = once(server, 'exit'), closed = once(server, 'close'), client = clientFor(server);
  let stderr = ''; server.stderr.on('data', chunk => { stderr += chunk.toString(); });
  try {
    await client.request('initialize', { processId: null, capabilities: {}, rootUri: pathToFileURL(root).toString(),
      initializationOptions: { phpVersion: '8.5', indexingMode: 'off', testMode: true } });
    client.send({ method: 'initialized', params: {} });
    const uri = pathToFileURL(join(root, 'Pressure.php')).toString();
    client.send({ method: 'textDocument/didOpen', params: { textDocument: { uri, languageId: 'php', version: 1, text: source } } });
    const baseline = await client.request('textDocument/documentSymbol', { textDocument: { uri } });
    expect(baseline).toHaveLength(2_000);
    expect(Buffer.byteLength(JSON.stringify(baseline))).toBeGreaterThan(500_000);
    let queued: { result: Promise<any> } | undefined;
    if (readerHeld) {
      server.stdout.pause();
      queued = client.start('textDocument/documentSymbol', { textDocument: { uri } });
      await until(() => server.stdout.readableLength >= server.stdout.readableHighWaterMark, 'large response blocked by the held reader');
    }
    const acknowledgement = client.start('phpCompanion/testCrash', {});
    if (readerHeld) {
      // Observe the held transport; product termination is gated by the client
      // notification rather than a longer delay or a retry.
      await Promise.race([
        exited.then(() => { throw new Error('Server exited before the client could receive its crash acknowledgement'); }),
        new Promise(done => setTimeout(done, 100)),
      ]);
      expect(server.exitCode).toBeNull();
      server.stdout.resume();
    }
    expect(await acknowledgement.result).toBe(true);
    if (queued) expect(await queued.result).toHaveLength(2_000);
    await client.request('phpCompanion/testQueryTimings', {});
    expect(server.exitCode).toBeNull();
    client.send({ method: 'phpCompanion/testCrash', params: {} });
    expect(await exited).toEqual([70, null]);
    await closed;
    expect(stderr).not.toContain('FATAL ERROR');
  } finally {
    server.stdout.resume();
    if (server.exitCode === null && server.signalCode === null) { server.kill('SIGTERM'); await closed; }
    await rm(root, { recursive: true, force: true });
  }
});

it('keeps crash requests and notifications disabled outside test mode', async () => {
  const root = await mkdtemp(join(tmpdir(), 'sophp-crash-disabled-'));
  await mkdir(join(root, 'src')); await writeFile(join(root, 'composer.json'), '{}');
  const runtime = resolve('../../dist');
  const server = spawn(process.execPath, [resolve('dist/server.js'), '--stdio',
    '--parser-core-wasm', join(runtime, 'web-tree-sitter.wasm'), '--php-wasm', join(runtime, 'tree-sitter-php.wasm')], { stdio: 'pipe' });
  const exited = once(server, 'exit'), closed = once(server, 'close'), client = clientFor(server);
  server.stderr.resume();
  try {
    await client.request('initialize', { processId: null, capabilities: {}, rootUri: pathToFileURL(root).toString(),
      initializationOptions: { phpVersion: '8.5', indexingMode: 'off' } });
    client.send({ method: 'initialized', params: {} });
    expect(await client.request('phpCompanion/testCrash', {})).toBe(false);
    client.send({ method: 'phpCompanion/testCrash', params: {} });
    await client.request('phpCompanion/testQueryTimings', {});
    expect(server.exitCode).toBeNull();
    await client.request('shutdown', null); client.send({ method: 'exit', params: {} });
    expect(await exited).toEqual([0, null]); await closed;
  } finally {
    if (server.exitCode === null && server.signalCode === null) { server.kill('SIGTERM'); await closed; }
    await rm(root, { recursive: true, force: true });
  }
});
