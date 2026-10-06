import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {mkdtemp,readFile,rm,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {fileURLToPath,URL} from 'node:url';
import process from 'node:process';
import console from 'node:console';
const root=fileURLToPath(new URL('../',import.meta.url));
const fixturePath=resolve(root,'packages/semantic/test/fixtures/native-boundaries.json');
const raw=await readFile(fixturePath), fixture=JSON.parse(raw), runtimes=new Map(), results=[];
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
for(const version of fixture.metadata.availableVersions){
 const executable=process.env[`PHP_COMPANION_PHP${version.replace('.','')}`]??`/opt/remi/php${version.replace('.','')}/root/usr/bin/php`;
 const args=['-n',...(version.startsWith('7.')?['-d','extension=json']:[])];
 const child=spawnSync(executable,[...args,'-r','echo json_encode(["version"=>PHP_VERSION,"intSize"=>PHP_INT_SIZE]);'],{encoding:'utf8',timeout:5000});
 assert.equal(child.error,undefined);assert.equal(child.status,0,child.stderr);
 const info=JSON.parse(child.stdout);assert.ok(info.version.startsWith(version+'.'));assert.equal(info.intSize,8);
 runtimes.set(version,{executable,args,...info,sha256:sha(await readFile(executable))});
}
const scratch=await mkdtemp(join(tmpdir(),'sophp-native-boundaries-'));
try{
 const defs=join(scratch,'Defs.php'),caller=join(scratch,'Caller.php');
 for(const row of fixture.cases){
  let declaration,operation;
  if(row.kind==='default'){declaration=`function make(${row.native} $mode=${row.input}){return $mode;}`;operation='$value=make();';}
  else if(row.kind==='return'){declaration=`function make():${row.native}{return ${row.input};}`;operation='$value=make();';}
  else{assert.equal(row.kind,'property');declaration=`class Holder{public ${row.native} $mode;}`;operation=`$holder=new Holder();$holder->mode=${row.input};$value=$holder->mode;`;}
  const source=`<?php declare(strict_types=${row.declarationStrict?1:0});`+declaration;
  let code=`<?php declare(strict_types=${row.callerStrict?1:0});`;
  code+='$warnings=[];set_error_handler(function($n,$m)use(&$warnings){$warnings[]=$m;return true;});$loaded=false;';
  code+='try{require '+JSON.stringify(defs)+';$loaded=true;'+operation;
  code+='$result=["accepted"=>true,"declarationAccepted"=>true,"modeType"=>gettype($value),"branch"=>is_int($value)?"Row":"Other"];}';
  code+='catch(Throwable $e){$result=["accepted"=>false,"declarationAccepted"=>$loaded,"errorClass"=>get_class($e),"error"=>$e->getMessage()];}';
  code+='$result["warnings"]=$warnings;echo json_encode($result,JSON_PARTIAL_OUTPUT_ON_ERROR);';
  await writeFile(defs,source);await writeFile(caller,code);
  const runtime=runtimes.get(row.version),child=spawnSync(runtime.executable,[...runtime.args,caller],{encoding:'utf8',timeout:5000});
  assert.equal(child.error,undefined);assert.equal(child.signal,null);
  let observed;
  if(child.status===0)observed=JSON.parse(child.stdout);
  else{
   assert.equal(row.kind,'default');assert.equal(child.status,255);
   assert.match(child.stdout+child.stderr,/Fatal error:.*(?:default|Default)/s);
   observed={accepted:false,declarationAccepted:false,errorClass:'DeclarationFatal',stdout:child.stdout,stderr:child.stderr};
  }
  const matches=observed.accepted===row.accepted&&observed.declarationAccepted===row.declarationAccepted
   &&(!row.accepted||(observed.branch===row.branch&&observed.modeType===row.modeType));
  results.push({...row,observed,matches,declarationSha256:sha(source),callerSha256:sha(code)});
 }
}finally{await rm(scratch,{recursive:true,force:true});}
const failures=results.filter(row=>!row.matches);
const report={scope:fixture.metadata.scope,fixtureSha256:sha(raw),createdAtUtc:new Date().toISOString(),runtimes:Object.fromEntries(runtimes),total:results.length,matching:results.length-failures.length,mismatching:failures.length,results};
if(process.argv[2])await writeFile(resolve(process.argv[2]),JSON.stringify(report,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({total:report.total,matching:report.matching,mismatching:report.mismatching}));
assert.equal(failures.length,0,JSON.stringify(failures.slice(0,3)));
