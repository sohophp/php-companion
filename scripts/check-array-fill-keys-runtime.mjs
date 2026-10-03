import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import process from 'node:process';

const commands = process.argv.slice(2);
assert.ok(commands.length, 'Usage: node scripts/check-array-fill-keys-runtime.mjs PHP_COMMAND...');
const probe = `
class Item { public function __toString() { return 'item'; } }
$item = new Item(); $items = ['label' => $item];
$filled = array_fill_keys(['first' => 1.5, 'second' => true, 'third' => null, 'fourth' => '2'], $item);
$types = [];
foreach (['array_reverse', 'array_unique'] as $name) $types[$name] = get_class(current($name($items)));
foreach (['array_intersect', 'array_diff_key'] as $name) $types[$name] = get_class(current($name($items, $name === 'array_intersect' ? $items : [])));
$types['array_diff'] = get_class(current(array_diff($items, [])));
$types['array_intersect_key'] = get_class(current(array_intersect_key($items, $items)));
$types['array_slice'] = get_class(current(array_slice($items, 0)));
$types['array_fill'] = get_class(current(array_fill(0, 1, $item)));
$chunk = array_chunk($items, 1); $types['array_chunk'] = get_class(current($chunk[0]));
echo json_encode(['version' => PHP_VERSION, 'filledKeys' => array_keys($filled),
 'sameObjects' => count(array_filter($filled, function ($value) use ($item) { return $value === $item; })) === 4,
 'empty' => array_fill_keys([], $item), 'adjacentValues' => $types, 'randomKey' => array_rand($items, 1)]);`;
for (const command of commands) {
  const result = JSON.parse(execFileSync(command, ['-r', probe], { encoding: 'utf8', timeout: 10_000 }));
  assert.deepEqual(result.filledKeys, ['1.5', 1, '', 2]); assert.equal(result.sameObjects, true); assert.deepEqual(result.empty, []);
  assert.equal(Object.keys(result.adjacentValues).length, 9); assert.ok(Object.values(result.adjacentValues).every(value => value === 'Item'));
  assert.equal(result.randomKey, 'label'); process.stdout.write(JSON.stringify(result) + '\n');
}
