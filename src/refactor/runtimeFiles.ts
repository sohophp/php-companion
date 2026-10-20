import { createHash } from 'node:crypto';
import { constants } from 'node:fs';
import type { BigIntStats } from 'node:fs';
import { open, stat } from 'node:fs/promises';

function metadataIdentity(current: BigIntStats): string {
  return [current.dev, current.ino, current.size, current.mode, current.mtimeNs, current.ctimeNs].join(':');
}

async function runtimeFileIdentity(path: string): Promise<string | undefined> {
  try {
    if (!(await stat(path)).isFile()) return undefined;
    // A nonregular replacement must not block while opening a local FIFO.
    const flags = constants.O_RDONLY | (constants.O_NONBLOCK ?? 0);
    const handle = await open(path, flags);
    try {
      const before = await handle.stat({ bigint: true });
      if (!before.isFile()) return undefined;
      const identity = metadataIdentity(before);
      // Equal-length writes can share every timestamp on coarse filesystems.
      // Stream the executable so content checks do not retain it in memory.
      const digest = createHash('sha256');
      for await (const chunk of handle.createReadStream({ autoClose: false })) digest.update(chunk);
      const after = await handle.stat({ bigint: true });
      if (!after.isFile() || metadataIdentity(after) !== identity) return undefined;
      // Reopen the path to detect replacement while hashing. Compare handle
      // stats consistently: older Windows Node versions report a different
      // device number for path-based stat, even for the same unchanged file.
      if (!(await stat(path)).isFile()) return undefined;
      const currentHandle = await open(path, flags);
      try {
        const current = await currentHandle.stat({ bigint: true });
        if (!current.isFile() || metadataIdentity(current) !== identity) return undefined;
      } finally { await currentHandle.close(); }
      return `${identity}:${digest.digest('hex')}`;
    } finally { await handle.close(); }
  } catch { return undefined; }
}

/** Detect changes to the selected executable while a refactor preview is being reviewed. */
export async function captureRuntimeFileGuard(paths: readonly string[]): Promise<() => Promise<boolean>> {
  const captured = await Promise.all([...new Set(paths)].map(async path => ({
    path, identity: await runtimeFileIdentity(path),
  })));
  return async () => (await Promise.all(captured.map(async item =>
    item.identity !== undefined && await runtimeFileIdentity(item.path) === item.identity))).every(Boolean);
}
