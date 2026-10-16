import { setTimeout, clearTimeout } from 'node:timers';
import process from 'node:process';
import { spawn, execFile } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { mkdir, open, readdir, realpath, rm } from 'node:fs/promises';
import { promisify } from 'node:util';

const execute = promisify(execFile);
const windows = process.platform === 'win32';

async function descendants(pid) {
  if (!windows) return [];
  const command = `$all=@(Get-CimInstance Win32_Process);$ids=@(${pid});$found=@();` +
    'do{$next=@($all|Where-Object {$ids -contains $_.ParentProcessId -and ' +
    '$found.ProcessId -notcontains $_.ProcessId});$found+=@($next);$ids=@($next|ForEach-Object {$_.ProcessId})}while($ids.Count);' +
    '@($found|ForEach-Object {@{pid=$_.ProcessId;created=$_.CreationDate.ToUniversalTime().ToString("o")}})|ConvertTo-Json -Compress';
  const { stdout } = await execute('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', command], { timeout: 30_000 });
  const data = stdout.trim() ? JSON.parse(stdout) : [];
  return Array.isArray(data) ? data : [data];
}

function groupAlive(pid) {
  try { process.kill(-pid, 0); return true; }
  catch (error) { if (error.code === 'ESRCH') return false; throw error; }
}

async function stopOwned(child, observed) {
  if (!windows) {
    if (!groupAlive(child.pid)) return;
    process.kill(-child.pid, 'SIGTERM');
    for (let i = 0; i < 20 && groupAlive(child.pid); i++) await delay(50);
    if (groupAlive(child.pid)) process.kill(-child.pid, 'SIGKILL');
    return;
  }
  if (child.exitCode === null && child.signalCode === null) child.kill();
  // Check creation identity before terminating a descendant; a reused numeric
  // PID is not evidence of ownership.
  for (const item of observed.reverse()) {
    const date = item.created.replaceAll("'", "''");
    const command = `$p=Get-CimInstance Win32_Process -Filter "ProcessId = ${item.pid}";` +
      `if($p -and $p.CreationDate.ToUniversalTime().ToString('o') -eq '${date}'){Stop-Process -Id ${item.pid} -Force -ErrorAction Stop}`;
    await execute('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', command], { timeout: 30_000 });
  }
}

async function remainingObserved(identities) {
  const remaining = [];
  for (const item of identities) {
    const date = item.created.replaceAll("'", "''");
    const command = `$p=Get-CimInstance Win32_Process -Filter "ProcessId = ${item.pid}";` +
      `if($p -and $p.CreationDate.ToUniversalTime().ToString('o') -eq '${date}'){Write-Output 'alive'}`;
    const { stdout } = await execute('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', command], { timeout: 30_000 });
    if (stdout.trim()) remaining.push(item);
  }
  return remaining;
}

export async function runOwned({ command, args, cwd, env, temporaryDirectory, stdoutPath, stderrPath, timeoutMs }) {
  await mkdir(temporaryDirectory);
  const physicalTemporaryDirectory = await realpath(temporaryDirectory);
  let stdout;
  let stderr;
  let child;
  let timer;
  let escalation;
  let timedOut = false;
  let cleanupNeeded = false;
  let observed = [];
  let close;
  let result;
  try {
    stdout = await open(stdoutPath, 'wx');
    stderr = await open(stderrPath, 'wx');
    child = spawn(command, args, { cwd, env: { ...env, TMPDIR: physicalTemporaryDirectory,
      TMP: physicalTemporaryDirectory, TEMP: physicalTemporaryDirectory },
      detached: !windows, stdio: ['ignore', stdout.fd, stderr.fd] });
    close = new Promise((resolve, reject) => {
      child.once('error', reject);
      child.once('close', (code, signal) => resolve({ actualExitCode: code, signal }));
    });
    // This outer watchdog only bounds an abandoned tool process. Protocol
    // timeouts and the report's performance budgets remain in the benchmark.
    timer = setTimeout(() => {
      timedOut = true;
      if (windows) child.kill();
      else if (child.pid && groupAlive(child.pid)) process.kill(-child.pid, 'SIGTERM');
      escalation = setTimeout(() => {
        if (windows) child.kill('SIGKILL');
        else if (child.pid && groupAlive(child.pid)) process.kill(-child.pid, 'SIGKILL');
      }, 1_000);
    }, timeoutMs);
    const exited = await close;
    clearTimeout(timer);
    clearTimeout(escalation);
    observed = await descendants(child.pid);
    cleanupNeeded = windows ? observed.length > 0 : groupAlive(child.pid);
    const leftoverTemporaryEntries = await readdir(physicalTemporaryDirectory);
    result = { pid: child.pid, ...exited, timedOut, cleanupNeeded,
      descendantIdentitiesObservedAfterExit: [...observed], leftoverTemporaryEntries,
      normalExitAndNoLeftovers: exited.actualExitCode === 0 && exited.signal === null
        && !timedOut && !cleanupNeeded && leftoverTemporaryEntries.length === 0 };
  } finally {
    clearTimeout(timer);
    clearTimeout(escalation);
    try {
      if (child?.pid) {
        if (windows && !observed.length) observed = await descendants(child.pid);
        await stopOwned(child, observed);
        if (close) await close.catch(() => {});
      }
    } finally {
      if (stdout) await stdout.close();
      if (stderr) await stderr.close();
      await rm(physicalTemporaryDirectory, { recursive: true, force: true });
    }
  }
  const remaining = windows
    ? [...await descendants(child.pid), ...await remainingObserved(observed)] : groupAlive(child.pid);
  result.ownedProcessesGoneAfterCleanup = windows ? remaining.length === 0 : !remaining;
  result.temporaryDirectoryRemoved = await readdir(physicalTemporaryDirectory).then(() => false,
    error => { if (error.code === 'ENOENT') return true; throw error; });
  return result;
}
