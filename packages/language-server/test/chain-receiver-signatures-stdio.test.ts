import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { expect, it } from 'vitest';
import { encodeLspMessage, LspMessageDecoder } from '../../testkit/src/index.js';

const cases = ['7.2', '8.5'].flatMap(phpVersion => ['onDemand', 'progressive', 'experimental'].map(indexingMode => ({ phpVersion, indexingMode })));

it.each(cases)('refreshes expression-receiver signatures and missing arguments at PHP $phpVersion ($indexingMode)', async ({ phpVersion, indexingMode }) => {
  const root = await mkdtemp(join(tmpdir(), 'sophp-chain-signatures-'));
  const file = join(root, 'Caller.php'), uri = pathToFileURL(file).toString();
  const disk = '<?php // unchanged disk baseline\n';
  await writeFile(file, disk);
  await writeFile(join(root, 'composer.json'), '{}');
  const declarations = `<?php namespace ChainReceiver;
class Worker { public function take(int $first, string $second = 'ready'): void {} }
function make(): Worker { return new Worker(); }
function take(string $unrelated): void {}
`;
  const source = declarations + 'make()->take();';
  const server = spawn(process.execPath, [process.env.PHP_COMPANION_TEST_CANONICAL_SERVER ?? resolve('dist/server.js'), '--stdio',
    '--parser-core-wasm', resolve('../../dist/web-tree-sitter.wasm'), '--php-wasm', resolve('../../dist/tree-sitter-php.wasm')], { stdio: 'pipe' });
  const closed = once(server, 'close'), decoder = new LspMessageDecoder(), messages: any[] = [];
  const waiters: Array<{ after: number; matches: (message: any) => boolean; done: (message: any) => void; timer: ReturnType<typeof setTimeout> }> = [];
  let id = 0, version = 0, stderr = '';
  const send = (message: object): void => { server.stdin.write(encodeLspMessage({ jsonrpc: '2.0', ...message })); };
  server.stderr.on('data', chunk => { stderr += chunk.toString(); });
  server.stdout.on('data', chunk => {
    for (const message of decoder.push(chunk) as any[]) {
      messages.push(message);
      if (message.method && message.id !== undefined) send({ id: message.id, result: null });
      for (const waiter of [...waiters]) if (messages.length - 1 >= waiter.after && waiter.matches(message)) {
        clearTimeout(waiter.timer); waiters.splice(waiters.indexOf(waiter), 1); waiter.done(message);
      }
    }
  });
  const waitFor = (matches: (message: any) => boolean, after = 0): Promise<any> => {
    const existing = messages.slice(after).find(matches); if (existing) return Promise.resolve(existing);
    return new Promise((done, reject) => {
      const waiter = { after, matches, done, timer: setTimeout(() => {
        waiters.splice(waiters.indexOf(waiter), 1); reject(Error(`Chain signature response timed out: ${stderr}`));
      }, 15_000) }; waiters.push(waiter);
    });
  };
  const request = async (method: string, params: object | null): Promise<any> => {
    const requestId = ++id, after = messages.length; send({ id: requestId, method, params });
    const response = await waitFor(message => message.id === requestId && !message.method, after);
    expect(response.error).toBeUndefined(); return response.result;
  };
  const update = (text: string): number => {
    const after = messages.length; version++;
    send({ method: version === 1 ? 'textDocument/didOpen' : 'textDocument/didChange', params: version === 1
      ? { textDocument: { uri, languageId: 'php', version, text } }
      : { textDocument: { uri, version }, contentChanges: [{ text }] } });
    return after;
  };
  const signature = async (text: string): Promise<any> => {
    const offset = text.lastIndexOf('take(') + 'take('.length, lines = text.slice(0, offset).split('\n');
    return request('textDocument/signatureHelp', { textDocument: { uri }, position: { line: lines.length - 1, character: lines.at(-1)!.length } });
  };
  const missing = async (after: number, count: number): Promise<void> => {
    const published = await waitFor(message => message.method === 'textDocument/publishDiagnostics'
      && message.params.uri === uri && message.params.version === version, after);
    expect(published.params.diagnostics.filter((item: any) => item.code === 'php.argument.missing-required')).toHaveLength(count);
  };
  try {
    await request('initialize', { processId: null, rootUri: pathToFileURL(root).toString(), capabilities: {},
      initializationOptions: { phpVersion, indexingMode, cacheDirectory: join(root, '.cache') } });
    send({ method: 'initialized', params: {} });
    let after = update(source);
    let hint = await signature(source);
    expect(hint?.signatures?.[0]?.label).toContain('$first');
    expect(hint?.signatures?.[0]?.label).not.toContain('$unrelated');
    await missing(after, 1);
    const optional = source.replace('int $first,', 'int $first = 1,');
    after = update(optional); hint = await signature(optional);
    expect(hint?.signatures?.[0]?.label).toContain('$first = 1');
    await missing(after, 0);
    const unknown = source.replace('function make(): Worker { return new Worker(); }', 'function make() { return unavailable(); }');
    after = update(unknown); hint = await signature(unknown);
    expect(hint?.signatures ?? []).toEqual([]);
    await missing(after, 0);
    const incomplete = declarations + 'make()->take(';
    update(incomplete); hint = await signature(incomplete);
    expect(hint?.signatures?.[0]?.label).toContain('$first');
    after = update(source); await signature(source); await missing(after, 1);
    expect(await readFile(file, 'utf8')).toBe(disk);
    expect(stderr).toBe('');
    await request('shutdown', null); send({ method: 'exit', params: null });
    const [code, signal] = await closed; expect(code).toBe(0); expect(signal).toBe(null);
  } finally {
    if (server.exitCode === null && server.signalCode === null) server.kill();
    await closed;
    for (const waiter of waiters.splice(0)) clearTimeout(waiter.timer);
    await rm(root, { recursive: true, force: true });
  }
});
