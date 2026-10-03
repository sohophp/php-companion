import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import process from 'node:process';
import test from 'node:test';
import { PHPSTORM_STUBS_REVISION, requirePinnedPhpstormStubs } from './phpstorm-stubs-source.mjs';

const upstream = process.env.PHPSTORM_STUBS_TEST_SOURCE;
if (!upstream) throw new Error('Set PHPSTORM_STUBS_TEST_SOURCE to the pinned upstream checkout');

test('fixed upstream identity rejects changed inputs before sync', async (t) => {
  const directory = mkdtempSync(join(tmpdir(), 'sophp-stubs-source-'));
  const source = join(directory, 'source');
  const git = (...args) => execFileSync('git', ['-C', source, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  try {
    execFileSync('git', ['-C', upstream, 'worktree', 'add', '--detach', source, PHPSTORM_STUBS_REVISION], { stdio: 'pipe' });
    await t.test('clean pinned checkout succeeds', () => {
      assert.equal(requirePinnedPhpstormStubs(source), PHPSTORM_STUBS_REVISION);
    });
    await t.test('unstaged declaration change is rejected', () => {
      writeFileSync(join(source, 'standard', 'standard_0.php'), '<?php function injected() {}\n');
      assert.throws(() => requirePinnedPhpstormStubs(source), /has local changes/);
      git('restore', 'standard/standard_0.php');
    });
    await t.test('staged declaration change is rejected', () => {
      writeFileSync(join(source, 'standard', 'standard_0.php'), '<?php function injected() {}\n');
      git('add', 'standard/standard_0.php');
      assert.throws(() => requirePinnedPhpstormStubs(source), /has local changes/);
      git('restore', '--staged', 'standard/standard_0.php');
      git('restore', 'standard/standard_0.php');
    });
    await t.test('deleted declaration is rejected', () => {
      rmSync(join(source, 'standard', 'standard_0.php'));
      assert.throws(() => requirePinnedPhpstormStubs(source), /has local changes/);
      git('restore', 'standard/standard_0.php');
    });
    await t.test('untracked source consumed by directory scans is rejected', () => {
      writeFileSync(join(source, 'standard', 'injected.php'), '<?php function injected() {}\n');
      assert.throws(() => requirePinnedPhpstormStubs(source), /has local changes/);
      rmSync(join(source, 'standard', 'injected.php'));
    });
    assert.equal(requirePinnedPhpstormStubs(source), PHPSTORM_STUBS_REVISION);
  } finally {
    try {
      execFileSync('git', ['-C', upstream, 'worktree', 'remove', '--force', source], { stdio: 'pipe' });
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  }
});
