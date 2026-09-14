import { describe, expect, it, vi } from 'vitest';
import { withBoundedRetry } from '../../src/refactor/retry.js';

describe('withBoundedRetry', () => {
  it('retries a transient failure and returns the first successful result', async () => {
    const failures: number[] = []; let calls = 0;
    await expect(withBoundedRetry(async () => {
      calls += 1; if (calls < 3) throw new Error(`transient-${calls}`); return 'settled';
    }, { attempts: 3, delayMs: 0, onFailure: (_error, attempt) => failures.push(attempt) })).resolves.toBe('settled');
    expect(calls).toBe(3); expect(failures).toEqual([1, 2]);
  });

  it('stops at the configured bound and preserves the final failure', async () => {
    const failure = new Error('still stale'); const operation = vi.fn(async () => { throw failure; });
    await expect(withBoundedRetry(operation, { attempts: 2, delayMs: 0 })).rejects.toBe(failure);
    expect(operation).toHaveBeenCalledTimes(2);
  });
});
