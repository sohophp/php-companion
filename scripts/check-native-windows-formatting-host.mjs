import assert from 'node:assert/strict';
import { execFileSync, spawn } from 'node:child_process';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { basename, join, resolve } from 'node:path';
import { createServer } from 'node:net';
import process from 'node:process';
import { clearTimeout, setTimeout } from 'node:timers';

assert.equal(process.platform, 'win32');
const [code, core, formatter, suite, portable, suiteKind, secondPhp] = process.argv.slice(2); assert.ok(code && core && formatter && suite && portable);
assert.ok(suiteKind === undefined || suiteKind === 'testTask' || suiteKind === 'debugLaunch' || suiteKind === 'debugBreakpoints' || suiteKind === 'formattingFailure' || suiteKind === 'formatterCandidate' || suiteKind === 'formatterNavigation');
const formatterCandidate = suiteKind === 'formatterCandidate';
const formatterNavigation = suiteKind === 'formatterNavigation';
assert.ok(!secondPhp || formatterCandidate, 'A second PHP runtime is only supported by formatter candidate acceptance');
// Each actual PHP executable must load its own matching ini/extension DLLs.
// A process-wide PHPRC selecting the first runtime would contaminate the second.
const runtimeEnv = { ...process.env };
if (secondPhp) for (const key of Object.keys(runtimeEnv)) {
  if (['phprc', 'php_ini_scan_dir'].includes(key.toLowerCase())) delete runtimeEnv[key];
}
const probe = executable => JSON.parse(execFileSync(executable, ['-r',
  'echo json_encode(["version"=>PHP_VERSION,"minor"=>PHP_MAJOR_VERSION.".".PHP_MINOR_VERSION,"ini"=>php_ini_loaded_file(),"binary"=>PHP_BINARY]);'],
{ env: runtimeEnv, encoding: 'utf8', timeout: 30_000 }));
const firstPhp = join(portable, 'php with spaces', 'php.exe');
const runtimes = secondPhp ? [probe(firstPhp), probe(secondPhp)] : undefined;
if (runtimes) {
  assert.notEqual(runtimes[0].minor, runtimes[1].minor, 'Use two distinct actual PHP minor versions');
  assert.ok(runtimes.every(runtime => runtime.ini), 'Both portable runtimes need a local ini');
  assert.notEqual(runtimes[0].ini.toLowerCase(), runtimes[1].ini.toLowerCase());
}
const testTask = suiteKind === 'testTask';
const debugLaunch = suiteKind === 'debugLaunch';
const debugBreakpoints = suiteKind === 'debugBreakpoints';
assert.ok(basename(resolve(portable)).startsWith('sophp-windows-php-'));
const container = await mkdtemp(join(portable, 'editor with spaces-'));
const root = formatterCandidate ? join(container, 'first project') : container;
let child; let output = '';
try {
  await mkdir(join(root, 'src'), { recursive: true }); await mkdir(join(root, '.vscode'));
  const batch = join(root, 'php-cs-fixer.bat');
  await writeFile(batch, `@echo off\r\ncd /d "%~dp0"\r\n"${join(portable, 'php with spaces', 'php.exe')}" -c "${join(portable, 'isolated ini', 'php.ini')}" "${join(portable, 'tools', 'vendor', 'friendsofphp', 'php-cs-fixer', 'php-cs-fixer')}" %*\r\n`);
  const config = join(root, '.php-cs-fixer.dist.php');
  await writeFile(config, "<?php\nreturn (new PhpCsFixer\\Config())->setRules(['@PSR12' => true]);\n");
  await writeFile(join(root, 'composer.json'), JSON.stringify({ require: { php: `>=${runtimes?.[0].minor ?? '8.5'}` }, autoload: { 'psr-4': { '': 'src/' } } }));
  await writeFile(join(root, '.vscode', 'settings.json'), JSON.stringify({
    'phpCompanion.phpVersion': 'auto', 'phpCompanion.phpExecutablePath': join(portable, 'php with spaces', 'php.exe'),
    'phpCompanion.indexing.mode': 'onDemand', 'php.suggest.basic': false, 'php.validate.enable': false,
    '[php]': testTask || debugLaunch || debugBreakpoints ? {} : { 'editor.defaultFormatter': 'junstyle.php-cs-fixer', 'editor.formatOnSave': true },
    'php-cs-fixer.executablePath': batch, 'php-cs-fixer.executablePathWindows': batch,
    'php-cs-fixer.config': config, 'php-cs-fixer.autoFixByBracket': false, 'php-cs-fixer.autoFixBySemicolon': false,
    'php-cs-fixer.onsave': false, 'php-cs-fixer.lastDownload': 0, 'files.eol': '\n', 'editor.insertSpaces': true,
    'editor.tabSize': 4, 'extensions.autoUpdate': false,
  }));
  const env = { ...runtimeEnv, SOPHP_WINDOWS_PORTABLE_ROOT: portable }; delete env.ELECTRON_RUN_AS_NODE; delete env.VSCODE_ESM_ENTRYPOINT;
  let workspace = root;
  if (formatterNavigation) {
    env.PHPRC = join(portable, 'isolated ini', 'php.ini');
    env.PHP_COMPANION_PHP_EXECUTABLE = firstPhp;
    env.PHP_COMPANION_TEST_FORMATTER_CLI = join(portable, 'tools', 'vendor', 'friendsofphp', 'php-cs-fixer', 'php-cs-fixer');
    env.SOPHP_FORMATTER_NAVIGATION_CONTROL = join(root, 'navigation-control.json');
  }
  if (formatterCandidate) {
    const second = join(container, 'second project');
    await mkdir(join(second, 'src'), { recursive: true });
    await mkdir(join(second, '.vscode'));
    await writeFile(join(second, 'composer.json'), JSON.stringify({ require: { php: `>=${runtimes?.[1].minor ?? '8.5'}` } }));
    await writeFile(join(second, '.vscode', 'settings.json'), JSON.stringify({
      'phpCompanion.phpVersion': 'auto', 'phpCompanion.phpExecutablePath': secondPhp ?? firstPhp,
      'phpCompanion.indexing.mode': 'onDemand', 'php.suggest.basic': false, 'php.validate.enable': false,
      'files.eol': '\n', 'editor.insertSpaces': true, 'editor.tabSize': 4,
      'php-cs-fixer.onsave': false, 'php-cs-fixer.lastDownload': 0,
    }));
    workspace = join(container, 'formatter.code-workspace');
    await writeFile(workspace, JSON.stringify({ folders: [{ path: root }, { path: second }] }));
    if (secondPhp) env.PHP_COMPANION_TEST_FORMATTER_SECOND_PHP = secondPhp;
    else env.PHPRC = join(portable, 'isolated ini', 'php.ini');
    env.PHP_COMPANION_PHP_EXECUTABLE = firstPhp;
    env.PHP_COMPANION_TEST_FORMATTER_CLI = join(portable, 'tools', 'vendor', 'friendsofphp', 'php-cs-fixer', 'php-cs-fixer');
    env.PHP_COMPANION_FORMATTER_EXECUTABLE = batch;
  }
  if (debugLaunch || debugBreakpoints) {
    const server = createServer(); await new Promise(done => server.listen(0, '127.0.0.1', done));
    env.SOPHP_WINDOWS_DEBUG_PORT = String(server.address().port);
    if (debugBreakpoints) {
      env.SOPHP_DEBUG_PORT = env.SOPHP_WINDOWS_DEBUG_PORT;
      env.SOPHP_DEBUG_PHP = join(portable, 'php with spaces', 'php.exe');
      env.SOPHP_DEBUG_INI = join(portable, 'isolated ini', 'php.ini');
      env.SOPHP_DEBUG_EXTENSION = join(portable, 'php_xdebug.dll');
    }
    await new Promise(done => server.close(done));
  }
  child = spawn(code, [workspace, '--disable-extensions', '--skip-welcome', '--skip-release-notes', '--disable-workspace-trust',
    `--user-data-dir=${join(container, 'user-data')}`, `--extensions-dir=${join(container, 'extensions')}`,
    `--extensionDevelopmentPath=${core}`, ...(testTask ? [] : [`--extensionDevelopmentPath=${formatter}`]), `--extensionTestsPath=${suite}`],
  { env, stdio: ['ignore', 'pipe', 'pipe'] });
  for (const stream of [child.stdout, child.stderr]) stream.on('data', chunk => {
    process.stdout.write(chunk); output = (output + chunk.toString()).slice(-262_144);
  });
  await new Promise((done, reject) => {
    const timer = setTimeout(() => { child.kill(); reject(new Error('Windows formatting host timed out')); }, 120_000);
    child.once('error', error => { clearTimeout(timer); reject(error); });
    child.once('exit', (code, signal) => { clearTimeout(timer); if (code === 0 && !signal) done(); else reject(new Error(`Editor exited ${code}/${signal}`)); });
  });
  if (formatterCandidate) {
    const match = output.match(/Formatter candidate acceptance proof: (\{[^\r\n]*\})/u); assert.ok(match);
    const proof = JSON.parse(match[1]);
    assert.equal(proof.platform, 'win32');
    if (runtimes) {
      assert.equal(proof.distinctPhpRuntimes, true);
      assert.deepEqual(proof.actualRuntimes, runtimes.map(runtime => runtime.version));
      process.stdout.write(`Windows formatter actual PHP runtimes: ${JSON.stringify(runtimes)}\n`);
    }
    for (const key of ['formatDocument', 'undo', 'redo', 'formatOnSave', 'diskMatches', 'idempotent',
      'multiRootDistinctConfig', 'concurrentFormatting', 'distinctExecutableWithSpaces']) assert.equal(proof[key], true);
    assert.equal(proof.autoFixState.tested, true, 'Native Windows auto-fix acceptance must execute');
    for (const key of ['backgroundIgnored', 'disabledFolderIgnored', 'bracketCurrentFormatted']) assert.equal(proof.autoFixState[key], true);
    assert.deepEqual(proof.autoFixState.deferredCliResults.map(result => result.state), ['new-version', 'focus-changed', 'selection-changed', 'current']);
    for (const result of proof.autoFixState.deferredCliResults) assert.equal(result.actualCliExit, 0);
    assert.deepEqual(proof.autoFixState.deferredBracketCliResults.map(result => result.state),
      ['new-version', 'focus-changed', 'selection-changed', 'current']);
    for (const result of proof.autoFixState.deferredBracketCliResults) assert.equal(result.actualCliExit, 0);
    process.stdout.write(`Windows formatter candidate host proof: ${JSON.stringify(proof)}\n`);
  } else if (formatterNavigation) {
    const match = output.match(/Formatter navigation race proof: (\{[^\r\n]*\})/u); assert.ok(match);
    const proof = JSON.parse(match[1]); assert.equal(proof.platform, 'win32'); assert.equal(proof.controlledDiagnostic, true);
    assert.deepEqual(proof.cases.map(item => [item.command, item.state]),
      ['editor.action.jumpToBracket', 'cursorUndo'].flatMap(command => ['new-version', 'focus-changed', 'current'].map(state => [command, state])));
    for (const item of proof.cases) {
      assert.equal(item.actualBuiltinCompleted, true); assert.equal(item.flowCompleted, true);
      assert.equal(item.cliInvoked, item.state === 'current');
    }
    process.stdout.write(`Windows formatter navigation diagnostic proof: ${JSON.stringify(proof)}\n`);
  } else if (suiteKind === 'formattingFailure') {
    const match = output.match(/Windows formatting failure proof: (\{[^\r\n]*\})/u); assert.ok(match);
    const proof = JSON.parse(match[1]);
    for (const key of ['noEdits', 'bufferUnchanged', 'diskUnchanged']) assert.equal(proof[key], true);
    assert.equal(proof.cliExitCode, 4, 'Actual CS Fixer syntax failure was not preserved');
    process.stdout.write(`Windows formatter failure host proof: ${JSON.stringify(proof)}\n`);
  } else if (debugBreakpoints) {
    const match = output.match(/Xdebug breakpoint proof: (\{[^\r\n]*\})/u); assert.ok(match);
    const proof = JSON.parse(match[1]);
    assert.equal(proof.platform, 'win32'); assert.equal(proof.breakpointLine, 3); assert.equal(proof.stepLine, 4);
    assert.equal(proof.before, '40'); assert.equal(proof.after, '42'); assert.equal(proof.programResult, 42);
    for (const key of ['scopeVariable', 'workingDirectoryMatches', 'sessionTerminated']) assert.equal(proof[key], true);
    process.stdout.write(`Windows Xdebug host proof: ${JSON.stringify(proof)}\n`);
  } else if (debugLaunch) {
    const match = output.match(/Windows debug launch proof: (\{[^\r\n]*\})/u); assert.ok(match);
    const proof = JSON.parse(match[1]);
    for (const key of ['sessionStarted', 'programExecuted', 'workingDirectoryMatches', 'sessionTerminated']) assert.equal(proof[key], true);
    process.stdout.write(`Windows debug launch host proof: ${JSON.stringify(proof)}\n`);
  } else if (testTask) {
    const match = output.match(/Windows test task proof: (\{[^\r\n]*\})/u); assert.ok(match);
    const proof = JSON.parse(match[1]);
    assert.deepEqual(proof.exitCodes, [0, 1]); assert.equal(proof.pathWithSpaces, true); assert.equal(proof.workingDirectoryMatches, true);
    process.stdout.write(`Windows test task host proof: ${JSON.stringify(proof)}\n`);
  } else {
  const match = output.match(/Windows formatting proof: (\{[^\r\n]*\})/u); assert.ok(match);
  assert.ok(!output.includes('Unable to determine minimum PHP version'), 'Formatter emitted a project-version error');
  assert.ok(!/Error:\s+PHP CS Fixer/u.test(output), 'Formatter treated ordinary no-change output as an error');
  const proof = JSON.parse(match[1]);
  for (const key of ['formatDocument', 'undo', 'redo', 'formatOnSave', 'diskMatches', 'idempotent']) assert.equal(proof[key], true);
  process.stdout.write(`Windows formatting host proof: ${JSON.stringify(proof)}\n`);
  }
} finally {
  if (child && child.exitCode === null) child.kill();
  await rm(container, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
}
