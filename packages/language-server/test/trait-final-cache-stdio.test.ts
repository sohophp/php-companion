import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { mkdtemp, mkdir, writeFile, readFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { expect, it } from 'vitest';
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


it('keeps final trait aliases across persisted restarts, old cache fallback and disk edits', async () => {
  const root = await mkdtemp(join(tmpdir(), 'sophp-final-cache-lsp-')); let server: ChildProcessWithoutNullStreams | undefined;
  try {
    const sourceDirectory = join(root, 'src'); await mkdir(sourceDirectory);
    const cacheDirectory = join(root, '.cache');
    await writeFile(join(root, 'composer.json'), JSON.stringify({ autoload: { 'psr-4': { 'App\\': 'src/' } } }));
    const parentPath = join(sourceDirectory, 'Base.php'); const parentUri = pathToFileURL(parentPath).toString();
    const original = '<?php namespace App; class Base { use Methods { seed as final __construct; } }';
    await writeFile(parentPath, original);
    await writeFile(join(sourceDirectory, 'Methods.php'), '<?php namespace App; trait Methods { public function seed(){} }');
    const marked = '<?php namespace App; class Child extends Base { public function __§(){} }';
    const source = marked.replace('§', ''); const childPath = join(sourceDirectory, 'Child.php'); const uri = pathToFileURL(childPath).toString();
    await writeFile(childPath, source);
    const proofs: object[] = [];
    for (let run = 0; run < 5; run++) {
      const diskFinal = run < 3; const current = diskFinal ? original : original.replace('as final', 'as');
      server = spawn(process.execPath, [resolve('../../dist/language-server.js'), '--stdio', '--parser-core-wasm', resolve('../../dist/web-tree-sitter.wasm'), '--php-wasm', resolve('../../dist/tree-sitter-php.wasm')], { stdio: 'pipe' });
      const output = messagesFrom(server); let id = 1;
      const request = async (method: string, params: object): Promise<any> => {
        const requestId = id++; server!.stdin.write(encode({ jsonrpc: '2.0', id: requestId, method, params }));
        const response = await output.waitFor(message => message.id === requestId); expect(response.error).toBeUndefined(); return response.result;
      };
      const notify = (method: string, params: object): void => { server!.stdin.write(encode({ jsonrpc: '2.0', method, params })); };
      await request('initialize', { processId: null, capabilities: {}, rootUri: pathToFileURL(root).toString(),
        initializationOptions: { phpVersion: '8.5', indexingMode: 'experimental', cacheDirectory } }); notify('initialized', {});
      const indexed = await output.waitFor(message => message.method === 'window/logMessage' && message.params?.message?.includes('complete=true'));
      const cached = Number(/(\d+) cached/.exec(indexed.params.message)?.[1]);
      expect(cached).toBe([0, 3, 0, 2, 3][run]);
      notify('textDocument/didOpen', { textDocument: { uri, languageId: 'php', version: 1, text: source } });
      const completion = async (): Promise<string[]> => {
        const result = await request('textDocument/completion', { textDocument: { uri }, position: lspPosition(source, marked.indexOf('§')) });
        const items = Array.isArray(result) ? result : result?.items ?? [];
        expect(items.map((item: { label: string }) => item.label)).toContain('__invoke');
        return items.map((item: { label: string }) => item.label);
      };
      expect((await completion()).includes('__construct')).toBe(!diskFinal);
      const changed = diskFinal ? original.replace('as final', 'as') : original;
      notify('textDocument/didOpen', { textDocument: { uri: parentUri, languageId: 'php', version: 1, text: changed } });
      expect((await completion()).includes('__construct')).toBe(diskFinal);
      notify('textDocument/didChange', { textDocument: { uri: parentUri, version: 2 }, contentChanges: [{ text: current }] });
      expect((await completion()).includes('__construct')).toBe(!diskFinal);
      expect(await readFile(parentPath, 'utf8')).toBe(current);
      await request('shutdown', {});
      const stopped = new Promise<void>((done, reject) => { server!.once('exit', code => code === 0 ? done() : reject(new Error(`Server exited ${code}`))); });
      notify('exit', {}); await stopped; server = undefined;
      const manifests = [];
      for (const file of await readdir(cacheDirectory)) {
        if (!file.endsWith('.json')) continue;
        const path = join(cacheDirectory, file); const manifest = JSON.parse(await readFile(path, 'utf8'));
        if (manifest.version === 'semantic-v66-php-8.5') {
          expect(Object.keys(manifest.entries)).toHaveLength(3); manifests.push(path);
          if (run === 1) { manifest.version = 'semantic-v65-php-8.5'; await writeFile(path, JSON.stringify(manifest)); }
        }
      }
      expect(manifests).toHaveLength(1);
      proofs.push({ run, cached, diskFinal, unsavedToggleMatched: true });
      if (run === 2) await writeFile(parentPath, original.replace('as final', 'as'));
    }
    expect(await readFile(childPath, 'utf8')).toBe(source);
    console.log('Final trait cache restart proof: ' + JSON.stringify(proofs));
  } finally { server?.kill(); await rm(root, { recursive: true, force: true }); }
}, 45000);
