import { stat } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { Worker } from 'node:worker_threads';
import type { SourceStamp, SourceStatReply } from './sourceStatWorker.js';

/** Keeps blocking filesystem metadata calls off the language-server event loop. */
export class SourceStatBatches {
  private worker: Worker | undefined;
  private nextId = 0;
  private queue: Array<{ path: string; resolve: (stamp: SourceStamp) => void; reject: (error: Error) => void }> = [];
  private pending = new Map<number, typeof this.queue>();
  private scheduled = false;
  private failed = false;
  private poll: ReturnType<typeof setInterval> | undefined;
  private readonly cancelFlag = new Int32Array(new SharedArrayBuffer(Int32Array.BYTES_PER_ELEMENT));

  constructor(private readonly shouldContinue: () => boolean = () => true,
    private readonly workerPath = resolve(dirname(process.argv[1] ?? ''), 'sourceStatWorker.js')) {}

  inspect = (path: string): Promise<SourceStamp> => {
    if (!this.shouldContinue()) this.fail();
    if (this.failed) return Promise.reject(new Error('Source metadata worker failed.'));
    if (!this.worker) {
      try {
        this.worker = new Worker(this.workerPath, { workerData: this.cancelFlag.buffer });
        this.worker.unref();
        this.worker.on('message', (reply: SourceStatReply) => this.receive(reply));
        this.worker.once('error', () => this.fail());
        this.worker.once('exit', () => this.fail());
        this.poll = setInterval(() => { if (!this.shouldContinue()) this.fail(); }, 25);
        this.poll.unref();
      } catch {
        // Synchronous worker creation failure uses ordinary async stat, preserving completeness checks.
        return stat(path).then(({ size, mtimeMs, ctimeMs }) => ({ size, mtimeMs, ctimeMs }));
      }
    }
    return new Promise<SourceStamp>((done, reject) => {
      this.queue.push({ path, resolve: done, reject });
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
      const id = ++this.nextId;
      this.pending.set(id, batch);
      try { this.worker.postMessage({ id, paths: batch.map(({ path }) => path) }); }
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
    if (this.worker) void this.worker.terminate().catch(() => undefined);
  }
}
