import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { once } from 'node:events';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { performance } from 'node:perf_hooks';
import process from 'node:process';
import { pathToFileURL } from 'node:url';
import { expect, it } from 'vitest';
import type { SemanticProviderDescriptor } from '@php-companion/semantic-provider';
import { encodeLspMessage, LspMessageDecoder } from '../../testkit/dist/index.js';

type Kind = 'container' | 'events' | 'controllers' | 'generic';
interface Call { pid: number; state: string; generation: string; readyTimeNs: string; }
const kinds: Kind[] = ['events', 'controllers', 'generic'];
const configurations = kinds.flatMap(kind => ['7.2', '8.5'].map(phpVersion => ({ kind, phpVersion })));
const source = String.raw`<?php namespace App;
class PageController {
  const INITIAL = 'initial.event'; const SLOW = 'slow.event'; const FAST = 'fast.event';
  public function show() { return $this->render('initial.html.twig'); }
  public function onReady(): void {}
}
function consume(PageController $controller): void { $controller->met; }
`;
function alive(pid: number): boolean {
  try { process.kill(pid, 0); return true; }
  catch (error) { if ((error as NodeJS.ErrnoException).code === 'ESRCH') return false; throw error; }
}
async function until(check: () => Promise<boolean>): Promise<void> {
  const deadline = performance.now() + 10_000;
  while (!await check()) {
    if (performance.now() > deadline) throw new Error('Owned provider did not reach its controlled gate');
    await new Promise(done => setTimeout(done, 5));
  }
}
async function stopped(pid: number): Promise<{ pid: number; gone: boolean; elapsedMs: number }> {
  const start = performance.now();
  while (alive(pid) && performance.now() - start < 100) await new Promise(done => setTimeout(done, 2));
  return { pid, gone: !alive(pid), elapsedMs: performance.now() - start };
}
function clientFor(server: ChildProcessWithoutNullStreams): {
  send: (message: object) => void; start: (method: string, params: unknown, deferSend?: boolean) => { id: number; response: Promise<any> };
  request: (method: string, params: unknown) => Promise<any>; messages: any[]; readonly exiting: boolean;
} {
  const decoder = new LspMessageDecoder(), messages: any[] = [];
  const pending = new Map<number, { done: (value: any) => void; fail: (error: Error) => void; timer: ReturnType<typeof setTimeout> }>();
  let nextId = 0, exiting = false;
  const send = (message: object): void => { if ('method' in message && message.method === 'exit') exiting = true; server.stdin.write(encodeLspMessage({ jsonrpc: '2.0', ...message })); };
  server.stdout.on('data', chunk => {
    for (const message of decoder.push(chunk) as any[]) {
      messages.push(message);
      if (message.id !== undefined && message.method) send({ id: message.id, result: null });
      const waiter = pending.get(message.id);
      if (waiter && !message.method) { clearTimeout(waiter.timer); pending.delete(message.id); waiter.done(message); }
    }
  });
  server.on('exit', (code, signal) => {
    for (const waiter of pending.values()) { clearTimeout(waiter.timer); waiter.fail(new Error(`Owned LSP exited ${code}/${signal}`)); }
    pending.clear();
  });
  const start = (method: string, params: unknown, deferSend = false): { id: number; response: Promise<any> } => {
    const id = ++nextId;
    const response = new Promise<any>((done, fail) => {
      const timer = setTimeout(() => { pending.delete(id); fail(new Error(`${method} timed out`)); }, 15_000);
      pending.set(id, { done, fail, timer });
      if (deferSend) queueMicrotask(() => send({ id, method, params }));
      else send({ id, method, params });
    });
    void response.catch(() => {});
    return { id, response };
  };
  return { send, start, messages, get exiting(): boolean { return exiting; }, request: async (method, params): Promise<any> => {
    const response = await start(method, params).response;
    if (response.error) throw new Error(JSON.stringify(response.error));
    return response.result;
  } };
}
interface ProviderFixture {
  root: string; uri: string; server: ChildProcessWithoutNullStreams; exited: Promise<unknown[]>;
  client: ReturnType<typeof clientFor>; calls: () => Promise<Call[]>;
  providers: (version?: string) => SemanticProviderDescriptor[]; dispose: () => Promise<void>;
}
async function fixture(kind: Kind, phpVersion: string, indexingMode = 'experimental', mode = '', pausePolling = false, traceShutdown = false): Promise<ProviderFixture> {
  const root = await mkdtemp(join(tmpdir(), 'sophp-owned-provider-lifecycle-'));
  await mkdir(join(root, 'src')); await mkdir(join(root, 'config'));
  await writeFile(join(root, 'composer.json'), JSON.stringify({ autoload: { 'psr-4': { 'App\\': 'src/' } } }));
  const php = join(root, 'src/PageController.php'), uri = pathToFileURL(php).toString();
  await writeFile(php, source);
  await writeFile(join(root, 'config/services.yaml'), 'services:\n  App\\PageController:\n    class: App\\PageController\n');
  const provider = join(root, 'lifecycle-provider.mjs'), callsPath = join(root, 'calls.jsonl');
  await writeFile(provider, String.raw`
import { appendFileSync, existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
const [root,kind,mode]=process.argv.slice(2);
process.on('SIGTERM',()=>{
  // Observe the ignored signal without changing cancellation behavior if tracing fails.
  try { appendFileSync(join(root,'signals.jsonl'),JSON.stringify({pid:process.pid,receivedTimeNs:process.hrtime.bigint().toString()})+'\n'); } catch {}
});
let input=''; for await(const chunk of process.stdin) input+=chunk;
const request=JSON.parse(input), phase=request.params.documents?.find(d=>d.uri.endsWith('/lifecycle.yaml'))?.source;
const state=phase??(mode==='replacement'?'fast':mode==='hold-initial'?'hold-initial':'initial');
appendFileSync(join(root,'calls.jsonl'),JSON.stringify({pid:process.pid,state,generation:request.params.generation,readyTimeNs:process.hrtime.bigint().toString()})+'\n');
const watchdog=setTimeout(()=>process.exit(4),15000);
while((state==='slow'||state==='hold-initial')&&!existsSync(join(root,'release-'+process.pid))){
  if(existsSync(join(root,'cleanup'))){clearTimeout(watchdog);process.exit(0);}
  await new Promise(done=>setTimeout(done,5));
}
clearTimeout(watchdog);
const type=request.params.projectTypes?.find(t=>t.fqcn==='App\\PageController');
const facts={schema:1,providerId:request.id.split(':')[0],generation:request.params.generation,complete:true,methods:[],properties:[],literalMethodReturns:[]};
if(kind==='container')Object.assign(facts,{containerServices:[],containerParameters:[],containerMethodArguments:[],containerPropertyArguments:[],containerConfigurationUris:[]});
if(kind==='events'){
  const php=readFileSync(join(root,'src/PageController.php'),'utf8'), event=(state==='hold-initial'?'initial':state)+'.event';
  const eventStart=php.indexOf(event), listenerStart=php.indexOf('onReady');
  Object.assign(facts,{eventSubscriptions:[{subscriberFqcn:'App\\PageController',event,listener:'onReady',uri:type.uri,eventStart,eventEnd:eventStart+event.length,listenerStart,listenerEnd:listenerStart+7}],eventDispatches:[]});
}
if(kind==='controllers')Object.assign(facts,{controllerContexts:[{template:(state==='hold-initial'?'initial':state)+'.html.twig',complete:true,variables:[],sources:[{symbol:type.fqcn+'::show',location:{uri:type.uri,start:type.start,end:type.end,snapshotVersion:request.params.generation}}]}]});
if(kind==='generic')facts.methods.push({ownerFqcn:'App\\PageController',name:'method'+(state==='fast'?'Fast':state==='slow'?'Slow':'Initial'),returnType:'string',uri:type.uri,start:type.start,end:type.end});
process.stdout.write(JSON.stringify({protocolVersion:1,id:request.id,result:facts}));
`);
  const descriptor = (version = mode): SemanticProviderDescriptor => ({ providerId: 'vendor.lifecycle.' + kind, command: process.execPath,
    args: [provider, root, kind, version], requiresProjectTypes: true, acceptsDocumentSnapshots: true, timeoutMs: 10_000,
    ...(kind === 'container' ? { replacesContainerServices: true } : {}),
    ...(kind === 'events' ? { replacesEventRelations: true, requiresContainerServices: true } : {}),
    ...(kind === 'controllers' ? { replacesControllerContexts: true } : {}) });
  const containers = { providerId: 'php-companion.symfony.services', command: process.execPath,
    args: [resolve('../provider-symfony-services/dist/cli.js'), '--parser-core-wasm', resolve('../../dist/web-tree-sitter.wasm'), '--php-wasm', resolve('../../dist/tree-sitter-php.wasm')], replacesContainerServices: true, requiresProjectTypes: true,
    acceptsDocumentSnapshots: true, timeoutMs: 10_000 };
  const providers = (version = mode): SemanticProviderDescriptor[] => [...(kind === 'events' ? [containers] : []), descriptor(version)];
  const runtime = resolve('../../dist');
  const monitor = join(root, 'pause-polling.cjs');
  const monitorParent = pausePolling || traceShutdown;
  if (monitorParent) {
    // Remove the server's 25ms polling opportunity. Snapshot replacement must
    // cancel obsolete work directly, while the host's force-kill timer stays active.
    const monitorSource = String.raw`const interval = global.setInterval;
global.setInterval = (callback, ms, ...args) => interval(ms === 25 ? () => {} : callback, ms, ...args);
if (require('node:path').basename(process.argv[1] || '') === 'language-server.js') {
  // Buffer observations until exit so logging adds no synchronous I/O to cancellation.
  const events = [], now = () => process.hrtime.bigint().toString();
  const record = event => { if (events.length < 128) events.push(event); };
  const children = require('node:child_process'), spawn = children.spawn;
  children.spawn = function (...args) {
    const child = Reflect.apply(spawn, this, args);
    if (!Array.isArray(args[1]) || !args[1].some(arg => typeof arg === 'string' && require('node:path').basename(arg) === 'lifecycle-provider.mjs')) return child;
    record({ event: 'spawn', pid: child.pid, timeNs: now() });
    const kill = child.kill;
    child.kill = function (...signals) {
      const timeNs = now();
      try { return Reflect.apply(kill, this, signals); }
      finally { record({ event: 'kill', pid: child.pid, signal: signals[0] || 'SIGTERM', timeNs }); }
    };
    child.on('exit', (code, signal) => record({ event: 'exit', pid: child.pid, code, signal, timeNs: now() }));
    child.on('close', (code, signal) => record({ event: 'close', pid: child.pid, code, signal, timeNs: now() }));
    return child;
  };
  require('node:module').syncBuiltinESMExports();
  const timeout = global.setTimeout;
  global.setTimeout = function (callback, ms, ...args) {
    if (ms !== 25 || typeof callback !== 'function' || !Function.prototype.toString.call(callback).includes('SIGKILL')) return Reflect.apply(timeout, this, [callback, ms, ...args]);
    const scheduledTimeNs = now();
    const timer = Reflect.apply(timeout, this, [function (...values) {
      const timeNs = now();
      try { return Reflect.apply(callback, this, values); }
      finally { record({ event: 'force-timer-fired', scheduledTimeNs, timeNs }); }
    }, ms, ...args]);
    record({ event: 'force-timer-scheduled', timeNs: scheduledTimeNs });
    return timer;
  };
  process.once('exit', () => {
    try { require('node:fs').writeFileSync(require('node:path').join(__dirname, 'parent-lifecycle.json'), JSON.stringify({ events, limit: 128, limitReached: events.length === 128 })); } catch {}
  });
}`;
    const pollingPatch = 'const interval = global.setInterval;\nglobal.setInterval = (callback, ms, ...args) => interval(ms === 25 ? () => {} : callback, ms, ...args);\n';
    await writeFile(monitor, pausePolling ? monitorSource : monitorSource.replace(pollingPatch, ''));
  }
  const server = spawn(process.execPath, [join(runtime, 'language-server.js'), '--stdio', '--parser-core-wasm', join(runtime, 'web-tree-sitter.wasm'), '--php-wasm', join(runtime, 'tree-sitter-php.wasm')], {
    stdio: 'pipe', ...(monitorParent ? { env: { ...process.env, NODE_OPTIONS: `${process.env.NODE_OPTIONS ?? ''} --require=${monitor}`.trim() } } : {}),
  });
  const exited = once(server, 'exit'), client = clientFor(server); let stderr = '';
  server.stderr.on('data', chunk => { stderr += chunk; });
  const calls = async (): Promise<Call[]> => {
    try { return (await readFile(callsPath, 'utf8')).split('\n').filter(Boolean).map(line => JSON.parse(line) as Call); }
    catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return []; throw error; }
  };
  const dispose = async (): Promise<void> => {
    try {
      await writeFile(join(root, 'cleanup'), 'yes');
      await until(async () => (await calls()).every(call => !alive(call.pid)));
      if (!client.exiting && server.exitCode === null && server.signalCode === null) {
        await client.request('shutdown', null); client.send({ method: 'exit', params: null });
      }
      await exited; expect(stderr).toBe('');
    } finally {
      if (server.exitCode === null && server.signalCode === null) { server.kill(); await exited; }
      const signals = await readFile(join(root, 'signals.jsonl'), 'utf8')
        .then(text => text.split('\n').filter(Boolean).map(line => JSON.parse(line)))
        .catch(error => (error as NodeJS.ErrnoException).code === 'ENOENT' ? []
          : { traceError: (error as NodeJS.ErrnoException).code ?? (error as Error).name });
      console.log(JSON.stringify({ case: 'provider-signal-observation', kind, phpVersion, signals }));
      if (monitorParent) {
        const parentLifecycle = await readFile(join(root, 'parent-lifecycle.json'), 'utf8')
          .then(text => JSON.parse(text))
          .catch(error => ({ traceError: (error as NodeJS.ErrnoException).code ?? (error as Error).name }));
        console.log(JSON.stringify({ case: pausePolling ? 'provider-parent-lifecycle-observation' : 'provider-parent-shutdown-lifecycle-observation', kind, phpVersion, parentLifecycle }));
      }
      await rm(root, { recursive: true, force: true });
    }
  };
  try {
    await client.request('initialize', { processId: null, rootUri: pathToFileURL(root).toString(), capabilities: {},
      initializationOptions: { phpVersion, indexingMode, bundledSemanticProviders: providers() } });
    client.send({ method: 'initialized', params: {} });
    if (indexingMode === 'experimental' && mode !== 'hold-initial') {
      await until(async () => client.messages.some(m => m.method === 'window/logMessage' && /\[index:\d+\] end/.test(m.params.message)));
      expect((await calls()).some(call => call.state === 'initial')).toBe(true);
    }
    return { root, uri, server, exited, client, calls, providers, dispose };
  } catch (error) { await dispose(); throw error; }
}
function snapshot(f: Awaited<ReturnType<typeof fixture>>, state: string, version: number): void {
  f.client.send({ method: 'phpCompanion/frameworkDocumentSnapshots', params: { complete: true, documents: [
    { uri: pathToFileURL(join(f.root, 'config/lifecycle.yaml')).toString(), languageId: 'yaml', source: state, snapshotVersion: String(version) },
  ] } });
}
function commits(f: Awaited<ReturnType<typeof fixture>>, kind: Kind): number {
  return f.client.messages.filter(m => m.method === 'window/logMessage' && m.params.message.includes('vendor.lifecycle.' + kind) && m.params.message.includes('committed')).length;
}
async function newest(f: Awaited<ReturnType<typeof fixture>>, kind: Kind, before: number): Promise<void> {
  await until(async () => commits(f, kind) > before);
  f.client.send({ method: 'textDocument/didOpen', params: { textDocument: { uri: f.uri, languageId: 'php', version: 1, text: source } } });
  const position = (offset: number): { line: number; character: number } => { const lines = source.slice(0, offset).split('\n'); return { line: lines.length - 1, character: lines.at(-1)!.length }; };
  if (kind === 'controllers') {
    const result = await f.client.request('phpCompanion/interop/contexts', { rootUri: pathToFileURL(f.root).toString() });
    expect(result.contexts.map((context: { template: string }) => context.template)).toEqual(['fast.html.twig']);
  } else if (kind === 'generic') {
    const result = await f.client.request('textDocument/completion', { textDocument: { uri: f.uri }, position: position(source.indexOf('->met') + 5) });
    const labels = (Array.isArray(result) ? result : result.items).map((item: { label: string }) => item.label);
    expect(labels).toContain('methodFast'); expect(labels).not.toContain('methodSlow'); expect(labels).not.toContain('methodInitial');
  } else {
    const result = await f.client.request('textDocument/references', { textDocument: { uri: f.uri }, position: position(source.indexOf('PageController') + 2), context: { includeDeclaration: false } });
    const expected = { uri: f.uri, range: { start: position(source.indexOf('fast.event')), end: position(source.indexOf('fast.event') + 10) } };
    expect(result).toContainEqual(expected);
    expect(result).not.toContainEqual({ uri: f.uri, range: { start: position(source.indexOf('slow.event')), end: position(source.indexOf('slow.event') + 10) } });
  }
}
async function assertShutdownPhysicalDeadline(kind: Kind, phpVersion: string, stallClientObserver = false): Promise<void> {
  const f = await fixture(kind, phpVersion, 'experimental', 'hold-initial', false, true);
  try {
    await until(async () => (await f.calls()).length === 1); const call = (await f.calls())[0]!, pid = call.pid;
    let goneAtReply = false;
    const requestedTimeNs = process.hrtime.bigint().toString();
    const shutdown = f.client.start('shutdown', null, stallClientObserver).response.then(response => {
      goneAtReply = !alive(pid); const repliedTimeNs = process.hrtime.bigint().toString();
      f.client.send({ method: 'exit', params: null });
      console.log(JSON.stringify({ case: 'shutdown-reply-observation', kind, phpVersion, pid, goneAtReply, requestedTimeNs, repliedTimeNs }));
      return response;
    });
    // The controlled case delays only the client; the LSP and provider keep running.
    const stall = stallClientObserver
      ? new Promise<void>(done => { setTimeout(() => { const end = performance.now() + 120; while (performance.now() < end) { /* Keep only this test client busy. */ } done(); }, 0); })
      : undefined;
    const observed = await stopped(pid); await stall; console.log(JSON.stringify({ case: 'shutdown-immediate-exit', kind, phpVersion, ...observed,
      requestedTimeNs, providerReadyTimeNs: call.readyTimeNs }));
    expect(observed.gone).toBe(true);
    expect((await shutdown).error).toBeUndefined(); expect(goneAtReply).toBe(true);
    await f.exited;
    const parentLifecycle = JSON.parse(await readFile(join(f.root, 'parent-lifecycle.json'), 'utf8'));
    expect(parentLifecycle.limit).toBe(128); expect(parentLifecycle.limitReached).toBe(false);
    expect(parentLifecycle.events.length).toBeLessThanOrEqual(128);
    const childEvents = parentLifecycle.events.filter((event: any) => event.pid === pid);
    const spawned = childEvents.filter((event: any) => event.event === 'spawn');
    const exits = childEvents.filter((event: any) => event.event === 'exit');
    const closes = childEvents.filter((event: any) => event.event === 'close');
    const terms = childEvents.filter((event: any) => event.event === 'kill' && event.signal === 'SIGTERM');
    const forced = childEvents.filter((event: any) => event.event === 'kill' && event.signal === 'SIGKILL');
    expect(spawned).toHaveLength(1); expect(exits).toHaveLength(1); expect(closes).toHaveLength(1);
    expect(terms).toHaveLength(1); expect(forced.length).toBeLessThanOrEqual(1);
    if (process.platform !== 'win32') { expect(forced).toHaveLength(1); expect(exits[0].signal).toBe('SIGKILL'); }
    expect(BigInt(spawned[0].timeNs) <= BigInt(terms[0].timeNs)).toBe(true);
    expect(BigInt(terms[0].timeNs) <= BigInt(exits[0].timeNs)).toBe(true);
    expect(BigInt(exits[0].timeNs) <= BigInt(closes[0].timeNs)).toBe(true);
    if (forced.length) {
      expect(BigInt(terms[0].timeNs) <= BigInt(forced[0].timeNs)).toBe(true);
      expect(BigInt(forced[0].timeNs) <= BigInt(exits[0].timeNs)).toBe(true);
    }
    const elapsedMs = Number(BigInt(exits[0].timeNs) - BigInt(requestedTimeNs)) / 1_000_000;
    console.log(JSON.stringify({ case: 'shutdown-parent-exit-budget', kind, phpVersion, pid, requestedTimeNs,
      parentExitTimeNs: exits[0].timeNs, parentCloseTimeNs: closes[0].timeNs, parentTermTimeNs: terms[0].timeNs,
      parentKillTimeNs: forced[0]?.timeNs, elapsedMs, observerElapsedMs: observed.elapsedMs,
      gone: observed.gone, goneAtReply, clientObserverStallMs: stall ? 120 : 0 }));
    expect(elapsedMs).toBeGreaterThanOrEqual(0); expect(elapsedMs).toBeLessThanOrEqual(100);
    if (stallClientObserver) expect(observed.elapsedMs).toBeGreaterThan(100);
  } finally { await f.dispose(); }
}
it.each((['container', ...kinds] as Kind[]).flatMap(kind => ['7.2', '8.5'].map(phpVersion => ({ kind, phpVersion }))))(
  'reaps $kind before shutdown replies to an immediate exit client at PHP $phpVersion',
  async ({ kind, phpVersion }) => { await assertShutdownPhysicalDeadline(kind, phpVersion); },
);

it('keeps the physical provider exit deadline when the client observer is delayed', async () => {
  await assertShutdownPhysicalDeadline('generic', '7.2', true);
});
it.each(configurations)('physically cancels superseded $kind snapshots and retains newest facts at PHP $phpVersion', async ({ kind, phpVersion }) => {
  const f = await fixture(kind, phpVersion);
  try {
    const before = commits(f, kind);
    snapshot(f, 'slow', 1); await until(async () => (await f.calls()).some(call => call.state === 'slow'));
    const pid = (await f.calls()).find(call => call.state === 'slow')!.pid; expect(alive(pid)).toBe(true);
    snapshot(f, 'fast', 2); const observed = await stopped(pid);
    console.log(JSON.stringify({ case: 'superseded-snapshot', kind, phpVersion, ...observed }));
    expect(observed.gone).toBe(true); expect(observed.elapsedMs).toBeLessThanOrEqual(100);
    await until(async () => (await f.calls()).some(call => call.state === 'fast'));
    await newest(f, kind, before);
  } finally { await f.dispose(); }
});
it.each(configurations)('cancels replaced $kind snapshots without polling at PHP $phpVersion', async ({ kind, phpVersion }) => {
  const f = await fixture(kind, phpVersion, 'experimental', '', true);
  try {
    const before = commits(f, kind);
    snapshot(f, 'slow', 1); await until(async () => (await f.calls()).some(call => call.state === 'slow'));
    const pid = (await f.calls()).find(call => call.state === 'slow')!.pid; expect(alive(pid)).toBe(true);
    const requestedTimeNs = process.hrtime.bigint().toString();
    snapshot(f, 'fast', 2); const observed = await stopped(pid);
    console.log(JSON.stringify({ case: 'superseded-without-polling', kind, phpVersion, ...observed, requestedTimeNs }));
    expect(observed.gone).toBe(true); expect(observed.elapsedMs).toBeLessThanOrEqual(100);
    await until(async () => (await f.calls()).some(call => call.state === 'fast'));
    await newest(f, kind, before);
  } finally { await f.dispose(); }
});
it.each(configurations)('runs the replacement $kind after cancelling initial provider work at PHP $phpVersion', async ({ kind, phpVersion }) => {
  const f = await fixture(kind, phpVersion, 'experimental', 'hold-initial');
  try {
    await until(async () => (await f.calls()).length === 1); const pid = (await f.calls())[0]!.pid;
    const before = commits(f, kind);
    f.client.send({ method: 'phpCompanion/bundledSemanticProviders', params: { providers: f.providers('replacement') } });
    const observed = await stopped(pid); console.log(JSON.stringify({ case: 'configuration-replacement', kind, phpVersion, ...observed }));
    expect(observed.gone).toBe(true); expect(observed.elapsedMs).toBeLessThanOrEqual(100);
    await until(async () => (await f.calls()).some(call => call.state === 'fast')); await newest(f, kind, before);
  } finally { await f.dispose(); }
});
it.each(['7.2', '8.5'].flatMap(phpVersion => ['one', 'all'].map(ownership => ({ phpVersion, ownership }))))(
  'retains Controller survivors or stops the last cancelled owner at PHP $phpVersion with $ownership', async ({ phpVersion, ownership }) => {
    const f = await fixture('controllers', phpVersion, 'onDemand', 'hold-initial');
    try {
      const first = f.client.start('phpCompanion/interop/contexts', { rootUri: pathToFileURL(f.root).toString() });
      const second = f.client.start('phpCompanion/interop/contexts', { rootUri: pathToFileURL(f.root).toString() });
      await until(async () => (await f.calls()).length === 1); const pid = (await f.calls())[0]!.pid;
      f.client.send({ method: '$/cancelRequest', params: { id: first.id } }); expect((await first.response).result ?? null).toBeNull(); expect(alive(pid)).toBe(true);
      if (ownership === 'all') {
        f.client.send({ method: '$/cancelRequest', params: { id: second.id } }); const observed = await stopped(pid);
        console.log(JSON.stringify({ case: 'controller-all-cancelled', phpVersion, ...observed }));
        expect(observed.gone).toBe(true); expect(observed.elapsedMs).toBeLessThanOrEqual(100); expect((await second.response).result ?? null).toBeNull();
      } else {
        await writeFile(join(f.root, 'release-' + pid), 'yes'); const result = await second.response;
        expect(result.error).toBeUndefined(); expect(result.result.contexts.map((context: { template: string }) => context.template)).toEqual(['initial.html.twig']);
      }
    } finally { await f.dispose(); }
  },
);
