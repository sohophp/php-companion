import { createHash } from 'node:crypto';
import type { BigIntStats } from 'node:fs';
import { open, readdir, realpath, stat } from 'node:fs/promises';
import { join, resolve } from 'node:path';

export interface ReferenceInputSnapshotOptions {
  /** Composer source roots, including dependency roots. Only PHP files are selected. */
  sourceRoots: readonly string[];
  /** Explicit configuration/provider inputs, irrespective of extension. */
  additionalFiles?: readonly string[];
  /** Include the engine identity, query, configuration and authoritative provider identities. */
  context: string;
  documents?: readonly { uri: string; source: string }[];
  shouldContinue?: () => boolean;
  maxFiles?: number;
  maxFileBytes?: number;
  maxTotalBytes?: number;
}

export interface ReferenceInputSnapshot {
  fingerprint: string;
  files: ReadonlyArray<{ path: string; hash: string }>;
}

interface InputFile { path: string; hash: string; stamp: string; }
interface Discovery { files: string[]; roots: Array<[string, string | null]>; }

function digest(value: string): string { return createHash('sha256').update(value).digest('hex'); }
function missing(error: unknown): boolean { return (error as NodeJS.ErrnoException).code === 'ENOENT'; }
function stamp(info: BigIntStats): string {
  return `${info.dev}:${info.ino}:${info.size}:${info.mtimeNs}:${info.ctimeNs}`;
}

/** A bounded, read-only proof of source inputs. Undefined always means "recompute". */
export async function captureReferenceInputSnapshot(options: ReferenceInputSnapshotOptions): Promise<ReferenceInputSnapshot | undefined> {
  const maxFiles = options.maxFiles ?? 50_000;
  const maxFileBytes = options.maxFileBytes ?? 2 * 1024 * 1024;
  const maxTotalBytes = options.maxTotalBytes ?? 512 * 1024 * 1024;
  if (![maxFiles, maxFileBytes, maxTotalBytes].every((limit) => Number.isSafeInteger(limit) && limit > 0)) return undefined;
  const active = (): boolean => options.shouldContinue?.() !== false;
  // Copy caller-owned data before the first await; changes require a new capture.
  const roots = [...new Set(options.sourceRoots.map((path) => resolve(path)))].sort();
  const additional = [...new Set((options.additionalFiles ?? []).map((path) => resolve(path)))].sort();
  if (roots.length + additional.length > maxFiles) return undefined;
  const documents = (options.documents ?? []).map(({ uri, source }) => [uri, digest(source)] as const)
    .sort(([left], [right]) => left.localeCompare(right));
  if (new Set(documents.map(([uri]) => uri)).size !== documents.length) return undefined;
  const context = options.context;
  const discover = async (): Promise<Discovery | undefined> => {
    const files = new Set<string>(); const identities: Discovery['roots'] = []; let directories = 0;
    for (const path of [...roots, ...additional]) {
      if (!active()) return undefined;
      let resolved: string;
      try { resolved = await realpath(path); }
      catch (error) { if (!missing(error)) return undefined; identities.push([path, null]); continue; }
      identities.push([path, resolved]);
      const info = await stat(path);
      if (info.isFile()) { files.add(path); }
      else if (info.isDirectory() && roots.includes(path)) {
        const pending = [path];
        while (pending.length) {
          if (!active() || ++directories > maxFiles) return undefined;
          const directory = pending.pop()!;
          for (const entry of await readdir(directory, { withFileTypes: true })) {
            // Nested links may hide PHP files or redirect a previous lookup.
            // Recompute instead of claiming a complete snapshot of that graph.
            if (entry.isSymbolicLink()) return undefined;
            const child = join(directory, entry.name);
            if (entry.isDirectory()) pending.push(child);
            else if (entry.isFile() && entry.name.toLowerCase().endsWith('.php')) files.add(child);
            if (files.size > maxFiles) return undefined;
          }
        }
      } else return undefined;
      if (files.size > maxFiles) return undefined;
    }
    return { files: [...files].sort(), roots: identities };
  };
  try {
    const before = await discover(); if (!before) return undefined;
    let totalBytes = 0; const files: InputFile[] = [];
    for (let offset = 0; offset < before.files.length; offset += 32) {
      if (!active()) return undefined;
      const batch = await Promise.all(before.files.slice(offset, offset + 32).map(async (path): Promise<InputFile | undefined> => {
        // Explicit roots may themselves be links; nested links were rejected.
        const handle = await open(path, 'r');
        try {
          const initial = await handle.stat({ bigint: true });
          if (!initial.isFile() || initial.size > BigInt(maxFileBytes)) return undefined;
          totalBytes += Number(initial.size); if (totalBytes > maxTotalBytes) return undefined;
          // Bound allocation/read size even if a file grows during the scan.
          const source = Buffer.alloc(Number(initial.size));
          let read = 0;
          while (read < source.length) {
            const part = await handle.read(source, read, source.length - read, read);
            if (!part.bytesRead) return undefined;
            read += part.bytesRead;
          }
          const final = await handle.stat({ bigint: true }); const current = await stat(path, { bigint: true });
          if (stamp(initial) !== stamp(final) || stamp(final) !== stamp(current) || source.length !== Number(final.size)) return undefined;
          return { path, hash: createHash('sha256').update(source).digest('hex'), stamp: stamp(final) };
        } finally { await handle.close(); }
      }));
      if (batch.some((file) => !file)) return undefined;
      files.push(...batch as InputFile[]);
    }
    const after = await discover();
    if (!after || JSON.stringify(before) !== JSON.stringify(after)) return undefined;
    // A file read early in the scan must still describe the same disk object.
    for (let offset = 0; offset < files.length; offset += 32) {
      if (!active()) return undefined;
      const unchanged = await Promise.all(files.slice(offset, offset + 32).map(async (file) => stamp(await stat(file.path, { bigint: true })) === file.stamp));
      if (unchanged.some((value) => !value)) return undefined;
    }
    if (!active()) return undefined;
    const inputs = files.map(({ path, hash }) => ({ path, hash }));
    return { files: inputs, fingerprint: digest(JSON.stringify({ schema: 1, context, roots: after.roots, files: inputs, documents })) };
  } catch { return undefined; }
}
