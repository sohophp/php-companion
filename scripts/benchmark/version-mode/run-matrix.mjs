import console from 'node:console';
import process from 'node:process';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdir, mkdtemp, readFile, readdir, realpath, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve, sep } from 'node:path';
import { fileURLToPath, URL } from 'node:url';
import { parseArgs, promisify } from 'node:util';
import { modes, versions, validateReport } from './validate-report.mjs';
import { runOwned } from './owned-process.mjs';

const execute = promisify(execFile);
const { values } = parseArgs({ options: {
  mode: { type: 'string' }, output: { type: 'string' },
  'core-sha': { type: 'string' }, commit: { type: 'string' }, platform: { type: 'string' },
} });
assert(modes.includes(values.mode), 'Require one existing index mode');
assert.match(values['core-sha'] ?? '', /^[0-9a-f]{64}$/);
assert.match(values.commit ?? '', /^[0-9a-f]{40}$/);
assert(['linux', 'win32', 'darwin'].includes(values.platform));
assert.equal(process.platform, values.platform);
assert(values.output);
const cwd = await realpath(process.cwd());
const helperRoot = dirname(fileURLToPath(import.meta.url));
const output = resolve(values.output);
// Restrict owned output to this repository's ignored verification directory.
assert(output.startsWith(join(cwd, '.vscode-test') + sep));
const git = async (...args) => (await execute('git', args, { cwd })).stdout.trim();
assert.equal(await git('rev-parse', 'HEAD'), values.commit);
assert.equal(await git('status', '--porcelain=v1', '--untracked-files=all'), '');
const digest = async path => createHash('sha256').update(await readFile(path)).digest('hex');
const runtimeFiles = ['language-server.js', 'extension.js', 'candidateWorker.js',
  'builtinSnapshotWorker.js', 'sourceStatWorker.js', 'portableCandidateSearchWorker.js',
  'web-tree-sitter.wasm', 'tree-sitter-php.wasm'].map(name => join(cwd, 'dist', name));
assert.equal(await digest(runtimeFiles[0]), values['core-sha']);
const trackedInputs = [...runtimeFiles, join(cwd, 'scripts/benchmark-editing.mjs'),
  join(cwd, 'packages/testkit/dist/index.js'), ...['run-matrix.mjs', 'validate-report.mjs',
    'owned-process.mjs', 'probe-loaded-version.mjs'].map(name => join(helperRoot, name))];
const manifest = await Promise.all(trackedInputs.map(async path => ({ path, sha256: await digest(path) })));
const verifyInputs = async () => {
  for (const item of manifest) assert.equal(await digest(item.path), item.sha256, item.path);
  assert.equal(await git('rev-parse', 'HEAD'), values.commit);
  assert.equal(await git('status', '--porcelain=v1', '--untracked-files=all'), '');
};
await mkdir(dirname(output), { recursive: true });
await mkdir(output);
const temporaryOwner = await realpath(await mkdtemp(join(tmpdir(), 'sophp-version-mode-matrix-')));
const state = { startedAtUtc: new Date().toISOString(), status: 'running',
  commit: values.commit, coreSHA256: values['core-sha'], platform: process.platform,
  runtime: process.version, mode: values.mode, expectedCasesInCohort: 9,
  expectedCasesInWholePlatformMatrix: 27, manifest, cases: [],
  cohortQualified: false, wholePlatformMatrixQualified: false, fullObjectiveComplete: false };
const save = () => writeFile(join(output, 'state.json'), JSON.stringify(state, null, 2) + '\n');
await save();
try {
  for (const phpVersion of versions) {
    await verifyInputs();
    const name = `php-${phpVersion}-${values.mode}`;
    const row = { name, phpVersion, mode: values.mode, status: 'running', qualified: false };
    state.cases.push(row);
    await save();
    const env = Object.fromEntries(Object.entries(process.env).filter(([key]) => !key.startsWith('SOPHP_BENCHMARK_')));
    Object.assign(env, { SOPHP_BENCHMARK_PHP_VERSION: phpVersion,
      SOPHP_BENCHMARK_INDEXING_MODE: values.mode,
      SOPHP_BENCHMARK_FIXTURE_LAYOUT: values.mode === 'experimental' ? 'legacy' : 'psr4',
      SOPHP_BENCHMARK_COMPLETION_NOISE_FUNCTIONS: values.mode === 'experimental' ? '0' : '500' });
    row.environment = Object.fromEntries(Object.entries(env).filter(([key]) => key.startsWith('SOPHP_BENCHMARK_')));
    row.benchmark = await runOwned({ command: process.execPath,
      args: [join(cwd, 'scripts/benchmark-editing.mjs'), '500', '50',
        ...['language-server.js', 'web-tree-sitter.wasm', 'tree-sitter-php.wasm'].map(file => join(cwd, 'dist', file))],
      cwd, env, temporaryDirectory: join(temporaryOwner, name + '-benchmark'),
      stdoutPath: join(output, name + '.json'), stderrPath: join(output, name + '.stderr'),
      timeoutMs: 15 * 60_000 });
    await save();
    assert(row.benchmark.normalExitAndNoLeftovers && row.benchmark.ownedProcessesGoneAfterCleanup
      && row.benchmark.temporaryDirectoryRemoved, name + ' benchmark lifecycle');
    const report = JSON.parse(await readFile(join(output, name + '.json')));
    row.summary = validateReport(report, { phpVersion, mode: values.mode,
      platform: process.platform, runtime: process.version });
    const proofPath = join(output, name + '.loaded-version.json');
    row.loadedVersionProbe = await runOwned({ command: process.execPath,
      args: [join(helperRoot, 'probe-loaded-version.mjs'), proofPath, phpVersion, values.mode, values['core-sha']],
      cwd, env, temporaryDirectory: join(temporaryOwner, name + '-version-probe'),
      stdoutPath: join(output, name + '.probe.stdout'), stderrPath: join(output, name + '.probe.stderr'),
      timeoutMs: 120_000 });
    await save();
    assert(row.loadedVersionProbe.normalExitAndNoLeftovers && row.loadedVersionProbe.ownedProcessesGoneAfterCleanup
      && row.loadedVersionProbe.temporaryDirectoryRemoved, name + ' version probe lifecycle');
    const proof = JSON.parse(await readFile(proofPath));
    assert.equal(proof.status, 'exited');
    assert.equal(proof.exitCode, 0);
    assert.equal(proof.passed, true);
    assert.equal(proof.coreHash, values['core-sha']);
    assert.equal(proof.rows.length, 1);
    const observed = proof.rows[0];
    assert.equal(observed.version, phpVersion);
    assert.equal(observed.mode, values.mode);
    assert(observed.passed && observed.directoryRemoved && observed.exitCode === 0);
    assert(observed.builtinSourceUris.length > 0);
    for (const uri of observed.builtinSourceUris) {
      assert(uri.startsWith('php-companion-builtin:'));
      assert.equal(new URL(uri).searchParams.get('php'), phpVersion);
    }
    assert.deepEqual(observed.availability.map(x => [x.name, x.since]),
      [['is_countable', '7.3'], ['str_contains', '8.0'], ['array_first', '8.5']]);
    for (const item of observed.availability) {
      const expected = versions.indexOf(phpVersion) >= versions.indexOf(item.since);
      assert.equal(item.present, expected);
      assert.equal(item.expected, expected);
    }
    row.rawEvidence = await Promise.all([name + '.json', name + '.stderr', name + '.loaded-version.json',
      name + '.probe.stdout', name + '.probe.stderr'].map(async file => ({ file, sha256: await digest(join(output, file)) })));
    await verifyInputs();
    row.status = 'passed';
    row.qualified = true;
    await save();
    console.log(JSON.stringify({ phpVersion, mode: values.mode, qualified: true }));
  }
  assert.equal(state.cases.length, 9);
  assert(state.cases.every(row => row.qualified));
  assert.equal((await readdir(temporaryOwner)).length, 0);
  state.cohortQualified = true;
} catch (error) {
  state.error = String(error.stack ?? error);
  process.exitCode = 1;
} finally {
  await rm(temporaryOwner, { recursive: true, force: true });
  state.temporaryOwnerRemoved = await readdir(temporaryOwner).then(() => false,
    error => { if (error.code === 'ENOENT') return true; throw error; });
  state.status = 'exited';
  state.finishedAtUtc = new Date().toISOString();
  state.requestedExitCode = process.exitCode ?? 0;
  await save();
}
console.log(JSON.stringify({ cohortQualified: state.cohortQualified, cases: state.cases.length,
  wholePlatformMatrixQualified: false, fullObjectiveComplete: false }));
