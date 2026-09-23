import { mkdtemp, mkdir, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { portableCandidatePaths } from '../src/portableCandidatePaths.js';

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
    const result = await portableCandidatePaths([src], ['answerStatus'], (path) => path.endsWith('Ignored.php'), () => true, 10);
    expect(result?.paths).toEqual(new Set([resolve(target)]));
    expect(result?.startedAt).toBeLessThanOrEqual(Date.now());
  });

  it('withholds negative evidence when the walk exceeds a file budget or is cancelled', async () => {
    root = await mkdtemp(join(tmpdir(), 'sophp-portable-candidates-limit-'));
    const src = join(root, 'src'); await mkdir(src);
    await writeFile(join(src, 'One.php'), '<?php class One {}');
    await writeFile(join(src, 'Two.php'), '<?php class Two {}');
    expect(await portableCandidatePaths([src], ['answerStatus'], () => false, () => true, 1)).toBeUndefined();
    expect(await portableCandidatePaths([src], ['answerStatus'], () => false, () => false, 10)).toBeUndefined();
  });

  it.skipIf(process.platform === 'win32')('follows a linked autoload root without looping through a symlink cycle', async () => {
    root = await mkdtemp(join(tmpdir(), 'sophp-portable-candidates-link-'));
    const src = join(root, 'src'); const link = join(root, 'linked'); await mkdir(src);
    await writeFile(join(src, 'Target.php'), '<?php function answerStatus() {}');
    await symlink(src, link, 'dir');
    await symlink(link, join(src, 'cycle'), 'dir');
    const result = await portableCandidatePaths([link], ['answerStatus'], () => false, () => true, 10);
    expect(result?.paths).toEqual(new Set([resolve(link, 'Target.php')]));
  });
});
