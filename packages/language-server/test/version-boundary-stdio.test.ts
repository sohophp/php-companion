import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { expect, it } from 'vitest';
import { encodeLspMessage, LspMessageDecoder } from '../../testkit/src/index.js';

const cases = ['7.2', '7.3', '7.4', '8.0', '8.1', '8.2', '8.3', '8.4', '8.5'].flatMap(phpVersion => ['onDemand', 'progressive'].map(indexingMode => ({ phpVersion, indexingMode })));

const sourceFor = (body: string): string => `<?php namespace App;
// 中文 😀
${body}`;
const states = [
  ['version boundaries', 'function f($x,) {} $value=1; $fn=function() use($value,) {}; try {} catch(\\Exception) {} $a=0o755; $b=0O7_55;', [['trailing comma in parameters', ',', '8.0'], ['trailing comma in closure captures', ',', '8.0'], ['non-capturing catch', 'catch', '8.0'], ['explicit octal literal', '0o755', '8.1'], ['explicit octal literal', '0O7_55', '8.1']], false],
  ['legal older syntax', 'function f($x) {} $value=1; $fn=function() use($value) {}; try {} catch(\\Exception $e) {} $a=0755; /* 0o755 f($x,) */ $s="catch(Exception)";', [], false],
  ['independent unfinished input', '$a=0o755; function incomplete(', [['explicit octal literal', '0o755', '8.1']], true],
  ['recovered header', 'function f($x,) {}', [['trailing comma in parameters', ',', '8.0']], false],
] as const;

it.each(cases)('refreshes octal/list/catch version diagnostics at PHP $phpVersion in $indexingMode', async ({ phpVersion, indexingMode }) => {
  const root = await mkdtemp(join(tmpdir(), 'sophp-version-boundaries-'));
  await mkdir(join(root, 'src'));
  await writeFile(join(root, 'composer.json'), JSON.stringify({ autoload: { 'psr-4': { 'App\\': 'src/' } } }));
  const path = join(root, 'src', 'Example.php'), uri = pathToFileURL(path).toString();
  const initial = sourceFor(states[0][1]); await writeFile(path, initial);
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
  const observations: Array<{ state: string; version: number; unsupported: number; syntax: number }> = [];
  const query = async ([state, body, contracts, incomplete]: typeof states[number]): Promise<void> => {
    const source = sourceFor(body); version++;
    send({ method: open ? 'textDocument/didChange' : 'textDocument/didOpen', params: open
      ? { textDocument: { uri, version }, contentChanges: [{ text: source }] }
      : { textDocument: { uri, languageId: 'php', version, text: source } } }); open = true;
    const notification = await waitFor(message => message.method === 'textDocument/publishDiagnostics'
      && message.params?.uri === uri && message.params?.version === version);
    const diagnostics = notification.params.diagnostics as any[];
    const syntax = diagnostics.filter(item => item.code === 'php.syntax');
    expect(syntax).toHaveLength(incomplete ? 1 : 0);
    const unsupported = diagnostics.filter(item => item.code === 'php.version.unsupported');
    const expected = contracts.filter(([, , minimum]) => Number(phpVersion) < Number(minimum));
    expect(unsupported).toHaveLength(expected.length);
    let after = 0;
    for (const [feature, literal, minimum] of expected) {
      const start = source.indexOf(literal, after); after = start + literal.length;
      const diagnostic = unsupported.find(item => item.message.includes(feature) && item.range.start.line === position(source, start).line && item.range.start.character === position(source, start).character);
      expect(diagnostic).toBeDefined();
      expect(diagnostic.range).toEqual({ start: position(source, start), end: position(source, start + literal.length) });
      expect(diagnostic.message).toContain(minimum);
    }
    expect(await readFile(path, 'utf8')).toBe(initial);
    observations.push({ state, version, unsupported: unsupported.length, syntax: syntax.length });
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
    console.log('Version boundaries production protocol evidence: ' + JSON.stringify({ phpVersion, indexingMode, observations, normalExit: true }));
  } finally {
    if (server.exitCode === null && server.signalCode === null) { server.kill(); await exited; }
    await rm(root, { recursive: true, force: true });
  }
});
