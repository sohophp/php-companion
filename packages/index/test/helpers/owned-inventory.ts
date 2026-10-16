import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';

export interface OwnedInventory {
  ready: Promise<void>;
  snapshot(): { phase: 'preparing' | 'prepared' | 'stopped'; completed: number; count: number; root: string };
  dispose(): Promise<void>;
}

// The existing large-inventory case retains its 1000 files, 32 writes per
// batch and original test timeout. Cleanup owns and drains this exact task.
export function beginOwnedInventory(root: string, { count = 1000, write = writeFile }: {
  count?: number;
  write?: (path: string, source: string) => Promise<unknown>;
} = {}): OwnedInventory {
  let disposed = false, completed = 0;
  let phase: 'preparing' | 'prepared' | 'stopped' = 'preparing';
  const cancelled = (): Error & { code: string } => Object.assign(new Error('Owned inventory setup cancelled'), { code: 'TEST_SETUP_CANCELLED' });
  const ready = (async (): Promise<void> => {
    for (let start = 0; start < count; start += 32) {
      if (disposed) throw cancelled();
      const results = await Promise.allSettled(Array.from({ length: Math.min(32, count - start) }, async (_, offset) => {
        await write(join(root, 'src', `Noise${start + offset}.php`), '<?php class Noise {}');
        completed++;
      }));
      const failure = results.find(result => result.status === 'rejected');
      if (failure?.status === 'rejected') throw failure.reason;
      if (disposed) throw cancelled();
    }
    phase = 'prepared';
  })();
  ready.catch(() => { phase = 'stopped'; });
  return {
    ready,
    snapshot: () => ({ phase, completed, count, root }),
    dispose: async (): Promise<void> => {
      disposed = true;
      await ready.catch(() => undefined);
    },
  };
}
