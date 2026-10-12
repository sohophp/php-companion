import assert from 'node:assert/strict';
import { spawn, execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import console from 'node:console';
import { lstat, mkdir, mkdtemp, readFile, readdir, readlink, realpath, rm, copyFile, symlink, writeFile, open } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const usage = 'Usage: node scripts/benchmark-editor-activation.mjs --editor /path/to/code --php /path/to/php --output NEW_DIRECTORY [--files 1000,10000,50000] [--rounds 5] [--modes onDemand,progressive,experimental] [--python python3] [--profile /path/to/profile.json]';
const args = process.argv.slice(2);
if (args.length === 1 && args[0] === '--help') { console.log(usage); process.exit(0); }
const options = new Map();
for (let i = 0; i < args.length; i += 2) {
  const key = args[i];
  if (!['--editor', '--php', '--output', '--files', '--rounds', '--modes', '--python', '--profile'].includes(key)
      || options.has(key) || args[i + 1] === undefined || args[i + 1].startsWith('--')) throw new Error(usage);
  options.set(key, args[i + 1]);
}
if (!['--editor', '--php', '--output'].every(key => options.has(key))) throw new Error(usage);
const counts = (options.get('--files') ?? '1000,10000,50000').split(',').map(Number);
const rounds = Number(options.get('--rounds') ?? '5');
const modes = (options.get('--modes') ?? 'onDemand').split(',');
assert.ok(counts.length > 0 && new Set(counts).size === counts.length && counts.every(n => [1000, 10000, 50000].includes(n)), usage);
assert.ok(Number.isSafeInteger(rounds) && rounds >= 1 && rounds <= 5, usage);
assert.ok(modes.length > 0 && new Set(modes).size === modes.length
  && modes.every(mode => ['onDemand', 'progressive', 'experimental'].includes(mode)), usage);
assert.equal(process.platform, 'linux', 'This observer currently supports Linux.');
assert.ok(!process.env.NODE_OPTIONS && !Object.keys(process.env).some(key => key.startsWith('PHP_COMPANION_') || key.startsWith('SOPHP_BENCHMARK_')), 'Remove inherited runtime/test selectors.');

const run = promisify(execFile);
const project = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const helpers = join(project, 'scripts/benchmark-editor-activation');
const editor = await realpath(resolve(options.get('--editor')));
const php = await realpath(resolve(options.get('--php')));
const pythonOption = options.get('--python') ?? 'python3';
const python = await realpath((await run(pythonOption, ['-c', 'import sys;print(sys.executable)'])).stdout.trim());
// Minimal -n PHP 7.x CLIs may not load the JSON extension.
const phpInfo = (await run(php, ['-r', 'echo PHP_VERSION, "\\n", PHP_BINARY;'])).stdout.trimEnd().split('\n');
assert.equal(phpInfo.length, 2, 'PHP version and actual binary probe returned unexpected output.');
const [phpVersion, phpBinaryPath] = phpInfo;
const phpTarget = /^([78]\.\d)\./u.exec(phpVersion)?.[1];
assert.ok(['7.2', '7.3', '7.4', '8.0', '8.1', '8.2', '8.3', '8.4', '8.5'].includes(phpTarget), 'Use a supported PHP 7.2–8.5 CLI.');
const actualPhpBinary = await realpath(phpBinaryPath);
const editorPackage = join(dirname(editor), 'resources/app/package.json');
const editorVersion = JSON.parse(await readFile(editorPackage, 'utf8')).version;
// Read-only source Profile: every editor gets its own copied installed extensions
// and fresh user-data. No installation or changes to the supplied Profile.
const profilePath = options.has('--profile') ? await realpath(resolve(options.get('--profile'))) : undefined;
let profile;
if (profilePath) {
  const config = JSON.parse(await readFile(profilePath, 'utf8'));
  assert.equal(config.schema, 1, 'Profile schema must be 1.');
  assert.ok(typeof config.extensionsDirectory === 'string' && Array.isArray(config.developmentPaths)
    && config.developmentPaths.every(path => typeof path === 'string'), 'Invalid Profile paths.');
  const extensionsDirectory = await realpath(resolve(dirname(profilePath), config.extensionsDirectory));
  const developmentPaths = await Promise.all(config.developmentPaths.map(path => realpath(resolve(dirname(profilePath), path))));
  const installed = [];
  for (const name of await readdir(extensionsDirectory)) {
    const path = join(extensionsDirectory, name);
    if (!(await lstat(path)).isDirectory()) continue;
    const manifest = JSON.parse(await readFile(join(path, 'package.json'), 'utf8'));
    installed.push({ id: `${manifest.publisher}.${manifest.name}`.toLowerCase(), version: manifest.version, path });
  }
  const development = await Promise.all(developmentPaths.map(async path => {
    const manifest = JSON.parse(await readFile(join(path, 'package.json'), 'utf8'));
    return { id: `${manifest.publisher}.${manifest.name}`.toLowerCase(), version: manifest.version, path };
  }));
  const inventory = [...installed, ...development];
  assert.ok(inventory.length > 0 && inventory.every(item => typeof item.version === 'string'
    && item.id !== 'sohophp.php-companion' && !item.id.startsWith('undefined.')), 'Invalid or duplicate Core extension.');
  assert.equal(new Set(inventory.map(item => item.id)).size, inventory.length, 'Duplicate Profile extension IDs.');
  profile = { extensionsDirectory, developmentPaths, installed, development, inventory };
}
const output = resolve(options.get('--output'));
await mkdir(output); // Never replace an earlier run or its failures.
const hash = async path => createHash('sha256').update(await readFile(path)).digest('hex');
const now = () => new Date().toISOString();
const report = { schema: 1, status: 'preparing', parentPid: process.pid, startedAtUtc: now(), cases: [],
  platform: process.platform, phpVersion, phpTarget, phpExecutablePath: php, actualPhpBinary, editorVersion,
  indexingMode: modes.length === 1 ? modes[0] : undefined, indexingModes: modes,
  scope: `Isolated ${profile ? 'source Profile' : 'Core'} activation-to-first strictly validated public query; private main clock wrapper and Production context proxy; original bundles unchanged. Not all Profile workflows/platforms, natural UI, hot-query or full-index qualification.`,
  sourceProfile: Boolean(profile), profileInventory: profile?.inventory,
  sourceProfileInputExclusions: profile ? ['development .git/.vscode-test/.vscode-test-results directories and historical .vsix files'] : [],
  diagnosticOnly: true, privateMainClockWrapper: true, privateProductionContextProxy: true,
  queryPrewarm: false, queryRetries: 0, forcedGc: false, profileUpdated: false, fullQualification: false,
  plannedSchedule: modes.flatMap(indexingMode => counts.flatMap(files => Array.from({ length: rounds },
    (_, i) => ({ files, round: i + 1, indexingMode })))) };
const save = () => writeFile(join(output, 'result.json'), JSON.stringify(report, null, 2) + '\n');
const inputs = new Map(); const links = new Map(); let extension; let activeChild;
async function capture(path) {
  const stat = await lstat(path);
  if (stat.isSymbolicLink()) { links.set(path, await readlink(path)); return; }
  if (stat.isDirectory()) {
    for (const entry of await readdir(path)) await capture(join(path, entry));
  } else if (stat.isFile()) inputs.set(path, await hash(path));
}
const profileVisited = new Set();
async function captureProfile(path, excludeDevelopmentArtifacts = false) {
  const stat = await lstat(path);
  if (stat.isSymbolicLink()) {
    links.set(path, await readlink(path));
    try { await captureProfile(await realpath(path), excludeDevelopmentArtifacts); }
    catch (error) { if (error.code !== 'ENOENT') throw error; }
    return;
  }
  if (profileVisited.has(path)) return;
  profileVisited.add(path);
  if (stat.isDirectory()) {
    for (const entry of await readdir(path)) {
      // Editor downloads, old reports and packaged historical builds are not
      // inputs to these source extensions. Keep runtime files and dependencies.
      if (excludeDevelopmentArtifacts && (['.git', '.vscode-test', '.vscode-test-results'].includes(entry)
        || entry.endsWith('.vsix'))) continue;
      await captureProfile(join(path, entry), excludeDevelopmentArtifacts);
    }
  } else if (stat.isFile()) inputs.set(path, await hash(path));
}
const assets = ['extension.js', 'language-server.js', 'candidateWorker.js', 'portableCandidateSearchWorker.js',
  'sourceStatWorker.js', 'builtinSnapshotWorker.js', 'web-tree-sitter.wasm', 'tree-sitter-php.wasm']
  .map(name => join(project, 'dist', name));
async function mismatches(paths = inputs.keys()) {
  const changed = [];
  for (const path of paths) {
    try { if (await hash(path) !== inputs.get(path)) changed.push(path); }
    catch { changed.push(path); }
  }
  return changed;
}
const isLive = async pid => {
  try { return (await lstat(`/proc/${pid}`)).isDirectory(); } catch { return false; }
};
await save();
try {
  for (const path of [...assets, join(project, 'package.json'), join(project, 'package.nls.json'),
    join(project, 'package.nls.zh-cn.json'), join(project, 'pnpm-lock.yaml'), join(project, 'packages/testkit/dist'),
    join(project, 'resources'), join(project, 'node_modules/.pnpm'), helpers, fileURLToPath(import.meta.url),
    process.execPath, editor, editorPackage, php, actualPhpBinary, python]) await capture(path);
  if (profile) {
    await capture(profilePath);
    await captureProfile(profile.extensionsDirectory);
    for (const path of profile.developmentPaths) await captureProfile(path, true);
    profile.installedFiles = [...inputs].filter(([path]) => path.startsWith(profile.extensionsDirectory + '/'))
      .map(([path, sha256]) => ({ relativePath: path.slice(profile.extensionsDirectory.length + 1), sha256 }));
  }
  report.engineBuildId = inputs.get(join(project, 'dist/language-server.js'));
  extension = await mkdtemp(join(tmpdir(), 'sophp-activation-observer-extension-'));
  const original = JSON.parse(await readFile(join(project, 'package.json'), 'utf8'));
  const manifest = { ...original, main: './activation-main.cjs' };
  assert.deepEqual({ ...manifest, main: original.main }, original);
  await writeFile(join(extension, 'package.json'), JSON.stringify(manifest, null, 2) + '\n');
  await copyFile(join(helpers, 'activation-main.cjs'), join(extension, 'activation-main.cjs'));
  for (const name of ['package.nls.json', 'package.nls.zh-cn.json']) await copyFile(join(project, name), join(extension, name));
  for (const name of ['dist', 'resources', 'node_modules']) await symlink(join(project, name), join(extension, name), 'dir');
  const preparation = { extension, php, phpTarget, phpVersion, actualPhpBinary, editor, editorVersion, helperDirectory: helpers, profile };
  const preparationPath = join(output, 'preparation.json');
  await writeFile(preparationPath, JSON.stringify(preparation, null, 2) + '\n');
  await writeFile(join(output, 'inputs.json'), JSON.stringify({ hashes: Object.fromEntries(inputs),
    symlinks: Object.fromEntries(links), runtimeAssets: assets, predeclaredSchedule: report.plannedSchedule }, null, 2) + '\n');
  report.status = 'running'; await save();
  for (const planned of report.plannedSchedule) {
    const name = `activation-${planned.files}${planned.indexingMode === 'onDemand' ? '' : '-' + planned.indexingMode}-r${planned.round}`;
    const display = join(output, name + '-owned-display');
    const command = [join(helpers, 'owned-display.py'), '--evidence', display, '--', process.execPath,
      join(helpers, 'worker.mjs'), preparationPath, output, String(planned.files), String(planned.round), planned.indexingMode];
    const row = { ...planned, status: 'running', startedAtUtc: now(), command: [python, ...command] };
    report.cases.push(row); await save();
    const stdout = await open(join(output, name + '.stdout'), 'wx');
    const stderr = await open(join(output, name + '.stderr'), 'wx');
    let code;
    try {
      const child = spawn(python, command, { cwd: project, stdio: ['ignore', stdout.fd, stderr.fd] }); activeChild = child;
      const exited = new Promise((done, reject) => { child.once('error', reject); child.once('exit', done); });
      // Attach rejection handling before writing evidence; a launcher may fail immediately.
      const outcome = exited.then(code => ({ code }), error => ({ error }));
      row.childPid = child.pid; await save();
      const completed = await outcome;
      if (completed.error) throw completed.error;
      code = completed.code; activeChild = undefined;
    } finally { await stdout.close(); await stderr.close(); }
    row.status = 'exited'; row.exitCode = code; await save();
    const displayProof = JSON.parse(await readFile(join(display, 'display-run.json'), 'utf8'));
    row.display = displayProof;
    let driver;
    try { driver = JSON.parse(await readFile(join(output, name + '-driver.json'), 'utf8')); }
    catch (error) {
      if (error.code !== 'ENOENT') throw error;
      // A display failure can prevent the editor worker from ever starting.
      // Preserve its actual failure and ownership evidence before stopping.
      row.driverMissing = true;
      row.workerStarted = Number.isInteger(displayProof.childPid);
      row.checkedProcessIds = [row.childPid, displayProof.childPid, displayProof.serverPid].filter(Number.isInteger);
      row.actualOwnedProcessesGone = (await Promise.all(row.checkedProcessIds.map(isLive))).every(live => !live);
      row.fixtureRemoved = !row.workerStarted;
      row.changedRuntimeAssets = await mismatches(assets);
      row.correctnessPassed = false;
      await save();
      throw new Error(`Editor driver evidence missing; owned display: ${displayProof.error ?? displayProof.cleanupError ?? displayProof.status}. See ${join(display, 'xserver.log')}.`, { cause: error });
    }
    row.driver = driver;
    const proofPath = join(output, name + '-proof.json');
    try { row.observation = JSON.parse(await readFile(proofPath, 'utf8')); row.proofSha256 = await hash(proofPath); }
    catch (error) { if (error.code !== 'ENOENT') throw error; }
    const partialPath = join(output, name + '-partial-trace.json');
    try { row.partialObservation = JSON.parse(await readFile(partialPath, 'utf8')); }
    catch (error) { if (error.code !== 'ENOENT') throw error; }
    const observed = row.observation ?? row.partialObservation;
    const pids = [row.childPid, displayProof.childPid, displayProof.serverPid,
      ...(observed ? [observed.hostPid, ...observed.servers.map(server => server.pid),
        ...(observed.ownedHostDescendants ?? []).map(child => child.pid)] : [])];
    row.checkedProcessIds = pids;
    row.actualOwnedProcessesGone = (await Promise.all(pids.map(isLive))).every(live => !live);
    row.fixtureRemoved = !await isLiveFixture(driver.fixtureRoot);
    row.changedRuntimeAssets = await mismatches(assets);
    row.correctnessPassed = Boolean(code === 0 && driver.correctnessPassed && !driver.logArchiveError && observed
      && observed.correctFirstResponses && observed.files === planned.files && observed.round === planned.round
      && observed.phpVersion === phpTarget && observed.phpExecutablePath === php && observed.indexingMode === planned.indexingMode
      && driver.phpTarget === phpTarget && driver.indexingMode === planned.indexingMode
      && Boolean(observed.sourceProfile) === Boolean(profile) && Boolean(driver.sourceProfile) === Boolean(profile)
      && (!profile || (observed.profileInventory.length === profile.inventory.length + 1
        && observed.profileAutomaticUpdatesDisabled && driver.profileAutomaticUpdatesDisabled
        && driver.profileRuntimeCopiesUnchanged
        && driver.profileCopiedFilesVerified === profile.installedFiles.length))
      && observed.originalContextMode === 3 && observed.delegatedContextMode === 1 && observed.calls === 1
      && observed.queryRetries === 0 && !observed.queryPrewarm && driver.generatedPhpFiles === planned.files);
    await save();
    assert.ok(row.correctnessPassed && row.actualOwnedProcessesGone && row.fixtureRemoved && row.changedRuntimeAssets.length === 0,
      'First actual workflow, ownership or asset failure retained; no equivalent retry.');
  }
  report.allScheduledCasesExecuted = report.cases.length === report.plannedSchedule.length;
  report.firstResultsRecorded = report.allScheduledCasesExecuted && report.cases.every(row => row.correctnessPassed);
} catch (error) { report.error = String(error.stack ?? error); }
finally {
  if (activeChild?.pid && activeChild.exitCode === null && activeChild.signalCode === null) {
    report.status = 'error-with-live-child'; await save();
    // eslint-disable-next-line no-unsafe-finally -- Preserve the actual live editor handle instead of cleaning its observer.
    throw new Error('Actual editor child remains live; preserve its PID, observer and frozen inputs.');
  }
  report.changedInputs = await mismatches();
  report.changedSymlinks = [];
  for (const [path, target] of links) {
    try { if (await readlink(path) !== target) report.changedSymlinks.push(path); }
    catch { report.changedSymlinks.push(path); }
  }
  report.inputsUnchanged = report.changedInputs.length === 0 && report.changedSymlinks.length === 0;
  report.passed = Boolean(report.firstResultsRecorded && report.inputsUnchanged);
  if (extension && report.cases.every(row => row.status === 'exited')) {
    await rm(extension, { recursive: true, force: true }); report.observerExtensionRemoved = true;
  }
  report.status = 'exited'; report.finishedAtUtc = now(); await save();
}
console.log(JSON.stringify({ result: join(output, 'result.json'), passed: report.passed,
  cases: report.cases.length, diagnosticOnly: true, fullQualification: false }));
process.exitCode = report.passed ? 0 : 1;

async function isLiveFixture(path) {
  try { await lstat(path); return true; } catch (error) { if (error.code === 'ENOENT') return false; throw error; }
}
