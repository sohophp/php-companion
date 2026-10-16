import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { expect, it } from 'vitest';
import { encodeLspMessage, LspMessageDecoder } from '../../testkit/src/index.js';

it.each([['7.2', 'onDemand'], ['7.2', 'experimental'], ['8.5', 'onDemand'], ['8.5', 'experimental']] as const)(
  'keeps Trait alias contracts independent of adaptation order at PHP %s (%s)', async (phpVersion, indexingMode) => {
    const root = await mkdtemp(join(tmpdir(), 'sophp-trait-adaptation-order-'));
    await mkdir(join(root, 'src'));
    await writeFile(join(root, 'composer.json'), JSON.stringify({ autoload: { 'psr-4': { 'Consumer\\': 'src/' } } }));
    const file = join(root, 'src', 'Editing.php'), uri = pathToFileURL(file).toString();
    const disk = '<?php namespace Consumer; // unchanged disk baseline\n';
    await writeFile(file, disk);
    const server = spawn(process.execPath, [process.env.PHP_COMPANION_TEST_CANONICAL_SERVER ?? resolve('dist/server.js'), '--stdio',
      '--parser-core-wasm', resolve('../../dist/web-tree-sitter.wasm'), '--php-wasm', resolve('../../dist/tree-sitter-php.wasm')], { stdio: 'pipe' });
    const decoder = new LspMessageDecoder(), messages: any[] = [];
    const waiters: Array<{ matches: (message: any) => boolean; done: (message: any) => void }> = [];
    server.stdout.on('data', chunk => {
      for (const message of decoder.push(chunk) as any[]) {
        messages.push(message);
        for (const waiter of [...waiters]) if (waiter.matches(message)) {
          waiters.splice(waiters.indexOf(waiter), 1); waiter.done(message);
        }
      }
    });
    const waitFor = (matches: (message: any) => boolean): Promise<any> => {
      const existing = messages.find(matches); if (existing) return Promise.resolve(existing);
      return new Promise((done, reject) => {
        const waiter = { matches, done: (message: any): void => { clearTimeout(timer); done(message); } };
        const timer = setTimeout(() => { waiters.splice(waiters.indexOf(waiter), 1); reject(new Error('Trait adaptation LSP response timed out')); }, 15_000);
        waiters.push(waiter);
      });
    };
    let id = 0, version = 0;
    const send = (message: object): void => { server.stdin.write(encodeLspMessage({ jsonrpc: '2.0', ...message })); };
    const request = async (method: string, params: object | null): Promise<any> => {
      const requestId = ++id, response = waitFor(message => message.id === requestId);
      send({ id: requestId, method, params }); const result = await response;
      expect(result.error).toBeUndefined(); return result.result;
    };
    const query = async (marked: string, expectedNames?: string[]): Promise<void> => {
      const source = marked.replace('§', ''), offset = marked.indexOf('§'); version++;
      const lines = source.slice(0, offset).split('\n');
      const position = { line: lines.length - 1, character: lines.at(-1)!.length };
      send({ method: version === 1 ? 'textDocument/didOpen' : 'textDocument/didChange', params: version === 1
        ? { textDocument: { uri, languageId: 'php', version, text: source } }
        : { textDocument: { uri, version }, contentChanges: [{ text: source }] } });
      if (expectedNames) {
        const result = await request('textDocument/completion', { textDocument: { uri }, position });
        const items = Array.isArray(result) ? result : result.items;
        expect(items.filter((item: any) => ['seed', 'copied'].includes(item.label)).map((item: any) => item.label).sort()).toEqual(expectedNames);
      } else {
        const result = await request('textDocument/signatureHelp', { textDocument: { uri }, position });
        expect(result?.signatures?.[0]?.label).toContain('$value');
      }
      const published = await waitFor(message => message.method === 'textDocument/publishDiagnostics'
        && message.params.uri === uri && message.params.version === version);
      const codes = published.params.diagnostics.filter((item: any) => ['php.instantiation.inaccessible-constructor',
        'php.argument.missing-required', 'php.argument.type-mismatch'].includes(item.code)).map((item: any) => item.code).sort();
      expect(codes).toEqual(expectedNames ? [] : ['php.argument.missing-required']);
    };
    try {
      await request('initialize', { processId: null, rootUri: pathToFileURL(root).toString(), capabilities: {},
        initializationOptions: { phpVersion, indexingMode, cacheDirectory: join(root, '.cache') } });
      send({ method: 'initialized', params: {} });
      if (indexingMode === 'experimental') await waitFor(message => message.method === 'window/logMessage'
        && message.params?.message?.includes('complete=true'));
      for (const rules of ['seed as private; seed as copied;', 'seed as copied; seed as private;']) {
        await query(`<?php trait Methods {public function seed(int $value){}} class Host {use Methods {${rules}}}
function consume(Host $host){$host->§copied(1);}`, ['copied']);
      }
      for (const rules of ['seed as public; seed as copied;', 'seed as copied; seed as public;']) {
        await query(`<?php trait Methods {private function seed(int $value){}} class Host {use Methods {${rules}}}
function consume(Host $host){$host->§seed(1);}`, ['seed']);
      }
      for (const rules of ['seed as private; seed as __construct;', 'seed as __construct; seed as private;']) {
        await query(`<?php trait Methods {public function seed(int $value){}} class Host {use Methods {${rules}}} new Host(§);`);
      }
      await query(`<?php trait Methods {public function seed(int $value){}} class Host {use Methods {seed as private; seed as copied;}}
function consume(Host $host){$host->§copied(1);}`, ['copied']);
      expect(version).toBe(7);
      expect(await readFile(file, 'utf8')).toBe(disk);
    } finally {
      if (server.exitCode === null) { const exited = once(server, 'exit'); server.kill(); await exited; }
      await rm(root, { recursive: true, force: true });
    }
  });
