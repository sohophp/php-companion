import { createHash } from 'node:crypto';
import { mkdtemp, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterEach, expect, it, vi } from 'vitest';
import { disposeSourceStatWorkers, sourceStatWorkerCount, SourceStatBatches } from '../src/sourceStatBatches.js';

let root: string | undefined;
afterEach(async () => { vi.useRealTimers(); disposeSourceStatWorkers(); if (root) await rm(root, { recursive: true, force: true }); });

it('returns filesystem stamps and promptly rejects pending inspections after cancellation', async () => {
  root = await mkdtemp(join(tmpdir(), 'sophp-stat-cancel-'));
  const path = join(root, 'Source.php');
  await writeFile(path, '<?php');
  let live = true;
  const batches = new SourceStatBatches(() => live, resolve('dist/sourceStatWorker.js'));
  try {
    const expected = await stat(path);
    expect(await batches.inspect(path)).toEqual({ size: expected.size, mtimeMs: expected.mtimeMs, ctimeMs: expected.ctimeMs });
    const pending = batches.inspect(path);
    const rejected = expect(pending).rejects.toThrow('Source metadata worker failed.');
    live = false;
    await expect(batches.inspect(path)).rejects.toThrow('Source metadata worker failed.');
    await rejected;
  } finally { batches.close(); }
});

it('verifies cached bytes independently of timestamps and never hashes over the file budget', async () => {
  root = await mkdtemp(join(tmpdir(), 'sophp-stat-hash-'));
  const path = join(root, 'Receipt.php');
  const original = '<?php class Receipt {}';
  await writeFile(path, original);
  const hash = createHash('sha256').update(original).digest('hex');
  const batches = new SourceStatBatches(() => true, resolve('dist/sourceStatWorker.js'), {
    expectedHash: (): string => hash, maxSourceBytes: Buffer.byteLength(original),
  });
  try {
    expect((await batches.inspect(path)).matchesHash).toBe(true);
    await writeFile(path, '<?php class Removed {}'); // Same bytes, different declaration.
    expect((await batches.inspect(path)).matchesHash).toBe(false);
    await writeFile(path, original);
    expect((await batches.inspect(path)).matchesHash).toBe(true);
    await writeFile(path, original + ' ');
    expect((await batches.inspect(path)).matchesHash).toBeUndefined();
    await rm(path);
    await expect(batches.inspect(path)).rejects.toThrow('Source could not be inspected.');
  } finally { batches.close(); }
});

it('reads current UTF-8 source within the byte budget without requiring a prior hash', async () => {
  root = await mkdtemp(join(tmpdir(), 'sophp-stat-source-'));
  const path = join(root, 'Source.php'); const source = '<?php // 中文\n';
  await writeFile(path, source);
  const batches = new SourceStatBatches(() => true, resolve('dist/sourceStatWorker.js'), {
    readSource: true, maxSourceBytes: Buffer.byteLength(source),
  });
  try {
    expect(await batches.inspect(path)).toMatchObject({ source, size: Buffer.byteLength(source) });
    await writeFile(path, '');
    expect(await batches.inspect(path)).toMatchObject({ source: '', size: 0 });
    await writeFile(path, source + ' ');
    const oversized = await batches.inspect(path);
    expect(oversized.size).toBe(Buffer.byteLength(source) + 1); expect(oversized.source).toBeUndefined();
    await rm(path);
    await expect(batches.inspect(path)).rejects.toThrow('Source could not be inspected.');
  } finally { batches.close(); }
});

it('reuses a worker across scans while cancelling only the owning scan', async () => {
  root = await mkdtemp(join(tmpdir(), 'sophp-stat-reuse-'));
  const path = join(root, 'Source.php'); await writeFile(path, '<?php');
  let firstLive = true;
  const first = new SourceStatBatches(() => firstLive, resolve('dist/sourceStatWorker.js'));
  const second = new SourceStatBatches(() => true, resolve('dist/sourceStatWorker.js'));
  try {
    await first.inspect(path);
    const firstPending = first.inspect(path);
    const rejected = expect(firstPending).rejects.toThrow('Source metadata worker failed.');
    const secondPending = second.inspect(path);
    expect(sourceStatWorkerCount()).toBe(1);
    await new Promise<void>(done => setImmediate(done)); // Both scans have dispatched their own batches.
    firstLive = false;
    await expect(first.inspect(path)).rejects.toThrow('Source metadata worker failed.');
    await rejected;
    expect((await secondPending).size).toBe(5);
    first.close(); second.close();
    const third = new SourceStatBatches(() => true, resolve('dist/sourceStatWorker.js'));
    try {
      expect((await third.inspect(path)).size).toBe(5);
      expect(sourceStatWorkerCount()).toBe(1);
      disposeSourceStatWorkers();
      await expect(third.inspect(path)).rejects.toThrow();
    } finally { third.close(); }
    expect(sourceStatWorkerCount()).toBe(0);
    const recovered = new SourceStatBatches(() => true, resolve('dist/sourceStatWorker.js'));
    try { expect((await recovered.inspect(path)).size).toBe(5); }
    finally { recovered.close(); }
  } finally { first.close(); second.close(); }
});

it('releases idle workers after the reuse window', async () => {
  root = await mkdtemp(join(tmpdir(), 'sophp-stat-idle-'));
  const path = join(root, 'Source.php'); await writeFile(path, '<?php');
  const batches = new SourceStatBatches(() => true, resolve('dist/sourceStatWorker.js'));
  try {
    await batches.inspect(path);
    vi.useFakeTimers({ toFake: ['setTimeout'] });
    batches.close();
    expect(sourceStatWorkerCount()).toBe(1);
    await vi.advanceTimersByTimeAsync(30_000);
    expect(sourceStatWorkerCount()).toBe(0);
  } finally { vi.useRealTimers(); batches.close(); }
});

it('shares a bounded parallel pool while keeping cancellation and hash replies owned by each scan', async () => {
  root = await mkdtemp(join(tmpdir(), 'sophp-stat-pool-'));
  const paths = await Promise.all(Array.from({ length: 128 }, async (_, index) => {
    const path = join(root!, `Source${index}.php`); await writeFile(path, `<?php // ${index}`); return path;
  }));
  const hashes = new Map(paths.map((path, index) => [path, createHash('sha256').update(`<?php // ${index}`).digest('hex')]));
  const verification = { expectedHash: (path: string): string | undefined => hashes.get(path), maxSourceBytes: 1024, parallelism: 4 as const };
  let live = true;
  const first = new SourceStatBatches(() => live, resolve('dist/sourceStatWorker.js'), verification);
  const second = new SourceStatBatches(() => true, resolve('dist/sourceStatWorker.js'), verification);
  try {
    expect((await Promise.all(paths.map(first.inspect))).every(stamp => stamp.matchesHash === true)).toBe(true);
    expect(sourceStatWorkerCount()).toBe(4);
    await writeFile(paths[3]!, '<?php // x');
    const cancelled = Promise.all(paths.map(first.inspect));
    const rejected = expect(cancelled).rejects.toThrow('Source metadata worker failed.');
    const current = Promise.all(paths.map(second.inspect));
    await new Promise<void>(done => setImmediate(done));
    live = false; await expect(first.inspect(paths[0]!)).rejects.toThrow('Source metadata worker failed.');
    await rejected;
    const stamps = await current;
    expect(stamps[3]!.matchesHash).toBe(false);
    expect(stamps.filter((_, index) => index !== 3).every(stamp => stamp.matchesHash === true)).toBe(true);
    expect(sourceStatWorkerCount()).toBe(4);
  } finally { first.close(); second.close(); }
});
