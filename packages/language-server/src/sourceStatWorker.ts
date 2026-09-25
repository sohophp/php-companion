import { statSync } from 'node:fs';
import { parentPort, workerData } from 'node:worker_threads';

export interface SourceStamp { size: number; mtimeMs: number; ctimeMs: number }
export interface SourceStatBatch { id: number; paths: string[] }
export interface SourceStatReply { id: number; stamps: Array<SourceStamp | null> }

const cancelled = workerData instanceof SharedArrayBuffer ? new Int32Array(workerData) : undefined;
parentPort?.on('message', (batch: SourceStatBatch) => {
  const stamps = batch.paths.map((path): SourceStamp | null => {
    if (cancelled && Atomics.load(cancelled, 0) !== 0) return null;
    try {
      const info = statSync(path);
      return { size: info.size, mtimeMs: info.mtimeMs, ctimeMs: info.ctimeMs };
    } catch { return null; }
  });
  parentPort?.postMessage({ id: batch.id, stamps } satisfies SourceStatReply);
});
