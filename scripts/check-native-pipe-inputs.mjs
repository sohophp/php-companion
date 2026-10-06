import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {fileURLToPath,URL} from 'node:url';
import process from 'node:process';
import console from 'node:console';

const root=fileURLToPath(new URL('../',import.meta.url));
const raw=await readFile(resolve(root,'packages/semantic/test/fixtures/native-numeric-inputs.json'));
const rows=JSON.parse(raw).cases.filter(row=>row.version==='8.5');
const executable=process.env.PHP_COMPANION_PHP85??'/opt/remi/php85/root/usr/bin/php';
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const info=spawnSync(executable,['-n','-r','echo json_encode(["version"=>PHP_VERSION,"intSize"=>PHP_INT_SIZE]);'],{encoding:'utf8',timeout:5000});
assert.equal(info.error,undefined);assert.equal(info.status,0,info.stderr);
const runtime={executable,...JSON.parse(info.stdout),sha256:sha(await readFile(executable))};
assert.ok(runtime.version.startsWith('8.5.'));assert.equal(runtime.intSize,8);
const results=[];
for(const row of rows)for(const form of ['function','static','instance','arrow','closure']){
 const body=`(${row.native} $mode){return $mode;}`;
 const definitions=form==='function'?`function make${body}`:form==='static'?`class Factory{static function make${body}}`
  :form==='instance'?`class Factory{function make${body}}`:'';
 const callback=form==='function'?'make(...)':form==='static'?'Factory::make(...)':form==='instance'?'$factory->make(...)'
  :form==='arrow'?`(fn(${row.native} $mode)=>$mode)`:`(function${body})`;
 const code=`declare(strict_types=${Number(row.strict)});${definitions}`
  +'$warnings=[];set_error_handler(function($n,$message)use(&$warnings){$warnings[]=$message;return true;});'
  +(form==='instance'?'$factory=new Factory();':'')
  +`try{$value=${row.input} |> ${callback};$result=['accepted'=>true,'branch'=>is_int($value)?'Row':'Other','modeType'=>gettype($value)];}`
  +"catch(Throwable $error){$result=['accepted'=>false,'errorClass'=>get_class($error),'error'=>$error->getMessage()];}"
  +'$result["warnings"]=$warnings;echo json_encode($result,JSON_PARTIAL_OUTPUT_ON_ERROR);';
 const child=spawnSync(executable,['-n','-r',code],{encoding:'utf8',timeout:5000});
 assert.equal(child.error,undefined);assert.equal(child.status,0,`${form} ${JSON.stringify(row)}: ${child.stderr}`);
 const actual=JSON.parse(child.stdout);
 results.push({row,form,actual,codeSha256:sha(code),match:actual.accepted===row.accepted&&(actual.branch??null)===(row.branch??null)});
}
const failures=results.filter(row=>!row.match);
const report={scope:'Explicit PHP 8.5 64-bit pipe invocations; five callback forms, original numeric parameter facts.',
 createdAtUtc:new Date().toISOString(),runtime,fixtureSha256:sha(raw),total:results.length,matching:results.length-failures.length,mismatching:failures.length,results};
if(process.argv[2])await writeFile(resolve(process.argv[2]),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({total:report.total,matching:report.matching,mismatching:report.mismatching}));
assert.equal(failures.length,0,JSON.stringify(failures.slice(0,3)));
