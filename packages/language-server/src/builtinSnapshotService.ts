// Prepare builtin syntax off the protocol thread; enrich fresh facts on each root.
import { Worker } from 'node:worker_threads';
import { dirname, resolve } from 'node:path';
import type { PhpParserPaths, PreparedPhpDocument } from '@php-companion/parser';

export interface BuiltinDocument { uri: string; source: string; }
interface Response { id: number; json?: string; error?: string; }
export class BuiltinSnapshotService {
  private worker: Worker | undefined;
  private nextId = 0;
  private stopping: Promise<void> = Promise.resolve();
  private closed = false;
  private failed = false;
  private warned = false;
  private waiting = new Map<number, (response: Response | undefined) => void>();
  private cache = new Map<string, string>();

  constructor(private readonly paths?: PhpParserPaths) {}
  private warn(error: unknown): void {
    if (this.warned || this.closed) return;
    this.warned = true;
    process.stderr.write(`[builtin-snapshot-worker] ${String(error)}\n`);
  }
  private start(): void {
    if (this.worker || this.closed || this.failed) return;
    try {
      const worker = new Worker(resolve(dirname(process.argv[1]!), 'builtinSnapshotWorker.js'),
        { workerData: { paths: this.paths } });
      worker.unref();
      this.worker = worker;
      const fail = (error: unknown): void => {
        if (this.worker !== worker) return;
        this.warn(error);
        this.failed = true;
        this.worker = undefined;
        for (const done of this.waiting.values()) done(undefined);
        this.waiting.clear();
        void worker.terminate().catch(() => {});
      };
      worker.on('message', (response: Response) => {
        const done = this.waiting.get(response.id);
        this.waiting.delete(response.id);
        if (response.error) this.warn(response.error);
        // Only serialized immutable facts remain cached after the job.
        if (this.waiting.size === 0 && this.worker === worker) {
          this.worker = undefined;
          this.stopping = worker.terminate().then(() => {}, () => {});
        }
        done?.(response);
      });
      worker.on('error', fail);
      worker.on('exit', code => fail(`Worker exited: ${code}`));
    } catch (error) { this.failed = true; this.warn(error); }
  }
  async prepare(version: string, documents: BuiltinDocument[]): Promise<PreparedPhpDocument[] | undefined> {
    if (this.closed) return undefined;
    const key = JSON.stringify([version, documents.map(document => document.uri)]);
    let json = this.cache.get(key);
    if (json) { this.cache.delete(key); this.cache.set(key, json); }
    else {
      await this.stopping;
      if (this.closed) return undefined;
      this.start();
      if (!this.worker) return undefined;
      const id = ++this.nextId;
      const response = await new Promise<Response | undefined>(done => {
        this.waiting.set(id, done);
        try { this.worker!.postMessage({ id, version, documents }); }
        catch (error) { this.waiting.delete(id); this.warn(error); done(undefined); }
      });
      if (this.closed || !response?.json) return undefined;
      json = response.json;
    }
    try {
      const records: unknown = JSON.parse(json);
      if (!Array.isArray(records) || records.length !== documents.length
        || records.some((record, index) => record?.uri !== documents[index]!.uri
          || record?.source !== documents[index]!.source || record?.prepared?.kind !== 'full'
          || !Array.isArray(record.prepared.controlFlowAssignments)
          || !Array.isArray(record.prepared.facts?.declarations)
          || !Array.isArray(record.prepared.facts?.callables))) throw new Error('Builtin preparation identity mismatch.');
      this.cache.set(key, json);
      while (this.cache.size > 2) this.cache.delete(this.cache.keys().next().value!);
      return records.map(record => record.prepared) as PreparedPhpDocument[];
    } catch (error) { this.cache.delete(key); this.warn(error); return undefined; }
  }
  dispose(): void {
    this.closed = true;
    for (const done of this.waiting.values()) done(undefined);
    this.waiting.clear();
    this.cache.clear();
    const worker = this.worker;
    this.worker = undefined;
    if (worker) void worker.terminate().catch(() => {});
  }
}
