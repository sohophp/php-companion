import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { EventEmitter } from 'node:events';

const state = vi.hoisted(() => ({ workers: [] as Array<EventEmitter & { sent?: { id: number } }> }));
vi.mock('node:os', () => ({ availableParallelism: (): number => 1 }));
vi.mock('node:worker_threads', async () => {
  const { EventEmitter } = await import('node:events');
  return { Worker: class extends EventEmitter {
    sent?: { id: number };
    constructor() { super(); state.workers.push(this); }
    unref(): void {}
    postMessage(message: { id: number }): void { this.sent = message; }
  } };
});
import { CandidateWorkers } from '../src/candidateWorkers.js';

const task = { uri: 'file:///Worker.php', hash: 'source-hash', source: '<?php class Worker {}',
  names: ['Worker'], mode: 'symbol' as const, deferBodies: true };

describe('candidate worker reply transport', () => {
  beforeEach(() => { state.workers.length = 0; });
  it('decodes a matching JSON reply without changing its source identity', async () => {
    const pool = new CandidateWorkers(); const pending = pool.prepare(task);
    const worker = state.workers[0]!; const id = worker.sent!.id;
    const result = { id, uri: task.uri, hash: task.hash, summary: { schema: 1, symbols: ['worker'] } };
    worker.emit('message', { id, json: JSON.stringify(result) });
    await expect(pending).resolves.toEqual(result);
  });
  it.each(['{', 'null', '{"id":-1,"summary":{}}'])('falls back for invalid encoded reply %s and accepts the next task', async (json) => {
    const pool = new CandidateWorkers(); const pending = pool.prepare(task);
    const worker = state.workers[0]!;
    worker.emit('message', { id: worker.sent!.id, json });
    await expect(pending).resolves.toBeUndefined();
    const retry = pool.prepare(task); const id = worker.sent!.id;
    const result = { id, uri: task.uri, hash: task.hash, summary: { schema: 1 } };
    worker.emit('message', { id, json: JSON.stringify(result) });
    await expect(retry).resolves.toEqual(result);
  });
});
