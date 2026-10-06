import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath, URL } from 'node:url';
import process from 'node:process';
import console from 'node:console';

const root = fileURLToPath(new URL('../', import.meta.url));
const bytes = await readFile(resolve(root, 'packages/semantic/test/fixtures/native-boolean-inputs.json'));
const fixture = JSON.parse(bytes), results = [], runtimes = [];
const sha = value => createHash('sha256').update(value).digest('hex');
for (const target of fixture.runtimes.map(runtime => runtime.target)) {
  const executable = process.env[`PHP_COMPANION_PHP${target.replace('.', '')}`] ?? `/opt/remi/php${target.replace('.', '')}/root/usr/bin/php`;
  const info = spawnSync(executable, ['-n', '-r', 'echo json_encode(["version"=>PHP_VERSION,"intSize"=>PHP_INT_SIZE]);'], {encoding:'utf8',timeout:5000});
  assert.equal(info.error, undefined); assert.equal(info.status, 0, info.stderr);
  const runtime = {target,executable,...JSON.parse(info.stdout),sha256:sha(await readFile(executable))};
  assert.ok(runtime.version.startsWith(`${target}.`)); assert.equal(runtime.intSize, 8); runtimes.push(runtime);
  for (const row of fixture.cases.filter(row => row.versions.includes(target))) for (const kind of ['argument','return','property']) {
    const body = kind === 'argument' ? `function convert(${row.native} $value){return $value;}$value=convert(${row.input});`
      : kind === 'return' ? `function convert():${row.native}{return ${row.input};}$value=convert();`
        : `class Target{public ${row.native} $value;}$object=new Target();$object->value=${row.input};$value=$object->value;`;
    const code = `declare(strict_types=${Number(row.strict)});$warnings=[];set_error_handler(function($n,$m)use(&$warnings){$warnings[]=$m;return true;});`
      + `try{${body}$result=['accepted'=>true,'type'=>gettype($value),'value'=>$value];}`
      + "catch(Throwable $e){$result=['accepted'=>false,'error'=>get_class($e),'message'=>$e->getMessage()];}"
      + '$result["warnings"]=$warnings;echo json_encode($result,JSON_PARTIAL_OUTPUT_ON_ERROR);';
    const child = spawnSync(executable, ['-n','-r',code], {encoding:'utf8',timeout:5000});
    assert.equal(child.error, undefined); assert.equal(child.status, 0, JSON.stringify({target,row,kind,stderr:child.stderr}));
    const actual = JSON.parse(child.stdout);
    results.push({target,row,kind,actual,codeSha256:sha(code),match:actual.accepted === row.accepted && (!actual.accepted || actual.type === row.type)});
  }
}
const failures = results.filter(row => !row.match);
const report = {scope:'Actual native boolean-literal union parameters, returns and writes on four available 64-bit PHP runtimes.',
  createdAtUtc:new Date().toISOString(),fixtureSha256:sha(bytes),runtimes,total:results.length,mismatching:failures.length,results};
if (process.argv[2]) await writeFile(resolve(process.argv[2]), JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({total:report.total,mismatching:report.mismatching}));
assert.equal(failures.length, 0, JSON.stringify(failures.slice(0,3)));
