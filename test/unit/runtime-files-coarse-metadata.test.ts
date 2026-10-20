import { mkdtemp, rm, utimes, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, it, vi } from 'vitest';
import { captureRuntimeFileGuard } from '../../src/refactor/runtimeFiles.js';

const observed = vi.hoisted(() => ({ identities: [] as string[] }));

vi.mock('node:fs/promises', async importOriginal => {
  const actual = await importOriginal<typeof import('node:fs/promises')>();
  return {
    ...actual,
    open: async (...args: Parameters<typeof actual.open>): Promise<Awaited<ReturnType<typeof actual.open>>> => {
      const handle = await actual.open(...args);
      const originalStat = handle.stat.bind(handle);
      Object.defineProperty(handle, 'stat', {
        value: async (...statArgs: Parameters<typeof handle.stat>) => {
          const current = await originalStat(...statArgs);
          // Model a filesystem whose change timestamp cannot separate writes.
          if ('ctimeNs' in current) {
            Object.defineProperty(current, 'ctimeNs', { value: 0n });
            observed.identities.push(['dev', 'ino', 'size', 'mode', 'mtimeNs', 'ctimeNs']
              .map(key => String(Reflect.get(current, key))).join(':'));
          }
          return current;
        },
      });
      return handle;
    },
  };
});

it('rejects changed executable contents even when every identity field is unchanged', async () => {
  const root = await mkdtemp(join(tmpdir(), 'sophp-runtime-coarse-metadata-'));
  const file = join(root, 'php'); const timestamp = new Date('2026-01-01T00:00:00.000Z');
  try {
    await writeFile(file, 'original'); await utimes(file, timestamp, timestamp);
    const unchanged = await captureRuntimeFileGuard([file]);
    expect(await unchanged()).toBe(true);
    await writeFile(file, 'modified'); await utimes(file, timestamp, timestamp);
    expect(await unchanged()).toBe(false);
    expect(observed.identities.length).toBeGreaterThan(0);
    expect(new Set(observed.identities).size).toBe(1);
  } finally { await rm(root, { recursive: true, force: true }); }
});
