import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

// Use the existing compiled harness without changing frozen dist-test artifacts.
if (process.platform !== 'linux') throw new Error('This visible gate uses the Linux VS Code harness.');
if (process.argv.length > 3) throw new Error('Usage: node scripts/check-comparison-condition-acceptance.mjs [report.json]');
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const automatic = process.env.SOPHP_AUTOMATIC_COMPLETION === '1';
const isolatedIndexingMode = process.env.SOPHP_AUTOMATIC_INDEXING_MODE;
if (isolatedIndexingMode && (!automatic || !['onDemand', 'progressive'].includes(isolatedIndexingMode)))
  throw new Error('SOPHP_AUTOMATIC_INDEXING_MODE requires automatic mode and onDemand or progressive.');
if (isolatedIndexingMode && (process.env.PHP_COMPANION_TEST_C3_INDEXING_MODE
  || isolatedIndexingMode === 'progressive' && process.env.PHP_COMPANION_TEST_SYMFONY_CONTEXT_ON_DEMAND === '1'))
  throw new Error('Conflicting isolated indexing mode settings.');
const scratch = await mkdtemp(join(root, '.vscode-test', 'comparison-condition-verification-'));
try {
  const suite = join(scratch, 'suite.cjs');
  await build({ entryPoints: [join(root, automatic ? 'test/extension/suite/automaticCompletionAcceptance.ts' : 'test/extension/suite/comparisonConditionAcceptance.ts')], outfile: suite,
    bundle: true, platform: 'node', format: 'cjs', external: ['vscode'], logLevel: 'warning' });
  let runner = (await readFile(join(root, 'dist-test/runTest.js'), 'utf8'))
    .replaceAll('__dirname', JSON.stringify(join(root, 'dist-test')));
  const pathPattern = /^([ \t]*)extensionTestsPath:[\s\S]*?(?=^[ \t]*launchArgs:)/gmu;
  assert.equal([...runner.matchAll(pathPattern)].length, 1, 'Compiled harness must have one tests path followed by launch arguments.');
  runner = runner.replace(pathPattern, (_value, indent) => `${indent}extensionTestsPath: ${JSON.stringify(suite)},\n`);
  if (isolatedIndexingMode) {
    const c1Mode = /^([ \t]*if \(c1Only\) \{\r?\n[^\n]*\r?\n[^\n]*\r?\n[ \t]*settings\['phpCompanion\.indexing\.mode'\] = )'onDemand';/gmu;
    assert.equal([...runner.matchAll(c1Mode)].length, 1, 'Compiled harness must have one C1 mode assignment.');
    runner = runner.replace(c1Mode, (_value, prefix) => `${prefix}${JSON.stringify(isolatedIndexingMode)};`);
    const launch = '        await (0, test_electron_1.runTests)({';
    assert.equal(runner.split(launch).length, 2, 'Compiled harness must have one test launch.');
    runner = runner.replace(launch, `        if (workspaceFile) {
            const workspaceFs = require('node:fs/promises');
            const workspaceData = JSON.parse(await workspaceFs.readFile(workspaceFile, 'utf8'));
            workspaceData.settings = { ...workspaceData.settings, 'phpCompanion.indexing.mode': ${JSON.stringify(isolatedIndexingMode)} };
            await workspaceFs.writeFile(workspaceFile, JSON.stringify(workspaceData, null, 2));
        }
${launch}`);
  }
  const runnerPath = join(scratch, 'runner.cjs'); await writeFile(runnerPath, runner);
  let output = '';
  let rendererExceptions = 0;
  const child = spawn(process.execPath, [join(root, 'scripts/run-extension-test.mjs'), runnerPath], {
    cwd: root, env: { ...process.env, PHP_COMPANION_TEST_CORE_ONLY: '1', PHP_COMPANION_TEST_C1_ONLY: '1', PHP_COMPANION_TEST_C1_UI: '1', PHP_COMPANION_TEST_C1_PHP_VERSION: '8.5' }, stdio: ['ignore', 'pipe', 'pipe'],
  });
  for (const [stream, destination] of [[child.stdout, process.stdout], [child.stderr, process.stderr]]) {
    stream.setEncoding('utf8'); let pending = '';
    const inspect = line => { if (line.includes("TypeError: Cannot read properties of undefined (reading 'getItemsByProvider')")) rendererExceptions++; };
    stream.on('data', chunk => { destination.write(chunk); output = (output + chunk).slice(-131_072);
      pending += chunk; const lines = pending.split('\n'); pending = lines.pop(); for (const line of lines) inspect(line); });
    stream.on('end', () => { if (pending) inspect(pending); });
  }
  await new Promise((resolveDone, reject) => {
    child.once('error', reject);
    child.once('close', (code, signal) => code === 0 && !signal ? resolveDone()
      : reject(new Error(`Comparison condition host exited with code ${code}, signal ${signal}`)));
  });
  const match = (automatic ? /Automatic completion acceptance proof: (\{[^\r\n]*\})/u : /Comparison condition acceptance proof: (\{[^\r\n]*\})/u).exec(output);
  assert.ok(match, 'Successful host exit did not provide the completion acceptance proof.');
  const proof = JSON.parse(match[1]);
  if (isolatedIndexingMode) {
    assert.equal(proof.indexingMode, isolatedIndexingMode);
    assert.equal(proof.workspaceIndexingMode, isolatedIndexingMode);
  }
  const expectedFlows = 6 + Number(process.env.SOPHP_ROOT_IMPORT_FLOW === '1') + Number(process.env.SOPHP_LIVE_TYPE_FLOW === '1')
    + 4 * Number(process.env.SOPHP_NAMESPACE_IMPORT_FLOW === '1');
  assert.equal(proof.results.length, automatic ? expectedFlows : 8);
  if (automatic) { assert.equal(rendererExceptions, 0, 'Automatic completion raised getItemsByProvider'); proof.rendererExceptions = rendererExceptions; }
  if (process.argv[2]) await writeFile(process.argv[2], JSON.stringify(proof, null, 2) + '\n');
} finally { await rm(scratch, { recursive: true, force: true }); }
