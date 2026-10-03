import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import process from 'node:process';

const commands = process.argv.slice(2);
assert.ok(commands.length, 'Usage: node scripts/check-iterator-apply-runtime.mjs PHP_COMMAND...');
const probe = `
$received = null;
$count = iterator_apply(new ArrayIterator([1]), function ($a, $b) use (&$received) { $received = [$a, $b]; return false; }, ['b' => 2, 'a' => 1]);
$nullable = (new ReflectionFunction('iterator_apply'))->getParameters()[2]->allowsNull();
$explicitNull = iterator_apply(new ArrayIterator([1]), function () { return false; }, null);
$omitted = iterator_apply(new ArrayIterator([1]), function () { return false; });
echo json_encode(['version' => PHP_VERSION, 'count' => $count, 'received' => $received,
 'nullable' => $nullable, 'explicitNull' => $explicitNull, 'omitted' => $omitted]);`;
for (const command of commands) {
  const result = JSON.parse(execFileSync(command, ['-r', probe], { encoding: 'utf8', timeout: 10_000 }));
  assert.equal(result.count, 1); assert.deepEqual([...result.received].sort(), [1, 2]);
  assert.equal(result.nullable, true); assert.equal(result.explicitNull, 1); assert.equal(result.omitted, 1);
  process.stdout.write(JSON.stringify(result) + '\n');
}
