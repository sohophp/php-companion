import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { it as test } from 'vitest';
import { beginOwnedInventory } from './helpers/owned-inventory.js';

const deferred = (): { promise: Promise<void>; resolve: () => void } => { let resolve!: () => void; const promise = new Promise<void>(done => { resolve = done; }); return { promise, resolve }; };
async function roots(): Promise<string[]> {
  const paths = [await mkdtemp(join(tmpdir(), 'sophp-owned-inventory-a-')), await mkdtemp(join(tmpdir(), 'sophp-owned-inventory-b-'))];
  for (const path of paths) await mkdir(join(path, 'src'));
  return paths;
}

test('keeps an inventory bound to its original directory across a caller root handoff', async () => {
  const [first, next] = await roots(), gate = deferred(), entered = deferred();
  let activeRoot = first, reached = 0;
  const setup = beginOwnedInventory(activeRoot, { count: 33, write: async (path: string, text: string) => {
    await writeFile(path, text);
    if (++reached <= 32) { if (reached === 32) entered.resolve(); await gate.promise; }
  } });
  try {
    await entered.promise; activeRoot = next;
    await writeFile(join(next, 'src/Target.php'), '<?php');
    gate.resolve(); await setup.ready;
    assert.equal((await readdir(join(first, 'src'))).length, 33);
    assert.deepEqual(await readdir(join(activeRoot, 'src')), ['Target.php']);
    assert.equal(await readFile(join(first, 'src/Noise32.php'), 'utf8'), '<?php class Noise {}');
  } finally { gate.resolve(); await setup.dispose(); await rm(first, { recursive: true, force: true }); await rm(next, { recursive: true, force: true }); }
});

test('cancels queued writes and drains the active real batch before allowing cleanup', async () => {
  const [first, next] = await roots(), gate = deferred(), entered = deferred();
  let writes = 0;
  const setup = beginOwnedInventory(first, { write: async (path: string, text: string) => {
    await writeFile(path, text); if (++writes === 32) entered.resolve(); await gate.promise;
  } });
  const outcome = setup.ready.then(() => null, error => error);
  try {
    await entered.promise; let disposed = false;
    const drain = setup.dispose().then(() => { disposed = true; });
    await writeFile(join(next, 'src/Target.php'), '<?php');
    await new Promise(done => setImmediate(done));
    assert.equal(disposed, false);
    gate.resolve(); await drain;
    assert.equal((await outcome)?.code, 'TEST_SETUP_CANCELLED');
    assert.equal(writes, 32); assert.equal(setup.snapshot().completed, 32);
    await rm(first, { recursive: true, force: true });
    assert.deepEqual(await readdir(join(next, 'src')), ['Target.php']);
  } finally { gate.resolve(); await setup.dispose(); await rm(first, { recursive: true, force: true }); await rm(next, { recursive: true, force: true }); }
});

test('propagates a setup error after draining sibling writes instead of leaking work into cleanup', async () => {
  const [first, next] = await roots(), gate = deferred(), entered = deferred();
  let calls = 0, completed = 0, finished = false;
  const failure = new Error('controlled source write failure');
  const setup = beginOwnedInventory(first, { write: async (path: string, text: string) => {
    const ordinal = calls++; await writeFile(path, text); completed++;
    if (completed === 32) entered.resolve();
    if (ordinal === 0) throw failure;
    await gate.promise;
  } });
  const outcome = setup.ready.then(() => { finished = true; return null; }, error => { finished = true; return error; });
  try {
    await entered.promise; await new Promise(done => setImmediate(done));
    assert.equal(finished, false);
    gate.resolve(); assert.equal(await outcome, failure);
    await setup.dispose(); assert.equal(calls, 32); assert.equal(completed, 32);
    await rm(first, { recursive: true, force: true });
    assert.deepEqual(await readdir(join(next, 'src')), []);
  } finally { gate.resolve(); await setup.dispose(); await rm(first, { recursive: true, force: true }); await rm(next, { recursive: true, force: true }); }
});
