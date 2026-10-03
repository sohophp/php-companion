import assert from 'node:assert/strict';
import console from 'node:console';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { delimiter, join } from 'node:path';
import process from 'node:process';
import { resolveExecutable } from '../packages/runtime-probe/dist/index.js';

const root = await mkdtemp(join(tmpdir(), 'sophp-executable-resolution-'));
const checks = [];
async function check(name, command, env, expected) {
  const actual = await resolveExecutable(command, env);
  const comparable = value => process.platform === 'win32' ? value?.toLowerCase() : value;
  assert.equal(comparable(actual), comparable(expected), name);
  checks.push(name);
}
try {
  const directory = join(root, 'tools with spaces');
  await mkdir(directory);
  const php = join(directory, process.platform === 'win32' ? 'php.exe' : 'php');
  await writeFile(php, 'resolver fixture only; never executed', { mode: 0o755 });
  await check('absolute path with spaces', php, {}, php);
  await check('missing command', 'sophp_nonexistent_tool', { PATH: directory }, undefined);
  await check('extensionless PHP lookup', 'php', { PATH: directory }, php);
  const shadow = join(root, 'shadow');
  await mkdir(join(shadow, process.platform === 'win32' ? 'php.exe' : 'php'), { recursive: true });
  await check('directory does not shadow executable', 'php', { PATH: `${shadow}${delimiter}${directory}` }, php);
  await check('absolute directory rejected', shadow, {}, undefined);
  if (process.platform !== 'win32') {
    const nonExecutable = join(root, 'non-executable');
    await mkdir(nonExecutable);
    await writeFile(join(nonExecutable, 'php'), 'not executable', { mode: 0o644 });
    await check('non-executable does not shadow executable', 'php', { PATH: `${nonExecutable}${delimiter}${directory}` }, php);
    await check('absolute non-executable rejected', join(nonExecutable, 'php'), {}, undefined);
  }
  if (process.platform === 'win32') {
    await check('explicit exe suffix', 'php.exe', { PATH: directory }, php);
    await check('Windows Path casing', 'php', { Path: directory, PathExt: '.EXE;.CMD;.BAT' }, php);
    await check('quoted PATH directory', 'php', { PATH: `"${directory}"` }, php);
    const composer = join(directory, 'composer.bat');
    await writeFile(composer, 'resolver fixture only; never executed');
    await check('Composer batch lookup', 'composer', { Path: directory, PATHEXT: '.EXE;.CMD;.BAT' }, composer);
    await check('explicit batch suffix', 'composer.bat', { PATH: directory }, composer);
  }
  console.log(JSON.stringify({ platform: process.platform, node: process.version, checks,
    scope: 'Native file resolution only; fixture executables are never run' }, null, 2));
} finally {
  await rm(root, { recursive: true, force: true });
}
