import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { cp, mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import process from 'node:process';
import { clearTimeout, setTimeout } from 'node:timers';

assert.equal(process.platform, 'win32', 'Run this harness with native Windows Node');
const [code, core, suite, baseline, symfony, suiteKind] = process.argv.slice(2);
assert.ok(suiteKind === undefined || ['restart', 'groupedReferences', 'arrayKeys', 'stubsFlow', 'traitFinal', 'declarationVariables', 'hookKeywords', 'arrayCallbacks'].includes(suiteKind), 'Unknown suite kind');
assert.ok(code && core && suite, 'Usage: check-native-windows-host.mjs CODE_EXE CORE_DIRECTORY SUITE_CJS [BASELINE_DIRECTORY [SYMFONY_DIRECTORY [SUITE_KIND]]]');
assert.ok(!symfony || baseline, 'Symfony C3 requires a baseline directory');
assert.ok(suiteKind !== 'restart' || !baseline && !symfony, 'Restart proof requires an independent Core-only fixture');
assert.ok(suiteKind !== 'groupedReferences' || !baseline && !symfony, 'Grouped references requires an independent Core-only fixture');
assert.ok(!['arrayKeys', 'stubsFlow', 'traitFinal'].includes(suiteKind) || !baseline && !symfony, 'Stubs proofs require an independent Core-only fixture');
assert.ok(!['declarationVariables', 'hookKeywords', 'arrayCallbacks'].includes(suiteKind) || !baseline && !symfony, 'Declaration proofs require an independent Core-only fixture');
const root = await mkdtemp(join(tmpdir(), 'sophp-native-windows-host-'));
let child;
let output = '';
try {
  const portServer = createServer();
  await new Promise(done => portServer.listen(0, '127.0.0.1', done));
  const port = portServer.address().port;
  await new Promise(done => portServer.close(done));
  if (baseline) await cp(baseline, root, { recursive: true });
  await mkdir(join(root, 'src'), { recursive: true });
  await mkdir(join(root, '.vscode'), { recursive: true });
  if (!baseline) await writeFile(join(root, 'composer.json'), JSON.stringify({ require: { php: '>=8.5' }, autoload: { 'psr-4': { 'App\\': 'src/' } } }));
  const settings = baseline ? JSON.parse(await readFile(join(root, '.vscode', 'settings.json'), 'utf8')) : {};
  await writeFile(join(root, '.vscode', 'settings.json'), JSON.stringify({
    ...settings,
    'phpCompanion.phpVersion': '8.5', 'phpCompanion.indexing.mode': suiteKind === 'groupedReferences' ? 'experimental' : symfony
      ? settings['phpCompanion.indexing.mode'] ?? 'experimental' : 'onDemand',
    'php.suggest.basic': false, 'php.validate.enable': false,
    'editor.wordBasedSuggestions': 'off', 'editor.insertSpaces': true, 'editor.tabSize': 4,
    'editor.snippetSuggestions': 'bottom', 'files.eol': '\n',
  }));
  const env = { ...process.env, PHP_COMPANION_TEST_C1_UI: '1', PHP_COMPANION_TEST_C1_PHP_VERSION: '8.5',
    PHP_COMPANION_TEST_C1_DEBUG_PORT: String(port) };
  delete env.ELECTRON_RUN_AS_NODE;
  delete env.VSCODE_ESM_ENTRYPOINT;
  delete env.PHP_COMPANION_TEST_C1_OPEN_SOURCE_PROFILE;
  // Full C2 must not inherit an environment switch that returns after a subset.
  for (const key of Object.keys(env)) if (key.startsWith('PHP_COMPANION_TEST_C2_')
    || key.startsWith('PHP_COMPANION_TEST_C3_') || key.startsWith('PHP_COMPANION_TEST_TEST_PROVIDER_')) delete env[key];
  child = spawn(code, [root, '--disable-extensions', '--skip-welcome', '--skip-release-notes', '--disable-workspace-trust',
    `--user-data-dir=${join(root, 'user-data')}`, `--extensions-dir=${join(root, 'extensions')}`,
    `--extensionDevelopmentPath=${core}`, ...(symfony ? [`--extensionDevelopmentPath=${symfony}`] : []),
    `--extensionTestsPath=${suite}`, `--remote-debugging-port=${port}`],
  { env, stdio: ['ignore', 'pipe', 'pipe'] });
  for (const stream of [child.stdout, child.stderr]) stream.on('data', chunk => {
    process.stdout.write(chunk); output = (output + chunk.toString()).slice(-262_144);
  });
  await new Promise((done, reject) => {
    const timeoutMs = baseline ? 300_000 : 150_000;
    const timer = setTimeout(() => { child.kill(); reject(new Error(`Windows editor test timed out after ${timeoutMs} ms`)); }, timeoutMs);
    child.once('error', error => { clearTimeout(timer); reject(error); });
    child.once('exit', (status, signal) => { clearTimeout(timer);
      if (status === 0 && !signal) done(); else reject(new Error(`Windows editor exited ${status}/${signal}`));
    });
  });
  const match = (suiteKind === 'arrayKeys' ? /Array key preservation host proof: (\{[^\r\n]*\})/u
    : suiteKind === 'declarationVariables' ? /Declaration variable acceptance proof: (\{[^\r\n]*\})/u
    : suiteKind === 'arrayCallbacks' ? /Array callback acceptance proof: (\{[^\r\n]*\})/u
    : suiteKind === 'hookKeywords' ? /Hook keyword acceptance proof: (\{[^\r\n]*\})/u
    : suiteKind === 'stubsFlow' ? /Stubs flow completion host proof: (\{[^\r\n]*\})/u
    : suiteKind === 'traitFinal' ? /Final trait restart host proof: (\{[^\r\n]*\})/u
    : suiteKind === 'groupedReferences' ? /Grouped references proof: (\{[^\r\n]*\})/u
    : suiteKind === 'restart' ? /Restart unsaved completion proof: (\{[^\r\n]*\})/u
    : symfony ? /Windows C3 acceptance proof: (\{[^\r\n]*\})/u
    : baseline ? /Windows C2 acceptance proof: (\{[^\r\n]*\})/u
    : /Template acceptance proof: (\{[^\r\n]*\})/u).exec(output);
  assert.ok(match, 'Editor exited without acceptance proof');
  const proof = JSON.parse(match[1]);
  if (suiteKind === 'declarationVariables' || suiteKind === 'hookKeywords' || suiteKind === 'arrayCallbacks') {
    assert.equal(proof.platform, 'win32');
    assert.equal(proof.results.length, suiteKind === 'declarationVariables' ? 8 : 4);
    assert.ok(proof.results.every(item => item.exactText && item.caretMatched && item.undoRedo && item.diskUnchanged));
    if (suiteKind === 'declarationVariables') assert.equal(proof.suppressedNames, 3);
  } else if (suiteKind === 'arrayKeys' || suiteKind === 'stubsFlow') {
    assert.equal(proof.platform, 'win32'); assert.equal(proof.diskUnchanged, true);
    assert.equal(proof.results.length, suiteKind === 'arrayKeys' ? 8 : 10);
    assert.ok(proof.results.every(item => item.matched));
  } else if (suiteKind === 'traitFinal') {
    assert.equal(proof.platform, 'win32');
    assert.ok(Number.isSafeInteger(proof.beforePid) && Number.isSafeInteger(proof.afterPid));
    assert.notEqual(proof.beforePid, proof.afterPid);
    assert.equal(proof.unsavedFinalPreserved, true); assert.equal(proof.postRestartRemoval, true);
    assert.equal(proof.disksPreserved, true);
  } else if (suiteKind === 'restart') {
    assert.equal(proof.platform, 'win32');
    assert.ok(Number.isSafeInteger(proof.beforePid) && Number.isSafeInteger(proof.afterPid));
    assert.notEqual(proof.beforePid, proof.afterPid);
    assert.equal(proof.unsavedPreserved, true); assert.equal(proof.diskPreserved, true);
    assert.equal(proof.postRestartEditing, true); assert.ok(proof.betaDefinitionCount > 0);
  } else if (suiteKind === 'groupedReferences') {
    assert.equal(proof.platform, 'win32'); assert.equal(proof.traces.length, 2);
    assert.deepEqual(proof.traces.map(item => item.scenario), ['cold', 'afterRejectedRename']);
    assert.ok(proof.traces.every(item => item.warmQueries.length === 3
      && item.warmQueries.every(query => query.missing.length === 0)));
  } else if (baseline) assert.equal(proof.suite, symfony ? 'fullC3' : 'fullC2'); else assert.equal(proof.results.length, 10);
  process.stdout.write(`Windows host proof: ${JSON.stringify({ platform: process.platform, node: process.version, proof })}\n`);
} finally {
  if (child && child.exitCode === null) child.kill();
  for (const match of output.matchAll(/C3 deferred fixture cleanup: (\{[^\r\n]*\})/gu)) {
    const fixture = JSON.parse(match[1]).path;
    assert.equal(typeof fixture, 'string');
    assert.equal(resolve(dirname(fixture)).toLowerCase(), resolve(tmpdir()).toLowerCase(), 'Cleanup must remain in the native temp directory');
    assert.ok(basename(fixture).startsWith('sophp-c3-multiroot-'), 'Cleanup must name an owned C3 fixture');
    await rm(fixture, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 });
  }
  await rm(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
}
