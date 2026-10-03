import assert from 'node:assert/strict';
import process from 'node:process';
import { execFileSync } from 'node:child_process';
const commands = process.argv.slice(2);
assert.ok(commands.length, 'Usage: node scripts/check-array-key-preservation-runtime.mjs PHP_COMMAND...');
const probe = `
$input = [7=>'seven', 'name'=>'named', 12=>'twelve'];
$result = [];
foreach ([false, true] as $keep) {
 $result[] = ['reverse'=>array_keys(array_reverse($input, $keep)),
 'slice'=>array_keys(array_slice($input, 0, null, $keep)),
 'chunk'=>array_map('array_keys', array_chunk($input, 2, $keep))];
}
$warnings = 0; set_error_handler(function () use (&$warnings) { $warnings++; return true; });
try { $invalid = array_chunk($input, 0); $failure = $invalid === null ? 'null' : 'other'; }
catch (Throwable $e) { $failure = get_class($e); }
restore_error_handler();
echo json_encode(['version'=>PHP_VERSION, 'cases'=>$result, 'failure'=>$failure, 'warnings'=>$warnings]);`;
for (const command of commands) {
 const result = JSON.parse(execFileSync(command, ['-r', probe], { encoding: 'utf8', timeout: 10000 }));
 assert.deepEqual(result.cases, [
  {reverse:[0,'name',1],slice:[0,'name',1],chunk:[[0,1],[0]]},
  {reverse:[12,'name',7],slice:[7,'name',12],chunk:[[7,'name'],[12]]},
 ]);
 assert.equal(result.failure, result.version.startsWith('7.') ? 'null' : 'ValueError');
 assert.equal(result.warnings, result.version.startsWith('7.') ? 1 : 0);
 process.stdout.write(JSON.stringify(result) + '\n');
}
