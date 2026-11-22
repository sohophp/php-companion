import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdir, mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { expect, it } from 'vitest';

function killOwnedChild(pid: number): void {
  try { process.kill(pid, 'SIGKILL'); }
  catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ESRCH') throw error; }
}

it.skipIf(process.platform !== 'linux')('reaps a suspended long-session server after the original response timeout', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'sophp-long-cleanup-test-'));
  const temporary = join(directory, 'temporary');
  await mkdir(temporary);
  const runner = spawn(process.execPath, [resolve(process.env.SOPHP_PRIVATE_LONG_SESSION_TEST_SCRIPT ?? 'scripts/benchmark-long-session.mjs'), '30', '0'], {
    cwd: resolve('.'), stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, TMPDIR: temporary, SOPHP_LONG_SESSION_EVIDENCE: join(directory, 'evidence') },
  });
  const ended = once(runner, 'exit');
  let child: number | undefined;
  let stderr = '';
  runner.stderr.on('data', chunk => { stderr += chunk.toString(); });
  runner.stdout.resume();
  try {
    const deadline = Date.now() + 8000;
    while (!child && Date.now() < deadline) {
      const children = (await readFile(`/proc/${runner.pid}/task/${runner.pid}/children`, 'utf8')).trim().split(/\s+/).filter(Boolean);
      for (const pid of children) {
        const command = await readFile(`/proc/${pid}/cmdline`, 'utf8');
        if (command.split('\0').includes(resolve('dist/language-server.js'))) { child = Number(pid); break; }
      }
      if (!child) await delay(10);
    }
    expect(child).toBeDefined();
    process.kill(child!, 'SIGSTOP');
    const terminal = await Promise.race([ended, delay(24_000, undefined, { ref: false })]);
    expect(terminal, 'The runner must exit without test rescue after its original 20-second response timeout').toEqual([1, null]);
    expect(stderr).toContain('LS timeout');
    await expect(readFile(`/proc/${child}/cmdline`)).rejects.toMatchObject({ code: 'ENOENT' });
    expect(await readdir(temporary)).toEqual([]);
    const report = JSON.parse(await readFile(join(directory, 'evidence', 'run.json'), 'utf8'));
    expect(report.status).toBe('failed');
    expect(report.qualified).toBe(false);
    expect(report.ownedFixtureRemoved).toBe(true);
  } finally {
    if (runner.exitCode === null && runner.signalCode === null) {
      if (child) killOwnedChild(child);
      await Promise.race([ended, delay(2000)]);
      runner.kill('SIGKILL');
      await ended;
    }
    await rm(directory, { recursive: true, force: true });
  }
}, 35_000);
