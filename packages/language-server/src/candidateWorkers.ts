import { availableParallelism } from 'node:os';
import { Worker } from 'node:worker_threads';
import { dirname, resolve } from 'node:path';
import type { PhpParserPaths, PreparedPhpDocument } from '@php-companion/parser';
import type { SourceCandidateSummary } from '@php-companion/index';
import type { SemanticSourceDeclarationSnapshot } from '@php-companion/semantic';
import type { CachedProjectPhpFile } from './projectFacts.js';

export interface CandidatePreparation {
  id: number;
  uri: string;
  hash: string;
  source: string;
  names: string[];
  mode: 'symbol' | 'named-argument';
  deferBodies: boolean;
}

export interface PreparedCandidate {
  id: number;
  uri: string;
  hash: string;
  summary: SourceCandidateSummary;
  matches: boolean;
  declarationsOnly: boolean;
  facts?: PreparedPhpDocument;
}

export interface CandidateRestore {
  kind: 'restore'; id: number; uri: string; hash: string; payload: unknown; deferBodies: boolean;
}

export interface PreparedCandidateRestore {
  kind: 'restored'; id: number; uri: string; hash: string;
  declaration?: SemanticSourceDeclarationSnapshot;
  semantic?: CachedProjectPhpFile;
}

interface WorkerSlot { worker: Worker; pending: number; alive: boolean; }

/** Bounded speculative syntax preparation. Workspace updates remain on the caller's thread. */
export class CandidateWorkers {
  private slots: WorkerSlot[] = [];
  private waiting = new Map<number, (value: unknown) => void>();
  private nextId = 0;
  private disabled = false;
  private warned = false;

  constructor(private readonly paths?: PhpParserPaths) {}

  private start(): void {
    if (this.slots.length || this.disabled) return;
    const path = resolve(dirname(process.argv[1] ?? ''), 'candidateWorker.js');
    for (let index = 0; index < Math.min(8, availableParallelism()); index += 1) {
      try {
        const worker = new Worker(path, { workerData: { paths: this.paths } });
        worker.unref();
        const slot: WorkerSlot = { worker, pending: 0, alive: true };
        worker.on('message', (result: (Partial<PreparedCandidate> | Partial<PreparedCandidateRestore>) & { id: number }) => {
          slot.pending = Math.max(0, slot.pending - 1);
          const resolve = this.waiting.get(result.id); this.waiting.delete(result.id); this.owners.delete(result.id);
          resolve?.(('kind' in result && result.kind === 'restored') || 'facts' in result || 'summary' in result ? result : undefined);
        });
        const fail = (): void => {
          if (!slot.alive) return;
          slot.alive = false;
          // A worker cannot be trusted after an error. Pending tasks fall back
          // to the ordinary source parser when that worker exits.
          for (const [id, resolve] of this.waiting) {
            if (this.owners.get(id) !== slot) continue;
            this.waiting.delete(id); this.owners.delete(id); resolve(undefined);
          }
        };
        worker.on('error', (error) => { this.warn(error); fail(); }); worker.on('exit', fail);
        this.slots.push(slot);
      } catch (error) { this.warn(error); this.disabled = true; break; }
    }
  }

  private owners = new Map<number, WorkerSlot>();

  private warn(error: unknown): void {
    if (this.warned) return;
    this.warned = true;
    process.stderr.write(`[candidate-worker] ${String(error)}\n`);
  }

  prepare(task: Omit<CandidatePreparation, 'id'>): Promise<PreparedCandidate | undefined> {
    this.start();
    const slot = this.slots.filter((candidate) => candidate.alive).sort((left, right) => left.pending - right.pending)[0];
    if (!slot) return Promise.resolve(undefined);
    const id = ++this.nextId; slot.pending += 1;
    return new Promise((done) => {
      this.waiting.set(id, (value) => done(value as PreparedCandidate | undefined)); this.owners.set(id, slot);
      try { slot.worker.postMessage({ id, ...task } satisfies CandidatePreparation); }
      catch { slot.pending -= 1; this.waiting.delete(id); this.owners.delete(id); done(undefined); }
    });
  }

  restore(task: Omit<CandidateRestore, 'id' | 'kind'>): Promise<PreparedCandidateRestore | undefined> {
    this.start();
    const slot = this.slots.filter((candidate) => candidate.alive).sort((left, right) => left.pending - right.pending)[0];
    if (!slot) return Promise.resolve(undefined);
    const id = ++this.nextId; slot.pending += 1;
    return new Promise((done) => {
      this.waiting.set(id, (value) => done(value as PreparedCandidateRestore | undefined)); this.owners.set(id, slot);
      try { slot.worker.postMessage({ kind: 'restore', id, ...task } satisfies CandidateRestore); }
      catch { slot.pending -= 1; this.waiting.delete(id); this.owners.delete(id); done(undefined); }
    });
  }
}
