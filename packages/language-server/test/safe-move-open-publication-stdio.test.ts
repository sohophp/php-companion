import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { once } from 'node:events';
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

it.each(cases)('publishes changed opened sources before delayed disk comparisons in PHP $phpVersion/$indexingMode', async ({ phpVersion, indexingMode }) => {
  const root = await mkdtemp(join(tmpdir(), 'sophp-safe-move-open-publication-'));
  const paths = ['A', 'B', 'C'].map(name => join(root, 'src', `${name}.php`));
  const files: Record<string, string> = {
    'composer.json': JSON.stringify({ autoload: { 'psr-4': { 'App\\': 'src/' } } }),
    'src/Contract/Runner.php': String.raw`<?php namespace App\Contract; interface Runner { public function run(): void; }`,
    'src/Consumer.php': String.raw`<?php namespace App; use App\Contract\Runner; function consume(Runner $runner): void {}`,
    'src/A.php': '<?php namespace App; class A {}',
    'src/B.php': '<?php namespace App; class B {}',
    'src/C.php': '<?php namespace App; class C {}',
  };
  for (const [relative, text] of Object.entries(files)) {
    const path = join(root, relative); await mkdir(dirname(path), { recursive: true }); await writeFile(path, text);
  }
  const preload = join(root, 'hold-open.cjs');
  await writeFile(preload, `const fs=require('node:fs'),fsp=require('node:fs/promises');
const {isMainThread}=require('node:worker_threads');const original=fsp.readFile,seen=new Set,paths=${JSON.stringify(paths)};
if(isMainThread){fsp.readFile=async function(file,...args){const path=String(file),i=paths.indexOf(path);
 if(i>=0&&!seen.has(path)&&fs.existsSync(${JSON.stringify(join(root, 'arm'))})){
  seen.add(path);const held=${JSON.stringify(join(root, 'held-'))}+i+'.json';
  fs.writeFileSync(held+'.tmp',JSON.stringify({path,stack:new Error('held open disk comparison').stack}));fs.renameSync(held+'.tmp',held);
  while(!fs.existsSync(${JSON.stringify(join(root, 'release-'))}+i))await new Promise(done=>setTimeout(done,5));
  const result=await original.call(this,file,...args);fs.writeFileSync(${JSON.stringify(join(root, 'completed-'))}+i,'done');return result;
 }
 return original.call(this,file,...args);
};require('node:module').syncBuiltinESMExports();}`);
  // This override binds the identical regression to the preceding compiled server for the red control.
  const entry = process.env.SOPHP_TEST_SAFE_MOVE_SERVER_ENTRY ?? resolve('dist/server.js');
  const runtime = resolve('../../dist');
  const server = spawn(process.execPath, ['--require', preload, entry, '--stdio',
    '--parser-core-wasm', join(runtime, 'web-tree-sitter.wasm'), '--php-wasm', join(runtime, 'tree-sitter-php.wasm')], { stdio: 'pipe' });
  const exited = once(server, 'exit'), client = clientFor(server);
  let stderr = '', completed = false;
  server.stderr.on('data', chunk => { stderr += chunk.toString(); });
  const uri = (relative: string): string => pathToFileURL(join(root, relative)).toString();
  const oldUri = uri('src/Contract/Runner.php'), newUri = uri('src/Service/Runner.php');
  const state = (): Promise<any> => client.request('phpCompanion/testQueryState', { method: 'safeMoveDiskRefresh', uri: oldUri });
  const plan = (): Promise<any> => client.request('phpCompanion/planSafeMove', { moves: [{ oldUri, newUri }], includeFileOperations: true });
  try {
    await client.request('initialize', { processId: null, capabilities: {}, rootUri: pathToFileURL(root).toString(),
      initializationOptions: { phpVersion, indexingMode, testMode: true } });
    client.send({ method: 'initialized', params: {} });
    const baseline = await plan(); expect(baseline.error).toBeUndefined(); expect(baseline.edit).toBeDefined();
    const before = await state(); await writeFile(join(root, 'arm'), 'armed');
    for (const name of ['A', 'B', 'C']) {
      const relative = `src/${name}.php`, text = files[relative]! + '\n// Changed before the move began.\n';
      await writeFile(join(root, relative), text);
      client.send({ method: 'textDocument/didOpen', params: { textDocument: { uri: uri(relative), languageId: 'php', version: 1, text } } });
    }
    for (let i = 0; i < paths.length; i += 1) {
      const held = await until(() => readFile(join(root, `held-${i}.json`), 'utf8').then(text => JSON.parse(text), () => false), `open disk read ${i}`);
      expect(held.path).toBe(paths[i]); expect(held.stack).toContain('server.js:');
    }
    // Publication must include invalidation, even while its disk comparison remains held.
    expect((await state()).epoch).toBe(before.epoch + paths.length);
    await client.request('phpCompanion/testQueryTimings', { reset: true });
    expect(await client.request('phpCompanion/testPauseNextQuery', { method: 'safeMoveDiskRefresh' })).toBe(true);
    const moving = plan(); void moving.catch(() => undefined);
    const scanned = await until(async () => { const s = await state(); return s.paused ? s : false; }, 'move scan');
    for (let i = 0; i < paths.length; i += 1) await writeFile(join(root, `release-${i}`), 'release');
    for (let i = 0; i < paths.length; i += 1) {
      await until(() => readFile(join(root, `completed-${i}`), 'utf8').then(() => true, () => false), `completed open disk read ${i}`);
    }
    expect((await state()).epoch).toBe(scanned.epoch);
    expect(await client.request('phpCompanion/testReleaseQuery', { method: 'safeMoveDiskRefresh' })).toBe(true);
    const result = await moving; expect(result.error).toBeUndefined(); expect(result.edit).toEqual(baseline.edit);
    const timings = await client.request('phpCompanion/testQueryTimings', {});
    expect(timings.safeMoveDiskRefresh).toHaveLength(1); expect(timings.safeMoveDiskRefreshEpochRetry ?? []).toEqual([]);
    await expect(readFile(join(root, 'src/Service/Runner.php'))).rejects.toMatchObject({ code: 'ENOENT' });
    expect(await readFile(join(root, 'src/Contract/Runner.php'), 'utf8')).toBe(files['src/Contract/Runner.php']);
    completed = true;
  } finally {
    for (let i = 0; i < paths.length; i += 1) await writeFile(join(root, `release-${i}`), 'release');
    try {
      if (server.exitCode === null && server.signalCode === null) {
        await client.request('phpCompanion/testReleaseQuery', { method: 'safeMoveDiskRefresh' });
        await client.request('shutdown', null); client.send({ method: 'exit', params: {} });
        expect((await exited)[0], stderr).toBe(0); if (completed) expect(stderr).toBe('');
      }
    } finally {
      if (server.exitCode === null && server.signalCode === null) { server.kill(); await exited; }
      await rm(root, { recursive: true, force: true });
    }
  }
}, 60_000);
