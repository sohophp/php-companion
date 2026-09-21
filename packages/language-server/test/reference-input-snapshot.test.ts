import { mkdtemp, mkdir, rename, rm, stat, symlink, utimes, writeFile } from 'node:fs/promises';
import { renameSync, utimesSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { captureReferenceInputSnapshot, type ReferenceInputSnapshot } from '../src/referenceInputSnapshot.js';
import { referenceCandidateEvidenceMatches } from '../src/referenceCandidateEvidence.js';

describe('reference input snapshot', () => {
  let root: string; let sourceRoot: string; let dependencyRoot: string; let source: string; let dependency: string; let configuration: string;
  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'php-companion-reference-inputs-'));
    sourceRoot = join(root, 'src'); dependencyRoot = join(root, 'vendor');
    await mkdir(sourceRoot); await mkdir(dependencyRoot);
    source = join(sourceRoot, 'Use.php'); dependency = join(dependencyRoot, 'Dependency.php'); configuration = join(root, 'composer.json');
    await writeFile(source, '<?php new Dependency();'); await writeFile(dependency, '<?php class Dependency {}');
    await writeFile(configuration, '{}');
  });
  afterEach(async () => { await rm(root, { recursive: true, force: true }); });
  const capture = async (): Promise<ReferenceInputSnapshot | undefined> => captureReferenceInputSnapshot({ sourceRoots: [sourceRoot, dependencyRoot], additionalFiles: [configuration], context: 'engine-1' });

  it('hashes deterministic complete input sets, not just returned reference files', async () => {
    const first = await capture(); expect(first?.files).toHaveLength(3);
    expect(await capture()).toEqual(first);
    expect(await captureReferenceInputSnapshot({ sourceRoots: [dependencyRoot, sourceRoot, sourceRoot], additionalFiles: [configuration], context: 'engine-1' })).toEqual(first);
    const before = await stat(dependency);
    await writeFile(dependency, '<?php class DependenCy {}');
    await utimes(dependency, before.atime, before.mtime);
    expect((await capture())?.fingerprint).not.toBe(first?.fingerprint);
  });

  it('invalidates on additions, moves, deletions and newly present roots/configuration', async () => {
    const first = await capture();
    const added = join(sourceRoot, 'New.php'); await writeFile(added, '<?php new Dependency();');
    const second = await capture(); expect(second?.fingerprint).not.toBe(first?.fingerprint);
    const moved = join(sourceRoot, 'Moved.php'); await rename(added, moved);
    const third = await capture(); expect(third?.fingerprint).not.toBe(second?.fingerprint);
    await rm(moved); expect(await capture()).toEqual(first);
    const optional = join(root, 'optional.json'); const absentRoot = join(root, 'optional-src');
    const options = { sourceRoots: [sourceRoot, absentRoot], additionalFiles: [optional], context: 'engine-1' };
    const absent = await captureReferenceInputSnapshot(options);
    await writeFile(optional, '{}'); expect((await captureReferenceInputSnapshot(options))?.fingerprint).not.toBe(absent?.fingerprint);
    const presentConfig = await captureReferenceInputSnapshot(options);
    await mkdir(absentRoot); expect((await captureReferenceInputSnapshot(options))?.fingerprint).not.toBe(presentConfig?.fingerprint);
  });

  it('includes unsaved buffers and engine/configuration context without exposing contents', async () => {
    const options = { sourceRoots: [sourceRoot], context: 'engine-1', documents: [{ uri: 'file:///Use.php', source: 'unsaved-one' }] };
    const first = await captureReferenceInputSnapshot(options);
    expect(JSON.stringify(first)).not.toContain('unsaved-one');
    expect((await captureReferenceInputSnapshot({ ...options, documents: [{ uri: 'file:///Use.php', source: 'unsaved-two' }] }))?.fingerprint).not.toBe(first?.fingerprint);
    expect((await captureReferenceInputSnapshot({ ...options, context: 'engine-2' }))?.fingerprint).not.toBe(first?.fingerprint);
    expect(await captureReferenceInputSnapshot({ ...options, documents: [...options.documents, ...options.documents] })).toBeUndefined();
  });

  it('separates scanned files from explicit dependencies and checks skipped candidates and exclusions', async () => {
    const skipped = join(sourceRoot, 'Idle.php'); const excluded = join(sourceRoot, 'Excluded.php');
    await writeFile(skipped, '<?php class Idle {}'); await writeFile(excluded, '<?php class Excluded {}');
    const options = { sourceRoots: [sourceRoot], additionalFiles: [source, dependency], context: 'candidate-scan' };
    const first = (await captureReferenceInputSnapshot(options))!;
    expect(first.sourceFiles).toEqual([excluded, skipped, source].sort());
    const include = (path: string): boolean => path !== excluded;
    const reads = new Map(first.files.filter((file) => first.sourceFiles.includes(file.path) && include(file.path)).map((file) => [file.path, file.hash]));
    expect(referenceCandidateEvidenceMatches(first, reads, include)).toBe(true);
    expect(referenceCandidateEvidenceMatches(first, new Map([[source, reads.get(source)!]]), include)).toBe(false);
    await writeFile(skipped, '<?php new Dependency();');
    expect(referenceCandidateEvidenceMatches((await captureReferenceInputSnapshot(options))!, reads, include)).toBe(false);
    await writeFile(skipped, '<?php class Idle {}');
    const moved = join(sourceRoot, 'Moved.php'); await rename(skipped, moved);
    expect(referenceCandidateEvidenceMatches((await captureReferenceInputSnapshot(options))!, reads, include)).toBe(false);
    await rename(moved, skipped);
    const added = join(sourceRoot, 'Added.php'); await writeFile(added, '<?php new Dependency();');
    expect(referenceCandidateEvidenceMatches((await captureReferenceInputSnapshot(options))!, reads, include)).toBe(false);
    await rm(added); await rm(skipped);
    expect(referenceCandidateEvidenceMatches((await captureReferenceInputSnapshot(options))!, reads, include)).toBe(false);
  });

  it('preserves explicit input order and absence across bounded concurrent discovery windows', async () => {
    const additional = Array.from({ length: 75 }, (_, index) => join(dependencyRoot, `${index}.php`));
    await Promise.all(additional.slice(0, 70).map((path) => writeFile(path, '<?php class Explicit {}')));
    const options = { sourceRoots: [sourceRoot], additionalFiles: additional, context: 'explicit-windows' };
    const first = (await captureReferenceInputSnapshot(options))!;
    expect(first.files).toHaveLength(71); expect(first.sourceFiles).toEqual([source]);
    expect(first.missingPaths).toEqual(additional.slice(70).sort());
    expect(await captureReferenceInputSnapshot({ ...options, additionalFiles: [...additional].reverse() })).toEqual(first);
    await mkdir(additional[74]!);
    expect(await captureReferenceInputSnapshot(options)).toBeUndefined();
  });

  it('includes source-set membership in the fingerprint when identical files have different input roles', async () => {
    const scanned = (await captureReferenceInputSnapshot({ sourceRoots: [source], context: 'roles' }))!;
    const explicit = (await captureReferenceInputSnapshot({ sourceRoots: [], additionalFiles: [source], context: 'roles' }))!;
    expect(explicit.files).toEqual(scanned.files);
    expect(scanned.sourceFiles).toEqual([source]); expect(explicit.sourceFiles).toEqual([]);
    expect(explicit.fingerprint).not.toBe(scanned.fingerprint);
  });

  it('checks complete directory frontiers across discovery windows and bounds empty directories', async () => {
    await Promise.all(Array.from({ length: 75 }, async (_, index) => {
      const directory = join(sourceRoot, `dir-${index}`); await mkdir(directory);
      if (index % 2 === 0) await writeFile(join(directory, 'Use.php'), '<?php new Dependency();');
    }));
    const options = { sourceRoots: [sourceRoot], context: 'directory-windows' };
    const first = (await captureReferenceInputSnapshot(options))!;
    expect(first.sourceFiles).toHaveLength(39);
    expect(await captureReferenceInputSnapshot(options)).toEqual(first);
    // Only 39 files, but traversing 76 directories exceeds this budget.
    expect(await captureReferenceInputSnapshot({ ...options, maxFiles: 50 })).toBeUndefined();
    await writeFile(join(sourceRoot, 'dir-73', 'Late.php'), '<?php new Dependency();');
    expect((await captureReferenceInputSnapshot(options))?.sourceFiles).toHaveLength(40);
  });

  it('fails closed for cancellation and every input budget', async () => {
    const options = { sourceRoots: [sourceRoot, dependencyRoot], context: 'engine-1' };
    expect(await captureReferenceInputSnapshot({ ...options, shouldContinue: () => false })).toBeUndefined();
    for (const limits of [{ maxFiles: 1 }, { maxFileBytes: 1 }, { maxTotalBytes: 1 }, { maxFiles: 0 }]) {
      expect(await captureReferenceInputSnapshot({ ...options, ...limits })).toBeUndefined();
    }
    let checks = 0;
    expect(await captureReferenceInputSnapshot({ ...options, shouldContinue: () => ++checks < 4 })).toBeUndefined();
  });

  it('records explicit root symlink targets and refuses incomplete nested link traversal', async () => {
    const linked = join(root, 'linked'); await symlink(sourceRoot, linked, 'dir');
    const options = { sourceRoots: [linked], context: 'engine-1' };
    const first = await captureReferenceInputSnapshot(options); expect(first?.files).toHaveLength(1);
    await rm(linked); await symlink(dependencyRoot, linked, 'dir');
    expect((await captureReferenceInputSnapshot(options))?.fingerprint).not.toBe(first?.fingerprint);
    await symlink(dependency, join(sourceRoot, 'Nested.php'));
    expect(await capture()).toBeUndefined();
  });

  it.each(['content', 'file-set'])('rejects a %s change during verification', async (change) => {
    let checkpoints = 0; let changed = false;
    const snapshot = await captureReferenceInputSnapshot({ sourceRoots: [sourceRoot], context: 'engine-1', shouldContinue: () => {
      checkpoints += 1;
      // With one directory and one file, checkpoint 4 starts rediscovery;
      // checkpoint 6 starts final stat verification after contents were read.
      if (checkpoints === (change === 'file-set' ? 4 : 6)) {
        writeFileSync(change === 'file-set' ? join(sourceRoot, 'Late.php') : source, '<?php new Changed();');
        changed = true;
      }
      return true;
    } });
    expect(changed).toBe(true);
    expect(snapshot).toBeUndefined();
  });

  it.each(['rewrite', 'replace'])('rejects same-size %s after reading even when the original mtime is restored', async (change) => {
    const fixed = new Date('2001-01-01T00:00:00Z'); await utimes(source, fixed, fixed);
    let checkpoints = 0; let changed = false;
    const snapshot = await captureReferenceInputSnapshot({ sourceRoots: [sourceRoot], context: 'final-identity', shouldContinue: () => {
      if (++checkpoints === 6) {
        const target = change === 'replace' ? join(root, 'Replacement.php') : source;
        writeFileSync(target, '<?php new DependenCy();');
        utimesSync(target, fixed, fixed);
        if (change === 'replace') renameSync(target, source);
        changed = true;
      }
      return true;
    } });
    expect(changed).toBe(true); expect(snapshot).toBeUndefined();
  });
});
