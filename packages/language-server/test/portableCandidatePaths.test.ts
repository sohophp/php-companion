import { mkdtemp, mkdir, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import type { ComposerProject } from '@php-companion/project';
import { scanPortableCandidates, type PortableCandidateSearchInput } from '../src/portableCandidateSearchWorker.js';

function input(root: string, path: string, maxFiles: number): PortableCandidateSearchInput {
  const project: ComposerProject = { root, composerPath: join(root, 'composer.json'), disabledExtensions: [], psr4: [], psr0: [],
    classmap: [], files: [], excludeFromClassmap: ['src/Ignored.php'], dependencies: [], warnings: [] };
  return { roots: [path], names: ['answerStatus'], project, maxFiles, deadline: Date.now() + 8_000,
    cancelled: new SharedArrayBuffer(Int32Array.BYTES_PER_ELEMENT) };
}

describe('portable candidate path search', () => {
  let root: string | undefined;
  afterEach(async () => { if (root) await rm(root, { recursive: true, force: true }); });

  it('finds matching upper-case PHP files and excludes unrelated files', async () => {
    root = await mkdtemp(join(tmpdir(), 'sophp-portable-candidates-'));
    const src = join(root, 'src'); await mkdir(src);
    const target = join(src, 'Target.PHP');
    await writeFile(target, '<?php class Target { function answerStatus() {} }');
    await writeFile(join(src, 'Noise.php'), '<?php class Noise {}');
    await writeFile(join(src, 'Ignored.php'), '<?php function answerStatus() {}');
    expect(scanPortableCandidates(input(root, src, 10))).toEqual([resolve(target)]);
  });

  it('withholds negative evidence when the walk exceeds a file budget or is cancelled', async () => {
    root = await mkdtemp(join(tmpdir(), 'sophp-portable-candidates-limit-'));
    const src = join(root, 'src'); await mkdir(src);
    await writeFile(join(src, 'One.php'), '<?php class One {}');
    await writeFile(join(src, 'Two.php'), '<?php class Two {}');
    expect(scanPortableCandidates(input(root, src, 1))).toBeUndefined();
    const cancelled = input(root, src, 10);
    Atomics.store(new Int32Array(cancelled.cancelled), 0, 1);
    expect(scanPortableCandidates(cancelled)).toBeUndefined();
  });

  it('counts the same PHP file once when autoload roots overlap', async () => {
    root = await mkdtemp(join(tmpdir(), 'sophp-portable-candidates-overlap-'));
    const src = join(root, 'src'); const nested = join(src, 'Nested');
    await mkdir(nested, { recursive: true });
    const target = join(nested, 'Target.php');
    await writeFile(target, '<?php function answerStatus() {}');
    const request = input(root, src, 1);
    request.roots.push(nested);
    expect(scanPortableCandidates(request)).toEqual([resolve(target)]);
  });

  it.skipIf(process.platform === 'win32')('follows a linked autoload root without looping through a symlink cycle', async () => {
    root = await mkdtemp(join(tmpdir(), 'sophp-portable-candidates-link-'));
    const src = join(root, 'src'); const link = join(root, 'linked'); await mkdir(src);
    await writeFile(join(src, 'Target.php'), '<?php function answerStatus() {}');
    await symlink(src, link, 'dir');
    await symlink(link, join(src, 'cycle'), 'dir');
    expect(scanPortableCandidates(input(root, link, 10))).toEqual([resolve(link, 'Target.php')]);
  });
});
