import { mkdtemp, rename, rm, stat, symlink, unlink, utimes, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import process from 'node:process';
import { describe, expect, it } from 'vitest';
import { captureRuntimeFileGuard } from '../../src/refactor/runtimeFiles.js';

async function withRuntimeFiles(run: (root: string) => Promise<void>): Promise<void> {
  const root = await mkdtemp(join(tmpdir(), 'sophp-runtime-files-'));
  try { await run(root); } finally { await rm(root, { recursive: true, force: true }); }
}

describe('runtime files during refactor previews', () => {
  it('allows stable programs and projects without a selected runtime', async () => {
    expect(await (await captureRuntimeFileGuard([]))()).toBe(true);
    await withRuntimeFiles(async root => {
      const file = join(root, 'php'); await writeFile(file, 'original');
      const unchanged = await captureRuntimeFileGuard([file, file]);
      expect(await unchanged()).toBe(true); expect(await unchanged()).toBe(true);
    });
  });

  it('rejects atomic replacement even with the same contents and modification time', async () => {
    await withRuntimeFiles(async root => {
      const file = join(root, 'php'), replacement = join(root, 'replacement');
      await writeFile(file, 'original'); const before = await stat(file);
      const unchanged = await captureRuntimeFileGuard([file]);
      await writeFile(replacement, 'original'); await utimes(replacement, before.atime, before.mtime);
      await rename(replacement, file);
      expect(await unchanged()).toBe(false);
      expect(await (await captureRuntimeFileGuard([file]))()).toBe(true);
    });
  });

  it('rejects changed or deleted programs instead of trusting their cached path', async () => {
    await withRuntimeFiles(async root => {
      const file = join(root, 'php'); await writeFile(file, 'original');
      const unchanged = await captureRuntimeFileGuard([file]);
      await writeFile(file, 'changed-program'); expect(await unchanged()).toBe(false);
      const afterEdit = await captureRuntimeFileGuard([file]);
      await unlink(file); expect(await afterEdit()).toBe(false);
      await writeFile(file, 'restored'); expect(await afterEdit()).toBe(false);
      expect(await (await captureRuntimeFileGuard([file]))()).toBe(true);
    });
  });

  it('refuses unavailable programs and directory replacements', async () => {
    await withRuntimeFiles(async root => {
      const missing = join(root, 'missing');
      const unchanged = await captureRuntimeFileGuard([missing]);
      expect(await unchanged()).toBe(false);
      await writeFile(missing, 'appeared'); expect(await unchanged()).toBe(false);
      expect(await (await captureRuntimeFileGuard([root]))()).toBe(false);
    });
  });

  it.skipIf(process.platform === 'win32')('detects equal-length edits with a restored modification time', async () => {
    await withRuntimeFiles(async root => {
      const file = join(root, 'php'); await writeFile(file, 'original'); const before = await stat(file);
      const unchanged = await captureRuntimeFileGuard([file]);
      await writeFile(file, 'modified'); await utimes(file, before.atime, before.mtime);
      expect(await unchanged()).toBe(false);
    });
  });

  it.skipIf(process.platform === 'win32')('rejects a retargeted or broken executable symlink', async () => {
    await withRuntimeFiles(async root => {
      const first = join(root, 'first'), second = join(root, 'second'), link = join(root, 'php');
      await writeFile(first, 'original'); await writeFile(second, 'original'); await symlink(first, link);
      const unchanged = await captureRuntimeFileGuard([link]);
      await unlink(link); await symlink(second, link); expect(await unchanged()).toBe(false);
      const afterSwitch = await captureRuntimeFileGuard([link]);
      await unlink(second); expect(await afterSwitch()).toBe(false);
    });
  });
});
