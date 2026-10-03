import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdtemp, mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import process from 'node:process';
import console from 'node:console';
import { clearTimeout, setTimeout } from 'node:timers';
import { fileURLToPath, pathToFileURL, URL } from 'node:url';
import { encodeLspMessage, LspMessageDecoder } from '../packages/testkit/dist/index.js';

// Test-only read gate runs in this child process, never in the installed extension.
const workspace = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const reportPath = process.argv[2];
if (process.argv.length > 3) throw new Error('Usage: check-cold-parent-completion-races.mjs [report.json]');
const results = [];
for (const phpVersion of ['7.2', '8.5']) for (const scenario of ['cancel', 'child-edit', 'parent-open']) {
  const root = await mkdtemp(join(tmpdir(), 'sophp-cold-parent-race-'));
  let child;
  try {
    await mkdir(join(root, 'src'));
    const parentPath = join(root, 'src', 'Base.php');
    const parent = '<?php namespace App; class Base { final public function __construct() {} }';
    const source = '<?php namespace App; class Child extends Base { public function __con() {} }';
    const uri = pathToFileURL(join(root, 'src', 'Child.php')).toString();
    const parentUri = pathToFileURL(parentPath).toString();
    await writeFile(join(root, 'composer.json'), JSON.stringify({autoload:{'psr-4':{'App\\':'src/'}}}));
    await writeFile(parentPath, parent);
    await writeFile(join(root, 'src', 'Child.php'), source);
    child = spawn(process.execPath, ['--import', fileURLToPath(new URL('./fixtures/cold-parent-read-gate.mjs', import.meta.url)),
      join(workspace, 'dist/language-server.js'), '--stdio',
      '--parser-core-wasm',join(workspace, 'dist/web-tree-sitter.wasm'),
      '--php-wasm',join(workspace, 'dist/tree-sitter-php.wasm')],
      {stdio:['pipe','pipe','pipe','ipc']});
    const messages = [], waiters = [], decoder = new LspMessageDecoder();
    let stderr = '';
    const accept = message => {
      messages.push(message);
      for (const waiter of [...waiters]) if (waiter.predicate(message)) {
        clearTimeout(waiter.timer); waiters.splice(waiters.indexOf(waiter),1); waiter.resolve(message);
      }
    };
    child.on('message', message => accept({ipc:message}));
    child.stderr.on('data', part => {stderr = (stderr + part).slice(-4096);});
    child.stdout.on('data', part => decoder.push(part).forEach(accept));
    const wait = predicate => {
      const existing = messages.find(predicate); if (existing) return Promise.resolve(existing);
      return new Promise((resolve,reject) => {
        const waiter = {predicate,resolve};
        waiter.timer = setTimeout(() => {waiters.splice(waiters.indexOf(waiter),1);reject(new Error(`${phpVersion}/${scenario}: wait timed out; ${stderr}; ${JSON.stringify(messages.slice(-6))}`));},20000);
        waiters.push(waiter);
      });
    };
    const send = message => child.stdin.write(encodeLspMessage({jsonrpc:'2.0',...message}));
    const request = async (id,method,params) => {send({id,method,params});const reply=await wait(m=>m.id===id);assert.equal(reply.error,undefined);return reply.result;};
    await request(1,'initialize',{processId:null,capabilities:{},rootUri:pathToFileURL(root).toString(),initializationOptions:{phpVersion,indexingMode:'onDemand',testMode:true}});
    send({method:'initialized',params:{}});
    send({method:'textDocument/didOpen',params:{textDocument:{uri,languageId:'php',version:1,text:source}}});
    await wait(m=>m.method==='textDocument/publishDiagnostics'&&m.params.uri===uri);
    child.send({kind:'arm',path:parentPath});await wait(m=>m.ipc?.kind==='armed');
    const completionParams = text => ({textDocument:{uri},position:{line:0,character:text.indexOf('__con')>=0?text.indexOf('__con')+5:text.indexOf('__inv')+5}});
    send({id:10,method:'textDocument/completion',params:completionParams(source)});
    const held=await wait(m=>m.ipc?.kind==='held');assert.equal(held.ipc.path,parentPath);
    assert.equal(messages.some(m=>m.id===10),false);
    let current=source;
    if(scenario==='cancel') send({method:'$/cancelRequest',params:{id:10}});
    if(scenario==='child-edit') {
      current=source.replace('__con','__inv');
      send({method:'textDocument/didChange',params:{textDocument:{uri,version:2},contentChanges:[{text:current}]}});
    }
    if(scenario==='parent-open') send({method:'textDocument/didOpen',params:{textDocument:{uri:parentUri,languageId:'php',version:1,text:parent.replace('final ','')}}});
    const state=await request(11,'phpCompanion/testQueryState',{method:'completion',uri});
    assert.equal(state.version,scenario==='child-edit'?2:1);
    child.send({kind:'release'});await wait(m=>m.ipc?.kind==='released');
    const stale=await wait(m=>m.id===10);assert.equal(stale.error,undefined);
    const labels=result=>(Array.isArray(result)?result:result?.items??[]).map(item=>item.label);
    // Opening the parent also invalidates the in-flight dependency query.
    // The fresh request, rather than an obsolete request ID, must see its buffer.
    assert.deepEqual(stale.result,[]);
    const fresh=await request(12,'textDocument/completion',completionParams(current));
    assert.equal(labels(fresh).includes('__construct'),scenario==='parent-open');
    if(scenario==='child-edit') assert.ok(labels(fresh).includes('__invoke'));
    let resumedLabels;
    if(scenario==='cancel') {
      const broader=completionParams(current);broader.position.character=current.indexOf('__con')+2;
      resumedLabels=labels(await request(14,'textDocument/completion',broader));
      assert.ok(resumedLabels.includes('__invoke'));assert.ok(!resumedLabels.includes('__construct'));
    }
    assert.equal(await readFile(parentPath,'utf8'),parent);
    assert.equal(await readFile(join(root,'src','Child.php'),'utf8'),source);
    results.push({phpVersion,scenario,heldAt:'cold parent readFile',oldLabels:labels(stale.result),freshLabels:labels(fresh),resumedLabels,childVersion:state.version,disksUnchanged:true});
    await request(13,'shutdown',null);const exited=once(child,'exit');send({method:'exit',params:null});assert.equal((await exited)[0],0);
  } finally {if(child?.exitCode===null){const exited=once(child,'exit');child.kill();await exited;}await rm(root,{recursive:true,force:true});}
}
if(reportPath) await writeFile(reportPath,JSON.stringify(results,null,2)+'\n');
console.log(JSON.stringify(results,null,2));
