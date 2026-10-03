import { readFileSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { parentPort } from 'node:worker_threads';

export interface SourceStamp { size: number; mtimeMs: number; ctimeMs: number; matchesHash?: boolean }
export interface SourceStatBatch { id: number; paths: string[]; expectedHashes?: Array<string | undefined>; maxSourceBytes?: number; cancelBuffer?: SharedArrayBuffer }
export interface SourceStatReply { id: number; stamps: Array<SourceStamp | null> }

parentPort?.on('message', (batch: SourceStatBatch) => {
  const cancelled = batch.cancelBuffer instanceof SharedArrayBuffer ? new Int32Array(batch.cancelBuffer) : undefined;
  const stamps = batch.paths.map((path, index): SourceStamp | null => {
    if (cancelled && Atomics.load(cancelled, 0) !== 0) return null;
    try {
      const info = statSync(path);
      const expected = batch.expectedHashes?.[index];
      const matchesHash = expected && info.size <= (batch.maxSourceBytes ?? 0)
        ? createHash('sha256').update(readFileSync(path)).digest('hex') === expected : undefined;
      return { size: info.size, mtimeMs: info.mtimeMs, ctimeMs: info.ctimeMs, matchesHash };
    } catch { return null; }
  });
  parentPort?.postMessage({ id: batch.id, stamps } satisfies SourceStatReply);
});
