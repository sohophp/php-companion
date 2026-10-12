export interface CacheRemovalOptions { concurrency?: number; beforeRemove?: (path: string) => void | Promise<void>; }
export interface CacheRemovalResult { filesRemoved: number; directoriesRemoved: number; peakPending: number; concurrency: number; }
import { lstat, opendir, rmdir, unlink } from 'node:fs/promises';
import { join } from 'node:path';

// Callers pass only their owned staging or an
// obsolete generation. Stream leaves and bound outstanding unlink operations;
// never follow symlinks. Unexpected nested directories remain supported.
export async function removeBoundedCacheDirectory(path: string, options: CacheRemovalOptions = {}): Promise<CacheRemovalResult> {
  const concurrency = options.concurrency ?? 16;
  if (!Number.isSafeInteger(concurrency) || concurrency < 1 || concurrency > 128)
    throw new RangeError('Cleanup concurrency must be between 1 and 128.');
  const result = { filesRemoved: 0, directoriesRemoved: 0, peakPending: 0, concurrency };
  const pending = new Set<Promise<void>>();
  let failure: unknown;
  const absent = (error: unknown): boolean => (error as NodeJS.ErrnoException).code === 'ENOENT';
  const removeLeaf = async (file: string): Promise<void> => {
    await options.beforeRemove?.(file);
    try { await unlink(file); result.filesRemoved++; }
    catch (error) { if (!absent(error)) throw error; }
  };
  const schedule = (file: string): void => {
    const task: Promise<void> = Promise.resolve().then(() => removeLeaf(file))
      .catch((error) => { failure ??= error; })
      .finally(() => { pending.delete(task); });
    pending.add(task); result.peakPending = Math.max(result.peakPending, pending.size);
  };
  let info;
  try { info = await lstat(path); }
  catch (error) { if (absent(error)) return result; throw error; }
  if (!info.isDirectory() || info.isSymbolicLink()) {
    await removeLeaf(path); return result;
  }
  // One directory handle at a time; parent paths are retained only for the
  // reverse-order rmdir pass. Normal immutable blob generations are flat.
  const directories = [path];
  try {
    for (let at = 0; at < directories.length; at++) {
      if (failure) throw failure;
      let directory;
      try { directory = await opendir(directories[at]!, { bufferSize: 32 }); }
      catch (error) { if (absent(error)) continue; throw error; }
      for await (const entry of directory) {
        if (failure) throw failure;
        const child = join(directories[at]!, entry.name);
        if (entry.isDirectory() && !entry.isSymbolicLink()) directories.push(child);
        else {
          schedule(child);
          if (pending.size >= concurrency) await Promise.race(pending);
        }
      }
    }
    await Promise.all(pending);
    if (failure) throw failure;
    for (let at = directories.length - 1; at >= 0; at--) {
      try { await rmdir(directories[at]!); result.directoriesRemoved++; }
      catch (error) { if (!absent(error)) throw error; }
    }
    return result;
  } finally {
    // A failed leaf stops new work; settle every already-started operation
    // before returning/rejecting, leaving no late cleanup behind the caller.
    await Promise.all(pending);
  }
}
