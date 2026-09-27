import { Worker } from 'node:worker_threads';
import { dirname, resolve } from 'node:path';
import type { ComposerProject } from '@php-companion/project';
import type { PortableCandidateSearchInput } from './portableCandidateSearchWorker.js';

export interface CandidatePaths { paths: Set<string>; startedAt: number; }

/** A bounded fallback when ripgrep is unavailable. Worker failure never supplies negative evidence. */
export async function portableCandidatePaths(roots: readonly string[], names: readonly string[], project: ComposerProject,
  shouldContinue: () => boolean, maxFiles: number, timeoutMs = 8_000): Promise<CandidatePaths | undefined> {
  if (!shouldContinue()) return undefined;
  const startedAt = Date.now();
  const cancelled = new SharedArrayBuffer(Int32Array.BYTES_PER_ELEMENT);
  const flag = new Int32Array(cancelled);
  const input: PortableCandidateSearchInput = {
    roots: [...roots], names: [...names], project, maxFiles, deadline: Date.now() + timeoutMs, cancelled,
  };
  const workerPath = resolve(dirname(process.argv[1] ?? ''), 'portableCandidateSearchWorker.js');
  return new Promise((done) => {
    let worker: Worker;
    try { worker = new Worker(workerPath, { workerData: input }); }
    catch { done(undefined); return; }
    worker.unref();
    let finished = false;
    const finish = (paths?: unknown): void => {
      if (finished) return;
      finished = true; clearTimeout(timeout); clearInterval(poll);
      if (!Array.isArray(paths) || paths.some((path) => typeof path !== 'string')) {
        Atomics.store(flag, 0, 1);
        void worker.terminate().catch(() => undefined);
        done(undefined); return;
      }
      done({ paths: new Set(paths), startedAt });
    };
    const timeout = setTimeout(() => finish(), timeoutMs);
    const poll = setInterval(() => { if (!shouldContinue()) finish(); }, 25);
    worker.once('message', (result: { paths?: unknown }) => finish(result?.paths));
    worker.once('error', () => finish());
    worker.once('exit', () => finish());
  });
}
