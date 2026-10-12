import { createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { expect, it } from 'vitest';
import { encodeLspMessage, LspMessageDecoder } from '../../testkit/src/index.js';

const cases = ['7.2', '8.5'].flatMap(phpVersion => ['onDemand', 'progressive'].flatMap(indexingMode =>
  ['private', 'public'].map(visibility => ({ phpVersion, indexingMode, visibility }))));

it.each(cases)('validates added $visibility parameter inputs at PHP $phpVersion in $indexingMode mode', async ({ phpVersion, indexingMode, visibility }) => {
  const root = await mkdtemp(join(tmpdir(), 'sophp-parameter-input-'));
  const source = `<?php declare(strict_types=1); namespace App; final class Example {
    ${visibility} function run(int $input): void {}
    public function useIt(): void { $this->run(1); }
  }`;
  await mkdir(join(root, 'src'));
  const path = join(root, 'src', 'Example.php'), uri = pathToFileURL(path).toString();
  await writeFile(join(root, 'composer.json'), JSON.stringify({ autoload: { 'psr-4': { 'App\\': 'src/' } } }));
  await writeFile(path, source);
  const server = spawn(process.execPath, [resolve('../../dist/language-server.js'), '--stdio',
    '--parser-core-wasm', resolve('../../dist/web-tree-sitter.wasm'), '--php-wasm', resolve('../../dist/tree-sitter-php.wasm')], { stdio: 'pipe' });
  const exited = once(server, 'exit');
  const decoder = new LspMessageDecoder();
  const pending = new Map<number, { done: (message: any) => void }>();
  let id = 0, stderr = '';
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
  const position = { line: 1, character: source.split('\n')[1]!.indexOf('run(') + 1 };
  try {
    await request('initialize', { processId: null, capabilities: {}, rootUri: pathToFileURL(root).toString(),
      initializationOptions: { phpVersion, indexingMode } });
    send({ method: 'initialized', params: {} });
    send({ method: 'textDocument/didOpen', params: { textDocument: { uri, languageId: 'php', version: 1, text: source } } });
    for (const [name, value] of [['extra', '08'], ['extra', '-08'], ['extra', '9223372036854775808'],
      ['this', '7'], ['GLOBALS', '7'], ['_GET', '7']]) {
      expect(await request('phpCompanion/addMethodParameter', {
        textDocument: { uri }, position, name, type: 'int', value,
      }), `${name}=${value}`).toBeNull();
    }
    const plan = await request('phpCompanion/addMethodParameter', {
      textDocument: { uri }, position, name: 'extra', type: 'int', value: '077',
    });
    expect(Object.keys(plan.changes)).toEqual([uri]);
    expect(plan.phpCompanion.sourceHashes).toEqual({ [uri]: createHash('sha256').update(source).digest('hex') });
    const offset = (position: { line: number; character: number }): number => {
      const lines = source.split('\n');
      return lines.slice(0, position.line).reduce((total, line) => total + line.length + 1, 0) + position.character;
    };
    const edits = plan.changes[uri] as Array<{ range: { start: { line: number; character: number }; end: { line: number; character: number } }; newText: string }>;
    let changed = source;
    for (const edit of [...edits].sort((left, right) => offset(right.range.start) - offset(left.range.start)))
      changed = changed.slice(0, offset(edit.range.start)) + edit.newText + changed.slice(offset(edit.range.end));
    expect(changed).toContain('run(int $input, int $extra)');
    expect(changed).toContain('$this->run(1, 077)');
    expect(await readFile(path, 'utf8')).toBe(source);
    await request('shutdown', null);
    send({ method: 'exit', params: {} });
    expect((await exited)[0], stderr).toBe(0);
  } finally {
    if (server.exitCode === null && server.signalCode === null) { server.kill(); await exited; }
    await rm(root, { recursive: true, force: true });
  }
});
