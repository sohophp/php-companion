import { readFile, stat } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { dirname, resolve } from 'node:path';
import { Worker } from 'node:worker_threads';
import type { SourceStamp, SourceStatReply } from './sourceStatWorker.js';

type WorkerEntry = { worker: Worker; leases: number; idle?: ReturnType<typeof setTimeout> };
const sourceStatWorkers = new Map<string, WorkerEntry>();
let nextSourceStatBatchId = 0;

/** Reuse the worker thread, but keep cancellation and reply ownership private to each scan. */
function leaseSourceStatWorker(path: string): { worker: Worker; release: () => void } {
  let entry = sourceStatWorkers.get(path);
  if (!entry) {
    entry = { worker: new Worker(path), leases: 0 };
    sourceStatWorkers.set(path, entry);
    const current = entry;
    const discard = (): void => {
      if (current.idle) clearTimeout(current.idle);
      if (sourceStatWorkers.get(path) === current) sourceStatWorkers.delete(path);
    };
    current.worker.once('error', discard); current.worker.once('exit', discard);
    current.worker.unref();
    // Each active scan owns short-lived listeners, removed on release.
    current.worker.setMaxListeners(0);
  }
  const current = entry;
  if (current.idle) { clearTimeout(current.idle); current.idle = undefined; }
  current.leases += 1;
  current.worker.ref();
  return { worker: current.worker, release: (): void => {
    current.leases -= 1;
    if (current.leases || sourceStatWorkers.get(path) !== current) return;
    current.worker.unref();
    current.idle = setTimeout(() => {
      if (sourceStatWorkers.get(path) !== current || current.leases) return;
      sourceStatWorkers.delete(path);
      void current.worker.terminate().catch(() => undefined);
    }, 30_000);
    current.idle.unref();
  } };
}

export function sourceStatWorkerCount(): number { return sourceStatWorkers.size; }
export function disposeSourceStatWorkers(): void {
  for (const { worker, idle } of sourceStatWorkers.values()) {
    if (idle) clearTimeout(idle);
    void worker.terminate().catch(() => undefined);
  }
  sourceStatWorkers.clear();
}

/** Keeps blocking filesystem metadata and source hash checks off the language-server event loop. */
export class SourceStatBatches {
  private worker: Worker | undefined;
  private releaseWorker: (() => void) | undefined;
  private readonly onMessage = (reply: SourceStatReply): void => this.receive(reply);
  private readonly onFailure = (): void => this.fail();
  private queue: Array<{ path: string; expectedHash?: string; resolve: (stamp: SourceStamp) => void; reject: (error: Error) => void }> = [];
  private pending = new Map<number, typeof this.queue>();
  private scheduled = false;
  private failed = false;
  private poll: ReturnType<typeof setInterval> | undefined;
  private readonly cancelFlag = new Int32Array(new SharedArrayBuffer(Int32Array.BYTES_PER_ELEMENT));

  constructor(private readonly shouldContinue: () => boolean = () => true,
    private readonly workerPath = resolve(dirname(process.argv[1] ?? ''), 'sourceStatWorker.js'),
    private readonly verification?: { expectedHash: (path: string) => string | undefined; maxSourceBytes: number }) {}

  inspect = (path: string): Promise<SourceStamp> => {
    if (!this.shouldContinue()) this.fail();
    if (this.failed) return Promise.reject(new Error('Source metadata worker failed.'));
    const expectedHash = this.verification?.expectedHash(path);
    if (!this.worker) {
      try {
        const lease = leaseSourceStatWorker(this.workerPath);
        this.worker = lease.worker; this.releaseWorker = lease.release;
        this.worker.on('message', this.onMessage);
        this.worker.once('error', this.onFailure);
        this.worker.once('exit', this.onFailure);
        this.poll = setInterval(() => { if (!this.shouldContinue()) this.fail(); }, 25);
        this.poll.unref();
      } catch {
        // Synchronous worker creation failure uses ordinary async stat, preserving completeness checks.
        return stat(path).then(async ({ size, mtimeMs, ctimeMs }) => ({ size, mtimeMs, ctimeMs,
          matchesHash: expectedHash && size <= this.verification!.maxSourceBytes
            ? createHash('sha256').update(await readFile(path)).digest('hex') === expectedHash : undefined,
        }));
      }
    }
    return new Promise<SourceStamp>((done, reject) => {
      this.queue.push({ path, expectedHash, resolve: done, reject });
      if (!this.scheduled) { this.scheduled = true; setImmediate(() => this.flush()); }
    });
  };

  close(): void {
    this.fail();
  }

  private flush(): void {
    this.scheduled = false;
    if (this.failed || !this.worker) return;
    while (this.queue.length) {
      const batch = this.queue.splice(0, 128);
      const id = ++nextSourceStatBatchId;
      this.pending.set(id, batch);
      try { this.worker.postMessage({ id, cancelBuffer: this.cancelFlag.buffer, paths: batch.map(({ path }) => path),
        expectedHashes: batch.map(({ expectedHash }) => expectedHash), maxSourceBytes: this.verification?.maxSourceBytes }); }
      catch { this.fail(); return; }
    }
  }

  private receive(reply: SourceStatReply): void {
    const batch = this.pending.get(reply.id);
    if (!batch) return;
    this.pending.delete(reply.id);
    if (!Array.isArray(reply.stamps) || reply.stamps.length !== batch.length) {
      this.fail(); return;
    }
    batch.forEach(({ resolve: done, reject }, index) => {
      const stamp = reply.stamps[index];
      if (stamp && Number.isFinite(stamp.size) && Number.isFinite(stamp.mtimeMs) && Number.isFinite(stamp.ctimeMs)) done(stamp);
      else reject(new Error('Source could not be inspected.'));
    });
  }

  private fail(): void {
    if (this.failed) return;
    this.failed = true;
    Atomics.store(this.cancelFlag, 0, 1);
    if (this.poll) clearInterval(this.poll);
    const error = new Error('Source metadata worker failed.');
    for (const item of this.queue) item.reject(error);
    this.queue = [];
    for (const batch of this.pending.values()) for (const item of batch) item.reject(error);
    this.pending.clear();
    if (this.worker) {
      this.worker.off('message', this.onMessage);
      this.worker.off('error', this.onFailure); this.worker.off('exit', this.onFailure);
      this.worker = undefined;
      this.releaseWorker?.(); this.releaseWorker = undefined;
    }
  }
}
