import console from 'node:console';
import process from 'node:process';
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runOwned } from './owned-process.mjs';

const root = dirname(fileURLToPath(import.meta.url));
const scratch = await mkdtemp(join(tmpdir(), 'sophp-matrix-runner-controls-'));
const rows = [];
try {
  for (const [name, code, timeoutMs] of [
    ['normal', "console.log(JSON.stringify({ok:true}));", 5_000],
    ['nonzero', "console.error('controlled failure');process.exitCode=7;", 5_000],
    ['timeout', 'setInterval(()=>{},100);', 200],
    ['term-resistant-timeout', 'process.on("SIGTERM",()=>{});setInterval(()=>{},100);', 500],
    ['leftover-directory', "require('node:fs').mkdirSync(require('node:path').join(require('node:os').tmpdir(),'owned-leftover'));", 5_000],
  ]) {
    const stdoutPath = join(scratch, name + '.stdout');
    const stderrPath = join(scratch, name + '.stderr');
    const row = await runOwned({ command: process.execPath, args: ['-e', code], cwd: root,
      env: process.env, temporaryDirectory: join(scratch, name + '-temporary'),
      stdoutPath, stderrPath, timeoutMs });
    assert(row.ownedProcessesGoneAfterCleanup && row.temporaryDirectoryRemoved);
    if (name === 'normal') {
      assert(row.normalExitAndNoLeftovers);
      assert.equal(row.actualExitCode, 0);
      assert.deepEqual(JSON.parse(await readFile(stdoutPath)), { ok: true });
    } else {
      assert.equal(row.normalExitAndNoLeftovers, false, name);
      if (name === 'nonzero') assert.equal(row.actualExitCode, 7);
      if (name === 'timeout') assert(row.timedOut);
      if (name === 'term-resistant-timeout') {
        assert(row.timedOut);
        if (process.platform !== 'win32') assert.equal(row.signal, 'SIGKILL');
      }
      if (name === 'leftover-directory') assert.deepEqual(row.leftoverTemporaryEntries, ['owned-leftover']);
    }
    rows.push({ name, ...row });
  }
  await assert.rejects(runOwned({ command: join(scratch, 'missing-executable'), args: [],
    cwd: root, env: process.env, temporaryDirectory: join(scratch, 'spawn-error-temporary'),
    stdoutPath: join(scratch, 'spawn-error.stdout'), stderrPath: join(scratch, 'spawn-error.stderr'),
    timeoutMs: 5_000 }), { code: 'ENOENT' });
  assert.equal(await readdir(join(scratch, 'spawn-error-temporary')).then(() => false,
    error => { if (error.code === 'ENOENT') return true; throw error; }), true);
  rows.push({ name: 'spawn-error', rejectedWith: 'ENOENT', temporaryDirectoryRemoved: true });
  // Refusing to overwrite evidence must still dispose of its newly owned directory.
  await assert.rejects(runOwned({ command: process.execPath, args: [], cwd: root,
    env: process.env, temporaryDirectory: join(scratch, 'existing-output-temporary'),
    stdoutPath: join(scratch, 'normal.stdout'), stderrPath: join(scratch, 'existing-output.stderr'),
    timeoutMs: 5_000 }), { code: 'EEXIST' });
  assert.equal(await readdir(join(scratch, 'existing-output-temporary')).then(() => false,
    error => { if (error.code === 'ENOENT') return true; throw error; }), true);
  assert.deepEqual(JSON.parse(await readFile(join(scratch, 'normal.stdout'))), { ok: true });
  rows.push({ name: 'existing-output', rejectedWith: 'EEXIST', evidencePreserved: true,
    temporaryDirectoryRemoved: true });
  assert.equal((await readdir(scratch)).length, 12);
} finally { await rm(scratch, { recursive: true, force: true }); }
const gone = await readdir(scratch).then(() => false, e => { if (e.code === 'ENOENT') return true; throw e; });
assert(gone);
const result = { auditedAtUtc: new Date().toISOString(), platform: process.platform,
  runtime: process.version, controlledCases: rows, scratchRemoved: true,
  realLanguageServersLaunched: 0, currentMatrixExecuted: false, fullObjectiveComplete: false };
const output = process.argv[2] ? resolve(process.argv[2]) : join(root, 'owned-process-audit.json');
await mkdir(dirname(output), { recursive: true });
await writeFile(output, JSON.stringify(result, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ controlledCasesPassed: rows.length, platform: process.platform,
  ownedProcessesGone: true, temporaryDirectoriesRemoved: true, realLanguageServersLaunched: 0 }));
