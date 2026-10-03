import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import process from 'node:process';
const commands = process.argv.slice(2);
assert.ok(commands.length, 'Usage: node scripts/check-array-count-values-runtime.mjs PHP_COMMAND...');
const probe = `
$warnings=0;set_error_handler(function()use(&$warnings){$warnings++;return true;});
$result=array_count_values(['12',12,'name','name',true,1.5,null,new stdClass(),[]]);restore_error_handler();
$integer=array_count_values([-12,0,12,12]);
$strings=array_count_values(['012','-12','+12','1.0',' 12']);
echo json_encode(['version'=>PHP_VERSION,'keys'=>array_keys($result),'counts'=>array_values($result),'warnings'=>$warnings,
 'integerKeys'=>array_keys($integer),'integerCounts'=>array_values($integer),'stringKeys'=>array_keys($strings),'empty'=>array_count_values([])]);`;
for (const command of commands) {
  const result = JSON.parse(execFileSync(command, ['-r', probe], { encoding: 'utf8', timeout: 10000 }));
  assert.deepEqual(result.keys, [12,'name']); assert.deepEqual(result.counts, [2,2]); assert.equal(result.warnings, 5);
  assert.deepEqual(result.integerKeys, [-12,0,12]); assert.deepEqual(result.integerCounts, [1,1,2]);
  assert.deepEqual(result.stringKeys, ['012',-12,'+12','1.0',' 12']); assert.deepEqual(result.empty, []);
  process.stdout.write(JSON.stringify(result) + '\n');
}
