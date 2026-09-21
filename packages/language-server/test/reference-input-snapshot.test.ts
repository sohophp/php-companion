import { mkdtemp, mkdir, rename, rm, stat, symlink, utimes, writeFile } from 'node:fs/promises';
import { writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { captureReferenceInputSnapshot, type ReferenceInputSnapshot } from '../src/referenceInputSnapshot.js';

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
});
