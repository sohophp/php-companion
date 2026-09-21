import { mkdtemp, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { referenceCandidateEvidenceMatches, skippedCandidateEvidenceMatches } from '../src/referenceCandidateEvidence.js';
import type { ReferenceInputSnapshot } from '../src/referenceInputSnapshot.js';

describe('source prefilter reference evidence', () => {
  let root: string | undefined;
  afterEach(async () => { if (root) await rm(root, { recursive: true, force: true }); });

  it('covers every source with either a content hash or a verified skipped-file stamp', async () => {
    root = await mkdtemp(join(tmpdir(), 'php-companion-prefilter-evidence-'));
    const matched = join(root, 'Matched.php'); const skipped = join(root, 'Skipped.php');
    await writeFile(matched, '<?php class Matched {}');
    await writeFile(skipped, '<?php class Skipped {}');
    const info = await stat(skipped);
    const stamps = new Map([[skipped, { size: info.size, mtimeMs: info.mtimeMs, ctimeMs: info.ctimeMs }]]);
    const snapshot: ReferenceInputSnapshot = { fingerprint: 'proof', sourceFiles: [matched, skipped], missingPaths: [],
      files: [{ path: matched, hash: 'matched-hash' }, { path: skipped, hash: 'skipped-hash' }] };
    expect(referenceCandidateEvidenceMatches(snapshot, new Map([[matched, 'matched-hash']]), () => true, stamps)).toBe(true);
    expect(await skippedCandidateEvidenceMatches(stamps, () => true)).toBe(true);
    expect(referenceCandidateEvidenceMatches(snapshot, new Map(), () => true, stamps)).toBe(false);
    await writeFile(skipped, '<?php class ChangedWithDifferentSize {}');
    expect(await skippedCandidateEvidenceMatches(stamps, () => true)).toBe(false);
  });
});
