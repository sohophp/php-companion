import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

// Compile an isolated suite using the existing Core host harness.

if (process.argv.length > 3) throw new Error('Usage: node scripts/check-captured-array-values-host.mjs [report.json]');
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const scratch = await mkdtemp(join(root, '.vscode-test', 'captured-array-verification-'));
try {
  const suite = join(scratch, 'suite.cjs');
  await build({ entryPoints: [join(root, 'test/extension/suite/capturedArrayValues.ts')], outfile: suite,
    bundle: true, platform: 'node', format: 'cjs', external: ['vscode'], logLevel: 'warning' });
  let runner = (await readFile(join(root, 'dist-test/runTest.js'), 'utf8'))
    .replaceAll('__dirname', JSON.stringify(join(root, 'dist-test')));
  const pattern = /^([ \t]*)extensionTestsPath:[\s\S]*?(?=^[ \t]*launchArgs:)/gmu;
  assert.equal([...runner.matchAll(pattern)].length, 1, 'Compiled harness must have one tests path before launch arguments.');
  runner = runner.replace(pattern, (_value, indent) => `${indent}extensionTestsPath: ${JSON.stringify(suite)},\n`);
  const runnerPath = join(scratch, 'runner.cjs'); await writeFile(runnerPath, runner);
  let output = '';
  const child = spawn(process.execPath, [join(root, 'scripts/run-extension-test.mjs'), runnerPath], {
    cwd: root, env: { ...process.env, PHP_COMPANION_TEST_CORE_ONLY: '1', PHP_COMPANION_TEST_C1_ONLY: '1', PHP_COMPANION_TEST_C1_UI: '1', PHP_COMPANION_TEST_C1_PHP_VERSION: process.env.SOPHP_VISIBLE_PHP_VERSION ?? '8.5' }, stdio: ['ignore', 'pipe', 'inherit'],
  });
  child.stdout.on('data', chunk => { process.stdout.write(chunk); output = (output + chunk.toString()).slice(-131_072); });
  await new Promise((resolveDone, reject) => {
    child.once('error', reject);
    child.once('exit', (code, signal) => code === 0 && !signal ? resolveDone()
      : reject(new Error(`Captured array host exited with code ${code}, signal ${signal}`)));
  });
  const match = /Captured array host proof: (\{[^\r\n]*\})/u.exec(output);
  assert.ok(match, 'Successful host exit did not provide the capture proof.');
  const proof = JSON.parse(match[1]); assert.equal(proof.diskUnchanged, true); assert.equal(proof.results.length, proof.phpVersion === '7.2' ? 18 : 22);
  assert.equal(proof.retraction.length, 4); assert.ok(proof.retraction.every(result => result.visibleCount === 0));
  if (process.argv[2]) await writeFile(process.argv[2], JSON.stringify(proof, null, 2) + '\n');
} finally { await rm(scratch, { recursive: true, force: true }); }
