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


it.each(['7.2', '8.4', '8.5'] as const)('separates variable names from references inside declarations at PHP %s', async phpVersion => {
  const root = await mkdtemp(join(tmpdir(), 'sophp-declaration-variables-')); let server: ChildProcessWithoutNullStreams | undefined;
  try {
    const path = join(root, 'Names.php'); const uri = pathToFileURL(path).toString();
    const cases: Array<[string, string, string]> = [
      ['parameter-name', '<?php $namedGlobal = 1; function read(string $na§) {}', ''],
      ['property-name', '<?php $namedGlobal = 1; class C { public string $na§; }', ''],
      ['promoted-name', '<?php $namedGlobal = 1; class C { public function __construct(public string $na§) {} }', ''],
    ];
    if (phpVersion !== '7.2') cases.push(
      ['getter-this', '<?php class C { public string $name { get => $th§; } }', '$this'],
      ['getter-local', '<?php class C { public string $name { get { $other = "text"; return $ot§her; } } }', '$other'],
      ['setter-implicit', '<?php class C { public string $name { set { $va§; } } }', '$value'],
      ['setter-explicit', '<?php class C { public string $name { set(string $incoming) { $in§; } } }', '$incoming'],
      ['setter-name', '<?php class C { public string $name { set(string $na§) {} } }', ''],
    );
    // The PHP 7 case only exercises plain declarations; promotion starts in 8.0.
    if (phpVersion === '7.2') cases.splice(2, 1);
    const original = cases[0]![1].replace('§', ''); await writeFile(path, original);
    await writeFile(join(root, 'composer.json'), JSON.stringify({ autoload: { files: ['Names.php'] } }));
    server = spawn(process.execPath, [resolve('../../dist/language-server.js'), '--stdio', '--parser-core-wasm', resolve('../../dist/web-tree-sitter.wasm'), '--php-wasm', resolve('../../dist/tree-sitter-php.wasm')], { stdio: 'pipe' });
    const output = messagesFrom(server); let id = 1;
    const request = async (method: string, params: object): Promise<any> => {
      const requestId = id++; server!.stdin.write(encode({ jsonrpc: '2.0', id: requestId, method, params }));
      const response = await output.waitFor(message => message.id === requestId); expect(response.error).toBeUndefined(); return response.result;
    };
    const notify = (method: string, params: object): void => { server!.stdin.write(encode({ jsonrpc: '2.0', method, params })); };
    await request('initialize', { processId: null, capabilities: {}, rootUri: pathToFileURL(root).toString(), initializationOptions: { phpVersion } }); notify('initialized', {});
    await output.waitFor(message => message.method === 'window/logMessage' && message.params?.message?.includes('complete=true'));
    let version = 0;
    for (const [name, marked, expected] of [...cases, ...cases]) {
      const source = marked.replace('§', ''); version++;
      notify(version === 1 ? 'textDocument/didOpen' : 'textDocument/didChange', version === 1
        ? { textDocument: { uri, languageId: 'php', version, text: source } }
        : { textDocument: { uri, version }, contentChanges: [{ text: source }] });
      await output.waitFor(message => message.method === 'textDocument/publishDiagnostics' && message.params?.uri === uri && message.params?.version === version);
      const result = await request('textDocument/completion', { textDocument: { uri }, position: lspPosition(source, marked.indexOf('§')) });
      const items = Array.isArray(result) ? result : result?.items ?? [];
      if (expected) {
        expect(items.map((item: { label: string }) => item.label), name).toContain(expected);
        const item = items.find((item: { label: string }) => item.label === expected);
        expect(item.textEdit.newText).toBe(expected);
        const edit = item.textEdit; const lines = source.split('\n');
        const at = (position: { line: number; character: number }): number => lines.slice(0, position.line).reduce((sum, line) => sum + line.length + 1, 0) + position.character;
        const accepted = source.slice(0, at(edit.range.start)) + edit.newText + source.slice(at(edit.range.end));
        expect(accepted, name).toBe(marked.replace(/\$[A-Za-z_]*§[A-Za-z_]*/u, expected));
      } else expect(items, name).toEqual([]);
    }
    expect(await readFile(path, 'utf8')).toBe(original); await request('shutdown', {}); notify('exit', {});
  } finally { server?.kill(); await rm(root, { recursive: true, force: true }); }
}, 30000);
