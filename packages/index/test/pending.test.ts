import { expect, it } from 'vitest';
import { PendingChanges } from '../src/pending.js';
it('retains changes arriving during a drain and coalesces earlier events', async () => {
  const changes = new PendingChanges<string>(); const applied: string[] = [];
  changes.set('a', 'create'); changes.set('a', 'delete');
  await changes.drain(async (key, value) => {
    applied.push(value);
    if (value === 'delete') changes.set(key, 'recreate');
  });
  expect(applied).toEqual(['delete', 'recreate']); expect(changes.size).toBe(0);
});
it('retains a failed event for retry without replacing a newer event', async () => {
  const changes = new PendingChanges<number>(); changes.set('a', 1);
  await expect(changes.drain(async () => { changes.set('a', 2); throw new Error('retry'); })).rejects.toThrow('retry');
  const values: number[] = []; await changes.drain(async (_, value) => { values.push(value); });
  expect(values).toEqual([2]);
});
