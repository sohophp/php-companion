import { readFileSync, readdirSync, realpathSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { parentPort, workerData } from 'node:worker_threads';
import { isAutoloadPathExcluded, type ComposerProject } from '@php-companion/project';

interface QueueEntry { path: string; ancestors: readonly string[]; root: boolean; }
export interface PortableCandidateSearchInput {
  roots: string[]; names: string[]; project: ComposerProject; maxFiles: number; deadline: number; cancelled: SharedArrayBuffer;
}

/** Runs on a worker so synchronous reads do not pause the language server. Undefined means no complete proof. */
export function scanPortableCandidates(input: PortableCandidateSearchInput): string[] | undefined {
  const queue: QueueEntry[] = input.roots.map((path) => ({ path: resolve(path), ancestors: [], root: true }));
  const matches = new Set<string>();
  const inspectedFiles = new Set<string>();
  const names = input.names.map((name) => name.toLowerCase());
  const cancelled = new Int32Array(input.cancelled);
  let files = 0; let bytes = 0;
  const withinBounds = (): boolean => Atomics.load(cancelled, 0) === 0 && Date.now() <= input.deadline;
  for (let next = 0; next < queue.length; next += 1) {
    if (!withinBounds()) return undefined;
    const entry = queue[next]!;
    let info;
    try { info = statSync(entry.path); }
    catch (error) {
      if (entry.root && (error as NodeJS.ErrnoException).code === 'ENOENT') continue;
      return undefined;
    }
    if (info.isDirectory()) {
      let canonical: string; let children;
      try { canonical = realpathSync(entry.path); children = readdirSync(entry.path, { withFileTypes: true }); }
      catch { return undefined; }
      if (entry.ancestors.includes(canonical)) continue;
      const ancestors = [...entry.ancestors, canonical];
      for (const child of children) {
        if (child.isDirectory() || child.isSymbolicLink() || child.isFile() && /\.php$/iu.test(child.name)) {
          queue.push({ path: join(entry.path, child.name), ancestors, root: false });
        }
      }
      if (queue.length > input.maxFiles * 4 + input.roots.length) return undefined;
      continue;
    }
    if (!info.isFile() || !/\.php$/iu.test(entry.path) || isAutoloadPathExcluded(input.project, entry.path)) continue;
    if (inspectedFiles.has(entry.path)) continue;
    inspectedFiles.add(entry.path);
    files += 1; bytes += info.size;
    if (files > input.maxFiles || info.size > 4 * 1024 * 1024 || bytes > 512 * 1024 * 1024) return undefined;
    let source: Buffer;
    try { source = readFileSync(entry.path); } catch { return undefined; }
    bytes += source.byteLength - info.size;
    if (source.byteLength > 4 * 1024 * 1024 || bytes > 512 * 1024 * 1024) return undefined;
    const text = source.toString('utf8').toLowerCase();
    if (names.some((name) => text.includes(name))) matches.add(resolve(entry.path));
  }
  return [...matches];
}

if (parentPort) {
  try { parentPort.postMessage({ paths: scanPortableCandidates(workerData as PortableCandidateSearchInput) }); }
  catch { parentPort.postMessage({ paths: undefined }); }
}
