import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath, URL } from 'node:url';
import process from 'node:process';
import console from 'node:console';

// Reproduce the frozen native parameter observations without running project PHP.
// Each version is explicit; absence is an error rather than a successful skip.
const root = fileURLToPath(new URL('../', import.meta.url));
const fixturePath = resolve(root, 'packages/semantic/test/fixtures/native-numeric-inputs.json');
const rawFixture = await readFile(fixturePath);
const fixture = JSON.parse(rawFixture);
const runtimes = new Map(), results = [];
for (const version of fixture.metadata.availableVersions) {
  const compact = version.replace('.', '');
  const executable = process.env[`PHP_COMPANION_PHP${compact}`] ?? `/opt/remi/php${compact}/root/usr/bin/php`;
  const arguments_ = ['-n', ...(version.startsWith('7.') ? ['-d', 'extension=json'] : [])];
  const process_ = spawnSync(executable, [...arguments_, '-r', 'echo json_encode(["version"=>PHP_VERSION,"intSize"=>PHP_INT_SIZE]);'],
    {encoding:'utf8', timeout:5_000});
  assert.equal(process_.error, undefined, `Cannot run ${version}: ${executable}`);
  assert.equal(process_.status, 0, process_.stderr);
  const runtime = JSON.parse(process_.stdout);
  assert.ok(runtime.version.startsWith(version+'.'), `Wrong PHP minor: ${runtime.version}`);
  assert.equal(runtime.intSize, 8, 'This fixture qualifies 64-bit integer parameters.');
  runtimes.set(version, {executable, arguments:arguments_, ...runtime,
    sha256:createHash('sha256').update(await readFile(executable)).digest('hex')});
}
for (const item of fixture.cases) {
  const runtime = runtimes.get(item.version);
  const code = `declare(strict_types=${item.strict ? 1 : 0});`
    + '$warnings=[];set_error_handler(function($n,$m)use(&$warnings){$warnings[]=$m;return true;});'
    + `function make(${item.native} $mode){return ["modeType"=>gettype($mode),"branch"=>is_int($mode)?"Row":"Other"];}`
    + `try{$result=make(${item.input});$result["accepted"]=true;}`
    + 'catch(Throwable $e){$result=["accepted"=>false,"errorClass"=>get_class($e),"error"=>$e->getMessage()];}'
    + '$result["warnings"]=$warnings;echo json_encode($result,JSON_PARTIAL_OUTPUT_ON_ERROR);';
  const process_ = spawnSync(runtime.executable, [...runtime.arguments, '-r', code], {encoding:'utf8', timeout:5_000});
  assert.equal(process_.error, undefined);
  assert.equal(process_.status, 0, `${JSON.stringify(item)}: ${process_.stderr}`);
  const result = JSON.parse(process_.stdout);
  results.push({...item, actual:result, codeSha256:createHash('sha256').update(code).digest('hex'),
    matches:result.accepted === item.accepted && (result.branch ?? null) === (item.branch ?? null)});
}
const mismatches = results.filter(item => !item.matches);
const report = {scope:fixture.metadata.scope, fixtureSha256:createHash('sha256').update(rawFixture).digest('hex'),
  createdAtUtc:new Date().toISOString(), runtimes:Object.fromEntries(runtimes),
  total:results.length, matching:results.length-mismatches.length, mismatching:mismatches.length, results};
if (process.argv[2]) await writeFile(resolve(process.argv[2]), JSON.stringify(report, null, 2)+'\n');
console.log(JSON.stringify({total:report.total, matching:report.matching, mismatching:report.mismatching}));
assert.equal(mismatches.length, 0, `Native fixture no longer matches: ${JSON.stringify(mismatches.slice(0, 3))}`);
