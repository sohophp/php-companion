import { createHash, randomUUID } from 'node:crypto';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdir, mkdtemp, readFile, readdir, rm, symlink, writeFile } from 'node:fs/promises';
import { hostname, tmpdir } from 'node:os';
import { basename, join } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { afterEach, expect, it, vi } from 'vitest';
import { indexComposerSources, type ProjectIndexOptions } from '../src/index.js';
import { EntryStore } from '../src/entry-store.js';
import { acquireCacheCommitLock } from '../src/owned-cache-lock.js';
import { removeBoundedCacheDirectory } from '../src/bounded-cache-removal.js';

const roots: string[] = [];
afterEach(async () => { vi.restoreAllMocks(); await Promise.all(roots.splice(0).map(path => rm(path, { recursive: true, force: true }))); });
async function temporary(): Promise<string> {
  const path = await mkdtemp(join(tmpdir(), 'php-companion-entry-store-')); roots.push(path); return path;
}
interface Fixture { root: string; paths: string[]; directory: string; path: string; options: ProjectIndexOptions; }
async function fixture(): Promise<Fixture> {
  const root = await temporary(); await mkdir(join(root, 'src'));
  await writeFile(join(root, 'composer.json'), JSON.stringify({ autoload: { 'psr-4': { 'App\\': 'src/' } } }));
  const paths = ['A', 'B', 'C'].map(name => join(root, 'src', name + '.php'));
  await Promise.all(paths.map(path => writeFile(path, `<?php class ${basename(path, '.php')} {}`)));
  const directory = join(root, 'cache');
  const options: ProjectIndexOptions = { readConcurrency: 3, onSource: ({ path }) => ({ identity: path, revision: 'original' }),
    cache: { directory, version: 'entry-store-contract', restore: () => true } };
  expect(await indexComposerSources(root, options)).toMatchObject({ files: 3, cached: 0, complete: true, warnings: [] });
  const path = join(directory, (await readdir(directory)).find(name => name.endsWith('.json'))!);
  return { root, paths, directory, path, options };
}

it('rejects an altered immutable blob and rebuilds only its source', async () => {
  const f = await fixture(); const manifest = JSON.parse(await readFile(f.path, 'utf8'));
  expect(manifest.schema).toBe(2);
  expect(Object.values(manifest.entries).every(entry => !Object.hasOwn(entry as object, 'payload'))).toBe(true);
  await writeFile(join(f.path + '.entries', manifest.generation, manifest.entries[f.paths[0]!].payloadHash + '.json'), '{broken');
  const parsed: string[] = [];
  const result = await indexComposerSources(f.root, { ...f.options, onSource: ({ path }) => { parsed.push(path); return { identity: path }; } });
  expect(result).toMatchObject({ files: 3, cached: 2, complete: true }); expect(parsed).toEqual([f.paths[0]]);
  const repaired = JSON.parse(await readFile(f.path, 'utf8'));
  expect(repaired.generation).not.toBe(manifest.generation);
  expect(await readdir(f.path + '.entries')).toEqual([repaired.generation]);
  expect((await indexComposerSources(f.root, f.options)).cached).toBe(3);
});

it('rejects inline payload injection without bypassing the schema 2 descriptor', async () => {
  const f = await fixture(); const manifest = JSON.parse(await readFile(f.path, 'utf8'));
  manifest.entries[f.paths[0]!].payload = { injected: true }; await writeFile(f.path, JSON.stringify(manifest));
  const restored: unknown[] = []; const parsed: string[] = [];
  const result = await indexComposerSources(f.root, { ...f.options, onSource: ({ path }) => { parsed.push(path); return { identity: path }; },
    cache: { ...f.options.cache!, restore: (value): boolean => { restored.push(value); return true; } } });
  expect(result.cached).toBe(2); expect(parsed).toEqual([f.paths[0]]);
  expect(restored.some(value => (value as { injected?: boolean }).injected)).toBe(false);
});

it('restores a legacy inline cache and migrates it to a complete immutable generation', async () => {
  const f = await fixture(); const manifest = JSON.parse(await readFile(f.path, 'utf8'));
  for (const entry of Object.values(manifest.entries) as Array<Record<string, any>>) {
    entry.payload = JSON.parse(await readFile(join(f.path + '.entries', manifest.generation, entry.payloadHash + '.json'), 'utf8'));
    delete entry.payloadHash; delete entry.payloadBytes;
  }
  manifest.schema = 1; delete manifest.generation; await writeFile(f.path, JSON.stringify(manifest));
  const restored: unknown[] = [];
  const result = await indexComposerSources(f.root, { ...f.options, onSource: (): never => { throw new Error('Legacy entries must restore.'); },
    cache: { ...f.options.cache!, restore: (value): boolean => { restored.push(value); return true; } } });
  expect(result).toMatchObject({ cached: 3, complete: true, warnings: [] });
  expect(restored).toEqual(f.paths.map(identity => ({ identity, revision: 'original' })));
  const migrated = JSON.parse(await readFile(f.path, 'utf8')); expect(migrated.schema).toBe(2);
  expect(await readdir(f.path + '.entries')).toEqual([migrated.generation]);
});

it.each([false, true])('preserves prepared payload identity and mutation when preparation rejects=%s', async rejected => {
  const f = await fixture(); const prepared = new Map<string, unknown>();
  const reads = vi.spyOn(EntryStore.prototype, 'payload');
  const result = await indexComposerSources(f.root, { ...f.options, cache: { ...f.options.cache!,
    prepareRestore: (value, source): unknown => {
      (value as { prepared?: string }).prepared = source.uri; prepared.set(source.uri, value);
      if (rejected) throw new Error('Controlled prepare failure.'); return { uri: source.uri };
    },
    restore: (value, source, context): boolean => {
      expect(value === prepared.get(source.uri)).toBe(true); expect((value as { prepared: string }).prepared).toBe(source.uri);
      expect(context).toEqual(rejected ? undefined : { uri: source.uri }); return true;
    } } });
  expect(result).toMatchObject({ cached: 3, warnings: [] }); expect(reads).toHaveBeenCalledTimes(3);
});

it.each(['finalization', 'serialization'])('keeps the entire prior manifest after late %s failure', async failure => {
  const f = await fixture(); const before = await readFile(f.path, 'utf8'); const generations = await readdir(f.path + '.entries');
  const cyclic: Record<string, unknown> = {}; cyclic.self = cyclic;
  const result = await indexComposerSources(f.root, { ...f.options, cache: { ...f.options.cache!, restore: () => false,
    finalizePayload: async (value): Promise<unknown> => {
      if ((value as { identity: string }).identity.endsWith('C.php')) {
        await delay(5); if (failure === 'finalization') throw new Error('Controlled late finalizer rejection.'); return cyclic;
      }
      return value;
    } } });
  expect(result).toMatchObject({ files: 3, complete: true, projectComplete: true });
  expect(result.warnings).toContain('Persistent index cache could not be written.');
  expect(await readFile(f.path, 'utf8')).toBe(before); expect(await readdir(f.path + '.entries')).toEqual(generations);
});

it('refuses a stale writer after a newer writer has committed and released its lock', async () => {
  const f = await fixture(); const newer = await EntryStore.load(f.path, f.root, f.options.cache!.version);
  const stale = await EntryStore.load(f.path, f.root, f.options.cache!.version);
  try {
    const next = new Map([...newer.previous].map(([path, entry]) => [path, { ...entry, payload: { revision: 'newest' } }]));
    expect(await newer.commit(next)).toBe(true); const published = await readFile(f.path, 'utf8');
    await expect(stale.commit(new Map(stale.previous))).rejects.toMatchObject({ code: 'EEXIST' });
    expect(await readFile(f.path, 'utf8')).toBe(published);
    const restored = await EntryStore.load(f.path, f.root, f.options.cache!.version);
    try { for (const entry of restored.previous.values()) expect(await restored.payload(entry)).toEqual({ revision: 'newest' }); }
    finally { await restored.dispose(); }
  } finally { await Promise.all([newer.dispose(), stale.dispose()]); }
});

function deferred(): { promise: Promise<void>; resolve: () => void } {
  let resolve!: () => void; const promise = new Promise<void>(done => { resolve = done; }); return { promise, resolve };
}
async function deadOwner(path: string, legacy: boolean): Promise<void> {
  expect(() => process.kill(2147483647, 0)).toThrow(); const token = randomUUID();
  const text = JSON.stringify({ pid: 2147483647, hostname: hostname(), token });
  if (legacy) await writeFile(path, text);
  else { await mkdir(path); await writeFile(join(path, `owner-${token}.json`), text); }
}
it.each([false, true])('a delayed recovery cannot unlink the new owner (legacy=%s)', async legacy => {
  const root = await temporary(); const path = join(root, 'commit.lock'); await deadOwner(path, legacy);
  const observed = deferred(); const resume = deferred();
  const pause = async (): Promise<void> => { observed.resolve(); await resume.promise; };
  const first = acquireCacheCommitLock(path, legacy ? { beforeLegacyOwnerUnlink: pause } : { beforeDeadOwnerUnlink: pause });
  const outcome = first.then(value => ({ value, error: undefined }), error => ({ value: undefined, error }));
  await observed.promise; const winner = await acquireCacheCommitLock(path); resume.resolve();
  try {
    expect((await outcome).error).toMatchObject({ code: 'EEXIST' });
    expect(JSON.parse(await readFile(join(path, winner.filename), 'utf8')).token).toBe(winner.token);
    await expect(acquireCacheCommitLock(path)).rejects.toMatchObject({ code: 'EEXIST' });
  } finally { resume.resolve(); await winner.release(); }
});

it('release cannot remove a new owner published after the old unique owner file was removed', async () => {
  const root = await temporary(); const path = join(root, 'commit.lock'); const removed = deferred(); const resume = deferred();
  const first = await acquireCacheCommitLock(path, { afterOwnedFileRemoved: async (): Promise<void> => { removed.resolve(); await resume.promise; } });
  const releasing = first.release(); await removed.promise; const winner = await acquireCacheCommitLock(path); resume.resolve();
  try { await releasing; expect(JSON.parse(await readFile(join(path, winner.filename), 'utf8')).token).toBe(winner.token); }
  finally { resume.resolve(); await winner.release(); }
});

it('retains a real live process owner and recovers its lock only after the process exits', async () => {
  const root = await temporary(); const path = join(root, 'commit.lock'); const token = randomUUID();
  const program = `const fs=require('node:fs'); const os=require('node:os'); const path=require('node:path');
const [file,token]=process.argv.slice(1);fs.mkdirSync(file);fs.writeFileSync(path.join(file,'owner-'+token+'.json'),JSON.stringify({pid:process.pid,hostname:os.hostname(),token}));process.send('ready');setInterval(()=>{},1000);`;
  const child = spawn(process.execPath, ['-e', program, path, token], { stdio: ['ignore', 'ignore', 'pipe', 'ipc'] });
  try {
    expect((await once(child, 'message'))[0]).toBe('ready');
    await expect(acquireCacheCommitLock(path)).rejects.toMatchObject({ code: 'EEXIST' });
    const exit = once(child, 'exit'); child.kill(); await exit;
    const recovered = await acquireCacheCommitLock(path);
    try { expect(recovered.token).not.toBe(token); }
    finally { await recovered.release(); }
  } finally { if (child.exitCode === null && child.signalCode === null) { const exit = once(child, 'exit'); child.kill(); await exit; } }
});

it('bounds pending cleanup operations across nested directories', async () => {
  const root = await temporary(); const target = join(root, 'generation'); await mkdir(join(target, 'nested'), { recursive: true });
  await Promise.all(Array.from({ length: 20 }, (_, i) => writeFile(join(target, i < 10 ? 'nested' : '.', `${i}.json`), 'payload')));
  let active = 0; let peak = 0;
  const result = await removeBoundedCacheDirectory(target, { concurrency: 2, beforeRemove: async (): Promise<void> => {
    active++; peak = Math.max(peak, active); await delay(1); active--;
  } });
  expect(result).toMatchObject({ filesRemoved: 20, directoriesRemoved: 2, concurrency: 2 });
  expect(peak).toBeLessThanOrEqual(2); expect(active).toBe(0); expect(await readdir(root)).toEqual([]);
});

it('settles already-started cleanup work before reporting a failed leaf', async () => {
  const root = await temporary(); const target = join(root, 'generation'); await mkdir(target);
  await Promise.all(['a', 'b', 'c'].map(name => writeFile(join(target, name), name)));
  let active = 0; let started = 0;
  await expect(removeBoundedCacheDirectory(target, { concurrency: 2, beforeRemove: async (): Promise<void> => {
    active++; const number = ++started;
    try { if (number === 1) throw new Error('Controlled unlink failure.'); await delay(5); }
    finally { active--; }
  } })).rejects.toThrow('Controlled unlink failure.');
  expect(active).toBe(0); expect(started).toBeLessThanOrEqual(2);
});

it.skipIf(process.platform === 'win32')('cleanup removes a symlink without touching its target', async () => {
  const root = await temporary(); const target = join(root, 'generation'); const outside = join(root, 'outside');
  await mkdir(target); await mkdir(outside); await writeFile(join(outside, 'keep'), 'unchanged');
  await symlink(outside, join(target, 'link')); await removeBoundedCacheDirectory(target);
  expect(await readFile(join(outside, 'keep'), 'utf8')).toBe('unchanged');
});

it('records valid checksums for every published immutable payload', async () => {
  const f = await fixture(); const manifest = JSON.parse(await readFile(f.path, 'utf8'));
  for (const entry of Object.values(manifest.entries) as Array<{ payloadHash: string; payloadBytes: number }>) {
    const bytes = await readFile(join(f.path + '.entries', manifest.generation, entry.payloadHash + '.json'));
    expect(bytes.length).toBe(entry.payloadBytes); expect(createHash('sha256').update(bytes).digest('hex')).toBe(entry.payloadHash);
  }
});
