import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { once } from 'node:events';
import { performance } from 'node:perf_hooks';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { expect, it } from 'vitest';
import { encodeLspMessage, LspMessageDecoder } from '../../testkit/dist/index.js';

function clientFor(server: ChildProcessWithoutNullStreams): {
  send: (message: object) => void;
  start: (method: string, params: unknown) => { id: number; result: Promise<any> };
  request: (method: string, params: unknown) => Promise<any>;
} {
  let nextId = 0;
  const decoder = new LspMessageDecoder();
  const pending = new Map<number, { resolve: (result: any) => void; reject: (error: Error) => void; timer: ReturnType<typeof setTimeout> }>();
  const send = (message: object): void => { server.stdin.write(encodeLspMessage({ jsonrpc: '2.0', ...message })); };
  server.stdout.on('data', chunk => {
    for (const message of decoder.push(chunk) as any[]) {
      if (message.method && message.id !== undefined) send({ id: message.id, result: null });
      const waiter = pending.get(message.id);
      if (!waiter || message.method) continue;
      clearTimeout(waiter.timer); pending.delete(message.id);
      if (message.error) waiter.reject(new Error(JSON.stringify(message.error))); else waiter.resolve(message.result);
    }
  });
  server.on('exit', (code, signal) => {
    for (const waiter of pending.values()) {
      clearTimeout(waiter.timer); waiter.reject(new Error(`LSP exited ${code}/${signal}`));
    }
    pending.clear();
  });
  const start = (method: string, params: unknown): { id: number; result: Promise<any> } => {
    const id = ++nextId;
    const result = new Promise<any>((resolveRequest, reject) => {
      const timer = setTimeout(() => { pending.delete(id); reject(new Error(`${method} timed out`)); }, 15_000);
      pending.set(id, { resolve: resolveRequest, reject, timer }); send({ id, method, params });
    });
    return { id, result };
  };
  return { send, start, request: (method, params) => start(method, params).result };
}

async function until<T>(check: () => Promise<T | false>, description: string): Promise<T> {
  const deadline = Date.now() + 10_000;
  while (Date.now() < deadline) {
    const value = await check(); if (value !== false) return value;
    await new Promise(done => setTimeout(done, 10));
  }
  throw new Error(`State not reached: ${description}`);
}

const cases = ['7.2', '8.5'].flatMap(phpVersion =>
  ['onDemand', 'progressive', 'experimental'].map(indexingMode => ({ phpVersion, indexingMode })));

it.each(cases)('waits for shared close restoration before Safe Move, with bounded caller cancellation in PHP $phpVersion/$indexingMode', async ({ phpVersion, indexingMode }) => {
  const root = await mkdtemp(join(tmpdir(), 'sophp-safe-move-close-wait-'));
  const arm = join(root, 'arm'), release = join(root, 'release'), held = join(root, 'held.json');
  const files: Record<string, string> = {
    'composer.json': JSON.stringify({ autoload: { 'psr-4': { 'App\\': 'src/' } } }),
    'src/Contract/Runner.php': String.raw`<?php namespace App\Contract; interface Runner { public function run(): void; }`,
    'src/Controller/Consumer.php': String.raw`<?php namespace App\Controller; use App\Contract\Runner; function consume(Runner $runner): void {}`,
    'src/UnrelatedA.php': '<?php namespace App; final class UnrelatedA {}',
    'src/UnrelatedB.php': '<?php namespace App; final class UnrelatedB {}',
    'src/UnrelatedC.php': '<?php namespace App; final class UnrelatedC {}',
  };
  for (const [relative, source] of Object.entries(files)) {
    const path = join(root, relative); await mkdir(dirname(path), { recursive: true }); await writeFile(path, source);
  }
  const preload = join(root, 'close-read.cjs');
  await writeFile(preload, `const fs=require('node:fs'),fsp=require('node:fs/promises');
const {isMainThread}=require('node:worker_threads');const original=fsp.readFile;let used=false;
if(isMainThread){fsp.readFile=async function(file,...args){
 if(!used&&String(file)===${JSON.stringify(join(root, 'src', 'UnrelatedA.php'))}&&fs.existsSync(${JSON.stringify(arm)})){
  used=true;fs.writeFileSync(${JSON.stringify(held)},JSON.stringify({pid:process.pid,stack:new Error('held close restoration').stack}));
  while(!fs.existsSync(${JSON.stringify(release)}))await new Promise(done=>setTimeout(done,10));
 }
 return original.call(this,file,...args);
};require('node:module').syncBuiltinESMExports();}`);
  const runtime = resolve('../../dist');
  const server = spawn(process.execPath, ['--import', pathToFileURL(preload).toString(), resolve('dist/server.js'), '--stdio',
    '--parser-core-wasm', join(runtime, 'web-tree-sitter.wasm'), '--php-wasm', join(runtime, 'tree-sitter-php.wasm')], { stdio: 'pipe' });
  const exited = once(server, 'exit'), client = clientFor(server);
  let stderr = '', complete = false;
  server.stderr.on('data', chunk => { stderr += chunk.toString(); });
  const uri = (relative: string): string => pathToFileURL(join(root, relative)).toString();
  const oldUri = uri('src/Contract/Runner.php'), newUri = uri('src/Service/Runner.php');
  const state = (): Promise<any> => client.request('phpCompanion/testQueryState', { method: 'safeMoveDiskRefresh', uri: oldUri });
  const plan = (): ReturnType<typeof client.start> => client.start('phpCompanion/planSafeMove', { moves: [{ oldUri, newUri }], includeFileOperations: true });
  try {
    await client.request('initialize', { processId: null, capabilities: {}, rootUri: pathToFileURL(root).toString(),
      initializationOptions: { phpVersion, indexingMode, testMode: true } });
    client.send({ method: 'initialized', params: {} });
    for (const [relative, text] of Object.entries(files)) if (relative.endsWith('.php')) {
      client.send({ method: 'textDocument/didOpen', params: { textDocument: { uri: uri(relative), languageId: 'php', version: 1, text } } });
    }
    const baseline = await plan().result;
    expect(baseline.error).toBeUndefined();
    expect(baseline.edit.documentChanges).toContainEqual(expect.objectContaining({ kind: 'rename', oldUri, newUri }));
    await client.request('phpCompanion/testQueryTimings', { reset: true });
    await writeFile(arm, 'hold');
    client.send({ method: 'textDocument/didClose', params: { textDocument: { uri: uri('src/UnrelatedA.php') } } });
    const actualRead = await until(async () => readFile(held, 'utf8').then(text => JSON.parse(text)).catch(() => false), 'actual close source read');
    expect(actualRead.pid).toBe(server.pid); expect(actualRead.stack).toContain('closeDocument');
    expect(await client.request('phpCompanion/testPauseNextQuery', { method: 'safeMoveDiskRefresh' })).toBe(true);
    const moving = plan(); let settled = false;
    void moving.result.then(() => { settled = true; }, () => { settled = true; });
    // The read gate remains held. A source scan here is a real ordering failure,
    // rather than a slow request satisfying the eventual result assertion.
    const observationEnd = Date.now() + 250;
    while (Date.now() < observationEnd) {
      expect((await state()).paused).toBe(false); expect(settled).toBe(false);
      await new Promise(done => setTimeout(done, 10));
    }
    const before = await state();
    for (const name of ['UnrelatedB.php', 'UnrelatedC.php']) {
      client.send({ method: 'textDocument/didClose', params: { textDocument: { uri: uri(`src/${name}`) } } });
    }
    const after = await state(); expect(after.epoch).toBe(before.epoch + 2); expect(after.paused).toBe(false);
    const cancelling = plan(); let cancelledSettled = false;
    const cancelled = cancelling.result.then(result => { cancelledSettled = true; return { result }; }, error => {
      cancelledSettled = true; return { error: String(error) };
    });
    await new Promise(done => setTimeout(done, 20)); expect(cancelledSettled).toBe(false);
    const cancelledAt = performance.now(); client.send({ method: '$/cancelRequest', params: { id: cancelling.id } });
    const response = await cancelled;
    expect(performance.now() - cancelledAt).toBeLessThanOrEqual(100);
    expect('error' in response || response.result.error !== undefined).toBe(true);
    expect('result' in response ? response.result.edit : undefined).toBeUndefined();
    expect(settled).toBe(false); await expect(readFile(release, 'utf8')).rejects.toMatchObject({ code: 'ENOENT' });
    await writeFile(release, 'release');
    const scanned = await until(async () => { const current = await state(); return current.paused ? current : false; }, 'scan after shared close restoration');
    expect(scanned.epoch).toBe(after.epoch);
    expect(await client.request('phpCompanion/testReleaseQuery', { method: 'safeMoveDiskRefresh' })).toBe(true);
    const recovered = await moving.result;
    expect(recovered.error).toBeUndefined(); expect(recovered.edit).toEqual(baseline.edit);
    const timings = await client.request('phpCompanion/testQueryTimings', {});
    expect(timings.safeMoveDiskRefresh).toHaveLength(1);
    expect(timings.safeMoveDiskRefreshEpochRetry ?? []).toEqual([]);
    for (const [relative, source] of Object.entries(files)) expect(await readFile(join(root, relative), 'utf8')).toBe(source);
    complete = true;
  } finally {
    await writeFile(release, 'release');
    try {
      if (complete && server.exitCode === null && server.signalCode === null) {
        await client.request('shutdown', null); client.send({ method: 'exit', params: {} });
        expect((await exited)[0], stderr).toBe(0); expect(stderr).toBe('');
      }
    } finally {
      if (server.exitCode === null && server.signalCode === null) { server.kill(); await exited; }
      await rm(root, { recursive: true, force: true });
    }
  }
}, 60_000);
