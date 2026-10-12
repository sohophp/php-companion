import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { EventEmitter } from 'node:events';

type TestWorker = EventEmitter & { sent: Array<{ id: number; kind?: string }>; terminate: () => Promise<number> };
const state = vi.hoisted(() => ({ workers: [] as TestWorker[], parallelism: 4, constructorFailure: false, postFailure: false }));
vi.mock('node:os', () => ({ availableParallelism: (): number => state.parallelism }));
vi.mock('node:worker_threads', async () => {
  const { EventEmitter } = await import('node:events');
  return { Worker: class extends EventEmitter {
    sent: Array<{ id: number; kind?: string }> = [];
    constructor() { super(); if (state.constructorFailure) throw new Error('deliberate startup failure'); state.workers.push(this); }
    unref(): void {}
    terminate(): Promise<number> { return Promise.resolve(0); }
    postMessage(message: { id: number; kind?: string }): void {
      if (state.postFailure) throw new Error('deliberate send failure'); this.sent.push(message);
    }
  } };
});
import { CandidateWorkers } from '../src/candidateWorkers.js';
const task = { uri: 'file:///Worker.php', hash: 'source-hash', source: '<?php class Worker {}',
  names: ['Worker'], mode: 'symbol' as const, deferBodies: true };
function reply(worker: TestWorker, index = worker.sent.length - 1): void {
  const request = worker.sent[index]!;
  const result = request.kind === 'restore' ? { id: request.id, kind: 'restored' }
    : request.kind === 'compress' ? { id: request.id, kind: 'compressed' }
      : { id: request.id, uri: task.uri, hash: task.hash, summary: { schema: 1 } };
  worker.emit('message', { id: request.id, json: JSON.stringify(result) });
}
describe('candidate worker demand and bounded concurrency', () => {
  beforeEach(() => { state.workers.length = 0; state.parallelism = 4; state.constructorFailure = false; state.postFailure = false; });
  it('uses one native slot for sequential jobs and reuses it after a response', async () => {
    const pool = new CandidateWorkers();
    try {
      const first = pool.prepare(task); expect(state.workers).toHaveLength(1); reply(state.workers[0]!); expect(await first).toBeDefined();
      const second = pool.prepare(task); expect(state.workers).toHaveLength(1); reply(state.workers[0]!); expect(await second).toBeDefined();
    } finally { pool.dispose(); }
  });
  it('grows for concurrent jobs up to the original cap and settles every queued job', async () => {
    const pool = new CandidateWorkers();
    try {
      const jobs = Array.from({length: 9}, () => pool.prepare(task));
      expect(state.workers).toHaveLength(4);
      expect(state.workers.map(worker => worker.sent.length)).toEqual([3,2,2,2]);
      for (const worker of state.workers) for (let i=0;i<worker.sent.length;i+=1) reply(worker,i);
      expect((await Promise.all(jobs)).every(Boolean)).toBe(true);
      const next = pool.prepare(task); expect(state.workers).toHaveLength(4); reply(state.workers[0]!); expect(await next).toBeDefined();
    } finally { pool.dispose(); }
  });
  it('respects both the configured cap and available CPUs', async () => {
    state.parallelism = 2; const pool = new CandidateWorkers(undefined, 3);
    const jobs = Array.from({length: 5}, () => pool.prepare(task)); expect(state.workers).toHaveLength(2);
    pool.dispose(); expect(await Promise.all(jobs)).toEqual([undefined,undefined,undefined,undefined,undefined]);
  });
  it('reuses an idle slot across restore, preparation and compression transports', async () => {
    const pool = new CandidateWorkers();
    try {
      const first = pool.restore({uri:task.uri,hash:task.hash,payload:null,deferBodies:true});
      expect(state.workers).toHaveLength(1); reply(state.workers[0]!); expect(await first).toMatchObject({kind:'restored'});
      const second = pool.prepare(task); reply(state.workers[0]!); expect(await second).toBeDefined();
      const third = pool.compress({hash:task.hash,snapshot:{} as never,declarationsOnly:true});
      expect(state.workers).toHaveLength(1); reply(state.workers[0]!); expect(await third).toMatchObject({kind:'compressed'});
    } finally { pool.dispose(); }
  });
  it('falls back after worker creation fails and does not repeat failed creation', async () => {
    const pool = new CandidateWorkers(); state.constructorFailure = true;
    try {
      expect(await pool.prepare(task)).toBeUndefined(); state.constructorFailure = false;
      expect(await pool.prepare(task)).toBeUndefined(); expect(state.workers).toHaveLength(0);
    } finally { pool.dispose(); }
  });
  it('settles an exited worker only and leaves another worker able to respond', async () => {
    const pool = new CandidateWorkers();
    try {
      const first = pool.prepare(task), second = pool.prepare(task); expect(state.workers).toHaveLength(2);
      state.workers[0]!.emit('exit',1); expect(await first).toBeUndefined();
      reply(state.workers[1]!); expect(await second).toBeDefined();
      const third = pool.prepare(task); expect(state.workers).toHaveLength(2); reply(state.workers[1]!); expect(await third).toBeDefined();
    } finally { pool.dispose(); }
  });
  it('releases failed post ownership and reuses the slot for a subsequent task', async () => {
    const pool = new CandidateWorkers(); state.postFailure = true;
    try {
      expect(await pool.prepare(task)).toBeUndefined(); state.postFailure = false;
      const next = pool.prepare(task); expect(state.workers).toHaveLength(1); reply(state.workers[0]!); expect(await next).toBeDefined();
    } finally { pool.dispose(); }
  });
});
