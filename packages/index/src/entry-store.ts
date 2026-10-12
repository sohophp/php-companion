export interface CachePayloadDescriptor { payloadHash: string; payloadBytes: number; }
export interface IndexCacheEntry { size: number; mtimeMs: number; ctimeMs?: number; hash: string; payload?: unknown; payloadHash?: string; payloadBytes?: number; }
import { removeBoundedCacheDirectory } from './bounded-cache-removal.js';
import { acquireCacheCommitLock } from './owned-cache-lock.js';
import { mkdir, open, readFile, readdir, rename, rm, stat, link, copyFile, lstat } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { createHash, randomUUID } from 'node:crypto';

const digest = (value: string | Uint8Array): string => createHash('sha256').update(value).digest('hex');
const validDigest = (value: unknown): value is string => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
const validGeneration = (value: unknown): value is string => typeof value === 'string' && /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/.test(value);
const record = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === 'object' && !Array.isArray(value);
const MAX_PAYLOAD_BYTES = 64 * 1024 * 1024;

// Keep immutable payloads outside the full-project metadata Map.
export class EntryStore {
  declare readonly path: string;
  declare readonly root: string;
  declare readonly version: string;
  declare readonly directory: string;
  declare readonly staging: string;
  declare loadedManifestDigest: string | undefined;
  previous = new Map<string, IndexCacheEntry>();
  generation: string;
  readonlyGeneration: string | undefined = undefined;
  warnings: string[] = [];
  disposed = false;
  published = false;
  writes = new Set<Promise<CachePayloadDescriptor>>();

  constructor(path: string, root: string, version: string) {
    this.path = path; this.root = root; this.version = version;
    this.generation = randomUUID();
    this.directory = path + '.entries';
    this.staging = join(this.directory, '.staging-' + this.generation);
  }

  static async load(path: string, root: string, version: string): Promise<EntryStore> {
    const store = new EntryStore(path, root, version);
    try {
      const manifestText = await readFile(path, 'utf8');
      store.loadedManifestDigest = digest(manifestText);
      const data: unknown = JSON.parse(manifestText);
      if (!record(data) || ![1, 2].includes(data.schema as number) || data.root !== root || data.version !== version
        || !record(data.entries) || data.schema === 2 && !validGeneration(data.generation)) return store;
      store.readonlyGeneration = data.schema === 2 ? data.generation as string : undefined;
      for (const [path, entry] of Object.entries(data.entries)) {
        if (record(entry) && Number.isSafeInteger(entry.size) && (entry.size as number) >= 0 && Number.isFinite(entry.mtimeMs)
          && (entry.ctimeMs === undefined || Number.isFinite(entry.ctimeMs)) && validDigest(entry.hash)
          && (data.schema === 1 || validDigest(entry.payloadHash) && Number.isSafeInteger(entry.payloadBytes)
            && (entry.payloadBytes as number) >= 0 && (entry.payloadBytes as number) <= MAX_PAYLOAD_BYTES && !Object.hasOwn(entry, 'payload'))) {
          store.previous.set(path, entry as unknown as IndexCacheEntry);
        } else store.warnings.push(`Persistent index entry for ${path} was rejected and rebuilt.`);
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') store.warnings.push('Persistent index cache was unreadable and will be rebuilt.');
    }
    return store;
  }

  async payload(entry: IndexCacheEntry): Promise<unknown> {
    if (this.readonlyGeneration === undefined || Object.hasOwn(entry, 'payload')) return entry.payload;
    const path = join(this.directory, this.readonlyGeneration as string, entry.payloadHash + '.json');
    const info = await lstat(path);
    if (!info.isFile() || info.isSymbolicLink() || info.size !== entry.payloadBytes) throw new Error('Cache payload size mismatch.');
    const value = await readFile(path);
    if (value.length !== entry.payloadBytes || digest(value) !== entry.payloadHash) throw new Error('Cache payload checksum mismatch.');
    return JSON.parse(value.toString('utf8'));
  }

  async stage(payload: unknown): Promise<CachePayloadDescriptor> {
    if (this.disposed) throw new Error('Cache store disposed.');
    const text = JSON.stringify(payload);
    const bytes = Buffer.byteLength(text);
    if (bytes > MAX_PAYLOAD_BYTES) throw new RangeError('Cache payload exceeded its size limit.');
    const hash = digest(text);
    const work = (async (): Promise<CachePayloadDescriptor> => {
      await mkdir(this.staging, { recursive: true });
      if (this.disposed) throw new Error('Cache store disposed.');
      const path = join(this.staging, hash + '.json');
      // Identical payloads share one immutable entry within this generation.
      try {
        const file = await open(path, 'wx');
        try { await file.writeFile(text); } finally { await file.close(); }
      } catch (error) { if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error; }
      return { payloadHash: hash, payloadBytes: bytes };
    })();
    this.writes.add(work);
    try { return await work; } finally { this.writes.delete(work); }
  }

  async commit(entries: Map<string, IndexCacheEntry>, shouldContinue?: () => boolean): Promise<boolean> {
    if (shouldContinue?.() === false) return false;
    await mkdir(dirname(this.path), { recursive: true });
    // Commit contention is a cache-write miss, never a partial publication.
    const lockPath = this.path + '.lock';
    const lock = await acquireCacheCommitLock(lockPath);
    const temporary = this.path + '.' + this.generation + '.tmp';
    const publishedDirectory = join(this.directory, this.generation);
    let renamedGeneration = false;
    try {
      let currentDigest;
      try { currentDigest = digest(await readFile(this.path, 'utf8')); }
      catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
      if (currentDigest !== this.loadedManifestDigest) throw Object.assign(new Error('Cache manifest changed since this writer loaded its snapshot.'), { code: 'EEXIST' });
      await mkdir(this.staging, { recursive: true });
      for (const [path, entry] of entries) {
        if (shouldContinue?.() === false) return false;
        if (Object.hasOwn(entry, 'payload')) {
          entries.set(path, { ...entry, ...await this.stage(entry.payload) });
          delete entries.get(path)!.payload;
        } else {
          const target = join(this.staging, entry.payloadHash + '.json');
          try { await stat(target); }
          catch (error) {
            if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
            const source = join(this.directory, this.readonlyGeneration as string, entry.payloadHash + '.json');
            const info = await lstat(source);
            if (!info.isFile() || info.isSymbolicLink() || info.size !== entry.payloadBytes) throw new Error('Cache entry unavailable during commit.');
            try { await link(source, target); }
            catch (error) { if ((error as NodeJS.ErrnoException).code === 'EXDEV') await copyFile(source, target); else if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error; }
          }
        }
      }
      if (shouldContinue?.() === false) return false;
      await rename(this.staging, publishedDirectory); renamedGeneration = true;
      const file = await open(temporary, 'wx');
      try {
        let batch = `{"schema":2,"version":${JSON.stringify(this.version)},"root":${JSON.stringify(this.root)},"generation":${JSON.stringify(this.generation)},"entries":{`;
        let separator = '';
        for (const [path, entry] of entries) {
          if (shouldContinue?.() === false) return false;
          batch += `${separator}${JSON.stringify(path)}:${JSON.stringify(entry)}`; separator = ',';
          if (batch.length >= 256 * 1024) { await file.writeFile(batch); batch = ''; }
        }
        await file.writeFile(batch + '}}');
      } finally { await file.close(); }
      if (shouldContinue?.() === false) return false;
      await rename(temporary, this.path); this.published = true;
      // Only committed generations are pruned. Other writers' staging data is untouched.
      for (const name of await readdir(this.directory)) {
        if (name !== this.generation && validGeneration(name)) await removeBoundedCacheDirectory(join(this.directory, name)).catch(() => undefined);
      }
      return true;
    } finally {
      await rm(temporary, { force: true }).catch(() => undefined);
      if (renamedGeneration && !this.published) await removeBoundedCacheDirectory(publishedDirectory).catch(() => undefined);
      await lock.release();
    }
  }

  async dispose(): Promise<void> {
    this.disposed = true;
    await Promise.allSettled(this.writes);
    await removeBoundedCacheDirectory(this.staging).catch(() => undefined);
  }
}
