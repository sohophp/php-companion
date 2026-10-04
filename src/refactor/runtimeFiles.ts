import { stat } from 'node:fs/promises';

async function runtimeFileIdentity(path: string): Promise<string | undefined> {
  try {
    const current = await stat(path, { bigint: true });
    if (!current.isFile()) return undefined;
    return [current.dev, current.ino, current.size, current.mode, current.mtimeNs, current.ctimeNs].join(':');
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
