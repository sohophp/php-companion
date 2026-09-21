import type { ReferenceInputSnapshot } from './referenceInputSnapshot.js';

/** Every scanned source counts, including files rejected by the name filter. */
export function referenceCandidateEvidenceMatches(snapshot: ReferenceInputSnapshot, reads: ReadonlyMap<string, string>,
  include: (path: string) => boolean): boolean {
  const expected = snapshot.sourceFiles.filter(include);
  if (expected.length !== reads.size) return false;
  const files = new Map(snapshot.files.map((file) => [file.path, file.hash]));
  return expected.every((path) => reads.has(path) && files.has(path) && reads.get(path) === files.get(path));
}
