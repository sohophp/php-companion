import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import process from 'node:process';
const commands = process.argv.slice(2);
assert.ok(commands.length, 'Usage: node scripts/check-array-flip-runtime.mjs PHP_COMMAND...');
const probe = `
$warnings = 0; set_error_handler(function () use (&$warnings) { $warnings++; return true; });
$result = array_flip(['numeric'=>'12','normal'=>'name','integer'=>8,'boolean'=>true,'float'=>1.5,'nil'=>null,'object'=>new stdClass(),'nested'=>['x']]);
restore_error_handler();
$collision = array_flip(['first'=>'12','second'=>12]);
$strings = array_flip(['leading'=>'012','negative'=>'-12','plus'=>'+12','decimal'=>'1.0','space'=>' 12']);
$integers = array_flip(['negative'=>-12,'zero'=>0,'positive'=>12]);
echo json_encode(['version'=>PHP_VERSION,'keys'=>array_keys($result),'values'=>array_values($result), 'warnings'=>$warnings,
 'collisionKeys'=>array_keys($collision),'collisionValues'=>array_values($collision),
 'stringKeys'=>array_keys($strings),'integerKeys'=>array_keys($integers)]);`;
for (const command of commands) {
  const result = JSON.parse(execFileSync(command, ['-r', probe], { encoding: 'utf8', timeout: 10000 }));
  assert.deepEqual(result.keys, [12,'name',8]); assert.deepEqual(result.values, ['numeric','normal','integer']);
  assert.equal(result.warnings, 5); assert.deepEqual(result.collisionKeys, [12]); assert.deepEqual(result.collisionValues, ['second']);
  assert.deepEqual(result.stringKeys, ['012',-12,'+12','1.0',' 12']); assert.deepEqual(result.integerKeys, [-12,0,12]);
  process.stdout.write(JSON.stringify(result) + '\n');
}
