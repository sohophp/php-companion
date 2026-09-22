import { mkdir, open, readdir, rename, rm, stat, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { join } from 'node:path';
import { referenceSourceHash } from './referenceDependencyEvidence.js';

export interface ReferenceLocation { uri: string; range: { start: { line: number; character: number }; end: { line: number; character: number } }; }
export interface ReferenceResultProof {
  schema: 1;
  key: string;
  environment: string;
  sourceRoots: string[];
  scopedSourceRoots?: Array<{ path: string; extensions: string[] }>;
  includeFileStamps?: boolean;
  containerInputEvidenceComplete?: boolean;
  routeInputEvidenceComplete?: boolean;
  preProviderEnvironment?: string;
  providerImplementationFiles?: string[];
  eventProviderUsed?: boolean;
  additionalFiles: string[];
  context: string;
  loaded: Array<{ uri: string; hash: string }>;
  frameworkFingerprint?: string;
  queryHint?: { uri: string; names: string[]; mode: 'symbol' | 'named-argument'; deferBodies: boolean };
  fingerprint: string;
  locations: ReferenceLocation[];
}

const MAX_BYTES = 8 * 1024 * 1024;
const digest = (value: unknown): boolean => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
const pathList = (value: unknown): value is string[] => Array.isArray(value) && value.length <= 50_000
  && value.every((path) => typeof path === 'string' && path.length > 0 && path.length <= 16_384);

function validProof(value: unknown): value is ReferenceResultProof {
  const proof = value as Partial<ReferenceResultProof> | null;
  const point = (position: unknown): boolean => {
    const p = position as { line?: number; character?: number } | null;
    return Boolean(p && Number.isSafeInteger(p.line) && p.line! >= 0 && Number.isSafeInteger(p.character) && p.character! >= 0);
  };
  return Boolean(proof && proof.schema === 1 && digest(proof.key) && digest(proof.fingerprint)
    && digest(proof.environment)
    && (proof.frameworkFingerprint === undefined || digest(proof.frameworkFingerprint))
    && (proof.queryHint === undefined || Boolean(proof.queryHint && typeof proof.queryHint === 'object'
      && typeof proof.queryHint.uri === 'string' && proof.queryHint.uri.length <= 16_384
      && Array.isArray(proof.queryHint.names) && proof.queryHint.names.length > 0 && proof.queryHint.names.length <= 8
      && proof.queryHint.names.every((name) => typeof name === 'string' && /^[\p{L}_][\p{L}\p{N}_]{0,127}$/u.test(name))
      && (proof.queryHint.mode === 'symbol' || proof.queryHint.mode === 'named-argument')
      && typeof proof.queryHint.deferBodies === 'boolean'))
    && typeof proof.context === 'string' && proof.context.length <= MAX_BYTES
    && pathList(proof.sourceRoots) && pathList(proof.additionalFiles)
    && (proof.scopedSourceRoots === undefined || Array.isArray(proof.scopedSourceRoots)
      && proof.scopedSourceRoots.length <= 128 && proof.scopedSourceRoots.every((root) => root
        && typeof root.path === 'string' && root.path.length > 0 && root.path.length <= 16_384
        && Array.isArray(root.extensions) && root.extensions.length > 0 && root.extensions.length <= 8
        && root.extensions.every((extension) => typeof extension === 'string' && (extension === '*' || /^\.[a-z0-9]{1,16}$/.test(extension)))))
    && (proof.includeFileStamps === undefined || typeof proof.includeFileStamps === 'boolean')
    && (proof.containerInputEvidenceComplete === undefined || typeof proof.containerInputEvidenceComplete === 'boolean')
    && (proof.routeInputEvidenceComplete === undefined || typeof proof.routeInputEvidenceComplete === 'boolean')
    && (proof.preProviderEnvironment === undefined || digest(proof.preProviderEnvironment))
    && (proof.providerImplementationFiles === undefined || pathList(proof.providerImplementationFiles))
    && (proof.eventProviderUsed === undefined || typeof proof.eventProviderUsed === 'boolean')
    && Array.isArray(proof.loaded) && proof.loaded.length <= 50_000
    && proof.loaded.every((entry) => entry && typeof entry.uri === 'string' && entry.uri.length <= 16_384 && digest(entry.hash))
    && Array.isArray(proof.locations) && proof.locations.length <= 2_048
    && proof.locations.every((location) => location && typeof location.uri === 'string' && location.uri.length <= 16_384
      && point(location.range?.start) && point(location.range?.end)
      && (location.range.end.line > location.range.start.line || location.range.end.line === location.range.start.line
        && location.range.end.character >= location.range.start.character)));
}

/** This store authenticates file integrity only; the caller must revalidate inputs. */
export class ReferenceResultStore {
  private readonly directory: string;
  constructor(cacheDirectory: string) { this.directory = join(cacheDirectory, 'reference-results-v1'); }

  async recent(limit = 8): Promise<ReferenceResultProof[]> {
    if (!Number.isSafeInteger(limit) || limit < 1 || limit > 32) return [];
    try {
      const entries = await Promise.all((await readdir(this.directory)).filter((name) => /^[a-f0-9]{64}\.json$/.test(name))
        .map(async (name) => ({ name, modified: (await stat(join(this.directory, name))).mtimeMs })));
      const proofs = await Promise.all(entries.sort((a, b) => b.modified - a.modified).slice(0, limit)
        .map((entry) => this.read(entry.name.slice(0, -5))));
      return proofs.flatMap((proof) => proof ? [proof] : []);
    } catch { return []; }
  }

  async read(key: string): Promise<ReferenceResultProof | undefined> {
    if (!digest(key)) return undefined;
    try {
      const handle = await open(join(this.directory, `${key}.json`), 'r');
      let source: string;
      try {
        const info = await handle.stat(); if (!info.isFile() || info.size > MAX_BYTES) return undefined;
        const buffer = Buffer.alloc(info.size); let offset = 0;
        while (offset < buffer.length) {
          const part = await handle.read(buffer, offset, buffer.length - offset, offset);
          if (!part.bytesRead) return undefined; offset += part.bytesRead;
        }
        source = buffer.toString('utf8');
      } finally { await handle.close(); }
      const envelope = JSON.parse(source) as { checksum?: unknown; payload?: unknown };
      if (!validProof(envelope.payload) || envelope.payload.key !== key
        || envelope.checksum !== referenceSourceHash(JSON.stringify(envelope.payload))) return undefined;
      return envelope.payload;
    } catch { return undefined; }
  }

  async write(proof: ReferenceResultProof, current: () => boolean): Promise<boolean> {
    if (!validProof(proof) || !current()) return false;
    const payload = JSON.stringify(proof);
    const contents = JSON.stringify({ checksum: referenceSourceHash(payload), payload: proof });
    if (Buffer.byteLength(contents) > MAX_BYTES) return false;
    const temporary = join(this.directory, `${proof.key}-${randomUUID()}.tmp`);
    try {
      await mkdir(this.directory, { recursive: true });
      await writeFile(temporary, contents, { flag: 'wx', mode: 0o600 });
      if (!current()) return false;
      await rename(temporary, join(this.directory, `${proof.key}.json`));
      const files = await readdir(this.directory);
      const entries = await Promise.all(files.filter((name) => /^[a-f0-9]{64}\.json$/.test(name))
        .map(async (name) => ({ name, modified: (await stat(join(this.directory, name))).mtimeMs })));
      for (const entry of entries.sort((a, b) => b.modified - a.modified).slice(32)) await rm(join(this.directory, entry.name), { force: true });
      return true;
    } catch { return false; }
    finally { await rm(temporary, { force: true }).catch(() => undefined); }
  }
}
