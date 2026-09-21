import type { ReferenceInputSnapshot } from './referenceInputSnapshot.js';
import { stat } from 'node:fs/promises';

export interface SkippedCandidateStamp { size: number; mtimeMs: number; ctimeMs: number; }

/** Confirm that omitted files still have the metadata observed after the source prefilter. */
export async function skippedCandidateEvidenceMatches(skipped: ReadonlyMap<string, SkippedCandidateStamp>,
  shouldContinue: () => boolean): Promise<boolean> {
  const entries = [...skipped];
  for (let offset = 0; offset < entries.length; offset += 32) {
    if (!shouldContinue()) return false;
    const valid = await Promise.all(entries.slice(offset, offset + 32).map(async ([path, expected]) => {
      try {
        const current = await stat(path);
        return current.isFile() && current.size === expected.size
          && current.mtimeMs === expected.mtimeMs && current.ctimeMs === expected.ctimeMs;
      } catch { return false; }
    }));
    if (valid.some((value) => !value)) return false;
  }
  return shouldContinue();
}

/** Every scanned source counts, including files omitted by a verified source prefilter. */
export function referenceCandidateEvidenceMatches(snapshot: ReferenceInputSnapshot, reads: ReadonlyMap<string, string>,
  include: (path: string) => boolean, skipped: ReadonlyMap<string, SkippedCandidateStamp> = new Map()): boolean {
  const expected = snapshot.sourceFiles.filter(include);
  if (expected.length !== reads.size + skipped.size) return false;
  const files = new Map(snapshot.files.map((file) => [file.path, file.hash]));
  return expected.every((path) => skipped.has(path) ? !reads.has(path) && files.has(path)
    : reads.has(path) && files.has(path) && reads.get(path) === files.get(path));
}
