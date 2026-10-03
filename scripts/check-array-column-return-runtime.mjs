import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import process from 'node:process';
const commands = process.argv.slice(2);
assert.ok(commands.length, 'Usage: node scripts/check-array-column-return-runtime.mjs PHP_COMMAND...');
const probe = `
$rows = ['outer-a'=>['id'=>'first','entry'=>'one'], 'outer-b'=>['id'=>'second','entry'=>'two']];
$list = array_column($rows, 'entry'); $indexed = array_column($rows, 'entry', 'id');
$whole = array_column($rows, null, 'id');
$missing = array_column([['id'=>'a'], ['entry'=>'value']], 'entry', 'id');
$duplicate = array_column([['id'=>'a','entry'=>'old'], ['id'=>'a','entry'=>'new']], 'entry', 'id');
echo json_encode(['version'=>PHP_VERSION, 'list'=>$list, 'indexed'=>$indexed, 'wholeKeys'=>array_keys($whole),
 'wholeMatches'=>$whole['first'] === $rows['outer-a'], 'missing'=>$missing, 'duplicate'=>$duplicate]);`;
for (const command of commands) {
  const result = JSON.parse(execFileSync(command, ['-r', probe], { encoding: 'utf8', timeout: 10000 }));
  assert.deepEqual(result.list, ['one','two']); assert.deepEqual(result.indexed, { first: 'one', second: 'two' });
  assert.deepEqual(result.wholeKeys, ['first','second']); assert.equal(result.wholeMatches, true);
  assert.deepEqual(result.missing, ['value']); assert.deepEqual(result.duplicate, { a: 'new' });
  process.stdout.write(JSON.stringify(result) + '\n');
}
