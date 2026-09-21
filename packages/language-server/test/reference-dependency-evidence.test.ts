import { describe, expect, it } from 'vitest';
import { resolve } from 'node:path';
import { ReferenceDependencyEvidence, referenceDependencyEvidenceMatches, referenceSourceHash } from '../src/referenceDependencyEvidence.js';
import type { ReferenceInputSnapshot } from '../src/referenceInputSnapshot.js';

describe('reference dependency evidence', () => {
  it('tracks absent lookups and replaces them when a source is actually loaded', () => {
    const evidence = new ReferenceDependencyEvidence();
    evidence.missing('/missing.php'); evidence.source('/loaded.php', 'file:///loaded.php', 'first');
    expect(evidence.snapshot()).toEqual([
      { kind: 'source', path: resolve('/loaded.php'), uri: 'file:///loaded.php', hash: referenceSourceHash('first') },
      { kind: 'missing', path: resolve('/missing.php') },
    ]);
    evidence.source('/missing.php', 'file:///missing.php', 'created');
    expect(evidence.snapshot()?.every((read) => read.kind === 'source')).toBe(true);
    const copy = evidence.snapshot()!; copy.length = 0;
    expect(evidence.snapshot()).toHaveLength(2);
  });

  it('does not interpret unvisited paths as verified absence', () => {
    const evidence = new ReferenceDependencyEvidence(); evidence.missing('/missing.php');
    const snapshot: ReferenceInputSnapshot = { fingerprint: 'unused', files: [], sourceFiles: [], missingPaths: [] };
    expect(referenceDependencyEvidenceMatches(snapshot, evidence.snapshot()!, [])).toBe(false);
    expect(referenceDependencyEvidenceMatches({ ...snapshot, missingPaths: [resolve('/missing.php')] }, evidence.snapshot()!, [])).toBe(true);
    expect(referenceDependencyEvidenceMatches({ ...snapshot, missingPaths: [resolve('/missing.php')], files: [{ path: resolve('/missing.php'), hash: referenceSourceHash('created') }] }, evidence.snapshot()!, [])).toBe(false);
  });

  it('requires consumed source hashes to match current disk or unsaved buffers', () => {
    const evidence = new ReferenceDependencyEvidence(); evidence.source('/loaded.php', 'file:///loaded.php', 'consumed');
    const snapshot: ReferenceInputSnapshot = { fingerprint: 'unused', files: [{ path: resolve('/loaded.php'), hash: referenceSourceHash('disk') }], sourceFiles: [], missingPaths: [] };
    const reads = evidence.snapshot()!;
    expect(referenceDependencyEvidenceMatches(snapshot, reads, [])).toBe(false);
    expect(referenceDependencyEvidenceMatches(snapshot, reads, [{ uri: 'file:///loaded.php', source: 'consumed' }])).toBe(true);
    expect(referenceDependencyEvidenceMatches(snapshot, reads, [{ uri: 'file:///loaded.php', source: 'changed' }])).toBe(false);
  });

  it('keeps failed reloads, truncation and path-budget overflow ineligible', () => {
    const failed = new ReferenceDependencyEvidence(); failed.source('/loaded.php', 'file:///loaded.php', 'source'); failed.missing('/loaded.php');
    expect(failed.snapshot()).toBeUndefined();
    const rejected = new ReferenceDependencyEvidence(); rejected.reject(); rejected.source('/loaded.php', 'file:///loaded.php', 'source');
    expect(rejected.snapshot()).toBeUndefined();
    const bounded = new ReferenceDependencyEvidence(1); bounded.missing('/one.php'); bounded.missing('/two.php');
    expect(bounded.snapshot()).toBeUndefined();
  });
});
