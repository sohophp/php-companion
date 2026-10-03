import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import process from 'node:process';

const commands = process.argv.slice(2);
assert.ok(commands.length, 'Usage: node scripts/check-getrusage-runtime.mjs PHP_COMMAND...');
const timingKeys = ['ru_stime.tv_sec', 'ru_stime.tv_usec', 'ru_utime.tv_sec', 'ru_utime.tv_usec'];
const unixKeys = ['ru_oublock', 'ru_inblock', 'ru_msgsnd', 'ru_msgrcv', 'ru_maxrss', 'ru_ixrss',
  'ru_idrss', 'ru_minflt', 'ru_majflt', 'ru_nsignals', 'ru_nvcsw', 'ru_nivcsw', 'ru_nswap', ...timingKeys];
const probe = `echo json_encode(['version' => PHP_VERSION, 'os' => PHP_OS,
  'self' => getrusage(), 'children' => getrusage(1)]);`;
for (const command of commands) {
  const result = JSON.parse(execFileSync(command, ['-r', probe], { encoding: 'utf8', timeout: 15_000 }));
  for (const [mode, usage] of [['self', result.self], ['children', result.children]]) {
    assert.ok(usage && typeof usage === 'object' && !Array.isArray(usage), `${result.os}: ${mode} must succeed`);
    for (const value of Object.values(usage)) assert.ok(Number.isInteger(value), `${mode}: integer counters`);
    for (const key of timingKeys) assert.ok(Object.hasOwn(usage, key), `${mode}: ${key}`);
    if (result.os === 'Linux') assert.deepEqual(Object.keys(usage).sort(), [...unixKeys].sort());
    if (result.os === 'WINNT') {
      const allowed = new Set([...timingKeys, 'ru_majflt', 'ru_maxrss']);
      for (const key of Object.keys(usage)) assert.ok(allowed.has(key), `${mode}: unexpected Windows key ${key}`);
      if (mode === 'self') {
        for (const key of ['ru_majflt', 'ru_maxrss']) assert.ok(Object.hasOwn(usage, key), key);
      }
      // The manual describes these two counters as self-only. PHP 8.5.11
      // also returns them as zero for children; retain the actual result.
    }
  }
  process.stdout.write(JSON.stringify(result) + '\n');
}
