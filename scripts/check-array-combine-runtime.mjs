import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import process from 'node:process';

const commands = process.argv.slice(2);
assert.ok(commands.length, 'Usage: node scripts/check-array-combine-runtime.mjs PHP_COMMAND...');
const probe = `
class Item { public function itemOnly() {} }
$item = new Item();
$associated = array_combine(['first' => 'label'], ['second' => $item]);
$converted = array_combine(['first' => 1.5, 'second' => true, 'third' => null], ['a' => $item, 'b' => $item, 'c' => $item]);
$mismatch = null;
try { $mismatch = @array_combine(['a'], []); } catch (Throwable $e) { $mismatch = get_class($e); }
echo json_encode(['version' => PHP_VERSION, 'associatedKey' => array_keys($associated),
 'sameObject' => $associated['label'] === $item, 'convertedKeys' => array_keys($converted),
 'convertedValuesAreObjects' => count(array_filter($converted, function ($value) use ($item) { return $value === $item; })) === 3,
 'mismatch' => $mismatch, 'empty' => array_combine([], [])]);`;
for (const command of commands) {
  const result = JSON.parse(execFileSync(command, ['-r', probe], { encoding: 'utf8', timeout: 10_000 }));
  assert.deepEqual(result.associatedKey, ['label']); assert.equal(result.sameObject, true);
  assert.deepEqual(result.convertedKeys, ['1.5', 1, '']); assert.equal(result.convertedValuesAreObjects, true);
  assert.equal(result.mismatch, Number(result.version.split('.')[0]) >= 8 ? 'ValueError' : false);
  assert.deepEqual(result.empty, []);
  process.stdout.write(JSON.stringify(result) + '\n');
}
