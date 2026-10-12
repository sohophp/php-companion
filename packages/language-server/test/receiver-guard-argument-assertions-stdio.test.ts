import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { expect, it } from 'vitest';
import { encodeLspMessage, LspMessageDecoder } from '../../testkit/src/index.js';

const cases = ['7.2', '8.5'].flatMap(phpVersion => ['onDemand', 'progressive'].map(indexingMode => ({ phpVersion, indexingMode })));

const sourceFor = (body: string): string => `<?php namespace App;
class Base {
/** @phpstan-assert-if-true Ready $this */ public function isReady(): bool { return true; }
/** @psalm-assert-if-false Ready $this */ public function isNotReady(): bool { return false; }
}
class Ready extends Base { public function onlyReady(): void {} }
class Rejected extends Base {}
function needReady(Ready $value): void {}
function unknown($value): void {}
function run(Base $item, bool $run = true): void {
${body}
}`;
const states = [
  ['early return', 'if (!$item->isReady()) { return; } QUERY', true],
  ['false assertion', 'if ($item->isNotReady()) { return; } QUERY', true],
  ['loop break', 'while ($run) { if (!$item->isReady()) { break; } QUERY }', true],
  ['loop continue', 'while ($run) { if (!$item->isReady()) { continue; } QUERY }', true],
  ['outer exit', 'while ($run) { while ($run) { if (!$item->isReady()) { break 2; } QUERY } }', true],
  ['exited loop', 'while ($run) { if (!$item->isReady()) { break; } } QUERY', false],
  ['non-exiting guard', 'if (!$item->isReady()) { $run = false; } QUERY', false],
  ['reassignment', 'if (!$item->isReady()) { return; } $item = new Rejected(); QUERY', false],
  ['unknown mutation', 'if (!$item->isReady()) { return; } unknown($item); QUERY', false],
  ['reference binding', 'if (!$item->isReady()) { return; } $alias =& $item; QUERY', false],
] as const;

it.each(cases)('refreshes receiver-guard argument assertions at PHP $phpVersion in $indexingMode', async ({ phpVersion, indexingMode }) => {
  const root = await mkdtemp(join(tmpdir(), 'sophp-receiver-guard-arguments-'));
  await mkdir(join(root, 'src'));
  await writeFile(join(root, 'composer.json'), JSON.stringify({ autoload: { 'psr-4': { 'App\\': 'src/' } } }));
  const path = join(root, 'src', 'Example.php'), uri = pathToFileURL(path).toString();
  const initial = sourceFor(states[0][1].replace('QUERY', '$item->onlyReady(); needReady($item);')); await writeFile(path, initial);
  const server = spawn(process.execPath, [resolve('../../dist/language-server.js'), '--stdio',
    '--parser-core-wasm', resolve('../../dist/web-tree-sitter.wasm'), '--php-wasm', resolve('../../dist/tree-sitter-php.wasm')], { stdio: 'pipe' });
  const exited = once(server, 'exit'), decoder = new LspMessageDecoder();
  const pending = new Map<number, { done: (message: any) => void }>();
  const messages: any[] = [];
  const notifications: Array<{ predicate: (message: any) => boolean; done: (message: any) => void }> = [];
  let id = 0, version = 0, open = false, stderr = '';
  server.stderr.on('data', (chunk: Buffer) => { stderr += chunk.toString(); });
  server.stdout.on('data', (chunk: Buffer) => {
    for (const message of decoder.push(chunk) as any[]) {
      messages.push(message); pending.get(message.id)?.done(message);
      for (const waiter of [...notifications]) if (waiter.predicate(message)) waiter.done(message);
    }
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
  const waitFor = (predicate: (message: any) => boolean): Promise<any> => {
    const found = messages.find(predicate); if (found) return Promise.resolve(found);
    return new Promise((done, reject) => {
      const timer = setTimeout(() => { notifications.splice(notifications.indexOf(waiter), 1); reject(new Error(`Diagnostics timed out: ${stderr}`)); }, 15_000);
      const waiter = { predicate, done: (message: any): void => {
        clearTimeout(timer); notifications.splice(notifications.indexOf(waiter), 1); done(message);
      } };
      notifications.push(waiter);
    });
  };
  const position = (source: string, offset: number): { line: number; character: number } => {
    const lines = source.slice(0, offset).split('\n'); return { line: lines.length - 1, character: lines.at(-1)!.length };
  };
  const observations: Array<{ state: string; version: number; narrowed: boolean; mismatches: number }> = [];
  const query = async ([state, body, narrowed]: typeof states[number]): Promise<void> => {
    const source = sourceFor(body.replace('QUERY', '$item->onlyReady(); needReady($item);')); version++;
    send({ method: open ? 'textDocument/didChange' : 'textDocument/didOpen', params: open
      ? { textDocument: { uri, version }, contentChanges: [{ text: source }] }
      : { textDocument: { uri, languageId: 'php', version, text: source } } }); open = true;
    const params = { textDocument: { uri }, position: position(source, source.lastIndexOf('onlyReady') + 1) };
    const definitions = await request('textDocument/definition', params);
    if (narrowed) {
      expect(definitions).toHaveLength(1);
      expect(definitions[0]).toMatchObject({ uri, range: { start: position(source, source.indexOf('onlyReady')) } });
      expect(JSON.stringify(await request('textDocument/hover', params))).toContain('onlyReady');
    } else expect(definitions).toEqual([]);
    const completion = await request('textDocument/completion', params);
    const items = Array.isArray(completion) ? completion : completion?.items ?? [];
    expect(items.some((item: any) => item.label === 'onlyReady')).toBe(narrowed);
    const notification = await waitFor(message => message.method === 'textDocument/publishDiagnostics'
      && message.params?.uri === uri && message.params?.version === version);
    const diagnostics = notification.params.diagnostics as any[];
    expect(diagnostics.some(item => item.code === 'php.syntax')).toBe(false);
    const mismatches = diagnostics.filter(item => item.code === 'php.argument.type-mismatch');
    expect(mismatches).toHaveLength(narrowed ? 0 : 1);
    if (!narrowed) expect(mismatches[0].range.start.line).toBe(position(source, source.lastIndexOf('needReady($item)')).line);
    expect(await readFile(path, 'utf8')).toBe(initial);
    observations.push({ state, version, narrowed, mismatches: mismatches.length });
  };
  try {
    await request('initialize', { processId: null, capabilities: {}, rootUri: pathToFileURL(root).toString(),
      initializationOptions: { phpVersion, indexingMode } }); send({ method: 'initialized', params: {} });
    for (const state of states) await query(state);
    await query(states[0]);
    send({ method: 'textDocument/didClose', params: { textDocument: { uri } } }); open = false;
    await query(states[0]);
    expect(observations).toHaveLength(states.length + 2);
    await request('shutdown', null); send({ method: 'exit', params: {} }); expect((await exited)[0], stderr).toBe(0); expect(stderr).toBe('');
    console.log('Receiver guard argument production protocol evidence: ' + JSON.stringify({ phpVersion, indexingMode, observations, normalExit: true }));
  } finally {
    if (server.exitCode === null && server.signalCode === null) { server.kill(); await exited; }
    await rm(root, { recursive: true, force: true });
  }
});
