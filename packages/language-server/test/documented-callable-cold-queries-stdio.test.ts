import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { once } from 'node:events';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
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
  (['onDemand', 'progressive'] as const).flatMap(indexingMode =>
    (['completion', 'hover', 'definition', 'signatureHelp'] as const).map(firstQuery => ({ phpVersion, indexingMode, firstQuery }))));
it.each(scenarios)('loads external callback returns for first $firstQuery PHP $phpVersion $indexingMode', scenario => checkColdQuery(scenario), 40_000);
it.each(scenarios)('retains repeated callback returns for first $firstQuery PHP $phpVersion $indexingMode', scenario => checkColdQuery(scenario, true), 40_000);

async function checkColdQuery({ phpVersion, indexingMode, firstQuery }: typeof scenarios[number], repeated = false): Promise<void> {
  const root = await mkdtemp(join(tmpdir(), 'sophp-callback-cold-'));
  let server: ChildProcessWithoutNullStreams | undefined;
  const base = '<?php namespace CallbackCold;class BaseResult{public function common(): string{return "ok";}}';
  const sourceFor = (argument: string, strict = false): string => `<?php declare(strict_types=${Number(strict)});
use CallbackCold\\Row as Ready;
use CallbackCold\\Other;
${repeated ? 'function consume($value): void {}' : ''}
/** @param callable(bool $flag): ($flag is true ? Ready : Other) $callback */
function run(callable $callback): void {${repeated ? '$prior=$callback(false);$copy=$callback;consume($copy(true));' : ''}$v=${repeated ? '$copy' : '$callback'}(${argument});$v->common();}`;
  try {
    await mkdir(join(root, 'src'));
    await writeFile(join(root, 'src', 'BaseResult.php'), base);
    await writeFile(join(root, 'src', 'Row.php'), '<?php namespace CallbackCold;class Row extends BaseResult{public function onlyRow(){}}');
    await writeFile(join(root, 'src', 'Other.php'), '<?php namespace CallbackCold;class Other extends BaseResult{public function onlyOther(){}}');
    await writeFile(join(root, 'composer.json'), JSON.stringify({autoload:{'psr-4':{'CallbackCold\\':'src/'}}}));
    const uri = pathToFileURL(join(root, 'Consumer.php')).toString(), original = sourceFor('1');
    const baseUri = pathToFileURL(join(root, 'src', 'BaseResult.php')).toString();
    await writeFile(join(root, 'Consumer.php'), original);
    for (let launch = 0; launch < 2; launch += 1) {
      server = spawn(process.execPath, [resolve('dist/server.js'), '--stdio'], { stdio: 'pipe' });
      const { request, notify } = client(server);
      await request('initialize', { processId: null, rootUri: pathToFileURL(root).toString(), capabilities: {},
        initializationOptions: { phpVersion, indexingMode, cacheDirectory: join(root, '.cache') } });
      notify('initialized', {});
      const query = async (method: typeof firstQuery, text: string): Promise<any> => {
        const access = text.indexOf('$v->common') + '$v->'.length;
        const offset = method === 'hover' ? text.lastIndexOf('$v') + 1
          : method === 'completion' ? access : method === 'definition' ? access + 2 : access + 'common('.length;
        return request('textDocument/' + method, { textDocument: { uri }, position: position(text, offset) });
      };
      const members = (value: any): string[] => (Array.isArray(value) ? value : value?.items ?? []).map((item: any) => item.label).sort();
      const expectedDefinition = [{uri:baseUri,range:{start:position(base,base.indexOf('common')),end:position(base,base.indexOf('common')+6)}}];
      const verify = (method: typeof firstQuery, value: any, expectedMembers: string[], owners: string[]): void => {
        if (method === 'completion') expect(members(value)).toEqual(expectedMembers);
        if (method === 'hover') for (const owner of owners) expect(value?.contents?.value).toContain('CallbackCold\\' + owner);
        if (method === 'definition') expect(value).toEqual(owners.length ? expectedDefinition : []);
        if (method === 'signatureHelp') expect(value?.signatures?.[0]?.label ?? '').toBe(owners.length ? 'common(): string' : '');
      };
      // Every query family gets an independent cold process, without indexing or diagnostic barriers.
      notify('textDocument/didOpen', { textDocument: { uri, languageId: 'php', version: 1, text: original } });
      verify(firstQuery, await query(firstQuery, original), ['common'], ['Other', 'Row']);
      if (repeated) {
        const callbackSignature = await request('textDocument/signatureHelp', { textDocument: { uri },
          position: position(original, original.lastIndexOf('$copy(') + '$copy('.length) });
        expect(callbackSignature.signatures).toHaveLength(1);
        expect(callbackSignature.signatures[0].label).toContain('bool $flag');
      }
      const stages = launch === 0 ? [
        { argument: 'true', strict: false, owners: ['Row'], members: ['common', 'onlyRow'] },
        { argument: 'false', strict: false, owners: ['Other'], members: ['common', 'onlyOther'] },
        { argument: '1', strict: true, owners: [], members: [] },
        { argument: '1', strict: false, owners: ['Other', 'Row'], members: ['common'] },
      ] : [];
      for (const [index, stage] of stages.entries()) {
        const text = sourceFor(stage.argument, stage.strict);
        notify('textDocument/didChange', { textDocument: { uri, version: index + 2 }, contentChanges: [{ text }] });
        for (const method of ['completion', 'hover', 'definition', 'signatureHelp'] as const)
          verify(method, await query(method, text), stage.members, stage.owners);
      }
      if (launch === 0) {
        if (repeated) {
          const invalid = original.replace('$v=$copy(1)', 'unknown($copy);$v=$copy(1)');
          notify('textDocument/didChange', { textDocument: { uri, version: 6 }, contentChanges: [{ text: invalid }] });
          expect(members(await query('completion', invalid))).toEqual([]);
          const signature = await request('textDocument/signatureHelp', { textDocument: { uri },
            position: position(invalid, invalid.lastIndexOf('$copy(') + '$copy('.length) });
          expect(signature?.signatures ?? []).toEqual([]);
          notify('textDocument/didChange', { textDocument: { uri, version: 7 }, contentChanges: [{ text: original }] });
          expect(members(await query('completion', original))).toEqual(['common']);
        }
        notify('textDocument/didOpen', { textDocument: { uri: baseUri, languageId: 'php', version: 1,
          text: base.replace('common', 'fresh') } });
        expect(members(await query('completion', original))).toEqual(['fresh']);
        notify('textDocument/didChange', { textDocument: { uri: baseUri, version: 2 }, contentChanges: [{ text: base }] });
        expect(members(await query('completion', original))).toEqual(['common']);
        verify('definition', await query('definition', original), ['common'], ['Row', 'Other']);
        notify('textDocument/didClose', { textDocument: { uri: baseUri } });
      }
      await request('shutdown', null);
      const exited = once(server, 'exit'); notify('exit', null); await exited; server = undefined;
    }
    expect(await readFile(join(root, 'Consumer.php'), 'utf8')).toBe(original);
    expect(await readFile(join(root, 'src', 'BaseResult.php'), 'utf8')).toBe(base);
  } finally {
    if (server) { const exited = once(server, 'exit'); server.kill(); await exited; }
    await rm(root, { recursive: true, force: true });
  }
}

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
