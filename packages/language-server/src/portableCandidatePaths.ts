import { readFile, readdir, realpath, stat } from 'node:fs/promises';
import { join, resolve } from 'node:path';

interface QueueEntry { path: string; ancestors: readonly string[]; root: boolean; }
export interface CandidatePaths { paths: Set<string>; startedAt: number; }

/** A bounded, portable fallback when ripgrep is unavailable. An incomplete walk never supplies negative evidence. */
export async function portableCandidatePaths(roots: readonly string[], names: readonly string[], excluded: (path: string) => boolean,
  shouldContinue: () => boolean, maxFiles: number, timeoutMs = 8_000): Promise<CandidatePaths | undefined> {
  const startedAt = Date.now() - 1_000;
  const deadline = Date.now() + timeoutMs;
  const queue: QueueEntry[] = roots.map((path) => ({ path: resolve(path), ancestors: [], root: true }));
  const matches = new Set<string>();
  const lowerNames = names.map((name) => name.toLowerCase());
  let files = 0; let bytes = 0;
  const withinBounds = (): boolean => shouldContinue() && Date.now() <= deadline;
  const inspect = async (entry: QueueEntry): Promise<QueueEntry[] | undefined> => {
    if (!withinBounds()) return undefined;
    let info;
    try { info = await stat(entry.path); }
    catch (error) {
      return entry.root && (error as NodeJS.ErrnoException).code === 'ENOENT' ? [] : undefined;
    }
    if (info.isDirectory()) {
      let canonical: string; let children;
      try { canonical = await realpath(entry.path); children = await readdir(entry.path, { withFileTypes: true }); }
      catch { return undefined; }
      if (entry.ancestors.includes(canonical)) return [];
      const ancestors = [...entry.ancestors, canonical];
      return children.filter((child) => child.isDirectory() || child.isSymbolicLink() || child.isFile() && /\.php$/iu.test(child.name))
        .map((child) => ({ path: join(entry.path, child.name), ancestors, root: false }));
    }
    if (!info.isFile() || !/\.php$/iu.test(entry.path) || excluded(entry.path)) return [];
    files += 1; bytes += info.size;
    if (files > maxFiles || info.size > 4 * 1024 * 1024 || bytes > 512 * 1024 * 1024) return undefined;
    let source: string;
    try { source = await readFile(entry.path, 'utf8'); } catch { return undefined; }
    const actualBytes = Buffer.byteLength(source);
    bytes += actualBytes - info.size;
    if (actualBytes > 4 * 1024 * 1024 || bytes > 512 * 1024 * 1024) return undefined;
    if (lowerNames.some((name) => source.toLowerCase().includes(name))) matches.add(resolve(entry.path));
    return [];
  };
  for (let next = 0; next < queue.length;) {
    if (!withinBounds()) return undefined;
    const batch = queue.slice(next, next + 64); next += batch.length;
    const children = await Promise.all(batch.map(inspect));
    if (children.some((result) => !result) || !withinBounds()) return undefined;
    for (const entries of children) queue.push(...entries!);
  }
  return { paths: matches, startedAt };
}
