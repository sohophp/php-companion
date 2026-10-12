export interface CacheLockOwner { pid: number; hostname: string; token: string; }
export interface CacheLockHooks {
  beforeDeadOwnerUnlink?: (state: { path: string; owner: CacheLockOwner; file: string }) => void | Promise<void>;
  beforeLegacyOwnerUnlink?: (state: { path: string; owner: CacheLockOwner }) => void | Promise<void>;
  afterOwnedFileRemoved?: (state: { path: string; token: string }) => void | Promise<void>;
}
export interface CacheCommitLock { path: string; token: string; filename: string; release(): Promise<void>; }
import { mkdir, writeFile, readFile, readdir, lstat, rename, unlink, rmdir, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { hostname } from 'node:os';
import { randomUUID } from 'node:crypto';

const contention = (): Error & { code: string } => Object.assign(new Error('Cache commit is owned by another writer.'), { code: 'EEXIST' });
const absent = (error: unknown): boolean => (error as NodeJS.ErrnoException).code === 'ENOENT';
const occupied = (error: unknown): boolean => ['EEXIST', 'ENOTEMPTY', 'EISDIR', 'ENOTDIR', 'EPERM', 'EACCES'].includes((error as NodeJS.ErrnoException).code!);
const validOwner = (owner: unknown): owner is CacheLockOwner => (owner && typeof owner === 'object' && !Array.isArray(owner)
  && Number.isSafeInteger((owner as CacheLockOwner).pid) && (owner as CacheLockOwner).pid > 0 && (owner as CacheLockOwner).hostname === hostname()
  && typeof (owner as CacheLockOwner).token === 'string' && /^[A-Za-z0-9-]{1,128}$/.test((owner as CacheLockOwner).token)) as boolean;
function dead(owner: unknown): owner is CacheLockOwner {
  if (!validOwner(owner)) return false;
  try { process.kill(owner.pid, 0); return false; }
  catch (error) { return (error as NodeJS.ErrnoException).code === 'ESRCH'; }
}
async function emptyDirectory(path: string): Promise<boolean> {
  try { await rmdir(path); return true; }
  catch (error) { if (absent(error)) return true; if (occupied(error)) return false; throw error; }
}

// Every new lock owner publishes a nonempty directory
// atomically. Recovery unlinks only the observed owner's unique filename;
// rmdir cannot remove a newly published nonempty owner's directory.
async function recover(path: string, hooks: CacheLockHooks): Promise<boolean> {
  let info;
  try { info = await lstat(path); } catch (error) { if (absent(error)) return true; throw error; }
  if (info.isSymbolicLink()) return false;
  if (info.isDirectory()) {
    let names;
    try { names = await readdir(path); } catch (error) { if (absent(error)) return true; throw error; }
    if (!names.length) return emptyDirectory(path);
    if (names.length !== 1 || !/^owner-[a-f0-9-]{36}\.json$/.test(names[0]!)) return false;
    const file = join(path, names[0]!);
    let owner: unknown;
    try {
      const ownerInfo = await lstat(file);
      if (!ownerInfo.isFile() || ownerInfo.isSymbolicLink() || ownerInfo.size > 4096) return false;
      owner = JSON.parse(await readFile(file, 'utf8'));
    } catch (error) { if (absent(error)) return true; if (error instanceof SyntaxError) return false; throw error; }
    if (!dead(owner) || names[0]! !== `owner-${owner.token}.json`) return false;
    await hooks.beforeDeadOwnerUnlink?.({ path, owner, file });
    try { await unlink(file); } catch (error) { if (!absent(error)) throw error; }
    return emptyDirectory(path);
  }
  // Preserve the original dead-local-owner flat-file fixture and legacy owner
  // records. New writers never publish flat files; unknown/live/foreign owner
  // records are refused. unlink cannot remove a new directory owner.
  if (!info.isFile() || info.size > 4096) return false;
  let owner: unknown;
  try { owner = JSON.parse(await readFile(path, 'utf8')); }
  catch (error) { if (absent(error)) return true; if (error instanceof SyntaxError) return false; throw error; }
  if (!dead(owner)) return false;
  await hooks.beforeLegacyOwnerUnlink?.({ path, owner });
  try { await unlink(path); return true; }
  catch (error) { if (absent(error)) return true; if (occupied(error)) return false; throw error; }
}

export async function acquireCacheCommitLock(path: string, hooks: CacheLockHooks = {}): Promise<CacheCommitLock> {
  const token = randomUUID();
  const filename = `owner-${token}.json`;
  const staging = `${path}.owner-${token}`;
  let published = false;
  await mkdir(staging, { mode: 0o700 });
  try {
    await writeFile(join(staging, filename), JSON.stringify({ schema: 1, hostname: hostname(), pid: process.pid, token }),
      { flag: 'wx', mode: 0o600 });
    for (let attempt = 0; attempt < 3; attempt++) {
      // Windows can rename a directory over a flat file. Inspect legacy files
      // before publishing so live owners survive and dead-owner recovery hooks
      // run on every platform. New writers only publish directory owners.
      const existing = await lstat(path).catch((error: unknown) => {
        if (absent(error)) return undefined;
        throw error;
      });
      if (existing && !existing.isDirectory()) {
        if (!await recover(path, hooks)) throw contention();
        continue;
      }
      try { await rename(staging, path); published = true; break; }
      catch (error) {
        if (!occupied(error)) throw error;
        if (!await recover(path, hooks)) throw contention();
      }
    }
    if (!published) throw contention();
    let released = false;
    return { path, token, filename, async release(): Promise<void> {
      if (released) return;
      released = true;
      try { await unlink(join(path, filename)); }
      catch (error) { if (absent(error)) return; throw error; }
      await hooks.afterOwnedFileRemoved?.({ path, token });
      await emptyDirectory(path);
    } };
  } finally {
    if (!published) await rm(staging, { recursive: true, force: true });
  }
}
