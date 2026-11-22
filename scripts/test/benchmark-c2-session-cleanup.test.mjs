import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { access, mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import process from 'node:process';
import { clearTimeout, setTimeout } from 'node:timers';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath, URL } from 'node:url';
import { test } from 'node:test';

async function processInfo(pid) {
  try {
    const text = await readFile(`/proc/${pid}/stat`, 'utf8');
    const fields = text.slice(text.lastIndexOf(') ') + 2).split(' ');
    return { startTicks: fields[19], command: (await readFile(`/proc/${pid}/cmdline`, 'utf8')).split('\0') };
  } catch (error) {
    if (error.code === 'ENOENT' || error.code === 'ESRCH') return undefined;
    throw error;
  }
}

test('C2 session reaps its suspended real server after the original protocol timeout', {
  skip: process.platform !== 'linux', timeout: 35_000,
}, async () => {
  const workspace = fileURLToPath(new URL('../../', import.meta.url));
  const serverEntry = join(workspace, 'packages/language-server/dist/server.js');
  await access(serverEntry);
  const directory = await mkdtemp(join(tmpdir(), 'sophp-c2-cleanup-test-'));
  const benchmark = spawn(process.execPath, [join(workspace, 'scripts/benchmark-c2-session.mjs'), '100'], {
    cwd: workspace, stdio: ['ignore', 'ignore', 'pipe'],
    env: { ...process.env, TMPDIR: directory, SOPHP_C2_PHP_VERSION: '8.5', SOPHP_C2_INDEXING_MODE: 'onDemand',
      SOPHP_C2_PROFILE_MEMORY: '0', SOPHP_C2_PROFILE_GC: '0', SOPHP_C2_PROFILE_EDITS_ONLY: '0' },
  });
  const exited = once(benchmark, 'exit');
  let stderr = '', owned, timer;
  benchmark.stderr.on('data', chunk => { stderr += chunk.toString(); });
  try {
    const deadline = Date.now() + 5000;
    while (!owned && Date.now() < deadline) {
      const children = (await readFile(`/proc/${benchmark.pid}/task/${benchmark.pid}/children`, 'utf8'))
        .trim().split(/\s+/).filter(Boolean);
      for (const text of children) {
        const pid = Number(text), info = await processInfo(pid);
        if (info?.command.includes(serverEntry)) { owned = { pid, ...info }; break; }
      }
      if (!owned) await delay(5);
    }
    assert.ok(owned, 'Require the actual C2 benchmark-owned server');
    process.kill(owned.pid, 'SIGSTOP');
    const [code, signal] = await Promise.race([exited, new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error('C2 benchmark retained its suspended child after protocol timeout')), 25_000);
    })]);
    clearTimeout(timer);
    assert.equal(code, 1);
    assert.equal(signal, null);
    assert.match(stderr, /Timed out waiting for language server/);
    const current = await processInfo(owned.pid);
    assert.ok(!current || current.startTicks !== owned.startTicks, 'C2 benchmark must reap its child without test rescue');
    assert.deepEqual(await readdir(directory), [], 'Remove the project after the server exits');
  } finally {
    clearTimeout(timer);
    if (owned) {
      const current = await processInfo(owned.pid);
      if (current?.startTicks === owned.startTicks) process.kill(owned.pid, 'SIGKILL');
    }
    if (benchmark.exitCode === null && benchmark.signalCode === null) {
      benchmark.kill('SIGKILL');
      await exited;
    }
    await rm(directory, { recursive: true, force: true });
  }
});
