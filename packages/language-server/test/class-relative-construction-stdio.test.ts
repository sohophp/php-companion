import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { expect, it } from 'vitest';
import { encodeLspMessage, LspMessageDecoder } from '../../testkit/src/index.js';

it.each([['7.2', 'onDemand'], ['7.2', 'experimental'], ['8.5', 'onDemand'], ['8.5', 'experimental']] as const)(
  'keeps class-relative construction contracts in an unsaved Composer document at PHP %s (%s)', async (phpVersion, indexingMode) => {
  const root = await mkdtemp(join(tmpdir(), 'sophp-class-relative-'));
  await mkdir(join(root, 'src'));
  await writeFile(join(root, 'composer.json'), JSON.stringify({ autoload: { 'psr-4': { 'Consumer\\': 'src/' } } }));
  const file = join(root, 'src', 'Editing.php'), uri = pathToFileURL(file).toString();
  const disk = '<?php namespace Consumer; // unchanged disk baseline\n';
  await writeFile(file, disk);
  const server = spawn(process.execPath, [resolve('dist/server.js'), '--stdio'], { stdio: 'pipe' });
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
      const timer = setTimeout(() => { waiters.splice(waiters.indexOf(waiter), 1); reject(new Error('Class-relative LSP response timed out')); }, 15_000);
      waiters.push(waiter);
    });
  };
  let id = 0, version = 0, queries = 0;
  const send = (message: object): void => { server.stdin.write(encodeLspMessage({ jsonrpc: '2.0', ...message })); };
  const request = async (method: string, params: object | null): Promise<any> => {
    const requestId = ++id, response = waitFor(message => message.id === requestId);
    send({ id: requestId, method, params }); const result = await response;
    expect(result.error).toBeUndefined(); return result.result;
  };
  const position = (source: string, offset: number): { line: number; character: number } => {
    const lines = source.slice(0, offset).split('\n'); return { line: lines.length - 1, character: lines.at(-1)!.length };
  };
  const query = async (marked: string, expectedCodes: string[], signature?: string, completion?: string): Promise<void> => {
    const source = marked.replace('§', ''), offset = marked.indexOf('§'); version++;
    send({ method: version === 1 ? 'textDocument/didOpen' : 'textDocument/didChange', params: version === 1
      ? { textDocument: { uri, languageId: 'php', version, text: source } }
      : { textDocument: { uri, version }, contentChanges: [{ text: source }] } });
    const result = await request('textDocument/signatureHelp', { textDocument: { uri }, position: position(source, offset) }); queries++;
    expect(result?.signatures?.[0]?.label?.includes(signature ?? '') ?? false).toBe(Boolean(signature));
    if (completion) {
      const result = await request('textDocument/completion', { textDocument: { uri }, position: position(source, offset) });
      const items = Array.isArray(result) ? result : result.items;
      expect(items.some((item: any) => item.label === completion)).toBe(true);
    }
    const published = await waitFor(message => message.method === 'textDocument/publishDiagnostics' && message.params.uri === uri && message.params.version === version);
    const codes = published.params.diagnostics.filter((item: any) => ['php.instantiation.invalid-target', 'php.instantiation.inaccessible-constructor',
      'php.argument.missing-required', 'php.argument.type-mismatch'].includes(item.code)).map((item: any) => item.code).sort();
    expect(codes, marked).toEqual(expectedCodes.sort());
  };
  try {
    await request('initialize', { processId: null, rootUri: pathToFileURL(root).toString(), capabilities: { textDocument: { completion: { completionItem: { snippetSupport: true } } } },
      initializationOptions: { phpVersion, indexingMode, cacheDirectory: join(root, '.cache') } });
    send({ method: 'initialized', params: {} });
    if (indexingMode === 'experimental') await waitFor(message => message.method === 'window/logMessage'
      && message.params?.message?.includes('complete=true'));
    const full = indexingMode === 'experimental';
    for (const args of ['', '()']) {
      await query(`<?php abstract class Base {public static function make(){return new static${args};}} class Child extends Base {} §`, []);
      await query(`<?php abstract class Base {public static function make(){return new self${args};}} class Child extends Base {} §`, full ? ['php.instantiation.invalid-target'] : []);
      await query(`<?php trait Maker {public static function make(){return new self${args};}} class Child {use Maker;} §`, []);
      await query(`<?php class Base {public function __construct(int $value){} public static function make(){return new static${args};}}
        class Child extends Base {public function __construct(){}} §`, []);
      await query(`<?php class Base {private function __construct(){}} class Child extends Base {public static function make(){return new self${args};}
        public static function later(){return new static${args};}} class GrandChild extends Child {public function __construct(){}} §`, full ? ['php.instantiation.inaccessible-constructor'] : []);
      await query(`<?php class Base {protected function __construct(int $value){}} class Child extends Base {public static function make(){return new self${args};}} §`, ['php.argument.missing-required']);
      await query(`<?php class Base {final public function __construct(int $value){} public static function make(){return new static${args};}} §`, ['php.argument.missing-required']);
    }
    await query(`<?php declare(strict_types=1); class Base {protected function __construct(int $value){}} class Child extends Base {public static function make(){return new self('wrong');}} §`, ['php.argument.type-mismatch']);
    await query(`<?php declare(strict_types=1); class Base {public function __construct(int $value){} public static function make(){return new static('wrong');}} class Child extends Base {public function __construct(string $value){}} §`, []);
    const header='<?php class Base {protected function __construct(int $value){}} class Child extends Base {';
    await query(header+'public static function make(){return new self(§);}}', ['php.argument.missing-required'], '$value', Number(phpVersion.replace('.', '')) >= 80 ? 'value:' : undefined);
    await query(header.replace('protected function','private function')+'public static function make(){return new self(§);}}',
      full ? ['php.instantiation.inaccessible-constructor'] : []);
    await query(header+'public static function make(){return new self(§);}}', ['php.argument.missing-required'], '$value', Number(phpVersion.replace('.', '')) >= 80 ? 'value:' : undefined);
    expect(await readFile(file, 'utf8')).toBe(disk);
    console.log(JSON.stringify({ phpVersion, indexingMode, queries, diagnosticVersions: version, diskUnchanged: true }));
  } finally {
    if (server.exitCode === null) { const exited = once(server, 'exit'); server.kill(); await exited; }
    await rm(root, { recursive: true, force: true });
  }
});
