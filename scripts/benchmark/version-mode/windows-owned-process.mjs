import { spawn } from 'node:child_process';
import { mkdir, mkdtemp, open, readFile, readdir, realpath, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath, URL } from 'node:url';
import { setTimeout, clearTimeout } from 'node:timers';

// The supervisor owns a non-inheritable kernel Job handle, never a PID tree.
// Killing the supervisor closes that handle and kills every owned process.
export async function runWindowsOwned({ command, args, cwd, env, temporaryDirectory, stdoutPath, stderrPath, timeoutMs }) {
  await mkdir(temporaryDirectory);
  const physicalTemporaryDirectory = await realpath(temporaryDirectory);
  let control;
  let stdout;
  let stderr;
  let supervisor;
  let closed;
  let watchdog;
  let result;
  try {
    stdout = await open(stdoutPath, 'wx');
    stderr = await open(stderrPath, 'wx');
    control = await mkdtemp(join(dirname(physicalTemporaryDirectory), 'job-control-'));
    const request = join(control, 'request.json');
    const receipt = join(control, 'receipt.json');
    await writeFile(request, JSON.stringify({ command, args, cwd, timeoutMs, receipt,
      temporaryDirectory: physicalTemporaryDirectory }), { flag: 'wx' });
    supervisor = spawn('powershell.exe', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass',
      '-File', fileURLToPath(new URL('./windows-owned-process.ps1', import.meta.url)), request], {
      cwd, env: { ...env, TMP: control, TEMP: control, TMPDIR: control },
      windowsHide: true, stdio: ['ignore', stdout.fd, stderr.fd],
    });
    closed = new Promise((resolve, reject) => {
      supervisor.once('error', reject);
      supervisor.once('close', (code, signal) => resolve({ code, signal }));
    });
    // The native supervisor applies the unchanged command timeout after resume.
    // This separate bound covers compiler/bootstrap failure and cleanup failure.
    let supervisorExpired = false;
    watchdog = setTimeout(() => { supervisorExpired = true; supervisor.kill(); }, timeoutMs + 60_000);
    const exited = await closed;
    clearTimeout(watchdog);
    if (supervisorExpired || exited.code !== 0 || exited.signal !== null) {
      throw new Error(`Windows Job supervisor failed: ${JSON.stringify({ ...exited, supervisorExpired })}`);
    }
    const row = JSON.parse(await readFile(receipt, 'utf8'));
    if (row.error) {
      throw Object.assign(new Error(row.error), { code: row.nativeError === 2 || row.nativeError === 3
        ? 'ENOENT' : 'EWINDOWSJOB' });
    }
    if (row.ownership !== 'kernel-job' || !row.ownedProcessesGoneAfterCleanup
        || !row.supervisorOutsideOwnedJob || !row.rootAssignedToOwnedJob) {
      throw new Error('Windows Job supervisor did not prove its scope empty');
    }
    const leftoverTemporaryEntries = await readdir(physicalTemporaryDirectory);
    result = { ...row, supervisorPid: supervisor.pid, signal: null, leftoverTemporaryEntries,
      normalExitAndNoLeftovers: row.actualExitCode === 0 && !row.timedOut && !row.cleanupNeeded
        && leftoverTemporaryEntries.length === 0 };
  } finally {
    clearTimeout(watchdog);
    if (supervisor && supervisor.exitCode === null && supervisor.signalCode === null) supervisor.kill();
    if (closed) await closed.catch(() => {});
    if (stdout) await stdout.close();
    if (stderr) await stderr.close();
    if (control) await rm(control, { recursive: true, force: true });
    await rm(physicalTemporaryDirectory, { recursive: true, force: true });
  }
  result.temporaryDirectoryRemoved = await readdir(physicalTemporaryDirectory).then(() => false,
    error => { if (error.code === 'ENOENT') return true; throw error; });
  return result;
}
