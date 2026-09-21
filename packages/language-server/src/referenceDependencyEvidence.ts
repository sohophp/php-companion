import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import type { ReferenceInputSnapshot } from './referenceInputSnapshot.js';

export type ReferenceDependencyRead = { path: string; kind: 'missing' }
  | { path: string; kind: 'source'; uri: string; hash: string };

export function referenceSourceHash(source: string): string {
  return createHash('sha256').update(source).digest('hex');
}

/** Query evidence follows the semantic workspace lifetime, not a single request. */
export class ReferenceDependencyEvidence {
  private readonly reads = new Map<string, ReferenceDependencyRead>();
  private complete = true;

  constructor(private readonly maxPaths = 4_096) {}

  reject(): void { this.complete = false; }

  source(path: string, uri: string, source: string): void {
    this.set({ kind: 'source', path: resolve(path), uri, hash: referenceSourceHash(source) });
  }

  missing(path: string): void {
    const normalized = resolve(path);
    // A failed reload does not prove that previously loaded facts disappeared.
    if (this.reads.get(normalized)?.kind === 'source') this.reject();
    this.set({ kind: 'missing', path: normalized });
  }

  private set(read: ReferenceDependencyRead): void {
    if (!this.complete) return;
    if (!this.reads.has(read.path) && this.reads.size >= this.maxPaths) { this.reject(); return; }
    this.reads.set(read.path, read);
  }

  snapshot(): ReferenceDependencyRead[] | undefined {
    return this.complete ? [...this.reads.values()].sort((left, right) => left.path.localeCompare(right.path)).map((read) => ({ ...read })) : undefined;
  }
}

/** Check consumed sources against disk evidence, giving current buffers precedence. */
export function referenceDependencyEvidenceMatches(snapshot: ReferenceInputSnapshot, reads: readonly ReferenceDependencyRead[],
  documents: readonly { uri: string; source: string }[]): boolean {
  const files = new Map(snapshot.files.map((file) => [file.path, file.hash]));
  const missing = new Set(snapshot.missingPaths);
  const buffers = new Map(documents.map((document) => [document.uri, referenceSourceHash(document.source)]));
  return reads.every((read) => read.kind === 'missing' ? missing.has(read.path) && !files.has(read.path)
    : (buffers.get(read.uri) ?? files.get(read.path)) === read.hash);
}
