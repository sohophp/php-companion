import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import process from 'node:process';
import { performance } from 'node:perf_hooks';
import { setTimeout as delay } from 'node:timers/promises';
import { expect, it } from 'vitest';
import { runSemanticProvider, type SemanticProviderRunResult } from '../src/index.js';

interface Fixture {
  directory: string;
  controller: AbortController;
  run: Promise<SemanticProviderRunResult>;
  ready: () => Promise<number>;
  release: () => Promise<void>;
  dispose: () => Promise<void>;
}
function alive(pid: number): boolean {
  try { process.kill(pid, 0); return true; }
  catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ESRCH') return false;
    throw error;
  }
}
async function fixture(mode: 'hold' | 'ignore-term' | 'output-limit', timeoutMs = 2_000, preAborted = false): Promise<Fixture> {
  const directory = await mkdtemp(join(tmpdir(), 'semantic-provider-owned-child-'));
  const provider = join(directory, 'provider.mjs');
  await writeFile(provider, String.raw`
import { existsSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
const directory=process.argv[2], mode=process.argv[3];
if(mode!=='hold') process.on('SIGTERM',()=>writeFileSync(join(directory,'term-observed'),'yes'));
let input=''; for await(const part of process.stdin) input+=part;
const request=JSON.parse(input);
writeFileSync(join(directory,'ready.json'),JSON.stringify({pid:process.pid}));
const watchdog=setTimeout(()=>process.exit(4),5000);
const interval=setInterval(()=>{
  if(existsSync(join(directory,'cleanup'))) {clearInterval(interval);clearTimeout(watchdog);process.exitCode=0;return;}
  if(!existsSync(join(directory,'release'))) return;
  clearInterval(interval);
  if(mode==='output-limit') {
    process.stdout.write('x'.repeat(2048));
    const hold=setInterval(()=>{if(existsSync(join(directory,'cleanup'))){clearInterval(hold);clearTimeout(watchdog);}},5);
    return;
  }
  clearTimeout(watchdog);
  process.stdout.write(JSON.stringify({protocolVersion:1,id:request.id,result:{schema:1,providerId:'vendor.abort',generation:request.params.generation,complete:true,methods:[],properties:[],literalMethodReturns:[]}}));
},5);
`);
  const controller = new AbortController(); if (preAborted) controller.abort();
  const run = runSemanticProvider({ providerId: 'vendor.abort', command: process.execPath,
    args: [provider, directory, mode], timeoutMs, maxOutputBytes: 1024 },
  { rootUri: pathToFileURL(directory).toString(), rootPath: directory, generation: '7', phpVersion: '8.5' },
  { signal: controller.signal });
  let pid: number | undefined;
  const ready = async (): Promise<number> => {
    const limit = performance.now() + 1_500;
    while (performance.now() < limit) {
      try {
        const value = JSON.parse(await readFile(join(directory, 'ready.json'), 'utf8')) as { pid: number };
        if (!Number.isSafeInteger(value.pid) || value.pid <= 0) throw new Error('Invalid owned process identity');
        pid = value.pid; return pid;
      } catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
      await delay(2);
    }
    throw new Error('Provider did not reach its controlled ready point');
  };
  const release = async (): Promise<void> => { await writeFile(join(directory, 'release'), 'yes'); };
  const dispose = async (): Promise<void> => {
    await writeFile(join(directory, 'cleanup'), 'yes');
    if (pid === undefined) {
      try { pid = (JSON.parse(await readFile(join(directory, 'ready.json'), 'utf8')) as { pid: number }).pid; }
      catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
    }
    await run;
    const limit = performance.now() + 1_500;
    while (pid !== undefined && alive(pid) && performance.now() < limit) await delay(5);
    if (pid !== undefined && alive(pid)) throw new Error('Owned provider did not exit after fixture cleanup');
    await rm(directory, { recursive: true, force: true });
  };
  return { directory, controller, run, ready, release, dispose };
}

it('does not spawn an already-cancelled provider', async () => {
  const f = await fixture('hold', 100, true);
  try {
    const result = await f.run;
    let spawned = false;
    try { await readFile(join(f.directory, 'ready.json')); spawned = true; }
    catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
    console.log(JSON.stringify({ case: 'pre-abort', result, spawned }));
    expect(result).toMatchObject({ ok: false, code: 'cancelled' }); expect(spawned).toBe(false);
  } finally { await f.dispose(); }
});

it.each(['hold', 'ignore-term'] as const)('reaps a cancelled %s provider within the original 100 ms budget', async mode => {
  const f = await fixture(mode);
  try {
    const pid = await f.ready(); expect(alive(pid)).toBe(true);
    const started = performance.now(); f.controller.abort();
    const result = await Promise.race([f.run, delay(100).then(() => undefined)]);
    const elapsedMs = performance.now() - started, gone = !alive(pid);
    console.log(JSON.stringify({ case: mode, pid, elapsedMs, gone, result }));
    expect(result).toMatchObject({ ok: false, code: 'cancelled' });
    expect(gone).toBe(true); expect(elapsedMs).toBeLessThanOrEqual(100);
  } finally { await f.dispose(); }
});

it('preserves a completed response when its caller aborts afterwards', async () => {
  const f = await fixture('hold');
  try {
    const pid = await f.ready(); await f.release(); const result = await f.run;
    expect(result).toMatchObject({ ok: true, contribution: { providerId: 'vendor.abort', generation: '7' } });
    expect(alive(pid)).toBe(false); f.controller.abort();
    expect(await f.run).toBe(result);
  } finally { await f.dispose(); }
});

it('reaps a deadline-exceeded provider that ignores SIGTERM before returning', async () => {
  const f = await fixture('ignore-term', 2_000);
  try {
    const pid = await f.ready(); const result = await f.run;
    console.log(JSON.stringify({ case: 'timeout', pid, gone: !alive(pid), result }));
    expect(result).toMatchObject({ ok: false, code: 'timeout' }); expect(alive(pid)).toBe(false);
  } finally { await f.dispose(); }
});

it('reaps an output-exceeded provider that ignores SIGTERM before returning', async () => {
  const f = await fixture('output-limit');
  try {
    const pid = await f.ready(); await f.release(); const result = await f.run;
    console.log(JSON.stringify({ case: 'output-limit', pid, gone: !alive(pid), result }));
    expect(result).toMatchObject({ ok: false, code: 'output-limit' }); expect(alive(pid)).toBe(false);
  } finally { await f.dispose(); }
});
