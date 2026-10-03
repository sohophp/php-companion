import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { mkdtemp, writeFile, readFile, rm } from 'node:fs/promises';
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


it.each(['7.2', '8.5'] as const)('refreshes array_count_values keys and values after unsaved input type edits at PHP %s', phpVersion => verify(phpVersion), 30_000);

async function verify(phpVersion: '7.2' | '8.5'): Promise<void> {
  const root = await mkdtemp(join(tmpdir(), 'sophp-array-count-values-lsp-')); let server: ChildProcessWithoutNullStreams | undefined;
  try {
    const rootUri = pathToFileURL(root).toString(); const path = join(root, 'Counts.php'); const uri = pathToFileURL(path).toString();
    const sourceFor = (variant: string): string => `<?php
/** @param ${variant} $input */
function read(array $input): void { $result = array_count_values($input); $result; }`;
    const original = sourceFor('array<string, string>'); await writeFile(path, original);
    await writeFile(join(root, 'composer.json'), JSON.stringify({ autoload: { files: ['Counts.php'] } }));
    server = spawn(process.execPath, [resolve('../../dist/language-server.js'), '--stdio',
      '--parser-core-wasm', resolve('../../dist/web-tree-sitter.wasm'),
      '--php-wasm', resolve('../../dist/tree-sitter-php.wasm')], { stdio: 'pipe' });
    const output = messagesFrom(server); let id = 1;
    const request = async (method: string, params: object): Promise<any> => {
      const requestId = id++; server!.stdin.write(encode({ jsonrpc: '2.0', id: requestId, method, params }));
      const response = await output.waitFor(message => message.id === requestId); expect(response.error).toBeUndefined(); return response.result;
    };
    const notify = (method: string, params: object): void => { server!.stdin.write(encode({ jsonrpc: '2.0', method, params })); };
    await request('initialize', { processId: null, capabilities: {}, rootUri, initializationOptions: { phpVersion } }); notify('initialized', {});
    await output.waitFor(message => message.method === 'window/logMessage' && message.params?.message?.includes('complete=true'));
    let version = 0;
    for (const valueType of ['array<string, string>', 'array<int, string>', 'array<string, int>', 'array<int, int>', 'array<string, mixed>', 'array', 'array<int, string>', 'array<string, string>']) {
      const source = sourceFor(valueType); version++;
      notify(version === 1 ? 'textDocument/didOpen' : 'textDocument/didChange', version === 1
        ? { textDocument: { uri, languageId: 'php', version, text: source } }
        : { textDocument: { uri, version }, contentChanges: [{ text: source }] });
      await output.waitFor(message => message.method === 'textDocument/publishDiagnostics' && message.params?.uri === uri && message.params?.version === version);
      const hover = await request('textDocument/hover', { textDocument: { uri }, position: lspPosition(source, source.indexOf('$result;') + 3) });
      const expected = ['array<string, int>', 'array<int, int>'].includes(valueType) ? 'array<int, int>' : 'array<int|string, int>';
      expect(hover?.contents?.value).toContain(`$result: ${expected}\n`);
    }
    expect(await readFile(path, 'utf8')).toBe(original); await request('shutdown', {}); notify('exit', {});
  } finally { server?.kill(); await rm(root, { recursive: true, force: true }); }
}
