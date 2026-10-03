import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import process from 'node:process';
const commands = process.argv.slice(2);
assert.ok(commands.length, 'Usage: node scripts/check-string-replacement-runtime.mjs PHP_COMMAND...');
const probe = `
class Label { public function __toString() { return 'Ab'; } }
$rows = [];
foreach (['str_replace', 'str_ireplace'] as $fn) {
  $object = new Label(); $count = 0;
  $text = $fn('A', 'Z', 'Ab', $count); $textCount = $count;
  $subject = ['text'=>'Ab', 'number'=>12, 'flag'=>true, 'empty'=>null, 'object'=>$object, 'nested'=>['Ab']];
  $count = 0; $result = @$fn('A', 'Z', $subject, $count);
  $rows[] = ['function'=>$fn, 'text'=>$text, 'textCount'=>$textCount, 'keys'=>array_keys($result),
    'textValue'=>$result['text'], 'number'=>$result['number'], 'flag'=>$result['flag'], 'empty'=>$result['empty'],
    'objectPreserved'=>$result['object'] === $object, 'objectType'=>gettype($result['object']),
    'nestedPreserved'=>$result['nested'] === ['Ab'], 'nestedType'=>gettype($result['nested']), 'count'=>$count];
}
echo json_encode(['version'=>PHP_VERSION, 'rows'=>$rows]);`;
for (const command of commands) {
  const result = JSON.parse(execFileSync(command, ['-r', probe], { encoding: 'utf8', timeout: 10000 }));
  const modern = Number(result.version.split('.')[0]) >= 8;
  for (const row of result.rows) {
    assert.equal(row.text, 'Zb'); assert.equal(row.textCount, 1); assert.equal(row.textValue, 'Zb');
    assert.deepEqual(row.keys, ['text','number','flag','empty','object','nested']);
    assert.equal(row.number, '12'); assert.equal(row.flag, '1'); assert.equal(row.empty, '');
    assert.equal(row.objectPreserved, !modern); assert.equal(row.nestedPreserved, !modern);
    assert.equal(row.objectType, modern ? 'string' : 'object'); assert.equal(row.nestedType, modern ? 'string' : 'array');
    assert.equal(row.count, modern ? (row.function === 'str_replace' ? 3 : 4) : 1);
  }
  process.stdout.write(JSON.stringify(result) + '\n');
}
