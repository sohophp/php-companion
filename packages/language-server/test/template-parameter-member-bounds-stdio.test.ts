import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { expect, it } from 'vitest';
import { encodeLspMessage, LspMessageDecoder } from '../../testkit/src/index.js';

const cases = ['7.2', '8.5'].flatMap(phpVersion => ['onDemand', 'progressive'].map(indexingMode => ({ phpVersion, indexingMode })));

it.each(cases)('refreshes template parameter member bounds at PHP $phpVersion in $indexingMode', async ({ phpVersion, indexingMode }) => {
  const root = await mkdtemp(join(tmpdir(), 'sophp-template-members-'));
  await mkdir(join(root, 'src'));
  await writeFile(join(root, 'composer.json'), JSON.stringify({ autoload: { 'psr-4': { 'App\\': 'src/' } } }));
  const path = join(root, 'src', 'Example.php'), uri = pathToFileURL(path).toString();
  const sourceFor = (templates: string, native: string): string => `<?php namespace App;
class Item { public function value(): string { return 'item'; } }
class Other { public function other(): string { return 'other'; } }
class T { public function value(): string { return 'unrelated'; } }
class Example {
/** ${templates}
 * @param T $item */
public static function run(${native}$item) { $item->value(); }
}`;
  const initial = sourceFor('@template T of Item', 'Item ');
  await writeFile(path, initial);
  const server = spawn(process.execPath, [resolve('../../dist/language-server.js'), '--stdio',
    '--parser-core-wasm', resolve('../../dist/web-tree-sitter.wasm'), '--php-wasm', resolve('../../dist/tree-sitter-php.wasm')], { stdio: 'pipe' });
  const exited = once(server, 'exit'), decoder = new LspMessageDecoder();
  const pending = new Map<number, { done: (message: any) => void }>();
  let id = 0, version = 0, stderr = '';
  server.stderr.on('data', (chunk: Buffer) => { stderr += chunk.toString(); });
  server.stdout.on('data', (chunk: Buffer) => {
    for (const message of decoder.push(chunk) as any[]) pending.get(message.id)?.done(message);
  });
  const send = (message: object): void => { server.stdin.write(encodeLspMessage({ jsonrpc: '2.0', ...message })); };
  const request = (method: string, params: object | null): Promise<any> => {
    const requestId = ++id;
    return new Promise((done, reject) => {
      const timer = setTimeout(() => { pending.delete(requestId); reject(new Error(`${method} timed out: ${stderr}`)); }, 15_000);
      pending.set(requestId, { done: message => {
        clearTimeout(timer); pending.delete(requestId);
        if (message.error) reject(new Error(JSON.stringify(message.error))); else done(message.result);
      } });
      send({ id: requestId, method, params });
    });
  };
  const position = (source: string, offset: number): { line: number; character: number } => {
    const lines = source.slice(0, offset).split('\n');
    return { line: lines.length - 1, character: lines.at(-1)!.length };
  };
  const query = async (source: string, methodName: string, expectedLine?: number): Promise<void> => {
    version++;
    send({ method: version === 1 ? 'textDocument/didOpen' : 'textDocument/didChange', params: version === 1
      ? { textDocument: { uri, languageId: 'php', version, text: source } }
      : { textDocument: { uri, version }, contentChanges: [{ text: source }] } });
    const offset = source.lastIndexOf(`${methodName}()`);
    const params = { textDocument: { uri }, position: position(source, offset + 1) };
    const locations = await request('textDocument/definition', params);
    if (expectedLine === undefined) expect(locations).toEqual([]);
    else {
      expect(locations).toHaveLength(1);
      expect(locations[0]).toMatchObject({ uri, range: { start: { line: expectedLine } } });
      const hover = await request('textDocument/hover', params);
      expect(JSON.stringify(hover)).toContain(methodName);
    }
    const completion = await request('textDocument/completion', params);
    const items = Array.isArray(completion) ? completion : completion?.items ?? [];
    expect(items.some((item: any) => item.label === methodName)).toBe(expectedLine !== undefined);
  };
  try {
    await request('initialize', { processId: null, capabilities: {}, rootUri: pathToFileURL(root).toString(),
      initializationOptions: { phpVersion, indexingMode } });
    send({ method: 'initialized', params: {} });
    await query(initial, 'value', 1);
    await query(sourceFor('@template T of Other', 'Other ').replace('$item->value()', '$item->other()'), 'other', 2);
    await query(sourceFor('@template T', ''), 'value');
    await query(sourceFor('@template U of T\n * @template T of U', ''), 'value');
    await query(initial, 'value', 1);
    expect(await readFile(path, 'utf8')).toBe(initial);
    await request('shutdown', null);
    send({ method: 'exit', params: {} });
    expect((await exited)[0], stderr).toBe(0);
    expect(stderr).toBe('');
  } finally {
    if (server.exitCode === null && server.signalCode === null) { server.kill(); await exited; }
    await rm(root, { recursive: true, force: true });
  }
});
