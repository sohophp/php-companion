import { setTimeout, clearTimeout } from 'node:timers';
import console from 'node:console';
import process from 'node:process';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {mkdtemp,mkdir,writeFile,rm,readFile,realpath} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {tmpdir} from 'node:os';
import {pathToFileURL,URL} from 'node:url';
import {createHash} from 'node:crypto';
const {encodeLspMessage,LspMessageDecoder}=await import(pathToFileURL(resolve('packages/testkit/dist/index.js')).href);
const [outputArgument,selectedVersion,selectedMode,expectedCoreHash]=process.argv.slice(2);
assert.equal(process.argv.length,6);assert.match(expectedCoreHash,/^[0-9a-f]{64}$/);
const output=resolve(outputArgument);
try {await readFile(output);throw Error('Preserve existing proof');}catch(e){if(e.code!=='ENOENT')throw e;}
const versions=['7.2','7.3','7.4','8.0','8.1','8.2','8.3','8.4','8.5'],rows=[];
assert(versions.includes(selectedVersion));assert(['progressive','onDemand','experimental'].includes(selectedMode));
const serverEntry=resolve('dist/language-server.js');
const coreHash=createHash('sha256').update(await readFile(serverEntry)).digest('hex');
assert.equal(coreHash,expectedCoreHash);
for(const version of [selectedVersion])for(const mode of [selectedMode]) {
 const root=await realpath(await mkdtemp(join(tmpdir(),'sophp-version-proof-')));
 await mkdir(join(root,'src'));await writeFile(join(root,'composer.json'),JSON.stringify({autoload:{'psr-4':{'Editing\\':'src/'}}}));
 const file=join(root,'src','Probe.php'),source="<?php namespace Editing; function probe(): int { return strlen('x'); }";
 await writeFile(file,source);
 const child=spawn(process.execPath,[serverEntry,'--stdio','--parser-core-wasm',resolve('dist/web-tree-sitter.wasm'),'--php-wasm',resolve('dist/tree-sitter-php.wasm')],{stdio:'pipe'});
 const exited=once(child,'exit'),decoder=new LspMessageDecoder(),messages=[],waiters=new Set();let sequence=0,stderr='';
 const send=message=>child.stdin.write(encodeLspMessage({jsonrpc:'2.0',...message}));
 child.stderr.on('data',chunk=>stderr+=chunk.toString());
 child.stdout.on('data',chunk=>{for(const message of decoder.push(chunk)){
  messages.push(message);if(message.method&&message.id!==undefined){send({id:message.id,result:null});continue;}
  for(const waiter of [...waiters])if(waiter.matches(message))waiter.done(message);
 }});
 const wait=matches=>{
  const existing=messages.find(matches);if(existing)return Promise.resolve(existing);
  return new Promise((done,reject)=>{const timer=setTimeout(()=>{waiters.delete(waiter);reject(Error('Version proof response timed out'));},30000);
   const waiter={matches,done:message=>{clearTimeout(timer);waiters.delete(waiter);done(message);}};waiters.add(waiter);});
 };
 const request=async(method,params={})=>{const id=++sequence,reply=wait(m=>m.id===id&&!m.method);send({id,method,params});const message=await reply;assert.equal(message.error,undefined,method);return message.result;};
 let result;
 try {
  await request('initialize',{processId:null,capabilities:{},rootUri:pathToFileURL(root).toString(),initializationOptions:{phpVersion:version,indexingMode:mode,cacheDirectory:join(root,'.cache')}});
  send({method:'initialized',params:{}});
  const uri=pathToFileURL(file).toString();send({method:'textDocument/didOpen',params:{textDocument:{uri,languageId:'php',version:1,text:source}}});
  await wait(m=>m.method==='textDocument/publishDiagnostics'&&m.params.uri===uri);
  const controls=await request('workspace/symbol',{query:'strlen'});
  const matches=controls.filter(symbol=>symbol.name==='strlen'&&symbol.location.uri.startsWith('php-companion-builtin:'));
  assert.ok(matches.length>0,'Require actual builtin symbol');
  for(const symbol of matches)assert.equal(new URL(symbol.location.uri).searchParams.get('php'),version);
  const availability=[];
  for(const [name,since] of [['is_countable','7.3'],['str_contains','8.0'],['array_first','8.5']]){
   const symbols=await request('workspace/symbol',{query:name});
   const present=symbols.some(symbol=>symbol.name===name&&symbol.location.uri.startsWith('php-companion-builtin:'));
   const expected=versions.indexOf(version)>=versions.indexOf(since);assert.equal(present,expected,name+' availability');
   availability.push({name,since,present,expected});
  }
  await request('shutdown',null);send({method:'exit',params:null});const [code,signal]=await exited;assert.equal(code,0);assert.equal(signal,null);assert.equal(stderr,'');
  result={version,mode,temporaryRoot:root,serverPid:child.pid,builtinSourceUris:matches.map(symbol=>symbol.location.uri),availability,exitCode:code,passed:true};
 } finally {
  if(child.exitCode===null&&child.signalCode===null){child.kill();await exited;}
  await rm(root,{recursive:true,force:true});
 }
 result.directoryRemoved=true;rows.push(result);
 await writeFile(output,JSON.stringify({status:'running',coreHash,rows},null,2)+'\n');
 console.log(JSON.stringify({version,mode,actualLoadedVersionVerified:true}));
}
await writeFile(output,JSON.stringify({status:'exited',exitCode:0,passed:true,coreHash,rows},null,2)+'\n');

assert.equal(createHash('sha256').update(await readFile(serverEntry)).digest('hex'),expectedCoreHash);
