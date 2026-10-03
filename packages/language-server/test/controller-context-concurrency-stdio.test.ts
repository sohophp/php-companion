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

it.each(['7.2', '8.5'])('retains Controller preparation for unchanged watcher events at PHP %s', async phpVersion => {
  const root = await mkdtemp(join(tmpdir(), 'sophp-controller-noop-watch-')); let server: ChildProcessWithoutNullStreams | undefined;
  let output: ReturnType<typeof outputFor> | undefined;
  try {
    await writeFile(join(root, 'composer.json'), JSON.stringify({ autoload: { 'psr-4': { 'App\\': './' } } }));
    const controller = join(root, 'PageController.php'), uri = pathToFileURL(controller).toString();
    const source = (template: string) => `<?php namespace App; class PageController { public function show() { return $this->render('${template}'); } }`;
    await writeFile(controller, source('initial.html.twig'));
    const calls = join(root, 'calls.txt'), provider = join(root, 'provider.mjs');
    await writeFile(provider, `import {appendFileSync,readFileSync} from 'node:fs';let input='';for await(const part of process.stdin)input+=part;const request=JSON.parse(input);appendFileSync(${JSON.stringify(calls)},request.id+'\\n');const documents=new Map((request.params.documents??[]).map(doc=>[doc.uri,doc.source]));const contexts=request.params.projectTypes.flatMap(type=>{const source=documents.get(type.uri)??readFileSync(type.path,'utf8');const template=/render\\('([^']+)'/.exec(source)?.[1];return template?[{template,complete:true,variables:[],sources:[{symbol:type.fqcn+'::show',location:{uri:type.uri,start:type.start,end:type.end,snapshotVersion:request.params.generation}}]}]:[]});process.stdout.write(JSON.stringify({protocolVersion:1,id:request.id,result:{schema:1,providerId:'test.controllers',generation:request.params.generation,complete:true,methods:[],properties:[],literalMethodReturns:[],controllerContexts:contexts}}));`);
    server = spawn(process.execPath, [resolve('../../dist/language-server.js'), '--stdio', '--parser-core-wasm', resolve('../../dist/web-tree-sitter.wasm'), '--php-wasm', resolve('../../dist/tree-sitter-php.wasm')], { stdio: 'pipe' }); output = outputFor(server);
    output.send({ id: 1, method: 'initialize', params: { processId: null, rootUri: pathToFileURL(root).toString(), capabilities: { window: { workDoneProgress: true } }, initializationOptions: { phpVersion, indexingMode: 'onDemand', bundledSemanticProviders: [{ providerId: 'test.controllers', command: process.execPath, args: [provider], requiresProjectTypes: true, acceptsDocumentSnapshots: true, replacesControllerContexts: true }] } } });
    expect((await output.wait(message => message.id === 1 && !message.method)).error).toBeUndefined(); output.send({ method: 'initialized', params: {} });
    const query = async (id: number) => { output!.send({ id, method: 'phpCompanion/interop/contexts', params: { rootUri: pathToFileURL(root).toString() } }); const response = await output!.wait(message => message.id === id && !message.method); expect(response.error).toBeUndefined(); return response.result.contexts.map((context: { template: string }) => context.template); };
    expect(await query(2)).toEqual(['initial.html.twig']); expect(await callsAt(calls)).toHaveLength(1);
    await writeFile(controller, source('initial.html.twig'));
    output.send({ method: 'workspace/didChangeWatchedFiles', params: { changes: [{ uri, type: 2 }, { uri, type: 2 }] } });
    await output.wait(message => message.method === 'window/logMessage' && /\[index:delta\] (?:complete|unchanged)/.test(message.params.message) && message.params.message.includes(uri));
    expect(await query(3)).toEqual(['initial.html.twig']); expect(await callsAt(calls)).toHaveLength(1);
    expect(output.messages.filter(message => message.method === '$/progress' && message.params.value.kind === 'begin' && message.params.value.title === 'Finding Symfony controller contexts')).toHaveLength(1);
    const afterNoop = output.messages.length;
    await writeFile(controller, source('changed.html.twig'));
    output.send({ method: 'workspace/didChangeWatchedFiles', params: { changes: [{ uri, type: 2 }] } });
    expect(await query(4)).toEqual(['changed.html.twig']);
    await until(async () => output!.messages.slice(afterNoop).some(message => message.method === 'window/logMessage' && message.params.message.includes(`[index:delta] complete uri=${uri}`))); expect((await callsAt(calls)).length).toBeGreaterThan(1);
    const beforeDelete = output.messages.length;
    await rm(controller); output.send({ method: 'workspace/didChangeWatchedFiles', params: { changes: [{ uri, type: 3 }] } });
    expect(await query(5)).toEqual([]);
    await until(async () => output!.messages.slice(beforeDelete).some(message => message.method === 'window/logMessage' && message.params.message.includes(`[index:delta] complete uri=${uri}`)));
    const beforeCreate = output.messages.length;
    await writeFile(controller, source('recreated.html.twig')); output.send({ method: 'workspace/didChangeWatchedFiles', params: { changes: [{ uri, type: 1 }] } });
    expect(await query(6)).toEqual(['recreated.html.twig']);
    await until(async () => output!.messages.slice(beforeCreate).some(message => message.method === 'window/logMessage' && message.params.message.includes(`[index:delta] complete uri=${uri}`)));
    expect(await readFile(controller, 'utf8')).toBe(source('recreated.html.twig'));
  } finally { output?.dispose(); server?.kill(); await rm(root, { recursive: true, force: true }); }
});
