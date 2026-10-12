import { once } from 'node:events';
import { spawn, spawnSync, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { mkdtemp, mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { expect, it } from 'vitest';
import { encodeLspMessage, LspMessageDecoder } from '../../testkit/dist/index.js';

function clientFor(server: ChildProcessWithoutNullStreams): {
  send: (message: object) => boolean; request: (method: string, params: unknown) => Promise<any>;
  wait: (match: (value: any) => boolean) => Promise<any>; messages: any[]; dispose: () => void;
} {
  const messages: any[] = [], decoder = new LspMessageDecoder();
  const waiters = new Set<{ match: (value: any) => boolean; resolve: (value: any) => void; reject: (error: Error) => void; timer: ReturnType<typeof setTimeout> }>();
  const send = (message: object): boolean => server.stdin.write(encodeLspMessage({ jsonrpc: '2.0', ...message }));
  const failAll = (error: Error): void => { for (const waiter of waiters) { clearTimeout(waiter.timer); waiter.reject(error); } waiters.clear(); };
  server.on('error', failAll);
  server.on('exit', (code, signal) => failAll(new Error(`LSP exited: ${code}/${signal}`)));
  server.stdout.on('data', chunk => {
    for (const message of decoder.push(chunk) as any[]) {
      messages.push(message);
      if (message.method && message.id !== undefined) send({ id: message.id, result: null });
      for (const waiter of waiters) if (waiter.match(message)) {
        waiters.delete(waiter); clearTimeout(waiter.timer); waiter.resolve(message);
      }
    }
  });
  const wait = (match: (value: any) => boolean): Promise<any> => {
    const found = messages.find(match); if (found) return Promise.resolve(found);
    return new Promise((resolveWait, reject) => {
      const waiter = { match, resolve: resolveWait, reject, timer: setTimeout(() => {
        waiters.delete(waiter); reject(new Error(`LSP timeout: ${JSON.stringify(messages.slice(-8))}`));
      }, 15_000) };
      waiters.add(waiter);
    });
  };
  let nextId = 1;
  const request = async (method: string, params: unknown): Promise<any> => {
    const id = nextId++; send({ id, method, params });
    const response = await wait(message => message.id === id && !message.method);
    expect(response.error).toBeUndefined(); return response.result;
  };
  return { send, request, wait, messages, dispose: (): void => { for (const waiter of waiters) clearTimeout(waiter.timer); waiters.clear(); } };
}

it.each(['7.2', '8.5'].flatMap(phpVersion => [false, true].map(cancelOne => ({ phpVersion, cancelOne }))))(
  'keeps current Controller contexts across a same-epoch progressive generation at PHP $phpVersion, cancelOne=$cancelOne',
  async ({ phpVersion, cancelOne }) => {
    const root = await mkdtemp(join(tmpdir(), 'sophp-controller-generation-'));
    let server: ChildProcessWithoutNullStreams | undefined, client: ReturnType<typeof clientFor> | undefined;
    let exited: Promise<unknown[]> | undefined;
    try {
      await mkdir(join(root, 'src'));
      await writeFile(join(root, 'composer.json'), JSON.stringify({ autoload: { 'psr-4': { 'App\\': 'src/' } } }));
      const controller = join(root, 'src', 'PageController.php'), uri = pathToFileURL(controller).toString();
      const source = (template: string): string => `<?php namespace App; class PageController { public function show(): void { $this->render('${template}'); } }`;
      await writeFile(controller, source('initial.html.twig'));
      const held = join(root, 'held'), release = join(root, 'release'), calls = join(root, 'calls.jsonl'), provider = join(root, 'provider.mjs');
      const realArgs = [resolve('../provider-symfony-controller-contexts/dist/cli.js'), '--parser-core-wasm', resolve('../../dist/web-tree-sitter.wasm'), '--php-wasm', resolve('../../dist/tree-sitter-php.wasm')];
      await writeFile(provider, `import {appendFileSync,existsSync} from 'node:fs';import {spawnSync} from 'node:child_process';let input='';for await(const part of process.stdin)input+=part;const request=JSON.parse(input);const holding=existsSync(${JSON.stringify(held)});appendFileSync(${JSON.stringify(calls)},JSON.stringify({generation:request.params.generation,holding,documents:request.params.documents})+String.fromCharCode(10));while(holding&&!existsSync(${JSON.stringify(release)}))await new Promise(done=>setTimeout(done,10));const child=spawnSync(process.execPath,${JSON.stringify(realArgs)},{input,encoding:'utf8'});process.stdout.write(child.stdout??'');process.stderr.write(child.stderr??'');process.exitCode=child.status??1;`);
      const checked = spawnSync(process.execPath, ['--check', provider], { encoding: 'utf8' });
      expect(checked.status, checked.stderr).toBe(0);
      server = spawn(process.execPath, [resolve('../../dist/language-server.js'), '--stdio', '--parser-core-wasm', resolve('../../dist/web-tree-sitter.wasm'), '--php-wasm', resolve('../../dist/tree-sitter-php.wasm')], { stdio: 'pipe' });
      exited = once(server, 'exit'); client = clientFor(server);
      const rootUri = pathToFileURL(root).toString();
      await client.request('initialize', { processId: null, rootUri, capabilities: {}, initializationOptions: {
        phpVersion, indexingMode: 'progressive', testMode: true, bundledSemanticProviders: [{
          providerId: 'php-companion.symfony.controller-contexts', command: process.execPath, args: [provider],
          requiresProjectTypes: true, acceptsDocumentSnapshots: true, replacesControllerContexts: true,
        }],
      } });
      client.send({ method: 'initialized', params: {} });
      await client.wait(message => message.method === 'window/logMessage' && /\[index:1\] end /.test(message.params.message));
      const contextParams = { rootUri };
      const initial = await client.request('phpCompanion/interop/contexts', contextParams);
      expect(initial, JSON.stringify(client.messages.filter(message => message.method === 'window/logMessage'))).not.toBeNull();
      expect(initial.contexts).toMatchObject([{ template: 'initial.html.twig' }]);
      expect(await client.request('phpCompanion/testPauseNextQuery', { method: 'indexSourceScan' })).toBe(true);
      await writeFile(controller, source('current.html.twig'));
      client.send({ method: 'workspace/didChangeWatchedFiles', params: { changes: [{ uri, type: 2 }] } });
      // Finish watcher publication first: holding its provider would block the
      // query at watchedFileChanges, so it could only start in the new generation.
      await client.wait(message => message.method === 'window/logMessage'
        && message.params.message === `[index:delta] complete uri=${uri}`);
      const state = (): Promise<any> => client!.request('phpCompanion/testQueryState', { method: 'safeMoveDiskRefresh', uri });
      const epoch = (await state()).epoch;
      await writeFile(held, 'hold');
      const requestIds = cancelOne ? [1000, 1001] : [1001];
      for (const id of requestIds) client.send({ id, method: 'phpCompanion/interop/contexts', params: contextParams });
      const deadline = Date.now() + 5_000;
      const readCalls = async (): Promise<any[]> => readFile(calls, 'utf8').then(text => text.trim().split('\n').filter(Boolean).map(line => JSON.parse(line)), () => []);
      while (!(await readCalls()).some(call => call.holding && call.generation === '1')) {
        if (Date.now() > deadline) throw new Error('Controller provider did not reach the original generation gate');
        await new Promise(done => setTimeout(done, 10));
      }
      expect((await state()).epoch).toBe(epoch);
      if (cancelOne) {
        client.send({ method: '$/cancelRequest', params: { id: 1000 } });
        expect((await client.wait(message => message.id === 1000 && !message.method)).result).toBeNull();
        expect(client.messages.some(message => message.id === 1001 && !message.method)).toBe(false);
      }
      await client.wait(message => message.method === 'window/logMessage' && message.params.message === '[index:2] start reason=progressive-source-change');
      await client.wait(message => message.method === 'window/logMessage' && message.params.message === '[test-query-paused] method=indexSourceScan');
      expect((await state()).epoch).toBe(epoch);
      await writeFile(release, 'release');
      expect(await client.request('phpCompanion/testReleaseQuery', { method: 'indexSourceScan' })).toBe(true);
      const response = await client.wait(message => message.id === 1001 && !message.method);
      expect(response.error).toBeUndefined();
      expect(response.result, JSON.stringify(client.messages.filter(message => message.method === 'window/logMessage'))).not.toBeNull();
      expect(response.result.contexts).toMatchObject([{ template: 'current.html.twig' }]);
      expect(Number(response.result.hello.snapshotVersion)).toBeGreaterThanOrEqual(2);
      await client.wait(message => message.method === 'window/logMessage' && /\[index:2\] end /.test(message.params.message));
      expect((await client.request('phpCompanion/interop/contexts', contextParams)).contexts).toEqual(response.result.contexts);
      expect(await readFile(controller, 'utf8')).toBe(source('current.html.twig'));
    } finally {
      if (server && client && server.exitCode === null && server.signalCode === null) {
        try { await client.request('shutdown', null); client.send({ method: 'exit', params: {} }); }
        catch { server.kill(); }
      }
      if (exited) await exited;
      client?.dispose(); await rm(root, { recursive: true, force: true });
    }
  },
);
