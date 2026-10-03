import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { mkdtemp, writeFile, readFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { expect, it } from 'vitest';
import { compressCachedProjectPhpFile, decompressCachedProjectPhpFile, type CachedProjectPhpFile } from '../src/projectFacts.js';
function encode(message: object): string {
  const body = JSON.stringify(message);
  return `Content-Length: ${Buffer.byteLength(body)}\r\n\r\n${body}`;
}

function lspPosition(source: string, offset: number): { line: number; character: number } {
  const lines = source.slice(0, offset).split('\n');
  return { line: lines.length - 1, character: lines.at(-1)!.length };
}

function messagesFrom(process: ChildProcessWithoutNullStreams, cancelAtBegin = false): {
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
      if (message.id !== undefined && message.method) process.stdin.write(encode({ jsonrpc: '2.0', id: message.id, result: null }));
      if (cancelAtBegin && message.method === '$/progress' && message.params.value.kind === 'begin')
        process.stdin.write(encode({ jsonrpc: '2.0', method: 'window/workDoneProgress/cancel', params: { token: message.params.token } }));
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


it.each(['7.2', '8.5'] as const)('finishes cold, cached and cancelled reference preparation at PHP %s', async phpVersion => {
  const root = await mkdtemp(join(tmpdir(), 'sophp-reference-progress-'));
  const cacheDirectory = join(root, 'cache'); let server: ChildProcessWithoutNullStreams | undefined;
  try {
    await writeFile(join(root, 'composer.json'), JSON.stringify({ autoload: { 'psr-4': { 'App\\': './' } } }));
    const source = '<?php namespace App; class Item { public function onlyItem(): void {} } $item = new Item(); $item->only;';
    const path = join(root, 'Item.php'); const uri = pathToFileURL(path).toString();
    await writeFile(path, source);
    for (let index = 0; index < 40; index++) await writeFile(join(root, `Noise${index}.php`), `<?php namespace App; class Noise${index} {}`);
    for (const phase of ['cold', 'cached', 'legacy', 'corrupted', 'overlay', 'cancelled'] as const) {
      if (phase === 'legacy' || phase === 'corrupted') {
        let changed = false;
        for (const name of await readdir(cacheDirectory)) {
          if (!name.endsWith('.json')) continue;
          const cachePath = join(cacheDirectory, name);
          const cache = JSON.parse(await readFile(cachePath, 'utf8'));
          if (!cache.entries?.[path]) continue;
          if (phase === 'legacy') {
            for (const entry of Object.values(cache.entries) as Array<{ payload: unknown }>) {
              const raw = decompressCachedProjectPhpFile(entry.payload);
              expect(raw, 'cold cache was compacted').toBeDefined(); entry.payload = raw;
            }
          } else {
            const entry = cache.entries[path];
            entry.payload = { ...compressCachedProjectPhpFile(entry.payload as CachedProjectPhpFile), data: 'AAAA' };
          }
          await writeFile(cachePath, JSON.stringify(cache)); changed = true;
        }
        expect(changed, phase).toBe(true);
      }
      server = spawn(process.execPath, [resolve('../../dist/language-server.js'), '--stdio', '--parser-core-wasm', resolve('../../dist/web-tree-sitter.wasm'), '--php-wasm', resolve('../../dist/tree-sitter-php.wasm')], { stdio: 'pipe' });
      const output = messagesFrom(server, phase === 'cancelled'); let id = 1;
      const request = async (method: string, params: object): Promise<any> => {
        const requestId = id++; server!.stdin.write(encode({ jsonrpc: '2.0', id: requestId, method, params }));
        const response = await output.waitFor(message => message.id === requestId && !message.method);
        expect(response.error, phase).toBeUndefined(); return response.result;
      };
      const notify = (method: string, params: object): void => { server!.stdin.write(encode({ jsonrpc: '2.0', method, params })); };
      await request('initialize', { processId: null, capabilities: { window: { workDoneProgress: true } }, rootUri: pathToFileURL(root).toString(), initializationOptions: { phpVersion, indexingMode: 'progressive', cacheDirectory } });
      notify('initialized', {});
      const begin = await output.waitFor(message => message.method === '$/progress' && message.params.value.kind === 'begin');
      const token = begin.params.token;
      expect(begin.params.value.title, phase).toBe('Preparing PHP references');
      const effectiveSource = phase === 'overlay' ? source.replace('onlyItem', 'onlyEdited') : source;
      if (phase === 'overlay') notify('textDocument/didOpen', { textDocument: { uri, languageId: 'php', version: 1, text: effectiveSource } });
      await output.waitFor(message => message.method === '$/progress' && message.params.token === token && message.params.value.kind === 'end');
      const updates = output.messages.filter((message: any) => message.method === '$/progress' && message.params.token === token) as any[];
      expect(updates.filter(message => message.params.value.kind === 'end'), phase).toHaveLength(1);
      expect(updates.at(-1).params.value.kind, phase).toBe('end');
      const reports = updates.filter(message => message.params.value.kind === 'report');
      if (phase !== 'cancelled') {
        expect(reports.some(message => message.params.value.message === 'Finishing PHP reference facts'), phase).toBe(true);
        expect(reports.at(-1).params.value, phase).toMatchObject({ percentage: 100, message: 'PHP references ready' });
        if (phase === 'cached' || phase === 'legacy') expect(reports.some(message => /41\/41 files, 41 cached/u.test(message.params.value.message)), phase).toBe(true);
        if (phase === 'corrupted') expect(reports.some(message => /41\/41 files, 40 cached/u.test(message.params.value.message)), phase).toBe(true);
      } else expect(reports.some(message => message.params.value.message === 'PHP references ready'), phase).toBe(false);
      if (phase !== 'overlay') notify('textDocument/didOpen', { textDocument: { uri, languageId: 'php', version: 1, text: effectiveSource } });
      await output.waitFor(message => message.method === 'textDocument/publishDiagnostics' && message.params?.uri === uri && message.params?.version === 1);
      const result = await request('textDocument/completion', { textDocument: { uri }, position: lspPosition(effectiveSource, effectiveSource.lastIndexOf('only;') + 'only'.length) });
      const items = Array.isArray(result) ? result : result?.items ?? [];
      expect(items.map((item: { label: string }) => item.label), phase).toEqual([phase === 'overlay' ? 'onlyEdited' : 'onlyItem']);
      expect(await readFile(path, 'utf8'), phase).toBe(source);
      await request('shutdown', {}); notify('exit', {});
      await new Promise<void>(done => { if (server!.exitCode !== null) done(); else server!.once('exit', () => done()); });
      server = undefined;
    }
  } finally { server?.kill(); await rm(root, { recursive: true, force: true }); }
}, 60000);
