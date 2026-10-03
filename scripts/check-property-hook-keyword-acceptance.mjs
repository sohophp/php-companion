import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

// Use the existing compiled harness without changing frozen dist-test artifacts.
if (process.platform !== 'linux') throw new Error('This visible gate uses the Linux VS Code harness.');
if (process.argv.length > 3) throw new Error('Usage: node scripts/check-property-hook-keyword-acceptance.mjs [report.json]');
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const scratch = await mkdtemp(join(root, '.vscode-test', 'property-hook-keyword-verification-'));
try {
  const suite = join(scratch, 'suite.cjs');
  await build({ entryPoints: [join(root, 'test/extension/suite/propertyHookKeywordAcceptance.ts')], outfile: suite,
    bundle: true, platform: 'node', format: 'cjs', external: ['vscode'], logLevel: 'warning' });
  let runner = (await readFile(join(root, 'dist-test/runTest.js'), 'utf8'))
    .replaceAll('__dirname', JSON.stringify(join(root, 'dist-test')));
  const lines = runner.split('\n');
  const matches = lines.flatMap((line, index) => /^\s*extensionTestsPath:/u.test(line) ? [index] : []);
  assert.equal(matches.length, 1, 'Compiled harness must have one explicit tests path.');
  lines[matches[0]] = `      extensionTestsPath: ${JSON.stringify(suite)},`;
  runner = lines.join('\n');
  const runnerPath = join(scratch, 'runner.cjs'); await writeFile(runnerPath, runner);
  let output = '';
  const child = spawn(process.execPath, [join(root, 'scripts/run-extension-test.mjs'), runnerPath], {
    cwd: root, env: { ...process.env, PHP_COMPANION_TEST_CORE_ONLY: '1', PHP_COMPANION_TEST_C1_ONLY: '1', PHP_COMPANION_TEST_C1_UI: '1', PHP_COMPANION_TEST_C1_PHP_VERSION: '8.5' }, stdio: ['ignore', 'pipe', 'inherit'],
  });
  child.stdout.on('data', chunk => { process.stdout.write(chunk); output = (output + chunk.toString()).slice(-131_072); });
  await new Promise((resolveDone, reject) => {
    child.once('error', reject);
    child.once('exit', (code, signal) => code === 0 && !signal ? resolveDone()
      : reject(new Error(`Hook keyword host exited with code ${code}, signal ${signal}`)));
  });
  const match = /Hook keyword acceptance proof: (\{[^\r\n]*\})/u.exec(output);
  assert.ok(match, 'Successful host exit did not provide the restart proof.');
  const proof = JSON.parse(match[1]); assert.equal(proof.results.length, 4);
  if (process.argv[2]) await writeFile(process.argv[2], JSON.stringify(proof, null, 2) + '\n');
} finally { await rm(scratch, { recursive: true, force: true }); }
