import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { mkdtemp, writeFile, mkdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { expect, it } from 'vitest';

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
      const message = JSON.parse(buffer.subarray(bodyStart, bodyStart + length).toString('utf8')) as object;
      buffer = buffer.subarray(bodyStart + length);
      messages.push(message);
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
