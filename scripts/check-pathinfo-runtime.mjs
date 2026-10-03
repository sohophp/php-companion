import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import process from 'node:process';

const commands = process.argv.slice(2);
assert.ok(commands.length, 'Usage: node scripts/check-pathinfo-runtime.mjs PHP_COMMAND...');
const probe = `
$paths = ['', 'file', '/dir/file.php', '/dir/file.', '/dir/.env', '/'];
$results = [];
foreach ($paths as $path) {
  $all = pathinfo($path);
  $values = [];
  foreach ([PATHINFO_DIRNAME, PATHINFO_BASENAME, PATHINFO_EXTENSION, PATHINFO_FILENAME] as $flag) {
    $values[] = pathinfo($path, $flag);
  }
  $results[] = ['path' => $path, 'all' => $all, 'explicitAll' => pathinfo($path, 15), 'values' => $values];
}
echo json_encode(['version' => PHP_VERSION, 'hasPathinfoAll' => defined('PATHINFO_ALL'), 'results' => $results]);`;
for (const command of commands) {
  const output = JSON.parse(execFileSync(command, ['-r', probe], { encoding: 'utf8' }));
  assert.equal(output.hasPathinfoAll, Number(output.version.split('.')[0]) >= 8);
  for (const { path, all, explicitAll, values } of output.results) {
    assert.deepEqual(all, explicitAll);
    assert.equal(typeof all.basename, 'string'); assert.equal(typeof all.filename, 'string');
    assert.deepEqual(Object.keys(all).filter(key => !['dirname', 'basename', 'extension', 'filename'].includes(key)), []);
    if (path === '') assert.equal(Object.hasOwn(all, 'dirname'), false);
    if (path === '' || path === 'file' || path === '/') assert.equal(Object.hasOwn(all, 'extension'), false);
    if (path === '/dir/file.') assert.equal(all.extension, '');
    for (const value of values) assert.equal(typeof value, 'string');
  }
  process.stdout.write(`${JSON.stringify({ command, ...output })}\n`);
}
