import { setTimeout, clearTimeout } from 'node:timers';
import process from 'node:process';
import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { mkdir, open, readdir, realpath, rm } from 'node:fs/promises';
import { runWindowsOwned } from './windows-owned-process.mjs';

function groupAlive(pid) {
  try { process.kill(-pid, 0); return true; }
  catch (error) { if (error.code === 'ESRCH') return false; throw error; }
}

async function stopOwned(child) {
  if (!groupAlive(child.pid)) return;
  process.kill(-child.pid, 'SIGTERM');
  for (let i = 0; i < 20 && groupAlive(child.pid); i++) await delay(50);
  if (groupAlive(child.pid)) process.kill(-child.pid, 'SIGKILL');
}

export async function runOwned({ command, args, cwd, env, temporaryDirectory, stdoutPath, stderrPath, timeoutMs }) {
  if (process.platform === 'win32') {
    return runWindowsOwned({ command, args, cwd, env, temporaryDirectory, stdoutPath, stderrPath, timeoutMs });
  }
  await mkdir(temporaryDirectory);
  const physicalTemporaryDirectory = await realpath(temporaryDirectory);
  let stdout;
  let stderr;
  let child;
  let timer;
  let escalation;
  let timedOut = false;
  let cleanupNeeded = false;
  let close;
  let result;
  try {
    stdout = await open(stdoutPath, 'wx');
    stderr = await open(stderrPath, 'wx');
    child = spawn(command, args, { cwd, env: { ...env, TMPDIR: physicalTemporaryDirectory,
      TMP: physicalTemporaryDirectory, TEMP: physicalTemporaryDirectory },
      detached: true, stdio: ['ignore', stdout.fd, stderr.fd] });
    close = new Promise((resolve, reject) => {
      child.once('error', reject);
      child.once('close', (code, signal) => resolve({ actualExitCode: code, signal }));
    });
    // This outer watchdog only bounds an abandoned tool process. Protocol
    // timeouts and the report's performance budgets remain in the benchmark.
    timer = setTimeout(() => {
      timedOut = true;
      if (child.pid && groupAlive(child.pid)) process.kill(-child.pid, 'SIGTERM');
      escalation = setTimeout(() => {
        if (child.pid && groupAlive(child.pid)) process.kill(-child.pid, 'SIGKILL');
      }, 1_000);
    }, timeoutMs);
    const exited = await close;
    clearTimeout(timer);
    clearTimeout(escalation);
    cleanupNeeded = groupAlive(child.pid);
    const leftoverTemporaryEntries = await readdir(physicalTemporaryDirectory);
    result = { pid: child.pid, ...exited, timedOut, cleanupNeeded,
      descendantIdentitiesObservedAfterExit: [], leftoverTemporaryEntries,
      normalExitAndNoLeftovers: exited.actualExitCode === 0 && exited.signal === null
        && !timedOut && !cleanupNeeded && leftoverTemporaryEntries.length === 0 };
  } finally {
    clearTimeout(timer);
    clearTimeout(escalation);
    try {
      if (child?.pid) {
        await stopOwned(child);
        if (close) await close.catch(() => {});
      }
    } finally {
      if (stdout) await stdout.close();
      if (stderr) await stderr.close();
      await rm(physicalTemporaryDirectory, { recursive: true, force: true });
    }
  }
  result.ownedProcessesGoneAfterCleanup = !groupAlive(child.pid);
  result.temporaryDirectoryRemoved = await readdir(physicalTemporaryDirectory).then(() => false,
    error => { if (error.code === 'ENOENT') return true; throw error; });
  return result;
}
