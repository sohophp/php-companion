import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath, URL } from 'node:url';
import process from 'node:process';
import console from 'node:console';

const root = fileURLToPath(new URL('../', import.meta.url));
const bytes = await readFile(resolve(root, 'packages/semantic/test/fixtures/native-clone-inputs.json'));
const fixture = JSON.parse(bytes), results = [];
const sha = value => createHash('sha256').update(value).digest('hex');
const executable = process.env.PHP_COMPANION_PHP85 ?? '/opt/remi/php85/root/usr/bin/php';
const info = spawnSync(executable, ['-n', '-r', 'echo json_encode(["version"=>PHP_VERSION,"intSize"=>PHP_INT_SIZE]);'], {encoding:'utf8', timeout:5000});
assert.equal(info.error, undefined); assert.equal(info.status, 0, info.stderr);
const runtime = { executable, ...JSON.parse(info.stdout), sha256:sha(await readFile(executable)) };
assert.ok(runtime.version.startsWith('8.5.')); assert.equal(runtime.intSize, 8);
function observe(id, code, expected, type) {
  const child = spawnSync(executable, ['-n', '-r', code], {encoding:'utf8', timeout:5000});
  assert.equal(child.error, undefined); assert.equal(child.status, 0, `${id}: ${child.stderr}`);
  const actual = JSON.parse(child.stdout);
  results.push({id, expected, type, actual, codeSha256:sha(code), match:actual.accepted === expected && (!expected || !type || actual.type === type)});
}
const warningSetup = '$warnings=[];set_error_handler(function($n,$m)use(&$warnings){$warnings[]=$m;return true;});';
const ending = "catch(Throwable $e){$result=['accepted'=>false,'error'=>get_class($e),'message'=>$e->getMessage()];}$result['warnings']=$warnings;echo json_encode($result,JSON_PARTIAL_OUTPUT_ON_ERROR);";
for (const row of fixture.cases) for (const form of ['assignment', 'clone-variable', 'clone-member']) {
  const operation = form === 'assignment' ? `$value->mode=${row.input};$copy=$value;`
    : form === 'clone-variable' ? `$copy=clone($value,['mode'=>${row.input}]);`
      : `$box=new Box();$box->value=$value;$copy=clone($box->value,['mode'=>${row.input}]);`;
  const code = `declare(strict_types=${Number(row.strict)});class Value{public ${row.native} $mode;}class Box{public Value $value;}`
    + `${warningSetup}$value=new Value();try{${operation}$result=['accepted'=>true,'type'=>gettype($copy->mode)];}${ending}`;
  observe(`${row.case} ${row.native} strict=${row.strict} ${form}`, code,
    form === 'assignment' ? row.assignmentAccepted : row.accepted, form === 'assignment' ? row.assignmentType : row.type);
}
for (const row of fixture.safetyCases) for (const strict of [false, true]) {
  const body = `$copy=clone($value,['mode'=>${row.input}]);return $copy;`;
  const definitions = `${row.prefix}class Value${row.id === 'inherited' ? ' extends Base' : ''}{${row.declaration}public function valueOnly(){return true;}`
    + (row.scope === 'inside' ? `public static function run(Value $value){${body}}}` : `}function run(Value $value){${body}}`);
  const invoke = row.scope === 'inside' ? 'Value::run($value)' : 'run($value)';
  const code = `declare(strict_types=${Number(strict)});${definitions}${warningSetup}`
    + `try{$value=new Value();$copy=${invoke};$result=['accepted'=>$copy->valueOnly()];}${ending}`;
  observe(`${row.id} strict=${strict}`, code, row.accepted);
}
const failures = results.filter(row => !row.match);
const report = {scope:'Actual PHP 8.5 64-bit ordinary and clone writes, native conversion, visibility, hooks and duplicate keys.',
  createdAtUtc:new Date().toISOString(), fixtureSha256:sha(bytes), runtime, total:results.length, mismatching:failures.length, results};
if (process.argv[2]) await writeFile(resolve(process.argv[2]), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({runtime, total:results.length, mismatching:failures.length, failures}));
if (failures.length) process.exitCode = 1;
