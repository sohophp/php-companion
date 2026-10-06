import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { once } from 'node:events';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { expect, it } from 'vitest';
import { encodeLspMessage, LspMessageDecoder } from '../../testkit/src/index.js';

function position(source: string, offset: number): { line: number; character: number } {
  const lines = source.slice(0, offset).split('\n');
  return { line: lines.length - 1, character: lines.at(-1)!.length };
}

const scenarios = (['7.2', '8.5'] as const).flatMap(phpVersion =>
  (['onDemand', 'progressive'] as const).map(indexingMode => ({ phpVersion, indexingMode })));
it.each(scenarios)('keeps documented callable conditions coherent in PHP $phpVersion $indexingMode', async ({ phpVersion, indexingMode }) => {
  const root = await mkdtemp(join(tmpdir(), 'sophp-callable-condition-'));
  let server: ChildProcessWithoutNullStreams | undefined;
  const sourceFor = (argument: string, strict = false, contract = 'bool'): string => `<?php declare(strict_types=${Number(strict)});
namespace CallableConditionLsp;
class CommonResult { public function common(): void {} }
class ReadyResult extends CommonResult { public function onlyReady(): void {} }
class OtherResult extends CommonResult { public function onlyOther(): void {} }
/** @param callable(${contract} $flag): ($flag is true ? ReadyResult : OtherResult) $callback */
function run(callable $callback): void { $result = $callback(${argument}); $result->common(); }`;
  try {
    await writeFile(join(root, 'composer.json'), JSON.stringify({ require: { php: `>=${phpVersion}` } }));
    const uri = pathToFileURL(join(root, 'Consumer.php')).toString();
    const original = sourceFor('1');
    await writeFile(join(root, 'Consumer.php'), original);
    for (let launch = 0; launch < 2; launch += 1) {
      server = spawn(process.execPath, [resolve('dist/server.js'), '--stdio'], { stdio: 'pipe' });
      const { request, notify } = client(server);
      await request('initialize', { processId: null, rootUri: pathToFileURL(root).toString(), capabilities: {},
        initializationOptions: { phpVersion, indexingMode, cacheDirectory: join(root, '.cache') } });
      notify('initialized', {});
      const stages = launch === 0 ? [
        { argument: '1', contract: 'bool', strict: false, owners: ['OtherResult', 'ReadyResult'], members: ['common'] },
        { argument: 'true', contract: 'bool', strict: false, owners: ['ReadyResult'], members: ['common', 'onlyReady'] },
        { argument: 'false', contract: 'bool', strict: false, owners: ['OtherResult'], members: ['common', 'onlyOther'] },
        { argument: '1', contract: 'int', strict: false, owners: ['OtherResult'], members: ['common', 'onlyOther'] },
        { argument: '1', contract: 'bool', strict: false, owners: ['OtherResult', 'ReadyResult'], members: ['common'] },
        { argument: '1', contract: 'bool', strict: true, owners: [], members: [] },
      ] : [{ argument: '1', contract: 'bool', strict: false, owners: ['OtherResult', 'ReadyResult'], members: ['common'] }];
      for (const [index, stage] of stages.entries()) {
        const text = sourceFor(stage.argument, stage.strict, stage.contract);
        if (index === 0) notify('textDocument/didOpen', { textDocument: { uri, languageId: 'php', version: 1, text } });
        else notify('textDocument/didChange', { textDocument: { uri, version: index + 1 }, contentChanges: [{ text }] });
        const access = text.indexOf('$result->common') + '$result->'.length;
        // The first query is completion; do not wait for diagnostics or index readiness.
        const completion = await request('textDocument/completion', { textDocument: { uri }, position: position(text, access) });
        expect((Array.isArray(completion) ? completion : completion?.items)?.map((item: any) => item.label).sort()).toEqual(stage.members);
        const hover = await request('textDocument/hover', { textDocument: { uri }, position: position(text, text.lastIndexOf('$result') + 1) });
        for (const owner of stage.owners) expect(hover?.contents?.value).toContain(`CallableConditionLsp\\${owner}`);
        for (const owner of ['ReadyResult', 'OtherResult'].filter(name => !stage.owners.includes(name)))
          expect(hover?.contents?.value ?? '').not.toContain(`CallableConditionLsp\\${owner}`);
        const definition = await request('textDocument/definition', { textDocument: { uri }, position: position(text, access + 2) });
        const start = text.indexOf('common');
        expect(definition).toEqual(stage.owners.length ? [{ uri, range: { start: position(text, start), end: position(text, start + 6) } }] : []);
        const signature = await request('textDocument/signatureHelp', { textDocument: { uri },
          position: position(text, text.indexOf('$callback(') + '$callback('.length) });
        expect(signature?.signatures?.[0]?.label).toContain(`${stage.contract} $flag`);
      }
      await request('shutdown', null);
      const exited = once(server, 'exit'); notify('exit', null); await exited; server = undefined;
    }
    expect(await readFile(join(root, 'Consumer.php'), 'utf8')).toBe(original);
  } finally {
    if (server) { const exited = once(server, 'exit'); server.kill(); await exited; }
    await rm(root, { recursive: true, force: true });
  }
}, 40_000);

function client(server: ChildProcessWithoutNullStreams): {
  notify: (method: string, params: unknown) => void;
  request: (method: string, params: unknown) => Promise<any>;
  startRequest: (method: string, params: unknown) => { id: number; result: Promise<any> };
  wait: (predicate: (message: any) => boolean) => Promise<any>;
} {
  const decoder = new LspMessageDecoder(); const messages: any[] = [];
  const waiters: Array<{ predicate: (message: any) => boolean; resolve: (message: any) => void }> = [];
  let sequence = 0;
  server.stdout.on('data', (chunk: Buffer) => {
    for (const raw of decoder.push(chunk)) {
      const message = raw as any;
      if (message.method && message.id !== undefined) {
        server.stdin.write(encodeLspMessage({ jsonrpc: '2.0', id: message.id, result: null }));
        continue;
      }
      messages.push(message);
      for (const waiter of [...waiters]) if (waiter.predicate(message)) {
        waiters.splice(waiters.indexOf(waiter), 1); waiter.resolve(message);
      }
    }
  });
  const wait = (predicate: (message: any) => boolean): Promise<any> => {
    const found = messages.find(predicate); if (found) return Promise.resolve(found);
    return new Promise((resolveResponse, reject) => {
      const waiter = { predicate, resolve: (message: any): void => { clearTimeout(timer); resolveResponse(message); } };
      const timer = setTimeout(() => {
        waiters.splice(waiters.indexOf(waiter), 1);
        reject(new Error(`No LSP response; recent messages: ${JSON.stringify(messages.slice(-5))}`));
      }, 15_000);
      waiters.push(waiter);
    });
  };
  const startRequest = (method: string, params: unknown): { id: number; result: Promise<any> } => {
    const id = ++sequence; const response = wait(message => message.id === id);
    server.stdin.write(encodeLspMessage({ jsonrpc: '2.0', id, method, params }));
    return { id, result: response.then(message => { expect(message.error).toBeUndefined(); return message.result; }) };
  };
  return {
    wait,
    startRequest,
    notify: (method, params): void => { server.stdin.write(encodeLspMessage({ jsonrpc: '2.0', method, params })); },
    request: async (method, params): Promise<any> => {
      return startRequest(method, params).result;
    },
  };
}
