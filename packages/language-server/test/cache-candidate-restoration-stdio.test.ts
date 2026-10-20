import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { realpathSync } from 'node:fs';
import { mkdtemp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir as osTmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';

// Five cold process launches retain the original assertions and 20s fixture limit.
// The Vitest project runs this file after parallel LSP workers have finished.
const testTempRoot = realpathSync(osTmpdir());
if (process.platform === 'darwin') process.env.TMPDIR = testTempRoot;
function tmpdir(): string { return testTempRoot; }

function encode(message: object): string {
  const body = JSON.stringify(message);
  return `Content-Length: ${Buffer.byteLength(body)}\r\n\r\n${body}`;
}

function lspPosition(source: string, offset: number): { line: number; character: number } {
  const lines = source.slice(0, offset).split('\n');
  return { line: lines.length - 1, character: lines.at(-1)!.length };
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

describe('language server stdio', () => {
  let server: ChildProcessWithoutNullStreams | undefined;
  afterEach(() => server?.kill());
  it('restores broad on-demand method candidates consistently across reload', async () => {
    const root = await mkdtemp(join(tmpdir(), 'php-companion-substring-candidates-'));
    try {
      const sourceDirectory = join(root, 'src'); await mkdir(sourceDirectory);
      const cacheDirectory = join(root, '.cache');
      const declaration = '<?php namespace App; final class Target { public function get(): int { return 1; } }';
      const consumer = '<?php namespace App; final class Consumer extends Getter { public function use(): int { return $this->target->get(); } }';
      const substring = '<?php namespace App; class Getter { protected Target $target; public function helper(): int { return 0; } }';
      const noise = '<?php namespace App; final class Noise {}';
      const declarationUri = pathToFileURL(join(sourceDirectory, 'Target.php')).toString();
      const consumerUri = pathToFileURL(join(sourceDirectory, 'Consumer.php')).toString();
      await writeFile(join(root, 'composer.json'), JSON.stringify({ autoload: { 'psr-4': { 'App\\': 'src/' } } }));
      await writeFile(join(sourceDirectory, 'Target.php'), declaration);
      await writeFile(join(sourceDirectory, 'Consumer.php'), consumer);
      await writeFile(join(sourceDirectory, 'Getter.php'), substring);
      await writeFile(join(sourceDirectory, 'Noise.php'), noise);
      for (let run = 0; run < 5; run += 1) {
        const phaseStartedAt = Date.now();
        server = spawn(process.execPath, [resolve('dist/server.js'), '--stdio'], { stdio: 'pipe' });
        const output = messagesFrom(server);
        server.stdin.write(encode({ jsonrpc: '2.0', id: 240, method: 'initialize', params: {
          processId: null, capabilities: {}, rootUri: pathToFileURL(root).toString(),
          initializationOptions: { indexingMode: 'onDemand', cacheDirectory },
        } }));
        await output.waitFor((message) => message.id === 240);
        server.stdin.write(encode({ jsonrpc: '2.0', method: 'initialized', params: {} }));
        server.stdin.write(encode({ jsonrpc: '2.0', method: 'textDocument/didOpen', params: {
          textDocument: { uri: declarationUri, languageId: 'php', version: 1, text: declaration },
        } }));
        server.stdin.write(encode({ jsonrpc: '2.0', id: 241, method: 'textDocument/references', params: {
          textDocument: { uri: declarationUri }, position: lspPosition(declaration, declaration.indexOf('get()') + 1),
          context: { includeDeclaration: false },
        } }));
        const references = (await output.waitFor((message) => message.id === 241)).result;
        expect(references).toEqual(run >= 2 ? [] : [expect.objectContaining({ uri: consumerUri })]);
        const scan = await output.waitFor((message) => message.method === 'window/logMessage'
          && message.params?.message?.includes('[named-candidates] files=4'));
        if (run < 3) {
          expect(scan.params.message).toContain(run === 0 ? 'parsed=3 restored=0' : run === 1 ? 'parsed=1 restored=2' : 'parsed=2 restored=1');
          expect(scan.params.message).toContain(run === 0 ? 'cached=0' : run === 1 ? 'cached=3' : 'cached=2');
          expect(scan.params.message).toContain(run === 1 ? 'declarations=0' : 'declarations=1');
          expect(scan.params.message).toContain(run === 0 ? 'restoredDeclarations=0' : 'restoredDeclarations=1');
          expect(scan.params.message).toContain(`prepared=${run === 0 ? 2 : run === 1 ? 0 : 1}`);
        } else expect(scan.params.message).toContain(run === 3 ? 'cached=0' : 'cached=3');
        const currentConsumer = run >= 2 ? consumer.replace('->get()', '->run()') : consumer;
        server.stdin.write(encode({ jsonrpc: '2.0', method: 'textDocument/didOpen', params: {
          textDocument: { uri: consumerUri, languageId: 'php', version: 1, text: currentConsumer },
        } }));
        server.stdin.write(encode({ jsonrpc: '2.0', id: 243, method: 'textDocument/completion', params: {
          textDocument: { uri: consumerUri }, position: lspPosition(currentConsumer, currentConsumer.indexOf('->get()') >= 0
            ? currentConsumer.indexOf('->get()') + 2 : currentConsumer.indexOf('->run()') + 2),
        } }));
        const completion = (await output.waitFor((message) => message.id === 243)).result;
        expect((Array.isArray(completion) ? completion : completion.items).map((item: { label: string }) => item.label)).toEqual(['get']);
        server.stdin.write(encode({ jsonrpc: '2.0', id: 242, method: 'shutdown', params: null }));
        await output.waitFor((message) => message.id === 242);
        server.stdin.write(encode({ jsonrpc: '2.0', method: 'exit', params: null }));
        await new Promise<void>((resolveExit) => server!.once('exit', () => resolveExit()));
        if (run === 1) await writeFile(join(sourceDirectory, 'Consumer.php'), consumer.replace('->get()', '->run()'));
        if (run === 2) {
          let damaged = 0;
          for (const file of await readdir(cacheDirectory)) {
            if (!file.endsWith('.json')) continue;
            const path = join(cacheDirectory, file);
            const manifest = JSON.parse(await readFile(path, 'utf8'));
            if (![1, 2].includes(manifest.schema) || !manifest.entries) continue;
            for (const entry of Object.values(manifest.entries) as Array<{ hash: string }>) entry.hash = 'damaged';
            await writeFile(path, JSON.stringify(manifest)); damaged += 1;
          }
          expect(damaged).toBeGreaterThan(0);
        }
        console.info('[cache-candidate-restoration]', JSON.stringify({ phase: run + 1, elapsedMs: Date.now() - phaseStartedAt }));
      }
    } finally { await rm(root, { recursive: true, force: true }); }
  });

});
