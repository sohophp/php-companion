import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { once } from 'node:events';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { expect, it } from 'vitest';
import { generatorReturnFlowSource, generatorReturnFlowContract } from '../../../test/extension/suite/generatorReturnFlowFixture.js';
import { encodeLspMessage, LspMessageDecoder } from '../../testkit/src/index.js';

function position(source: string, offset: number): { line: number; character: number } {
  const lines = source.slice(0, offset).split('\n');
  return { line: lines.length - 1, character: lines.at(-1)!.length };
}

function client(server: ChildProcessWithoutNullStreams): {
  notify: (method: string, params: unknown) => void;
  request: (method: string, params: unknown) => Promise<any>;
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
  return {
    wait,
    notify: (method, params): void => { server.stdin.write(encodeLspMessage({ jsonrpc: '2.0', method, params })); },
    request: async (method, params): Promise<any> => {
      const id = ++sequence; const response = wait(message => message.id === id);
      server.stdin.write(encodeLspMessage({ jsonrpc: '2.0', id, method, params }));
      const message = await response; expect(message.error).toBeUndefined(); return message.result;
    },
  };
}


it.each((['7.2', '8.5'] as const).flatMap(phpVersion =>
  (['onDemand', 'progressive'] as const).flatMap(indexingMode =>
    ['implementation', 'declaration', 'superseded'].map(change => [
      change === 'superseded' ? `preserves queried declaration changes across publication versions at PHP ${phpVersion}/${indexingMode}`
        : change === 'declaration' ? `preserves declaration publication after querying the current caller at PHP ${phpVersion}/${indexingMode}`
          : `uses the current open caller for shifted function offsets at PHP ${phpVersion}/${indexingMode}`,
      phpVersion, indexingMode, change,
    ] as const))))(
  '%s',
  async (_name, phpVersion, indexingMode, change) => {
    const declarationChange = change !== 'implementation', superseded = change === 'superseded';
    const root = await mkdtemp(join(tmpdir(), 'sophp-signature-publication-'));
    let active: ChildProcessWithoutNullStreams | undefined;
    try {
      await mkdir(join(root, 'src'));
      await writeFile(join(root, 'composer.json'), JSON.stringify({autoload: {'psr-4': {'App\\': 'src/'}}}));
      const namespace = 'App\\GeneratorProbe',
        before = generatorReturnFlowSource(namespace, 'finally'),
        after = generatorReturnFlowSource(namespace, 'unknown').replace('function inner(bool $flag)',
          declarationChange ? 'function inner(string $flag)' : 'function inner(bool $flag)'),
        file = join(root, 'src', 'Example.php'), uri = pathToFileURL(file).toString();
      await writeFile(file, before);
      const server = spawn(process.execPath, [resolve('dist/server.js'), '--stdio'], {stdio: 'pipe'});
      active = server;
      const {request, notify, wait} = client(server);
      await request('initialize', {processId: null, rootUri: pathToFileURL(root).toString(), capabilities: {},
        initializationOptions: {testMode: true, phpVersion, indexingMode, cacheDirectory: join(root, '.cache')}});
      notify('initialized', {});
      notify('textDocument/didOpen', {textDocument: {uri, languageId: 'php', version: 1, text: before}});
      await wait(message => message.method === 'window/logMessage'
        && message.params.message.includes('[test-interop-document-refreshed]')
        && message.params.message.includes(uri) && message.params.message.includes('version=1'));
      const query = (source: string): Promise<any> => request('textDocument/signatureHelp', {
        textDocument: {uri}, position: position(source, source.lastIndexOf('inner(false)') + 'inner('.length),
      });
      expect((await query(before))?.signatures?.[0]?.label)
        .toBe('inner(bool $flag): ' + generatorReturnFlowContract(namespace, 'finally'));
      await request('phpCompanion/testPauseNextQuery', {method: 'openSourcePublication'});
      notify('textDocument/didChange', {textDocument: {uri, version: 2}, contentChanges: [{text: after}]});
      await wait(message => message.method === 'window/logMessage'
        && message.params.message === '[test-query-paused] method=openSourcePublication');
      // Query the current buffer while its regular publication is held. The
      // changed body shifts the call away from the previously indexed offset.
      const result = await query(after);
      expect(result?.signatures).toHaveLength(1);
      expect(result?.signatures?.[0]?.label)
        .toBe(`inner(${declarationChange ? 'string' : 'bool'} $flag): ` + generatorReturnFlowContract(namespace, 'unknown'));
      if (superseded) {
        notify('textDocument/didChange', {textDocument: {uri, version: 3}, contentChanges: [{text: after}]});
        await wait(message => message.method === 'textDocument/publishDiagnostics'
          && message.params.uri === uri && message.params.version === 3);
      }
      await request('phpCompanion/testReleaseQuery', {method: 'openSourcePublication'});
      await wait(message => message.method === 'window/logMessage'
        && message.params.message.includes('[test-interop-document-refreshed]')
        && message.params.message.includes(uri) && message.params.message.includes(`version=${superseded ? 3 : 2}`));
      await request('shutdown', null);
      const exited = once(server, 'exit');
      notify('exit', null);
      await exited;
      active = undefined;
      expect(await readFile(file, 'utf8')).toBe(before);
    } finally {
      if (active) { const exited = once(active, 'exit'); active.kill(); await exited; }
      await rm(root, {recursive: true, force: true});
    }
  }, 40_000,
);
