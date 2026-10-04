import { readFileSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { parentPort } from 'node:worker_threads';

export interface SourceStamp { size: number; mtimeMs: number; ctimeMs: number; matchesHash?: boolean; source?: string }
export interface SourceStatBatch { id: number; paths: string[]; expectedHashes?: Array<string | undefined>; maxSourceBytes?: number; readSource?: boolean; cancelBuffer?: SharedArrayBuffer }
export interface SourceStatReply { id: number; stamps: Array<SourceStamp | null> }

parentPort?.on('message', (batch: SourceStatBatch) => {
  const cancelled = batch.cancelBuffer instanceof SharedArrayBuffer ? new Int32Array(batch.cancelBuffer) : undefined;
  const stamps = batch.paths.map((path, index): SourceStamp | null => {
    if (cancelled && Atomics.load(cancelled, 0) !== 0) return null;
    try {
      const info = statSync(path);
      const expected = batch.expectedHashes?.[index];
      const data = (expected || batch.readSource) && info.size <= (batch.maxSourceBytes ?? 0) ? readFileSync(path) : undefined;
      const size = data?.length ?? info.size;
      const withinBudget = size <= (batch.maxSourceBytes ?? 0);
      const matchesHash = expected && data && withinBudget ? createHash('sha256').update(data).digest('hex') === expected : undefined;
      return { size, mtimeMs: info.mtimeMs, ctimeMs: info.ctimeMs, matchesHash,
        source: batch.readSource && data && withinBudget ? data.toString('utf8') : undefined };
    } catch { return null; }
  });
  parentPort?.postMessage({ id: batch.id, stamps } satisfies SourceStatReply);
});
