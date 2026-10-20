import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { once } from 'node:events';
import { performance } from 'node:perf_hooks';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { expect, it } from 'vitest';
import { encodeLspMessage, LspMessageDecoder } from '../../testkit/dist/index.js';

const runtime = resolve('../../dist');
function clientFor(server: ChildProcessWithoutNullStreams): {
  send: (message: object) => void; request: (method: string, params: unknown) => Promise<any>; start: (method: string, params: unknown) => { id: number; result: Promise<any> }; messages: any[];
} {
  const messages: any[] = [], decoder = new LspMessageDecoder();
  const pending = new Map<number, { resolve: (value: any) => void; reject: (error: Error) => void; timer: ReturnType<typeof setTimeout> }>();
  let id = 0;
  const send = (message: object): void => { server.stdin.write(encodeLspMessage({ jsonrpc: '2.0', ...message })); };
  server.stdout.on('data', chunk => {
    for (const message of decoder.push(chunk) as any[]) {
      messages.push(message);
      if (message.method && message.id !== undefined) send({ id: message.id, result: null });
      const waiter = pending.get(message.id);
      if (waiter && !message.method) {
        clearTimeout(waiter.timer); pending.delete(message.id);
        if (message.error) waiter.reject(new Error(JSON.stringify(message.error))); else waiter.resolve(message.result);
      }
    }
  });
  server.on('exit', (code, signal) => {
    for (const waiter of pending.values()) { clearTimeout(waiter.timer); waiter.reject(new Error(`LSP exited ${code}/${signal}`)); }
    pending.clear();
  });
  const start = (method: string, params: unknown): { id: number; result: Promise<any> } => {
    const requestId = ++id;
    const result = new Promise<any>((resolveRequest, reject) => {
      const timer = setTimeout(() => { pending.delete(requestId); reject(new Error(`${method} timed out`)); }, 15_000);
      pending.set(requestId, { resolve: resolveRequest, reject, timer }); send({ id: requestId, method, params });
    });
    return { id: requestId, result };
  };
  return { send, messages, start, request: (method, params) => start(method, params).result };
}

const position = (source: string, offset: number): { line: number; character: number } => {
  const lines = source.slice(0, offset).split('\n');
  return { line: lines.length - 1, character: lines.at(-1)!.length };
};
async function fixture(phpVersion: string, indexingMode: string, testMode = false, autowire = false): Promise<{
  root: string; server: ChildProcessWithoutNullStreams; client: ReturnType<typeof clientFor>; stop: () => Promise<void>; calls: () => Promise<any[]>; hold: () => Promise<void>; release: () => Promise<void>;
}> {
  const root = await mkdtemp(join(tmpdir(), 'sophp-service-definition-'));
  await mkdir(join(root, 'src')); await mkdir(join(root, 'config'));
  await writeFile(join(root, 'composer.json'), JSON.stringify({ autoload: { 'psr-4': { 'App\\': 'src/' } } }));
  await writeFile(join(root, 'src', 'Mailer.php'), '<?php namespace App; class Mailer {}');
  await writeFile(join(root, 'src', 'Consumer.php'), autowire
    ? '<?php namespace App; class Consumer { public function __construct(private Mailer $mailer) {} }'
    : '<?php namespace App; class Consumer { public function run(): void {} }');
  if (autowire) await writeFile(join(root, 'src', 'OtherMailer.php'), '<?php namespace App; class OtherMailer extends Mailer {}');
  const config = 'parameters:\n  app.mode: test\nservices:\n  app.mailer: { class: App\\Mailer }\n  App\\Mailer: { alias: app.mailer }\n'
    + (autowire ? '  app.other: { class: App\\OtherMailer }\n  App\\Consumer: { class: App\\Consumer, autowire: true }\n' : '');
  await writeFile(join(root, 'config', 'services.yaml'), `imports:\n  - { resource: extra.php }\n${config}`);
  await writeFile(join(root, 'config', 'extra.php'), '<?php return [];');
  const callsPath = join(root, 'provider-calls.jsonl'), holdPath = join(root, 'hold'), releasePath = join(root, 'release');
  const wrapperPath = join(root, 'gated-provider.mjs');
  const cli = resolve('../provider-symfony-services/dist/cli.js');
  await writeFile(wrapperPath, `import { appendFileSync, existsSync } from 'node:fs';
import { spawn } from 'node:child_process';
let input = ''; for await (const chunk of process.stdin) input += chunk;
const request = JSON.parse(input), held = existsSync(${JSON.stringify(holdPath)});
appendFileSync(${JSON.stringify(callsPath)}, JSON.stringify({pid:process.pid, held, request}) + '\\n');
while (held && !existsSync(${JSON.stringify(releasePath)}) && !existsSync(${JSON.stringify(releasePath)}+'-'+process.pid)) await new Promise(done => setTimeout(done, 10));
const child = spawn(process.execPath, [${JSON.stringify(cli)}, '--parser-core-wasm', ${JSON.stringify(join(runtime, 'web-tree-sitter.wasm'))}, '--php-wasm', ${JSON.stringify(join(runtime, 'tree-sitter-php.wasm'))}], {stdio:['pipe','inherit','inherit']});
child.stdin.end(input); child.on('exit', code => {process.exitCode = code ?? 1;});`);
  const calls = async (): Promise<any[]> => {
    const text = await readFile(callsPath, 'utf8').catch(() => '');
    return text.trim().split('\n').filter(Boolean).map(line => JSON.parse(line));
  };
  const hold = async (): Promise<void> => { await rm(releasePath, {force:true}); await writeFile(holdPath, 'hold'); };
  const release = async (): Promise<void> => { await writeFile(releasePath, 'release'); };
  const server = spawn(process.execPath, [join(runtime, 'language-server.js'), '--stdio',
    '--parser-core-wasm', join(runtime, 'web-tree-sitter.wasm'), '--php-wasm', join(runtime, 'tree-sitter-php.wasm')], { stdio: 'pipe' });
  const exited = once(server, 'exit'), client = clientFor(server);
  let stderr = ''; server.stderr.on('data', chunk => { stderr += chunk.toString(); });
  const stop = async (): Promise<void> => {
    try {
      await release();
      if (server.exitCode === null && server.signalCode === null) {
        await client.request('shutdown', null); client.send({ method: 'exit', params: {} });
        expect((await exited)[0], stderr).toBe(0);
      }
      expect(stderr).toBe('');
    } finally {
      if (server.exitCode === null && server.signalCode === null) { server.kill(); await exited; }
      await rm(root, { recursive: true, force: true });
    }
  };
  try {
    await client.request('initialize', { processId: null, rootUri: pathToFileURL(root).toString(), capabilities: {},
      initializationOptions: { ...(testMode ? { testMode: true } : {}), phpVersion, indexingMode, bundledSemanticProviders: [{
        providerId: 'php-companion.symfony.services', command: process.execPath,
        args: [wrapperPath],
        requiresProjectTypes: true, acceptsDocumentSnapshots: true, replacesContainerServices: true, timeoutMs: 10_000,
      }] } });
    client.send({ method: 'initialized', params: {} });
    return { root, server, client, stop, calls, hold, release };
  } catch (error) { await stop(); throw error; }
}


async function until(check: () => Promise<boolean>): Promise<void> {
  const deadline = Date.now() + 10_000;
  while (!await check()) {
    if (Date.now() > deadline) throw new Error('Container provider gate not reached');
    await new Promise(done => setTimeout(done, 10));
  }
}

it.each(['onDemand', 'progressive'])(
  'waits for a watched service removal before returning member completion in %s', async indexingMode => {
    const f = await fixture('8.5', indexingMode);
    try {
      const text = `<?php namespace Psr\\Container { interface ContainerInterface { public function get(string $id): mixed; } }
namespace App { function run(\\Psr\\Container\\ContainerInterface $container): void { $container->get('app.mailer')->se; } }`;
      await writeFile(join(f.root, 'src', 'Mailer.php'), '<?php namespace App; class Mailer { public function send(): void {} }');
      const uri = pathToFileURL(join(f.root, 'src', 'Consumer.php')).toString();
      const configPath = join(f.root, 'config', 'services.yaml');
      await writeFile(configPath, 'services:\n  app.mailer: { class: App\\Mailer, public: true }\n');
      f.client.send({ method: 'workspace/didChangeWatchedFiles', params: { changes: [
        { uri: pathToFileURL(join(f.root, 'src', 'Mailer.php')).toString(), type: 2 },
        { uri: pathToFileURL(configPath).toString(), type: 2 },
      ] } });
      f.client.send({ method: 'textDocument/didOpen', params: { textDocument: { uri, languageId: 'php', version: 1, text } } });
      const params = { textDocument: { uri }, position: position(text, text.lastIndexOf('->se') + 4) };
      const items = (result: any): any[] => Array.isArray(result) ? result : result?.items ?? [];
      // A real service Definition prepares the actual provider, not a test-only fact.
      await f.client.request('phpCompanion/symfonyServiceDefinition', {
        textDocument: { uri, version: 1 }, source: text, position: position(text, text.indexOf('app.mailer') + 4),
      });
      expect(items(await f.client.request('textDocument/completion', params))).toContainEqual(expect.objectContaining({ label: 'send' }));
      await f.hold();
      const before = (await f.calls()).length;
      await writeFile(configPath, 'services: {}\n');
      f.client.send({ method: 'workspace/didChangeWatchedFiles', params: {
        changes: [{ uri: pathToFileURL(configPath).toString(), type: 2 }],
      } });
      await until(async () => (await f.calls()).length > before);
      const query = f.client.start('textDocument/completion', params);
      const cancel = f.client.start('textDocument/completion', params);
      const cancelledAt = performance.now();
      f.client.send({ method: '$/cancelRequest', params: { id: cancel.id } });
      expect(items(await cancel.result)).toEqual([]);
      expect(performance.now() - cancelledAt).toBeLessThanOrEqual(100);
      let resolved = false;
      void query.result.then(() => { resolved = true; }, () => { resolved = true; });
      // The provider is deliberately held; this is a concurrency guard, not a performance budget.
      await new Promise(done => setTimeout(done, 100));
      expect(resolved, 'Completion returned before the watched service facts were refreshed').toBe(false);
      await f.release();
      expect(items(await query.result)).not.toContainEqual(expect.objectContaining({ label: 'send' }));
    } finally { await f.stop(); }
  },
);

it.each(['7.2', '8.5'])('cancels ordinary completion while a replacement provider rebuild is held at PHP %s', async phpVersion => {
  const f = await fixture(phpVersion, 'progressive');
  try {
    const text = '<?php namespace App; class Consumer {}\nnew Mai';
    const uri = pathToFileURL(join(f.root, 'src', 'Consumer.php')).toString();
    const warmSource = `<?php namespace Psr\\Container { interface ContainerInterface { public function get(string $id); } }
namespace App { class Consumer { public function run(\\Psr\\Container\\ContainerInterface $container): void { $container->get('app.mailer'); } } }`;
    f.client.send({ method: 'textDocument/didOpen', params: { textDocument: { uri, languageId: 'php', version: 1, text: warmSource } } });
    expect(await f.client.request('phpCompanion/symfonyServiceDefinition', {
      textDocument: { uri, version: 1 }, source: warmSource, position: position(warmSource, warmSource.indexOf('app.mailer') + 4),
    })).toHaveLength(1);
    f.client.send({ method: 'textDocument/didChange', params: { textDocument: { uri, version: 2 }, contentChanges: [{ text }] } });
    const params = { textDocument: { uri }, position: position(text, text.length) };
    const items = (result: any): any[] => Array.isArray(result) ? result : result?.items ?? [];
    expect(items(await f.client.request('textDocument/completion', params))).toContainEqual(expect.objectContaining({ label: 'Mailer' }));
    await f.hold(); const before = (await f.calls()).length;
    const wrapper = join(f.root, 'gated-provider.mjs'), replacement = join(f.root, 'replacement-provider.mjs');
    const original = await readFile(wrapper, 'utf8');
    expect(original).toContain('{pid:process.pid, held, request}');
    await writeFile(replacement, original.replace('{pid:process.pid, held, request}', "{pid:process.pid, held, request, providerVersion:'reconciliation'}"));
    f.client.send({ method: 'phpCompanion/bundledSemanticProviders', params: { providers: [{
      providerId: 'php-companion.symfony.services', command: process.execPath, args: [replacement],
      requiresProjectTypes: true, acceptsDocumentSnapshots: true, replacesContainerServices: true, timeoutMs: 10_000,
    }] } });
    await until(async () => (await f.calls()).slice(before).some(call => call.held && call.providerVersion === 'reconciliation'));
    const query = f.client.start('textDocument/completion', params), cancel = f.client.start('textDocument/completion', params);
    let finished = false, cancelFinished = false;
    void query.result.then(() => { finished = true; }, () => { finished = true; });
    void cancel.result.then(() => { cancelFinished = true; }, () => { cancelFinished = true; });
    await new Promise(done => setTimeout(done, 25));
    expect(finished).toBe(false); expect(cancelFinished).toBe(false);
    const cancelledAt = performance.now(); f.client.send({ method: '$/cancelRequest', params: { id: cancel.id } });
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      const response = await Promise.race([cancel.result.then(result => ({ result })),
        new Promise<undefined>(done => { timer = setTimeout(() => done(undefined), 100); })]);
      expect(response, 'Cancellation waited for provider reconciliation').toBeDefined();
      expect(items(response!.result)).toEqual([]);
      expect(performance.now() - cancelledAt).toBeLessThanOrEqual(100);
    } finally { if (timer) clearTimeout(timer); }
    expect(finished).toBe(false);
    await f.release();
    expect(items(await query.result)).toContainEqual(expect.objectContaining({ label: 'Mailer' }));
  } finally { await f.stop(); }
});

it.each(['7.2', '8.5'].flatMap(phpVersion => ['onDemand', 'progressive'].map(indexingMode => ({phpVersion,indexingMode})) ))(
  'keeps first unsaved service navigation while foreground and background overlap at PHP $phpVersion in $indexingMode', async ({phpVersion,indexingMode}) => {
    const f = await fixture(phpVersion, indexingMode);
    try {
      const uri = pathToFileURL(join(f.root, 'src', 'Consumer.php')).toString();
      const initial = '<?php namespace App; class Consumer { public function run(): void {} }';
      const source = `<?php namespace App;
use Symfony\\Component\\DependencyInjection\\Attribute\\Autowire;
class Consumer { public function __construct(#[Autowire(service: "app.mailer")] object $mailer) {} }`;
      const definition = (text: string, version: number): ReturnType<typeof f.client.start> => f.client.start('phpCompanion/symfonyServiceDefinition', {
        textDocument: {uri,version}, source:text, position:position(text,text.indexOf('app.mailer')+4),
      });
      // Prime through a real request and the real services provider.
      const prime = definition(source,0); const expected = await prime.result;
      expect(expected).toHaveLength(1);
      f.client.send({method:'textDocument/didOpen',params:{textDocument:{uri,languageId:'php',version:1,text:initial}}});
      await until(async () => f.client.messages.some(m => m.method==='textDocument/publishDiagnostics' && m.params.uri===uri && m.params.version===1));
      // Settle the open refresh separately from the new unsaved declaration.
      await new Promise(done => setTimeout(done, 500));
      await f.hold(); const before = (await f.calls()).length;
      f.client.send({method:'textDocument/didChange',params:{textDocument:{uri,version:2},contentChanges:[{text:source}]}});
      await until(async () => f.client.messages.some(m => m.method==='textDocument/publishDiagnostics' && m.params.uri===uri && m.params.version===2));
      const first = definition(source,2);
      await until(async () => (await f.calls()).length > before);
      const second = definition(source,2);
      // Keep the real provider in flight across the server's existing 250ms
      // refresh timer. This changes the fixture's provider latency, not a budget.
      await new Promise(done => setTimeout(done, 600));
      const inFlight = (await f.calls()).slice(before);
      // Release only the first actual provider. A later independent provider
      // remains blocked, so stale-result rejection cannot be hidden by its commit.
      await writeFile(join(f.root, 'release')+'-'+inFlight[0].pid, 'release first provider');
      const firstResult = await first.result;
      await f.release();
      const secondResult = await second.result;
      expect(firstResult, JSON.stringify(inFlight)).toEqual(expected);
      expect(secondResult, JSON.stringify(inFlight)).toEqual(expected);
      expect(inFlight).toHaveLength(1);
      expect(inFlight[0].request.params.documents.find((d:any) => d.uri===uri).source).toBe(source);
      expect(await readFile(join(f.root,'src','Consumer.php'),'utf8')).toBe(initial);
    } finally {await f.stop();}
  },
);

const source = `<?php namespace App;
use Symfony\\Component\\DependencyInjection\\Attribute\\Autowire;
class Consumer { public function __construct(#[Autowire(service: "app.mailer")] object $mailer) {} }`;
type Fixture = Awaited<ReturnType<typeof fixture>>;
function definition(f: Fixture, uri: string, version = 2): ReturnType<typeof f.client.start> {
  const text = version >= 2 ? source+'\n// changed body snapshot' : source;
  return f.client.start('phpCompanion/symfonyServiceDefinition', {
    textDocument:{uri,version},source:text,position:position(text,text.indexOf('app.mailer')+4),
  });
}
async function prepared(phpVersion: string): Promise<{f:Fixture;uri:string;expected:any[];before:number}> {
  const f = await fixture(phpVersion,'onDemand',true);
  try {
    const uri = pathToFileURL(join(f.root,'src','Consumer.php')).toString();
    const expected = await definition(f,uri,0).result; expect(expected).toHaveLength(1);
    f.client.send({method:'textDocument/didOpen',params:{textDocument:{uri,languageId:'php',version:1,text:source}}});
    await until(async () => f.client.messages.some(m=>m.method==='textDocument/publishDiagnostics'&&m.params.uri===uri&&m.params.version===1));
    await new Promise(done=>setTimeout(done,600));
    expect(await definition(f,uri,1).result).toEqual(expected);
    await f.hold();const before=(await f.calls()).length;
    // A body-only edit invalidates facts but has no declaration refresh owner.
    f.client.send({method:'textDocument/didChange',params:{textDocument:{uri,version:2},contentChanges:[{text:source+'\n// changed body snapshot'}]}});
    await until(async()=>f.client.messages.some(m=>m.method==='textDocument/publishDiagnostics'&&m.params.uri===uri&&m.params.version===2));
    await new Promise(done=>setTimeout(done,350));
    expect((await f.calls()).length).toBe(before);
    return {f,uri,expected,before};
  } catch(error) {await f.stop();throw error;}
}
async function promptly(result:Promise<any>):Promise<any> {
  let timer:ReturnType<typeof setTimeout>|undefined;
  try {return await Promise.race([result,new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error('Cancelled container caller did not return promptly')),500);})]);}
  finally {if(timer)clearTimeout(timer);}
}
it.each(['7.2','8.5'].flatMap(phpVersion=>['one','all'].map(cancellation=>({phpVersion,cancellation}))))(
  'retains live container waiters and replaces abandoned work at PHP $phpVersion with $cancellation cancelled callers',async({phpVersion,cancellation})=>{
    const {f,uri,expected,before}=await prepared(phpVersion);
    try {
      const first=definition(f,uri);await until(async()=>(await f.calls()).length>before);
      const second=definition(f,uri);await new Promise(done=>setTimeout(done,100));
      let secondFinished=false;void second.result.then(()=>{secondFinished=true;});
      f.client.send({method:'$/cancelRequest',params:{id:first.id}});
      expect(await promptly(first.result)).toEqual([]);
      expect(secondFinished).toBe(false);expect((await f.calls()).slice(before)).toHaveLength(1);
      let survivor=second;
      if(cancellation==='all') {
        f.client.send({method:'$/cancelRequest',params:{id:second.id}});
        expect(await promptly(second.result)).toEqual([]);
        survivor=definition(f,uri);
        await until(async()=>(await f.calls()).length===before+2);
      }
      await f.release();expect(await survivor.result).toEqual(expected);
      expect(await definition(f,uri).result).toEqual(expected);
      expect((await f.calls()).slice(before)).toHaveLength(cancellation==='all'?2:1);
    } finally {await f.stop();}
  },
);

it.each(['7.2','8.5'])('rejects an older container snapshot while the new YAML snapshot remains in flight at PHP %s',async phpVersion=>{
  const {f,uri,expected,before}=await prepared(phpVersion);
  try {
    const first=definition(f,uri);await until(async()=>(await f.calls()).length>before);
    const old=(await f.calls()).at(-1);const yamlPath=join(f.root,'config','services.yaml'),yamlUri=pathToFileURL(yamlPath).toString();
    const changed='# unsaved YAML registration shifted\n'+await readFile(yamlPath,'utf8');
    const logsBefore=f.client.messages.length;
    f.client.send({method:'phpCompanion/frameworkDocumentSnapshots',params:{complete:true,documents:[{uri:yamlUri,languageId:'yaml',snapshotVersion:'new',source:changed}]}});
    await until(async()=>(await f.calls()).length===before+2);
    await writeFile(join(f.root,'release')+'-'+old.pid,'release old');
    expect(await first.result).toEqual([]);
    expect(f.client.messages.slice(logsBefore).some(m=>m.method==='window/logMessage'&&m.params.message.includes('committed authoritative container generation'))).toBe(false);
    const current=definition(f,uri);await f.release();
    const result=await current.result;
    expect(result).toEqual(expected.map(target=>({...target,range:{start:{...target.range.start,line:target.range.start.line+1},end:{...target.range.end,line:target.range.end.line+1}}})));
    expect(await definition(f,uri).result).toEqual(result);
    expect((await f.calls()).slice(before)).toHaveLength(2);
  } finally {await f.stop();}
});

it.each(['7.2','8.5'])('does not join a superseded container provider at PHP %s',async phpVersion=>{
  const {f,uri,expected,before}=await prepared(phpVersion);
  try {
    const first=definition(f,uri);await until(async()=>(await f.calls()).length>before);
    const old=(await f.calls()).at(-1),wrapper=join(f.root,'gated-provider.mjs'),replacement=join(f.root,'replacement-provider.mjs');
    await writeFile(replacement,(await readFile(wrapper,'utf8')).replace('{pid:process.pid, held, request}',"{pid:process.pid, held, providerVersion:'replacement', request}"));
    f.client.send({method:'phpCompanion/bundledSemanticProviders',params:{providers:[{providerId:'php-companion.symfony.services',command:process.execPath,args:[replacement],requiresProjectTypes:true,acceptsDocumentSnapshots:true,replacesContainerServices:true,timeoutMs:10_000}]}});
    expect(await f.client.request('phpCompanion/testSemanticLifecycle',{})).not.toBeNull();
    const fresh=definition(f,uri);await until(async()=>(await f.calls()).length===before+2);
    expect((await f.calls()).at(-1).providerVersion).toBe('replacement');
    await writeFile(join(f.root,'release')+'-'+old.pid,'release superseded');
    expect(await first.result).toEqual([]);
    await f.release();expect(await fresh.result).toEqual(expected);
    expect(await definition(f,uri).result).toEqual(expected);
    expect((await f.calls()).slice(before)).toHaveLength(2);
  } finally {await f.stop();}
});

it.each(['7.2','8.5'])('waits for actual source publication before joining container work at PHP %s',async phpVersion=>{
  const {f,uri,expected,before}=await prepared(phpVersion);
  try {
    const oldQuery=definition(f,uri);await until(async()=>(await f.calls()).length===before+1);
    const old=(await f.calls()).at(-1);
    expect(await f.client.request('phpCompanion/testPauseNextQuery',{method:'openSourcePublication'})).toBe(true);
    const publishedSource=source.replace('class Consumer','class PublishedConsumer');
    f.client.send({method:'textDocument/didChange',params:{textDocument:{uri,version:3},contentChanges:[{text:publishedSource}]}});
    await until(async()=>(await f.client.request('phpCompanion/testQueryState',{method:'openSourcePublication',uri}))?.paused===true);
    const fresh=f.client.start('phpCompanion/symfonyServiceDefinition',{
      textDocument:{uri,version:3},source:publishedSource,position:position(publishedSource,publishedSource.indexOf('app.mailer')+4),
    });
    let freshFinished=false;void fresh.result.then(()=>{freshFinished=true;});
    await new Promise(done=>setTimeout(done,100));
    expect((await f.calls()).slice(before)).toHaveLength(1);
    await writeFile(join(f.root,'release')+'-'+old.pid,'release prior input');
    await oldQuery.result;
    expect(freshFinished).toBe(false);
    expect((await f.calls()).slice(before)).toHaveLength(1);
    expect(await f.client.request('phpCompanion/testReleaseQuery',{method:'openSourcePublication'})).toBe(true);
    await until(async()=>(await f.calls()).length===before+2);
    const current=(await f.calls()).at(-1).request.params;
    expect(current.documents.find((d:any)=>d.uri===uri)).toMatchObject({source:publishedSource,snapshotVersion:'3'});
    expect(current.projectTypes.map((t:any)=>t.fqcn)).toContain('App\\PublishedConsumer');
    expect(current.projectTypes.map((t:any)=>t.fqcn)).not.toContain('App\\Consumer');
    await f.release();expect(await fresh.result).toEqual(expected);
  } finally {
    await f.client.request('phpCompanion/testReleaseQuery',{method:'openSourcePublication'}).catch(()=>undefined);
    await f.stop();
  }
});


function providerAlive(pid:number):boolean {
  try {process.kill(pid,0);return true;}
  catch(error) {if((error as NodeJS.ErrnoException).code==='ESRCH')return false;throw error;}
}
async function observeProviderStop(pid:number):Promise<{pid:number;gone:boolean;elapsedMs:number}> {
  const started=performance.now();
  while(providerAlive(pid)&&performance.now()-started<100) await new Promise(done=>setTimeout(done,2));
  return {pid,gone:!providerAlive(pid),elapsedMs:performance.now()-started};
}
it.each(['7.2','8.5'].flatMap(phpVersion=>['one','all'].map(ownership=>({phpVersion,ownership}))))(
  'preserves the surviving owner or physically stops the abandoned container at PHP $phpVersion with $ownership cancelled owners',async({phpVersion,ownership})=>{
    const {f,uri,expected,before}=await prepared(phpVersion);
    try {
      const first=definition(f,uri);await until(async()=>(await f.calls()).length>before);
      const second=definition(f,uri);await new Promise(done=>setTimeout(done,100));
      const pid=(await f.calls())[before].pid as number;expect(providerAlive(pid)).toBe(true);
      f.client.send({method:'$/cancelRequest',params:{id:first.id}});expect(await promptly(first.result)).toEqual([]);
      expect(providerAlive(pid)).toBe(true);
      if(ownership==='all') {
        f.client.send({method:'$/cancelRequest',params:{id:second.id}});
        const observed=await observeProviderStop(pid);
        console.log(JSON.stringify({case:'all-owners-cancelled',phpVersion,...observed}));
        expect(observed.gone).toBe(true);expect(observed.elapsedMs).toBeLessThanOrEqual(100);
        expect(await promptly(second.result)).toEqual([]);
        const retry=definition(f,uri);await until(async()=>(await f.calls()).length===before+2);
        await f.release();expect(await retry.result).toEqual(expected);
      } else {
        console.log(JSON.stringify({case:'surviving-owner',phpVersion,pid,alive:true}));
        await f.release();expect(await second.result).toEqual(expected);
      }
      expect(await definition(f,uri).result).toEqual(expected);
    } finally {await f.stop();}
  },
);
it.each(['7.2','8.5'])('physically stops the owned container provider during shutdown at PHP %s',async phpVersion=>{
  const {f,uri,before}=await prepared(phpVersion);
  let shutdown:ReturnType<typeof f.client.start>|undefined;
  const exit=once(f.server,'exit');
  try {
    const query=definition(f,uri);void query.result.catch(()=>{});
    await until(async()=>(await f.calls()).length>before);
    const pid=(await f.calls())[before].pid as number;expect(providerAlive(pid)).toBe(true);
    shutdown=f.client.start('shutdown',null);
    const observed=await observeProviderStop(pid);
    console.log(JSON.stringify({case:'shutdown',phpVersion,...observed}));
    expect(observed.gone).toBe(true);expect(observed.elapsedMs).toBeLessThanOrEqual(100);
    expect(await query.result).toEqual([]);
  } finally {
    // Release fixture-controlled legacy children before exiting their LSP owner.
    // This cleanup is outside the measured stop budget and cannot turn it green.
    await f.release();
    await until(async()=>(await f.calls()).every((call:any)=>!providerAlive(call.pid)));
    if(shutdown)await shutdown.result;
    if(f.server.exitCode===null&&f.server.signalCode===null)f.client.send({method:'exit',params:{}});
    await exit;await f.stop();
  }
});


it.each(['experimental', 'progressive', 'onDemand'].flatMap(mode => ['hover', 'definition'].map(query => ({ mode, query }))))(
  'autowire queries wait for current held container facts ($mode/$query)', async ({ mode, query }) => {
    const f = await fixture('8.5', mode, false, true);
    try {
      const uri = pathToFileURL(join(f.root, 'src', 'Consumer.php')).toString();
      const source = await readFile(join(f.root, 'src', 'Consumer.php'), 'utf8');
      expect(await definition(f, uri, 0).result).toHaveLength(1);
      f.client.send({ method: 'textDocument/didOpen', params: { textDocument: { uri, languageId: 'php', version: 1, text: source } } });
      await until(async () => f.client.messages.some(message => message.method === 'textDocument/publishDiagnostics'
        && message.params.uri === uri && message.params.version === 1));
      const params = { textDocument: { uri }, position: position(source, source.indexOf('Mailer $mailer') + 2) };
      const prime = await f.client.request('textDocument/' + query, params);
      if (query === 'hover') expect(prime?.contents?.value, JSON.stringify(prime)).toContain('injects `App\\Mailer`');
      else expect(prime).toEqual([expect.objectContaining({ uri: pathToFileURL(join(f.root, 'src', 'Mailer.php')).toString() })]);
      await f.hold();
      const before = (await f.calls()).length;
      const yamlUri = pathToFileURL(join(f.root, 'config', 'services.yaml')).toString();
      const diskConfig = await readFile(join(f.root, 'config', 'services.yaml'), 'utf8');
      const changed = diskConfig.replace('App\\Mailer: { alias: app.mailer }', 'App\\Mailer: { alias: app.other }');
      expect(changed).not.toBe(diskConfig);
      f.client.send({ method: 'phpCompanion/frameworkDocumentSnapshots', params: { complete: true, documents: [
        { uri: yamlUri, languageId: 'yaml', snapshotVersion: 'new', source: changed },
      ] } });
      const pending = f.client.start('textDocument/' + query, params);
      let settled = false; void pending.result.then(() => { settled = true; });
      await until(async () => (await f.calls()).slice(before).some(call => call.held
        && call.request.params.documents.some((document: any) => document.uri === yamlUri && document.source === changed)));
      const ordinary = await f.client.request('textDocument/hover', {
        textDocument: { uri }, position: position(source, source.indexOf('class Consumer') + 8),
      });
      expect(ordinary?.contents?.value).toContain('Consumer');
      expect(settled).toBe(false);
      await f.release();
      const result = await pending.result;
      if (query === 'hover') expect(result?.contents?.value).toContain('injects `App\\OtherMailer`');
      else expect(result).toEqual([expect.objectContaining({ uri: pathToFileURL(join(f.root, 'src', 'OtherMailer.php')).toString() })]);
      expect(await readFile(join(f.root, 'config', 'services.yaml'), 'utf8')).toBe(diskConfig);
    } finally { await f.release(); await f.stop(); }
  },
);
