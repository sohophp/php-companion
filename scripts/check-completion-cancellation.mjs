import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import console from 'node:console';
import process from 'node:process';
import { performance } from 'node:perf_hooks';
import { clearTimeout, setTimeout } from 'node:timers';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { encodeLspMessage, LspMessageDecoder } from '../packages/testkit/dist/index.js';

// Build language-server and testkit first. Optional native paths use the same protocol checks.
const serverPath = process.argv[3] ? resolve(process.argv[3])
  : resolve(dirname(fileURLToPath(import.meta.url)), '../packages/language-server/dist/server.js');
const reportPath = process.argv[2];
const parserCoreWasm = process.argv[4]; const phpWasm = process.argv[5];
if (process.argv.length > 6 || Boolean(parserCoreWasm) !== Boolean(phpWasm))
  throw new Error('Usage: check-completion-cancellation.mjs [report.json] [server entry] [parser core WASM] [PHP WASM]');
const results = [];
for (const phpVersion of ['7.2', '8.5']) for (const indexingMode of ['onDemand', 'experimental', 'progressive']) {
  const root = await mkdtemp(join(tmpdir(), 'sophp-completion-cancel-'));
  const source = '<?php class Receiver { public function render(int $value): string { return ""; } } function run(Receiver $item): void { $item->ren; }';
  const uri = pathToFileURL(join(root, 'Consumer.php')).toString();
  let child;
  try {
    await writeFile(join(root, 'composer.json'), JSON.stringify({ autoload: { files: ['Consumer.php'] } }));
    await writeFile(join(root, 'Consumer.php'), source);
    child = spawn(process.execPath, [serverPath, '--stdio', ...(parserCoreWasm
      ? ['--parser-core-wasm', parserCoreWasm, '--php-wasm', phpWasm] : [])], { stdio: 'pipe' });
    const decoder = new LspMessageDecoder(), messages = [], waiters = [];
    let stderr = '';
    child.stderr.on('data', part => { stderr = (stderr + part).slice(-4096); });
    child.stdout.on('data', part => {
      for (const message of decoder.push(part)) {
        messages.push(message);
        for (let i = waiters.length - 1; i >= 0; i--) if (waiters[i].predicate(message)) {
          const waiter = waiters.splice(i, 1)[0]; clearTimeout(waiter.timer); waiter.resolve(message);
        }
      }
    });
    const wait = predicate => {
      const previous = messages.find(predicate); if (previous) return Promise.resolve(previous);
      return new Promise((resolve, reject) => {
        const waiter = { predicate, resolve };
        waiter.timer = setTimeout(() => { waiters.splice(waiters.indexOf(waiter), 1); reject(new Error(`Timed out: ${phpVersion}/${indexingMode}; ${stderr}`)); }, 20000);
        waiters.push(waiter);
      });
    };
    const send = message => child.stdin.write(encodeLspMessage(message));
    const request = async (id, method, params) => { send({jsonrpc:'2.0',id,method,params}); const reply = await wait(message => message.id === id); assert.equal(reply.error, undefined); return reply.result; };
    await request(1, 'initialize', {processId:null,capabilities:{},rootUri:pathToFileURL(root).toString(),initializationOptions:{phpVersion,indexingMode,testMode:true,testPauseNextQueries:['completion']}});
    send({jsonrpc:'2.0',method:'initialized',params:{}});
    send({jsonrpc:'2.0',method:'textDocument/didOpen',params:{textDocument:{uri,languageId:'php',version:1,text:source}}});
    await wait(message => message.method === 'textDocument/publishDiagnostics' && message.params?.uri === uri);
    const params = {textDocument:{uri},position:{line:0,character:source.indexOf('$item->ren;')+'$item->ren'.length}};
    send({jsonrpc:'2.0',id:10,method:'textDocument/completion',params});
    await wait(message => message.method === 'window/logMessage' && message.params?.message === '[test-query-paused] method=completion');
    assert.equal(messages.some(message => message.id === 10), false);
    const cancellationStarted = performance.now();
    send({jsonrpc:'2.0',method:'$/cancelRequest',params:{id:10}});
    const state = await request(11,'phpCompanion/testQueryState',{method:'completion',uri});
    assert.equal(state.paused,true); assert.equal(state.version,1);
    assert.equal(await request(12,'phpCompanion/testReleaseQuery',{method:'completion'}),true);
    const cancelled = await wait(message => message.id === 10);
    const cancellationThroughReleaseMs = performance.now() - cancellationStarted;
    assert.equal(cancelled.error,undefined); assert.deepEqual(cancelled.result,[]);
    send({jsonrpc:'2.0',method:'$/cancelRequest',params:{id:99999}});
    const fresh = await request(13,'textDocument/completion',params);
    const items = Array.isArray(fresh) ? fresh : fresh.items;
    assert.ok(items.some(item => item.label === 'render'));
    results.push({platform:process.platform,node:process.version,phpVersion,indexingMode,cancelledResult:[],
      freshLabels:items.map(item => item.label),documentVersion:state.version,cancellationThroughReleaseMs});
    await request(14,'shutdown',null);
    const exited = new Promise(resolve => child.once('exit',(code,signal)=>resolve({code,signal})));
    send({jsonrpc:'2.0',method:'exit',params:null});
    assert.deepEqual(await exited,{code:0,signal:null});
  } finally { if(child && child.exitCode === null) child.kill(); await rm(root,{recursive:true,force:true,maxRetries:5,retryDelay:100}); }
}
if (reportPath) await writeFile(reportPath,JSON.stringify(results,null,2)+'\n');
console.log(JSON.stringify(results,null,2));
