import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import process from 'node:process';

const commands = process.argv.slice(2);
assert.ok(commands.length, 'Usage: node scripts/check-stat-runtime.mjs PHP_COMMAND...');
const root = await mkdtemp(join(tmpdir(), 'sophp-stat-runtime-'));
try {
  const file = join(root, 'present.txt'); await writeFile(file, 'abc');
  const probe = `
$result = [];
foreach (['stat', 'lstat'] as $name) {
  $present = $name($argv[1]);
  $result[$name] = ['present' => $present, 'missing' => @$name($argv[2])];
}
echo json_encode(['version' => PHP_VERSION, 'results' => $result]);`;
  for (const command of commands) {
    const result = JSON.parse(execFileSync(command, ['-r', probe, file, join(root, 'missing')], { encoding: 'utf8' }));
    for (const entry of Object.values(result.results)) {
      assert.equal(entry.missing, false); assert.equal(entry.present.size, 3);
      for (const key of ['dev', 'ino', 'mode', 'nlink', 'uid', 'gid', 'rdev', 'size', 'atime', 'mtime', 'ctime', 'blksize', 'blocks']) {
        assert.equal(Number.isInteger(entry.present[key]), true, key);
      }
    }
    process.stdout.write(JSON.stringify(result) + '\n');
  }
} finally { await rm(root, { recursive: true, force: true }); }
