import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { expect, it } from 'vitest';
import { encodeLspMessage, LspMessageDecoder } from '../../testkit/dist/index.js';

function outputFor(server: ChildProcessWithoutNullStreams) {
  const messages: any[] = [], decoder = new LspMessageDecoder();
  const waiters: Array<{ match: (value: any) => boolean; done: (value: any) => void; timer: ReturnType<typeof setTimeout> }> = [];
  const send = (message: object) => server.stdin.write(encodeLspMessage({ jsonrpc: '2.0', ...message }));
  server.stdout.on('data', chunk => {
    for (const message of decoder.push(chunk) as any[]) {
      messages.push(message);
      if (message.method && message.id !== undefined) send({ id: message.id, result: null });
      for (const waiter of [...waiters]) if (waiter.match(message)) {
        waiters.splice(waiters.indexOf(waiter), 1); clearTimeout(waiter.timer); waiter.done(message);
      }
    }
  });
  return { send, messages, wait: (match: (value: any) => boolean): Promise<any> => {
    const found = messages.find(match); if (found) return Promise.resolve(found);
    return new Promise((done, fail) => {
      const waiter = { match, done, timer: setTimeout(() => fail(new Error(`LSP timeout: ${JSON.stringify(messages.slice(-8))}`)), 15_000) };
      waiters.push(waiter);
    });
  }, dispose: () => { for (const waiter of waiters) clearTimeout(waiter.timer); } };
}
async function callsAt(path: string): Promise<string[]> {
  try { return (await readFile(path, 'utf8')).trim().split('\n').filter(Boolean); } catch { return []; }
}
async function until(match: () => Promise<boolean>): Promise<void> {
  const deadline = Date.now() + 10_000;
  while (!await match()) { if (Date.now() > deadline) throw new Error('Provider did not reach gate'); await new Promise(done => setTimeout(done, 10)); }
}

it.each([['7.2', 'one'], ['8.5', 'one'], ['7.2', 'all'], ['8.5', 'all']] as const)('shares concurrent Controller scans at PHP %s with %s cancelled callers', async (phpVersion, cancellation) => {
  const root = await mkdtemp(join(tmpdir(), 'sophp-controller-concurrency-')); let server: ChildProcessWithoutNullStreams | undefined;
  let output: ReturnType<typeof outputFor> | undefined;
  try {
    await writeFile(join(root, 'composer.json'), JSON.stringify({ autoload: { 'psr-4': { 'App\\': './' } } }));
    const controller = join(root, 'PageController.php');
    const source = "<?php namespace App; class PageController { public function show() { return $this->render('page.html.twig'); } }";
    await writeFile(controller, source);
    const calls = join(root, 'calls.txt'), release = join(root, 'release'), provider = join(root, 'provider.mjs');
    await writeFile(provider, `import {appendFileSync,existsSync} from 'node:fs';let input='';for await(const part of process.stdin)input+=part;const request=JSON.parse(input);appendFileSync(${JSON.stringify(calls)},request.id+'\\n');while(!existsSync(${JSON.stringify(release)}))await new Promise(done=>setTimeout(done,10));const type=request.params.projectTypes.find(type=>type.fqcn==='App\\\\PageController');process.stdout.write(JSON.stringify({protocolVersion:1,id:request.id,result:{schema:1,providerId:'test.controllers',generation:request.params.generation,complete:true,methods:[],properties:[],literalMethodReturns:[],controllerContexts:[{template:'page.html.twig',complete:true,variables:[],sources:[{symbol:type.fqcn+'::show',location:{uri:type.uri,start:type.start,end:type.end,snapshotVersion:request.params.generation}}]}]}}));`);
    server = spawn(process.execPath, [resolve('../../dist/language-server.js'), '--stdio', '--parser-core-wasm', resolve('../../dist/web-tree-sitter.wasm'), '--php-wasm', resolve('../../dist/tree-sitter-php.wasm')], { stdio: 'pipe' });
    output = outputFor(server);
    output.send({ id: 1, method: 'initialize', params: { processId: null, rootUri: pathToFileURL(root).toString(), capabilities: { window: { workDoneProgress: true } }, initializationOptions: { phpVersion, indexingMode: 'onDemand', bundledSemanticProviders: [{ providerId: 'test.controllers', command: process.execPath, args: [provider], requiresProjectTypes: true, acceptsDocumentSnapshots: true, replacesControllerContexts: true }] } } });
    expect((await output.wait(message => message.id === 1 && !message.method)).error).toBeUndefined(); output.send({ method: 'initialized', params: {} });
    const query = (id: number) => output!.send({ id, method: 'phpCompanion/interop/contexts', params: { rootUri: pathToFileURL(root).toString() } });
    query(2); query(3);
    await until(async () => (await callsAt(calls)).length >= 1);
    output.send({ method: '$/cancelRequest', params: { id: 2 } });
    const cancelled = await output.wait(message => message.id === 2 && !message.method);
    expect(cancelled.result ?? null).toBeNull();
    expect(output.messages.some(message => message.id === 3 && !message.method)).toBe(false);
    expect(await callsAt(calls)).toHaveLength(1);
    if (cancellation === 'all') {
      output.send({ method: '$/cancelRequest', params: { id: 3 } });
      expect((await output.wait(message => message.id === 3 && !message.method)).result ?? null).toBeNull();
      // Retry before releasing the abandoned provider: it must not join a cancelled task.
      query(4);
      await until(async () => (await callsAt(calls)).length === 2);
    }
    await writeFile(release, 'release');
    const surviving = await output.wait(message => message.id === (cancellation === 'all' ? 4 : 3) && !message.method);
    expect(surviving.error).toBeUndefined(); expect(surviving.result.contexts).toMatchObject([{ template: 'page.html.twig' }]);
    query(5); expect((await output.wait(message => message.id === 5 && !message.method)).result.contexts).toEqual(surviving.result.contexts);
    expect(await callsAt(calls)).toHaveLength(cancellation === 'all' ? 2 : 1);
    const begins = output.messages.filter(message => message.method === '$/progress' && message.params.value.kind === 'begin' && message.params.value.title === 'Finding Symfony controller contexts');
    expect(begins).toHaveLength(cancellation === 'all' ? 2 : 1);
    await until(async () => begins.every(begin => output!.messages.some(message => message.method === '$/progress'
      && message.params.token === begin.params.token && message.params.value.kind === 'end')));
    for (const begin of begins) expect(output.messages.filter(message => message.method === '$/progress'
      && message.params.token === begin.params.token && message.params.value.kind === 'end')).toHaveLength(1);
    expect(await readFile(controller, 'utf8')).toBe(source);
  } finally { output?.dispose(); server?.kill(); await rm(root, { recursive: true, force: true }); }
});
