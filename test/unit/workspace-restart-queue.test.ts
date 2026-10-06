import { expect, it, vi } from 'vitest';
import { WorkspaceRestartQueue } from '../../src/extension/workspaceRestartQueue.js';

function deferred(): { promise: Promise<void>; resolve: () => void } {
  let resolve!: () => void;
  const promise = new Promise<void>(done => { resolve = done; });
  return { promise, resolve };
}

it('coalesces folder changes during stop and serializes another change during start', async () => {
  const stopping = deferred(), starting = deferred();
  const stop = vi.fn().mockImplementationOnce(() => stopping.promise).mockResolvedValue(undefined);
  const start = vi.fn().mockImplementationOnce(() => starting.promise).mockResolvedValue(undefined);
  const failed = vi.fn();
  const queue = new WorkspaceRestartQueue(stop, start, failed);
  queue.request(); queue.request(); queue.request();
  expect(stop).toHaveBeenCalledTimes(1);
  stopping.resolve();
  await vi.waitFor(() => expect(start).toHaveBeenCalledTimes(1));
  expect(stop).toHaveBeenCalledTimes(1);
  queue.request(); queue.request();
  expect(stop).toHaveBeenCalledTimes(1);
  starting.resolve();
  await vi.waitFor(() => expect(start).toHaveBeenCalledTimes(2));
  expect(stop).toHaveBeenCalledTimes(2);
  expect(failed).not.toHaveBeenCalled();
  queue.dispose();
});

it('does not start or report an error after disposal during stop', async () => {
  const stopping = deferred(), start = vi.fn(), failed = vi.fn();
  const queue = new WorkspaceRestartQueue(() => stopping.promise, start, failed);
  queue.request(); queue.dispose(); queue.request(); stopping.resolve();
  await stopping.promise;
  expect(start).not.toHaveBeenCalled();
  expect(failed).not.toHaveBeenCalled();
});

it('reports a failed stop once and accepts a later folder change without an automatic retry loop', async () => {
  const error = new Error('stop failed');
  const stop = vi.fn().mockRejectedValueOnce(error).mockResolvedValue(undefined);
  const start = vi.fn().mockResolvedValue(undefined), failed = vi.fn();
  const queue = new WorkspaceRestartQueue(stop, start, failed);
  queue.request();
  await vi.waitFor(() => expect(failed).toHaveBeenCalledExactlyOnceWith(error));
  expect(start).not.toHaveBeenCalled();
  expect(stop).toHaveBeenCalledTimes(1);
  queue.request();
  await vi.waitFor(() => expect(start).toHaveBeenCalledTimes(1));
  queue.dispose();
});
