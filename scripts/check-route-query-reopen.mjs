import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import console from 'node:console';
import process from 'node:process';
import { clearTimeout, setTimeout } from 'node:timers';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { encodeLspMessage, LspMessageDecoder } from '../packages/testkit/dist/index.js';

// The optional server argument permits checking an isolated compiled candidate.
const serverPath = process.argv[3] ?? resolve(dirname(fileURLToPath(import.meta.url)), '../packages/language-server/dist/server.js');
const reportPath = process.argv[2];
if (process.argv.length > 4) throw new Error('Usage: node scripts/check-route-query-reopen.mjs [report.json] [server.js]');
const results = [];
for (const phpVersion of ['7.2','8.5']) for (const indexingMode of ['onDemand','experimental','progressive']) for (const kind of ['name','parameter','definition']) {
  const root = await mkdtemp(join(tmpdir(), 'sophp-route-reopen-'));
  const header = '<?php namespace Symfony\\Component\\Routing; interface RouterInterface { public function generate(string $name, array $parameters = []): string; } namespace App; function run(\\Symfony\\Component\\Routing\\RouterInterface $router): void { ';
  const source = header + (kind === 'parameter' ? "$router->generate('demo', ['i' => 1]); }" : kind === 'name' ? "$router->generate('de'); }" : "$router->generate('demo'); }");
  const uri = pathToFileURL(join(root, 'Consumer.php')).toString();
  let child;
  try {
    await writeFile(join(root, 'composer.json'), JSON.stringify({ autoload: { files: ['Consumer.php'] } }));
    await writeFile(join(root, 'Consumer.php'), source);
    child = spawn(process.execPath, [serverPath, '--stdio'], { stdio: 'pipe' });
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
    const declarationUri=pathToFileURL(join(root,'Routes.yaml')).toString(); await writeFile(join(root,'Routes.yaml'),'demo: /demo/{id}');
    const gate = join(root,'gate'), started = join(root,'started'), release = join(root,'release'), provider = join(root,'routes.mjs');
    await writeFile(provider, `import {existsSync,writeFileSync} from 'node:fs';let data='';for await(const part of process.stdin)data+=part;const request=JSON.parse(data);if(existsSync(${JSON.stringify(gate)})){writeFileSync(${JSON.stringify(started)},'started');while(!existsSync(${JSON.stringify(release)}))await new Promise(done=>setTimeout(done,10));}process.stdout.write(JSON.stringify({protocolVersion:1,id:request.id,result:{schema:1,providerId:'test.routes',generation:request.params.generation,complete:true,routes:[{name:'demo',path:'/demo/{id}',uri:${JSON.stringify(declarationUri)},start:0,end:4}]}}));`);
    await request(1, 'initialize', {processId:null,capabilities:{},rootUri:pathToFileURL(root).toString(),initializationOptions:{phpVersion,indexingMode,routeProviders:[{providerId:'test.routes',command:process.execPath,args:[provider],timeoutMs:10000,replacesStaticRoutes:true}]}});
    send({jsonrpc:'2.0',method:'initialized',params:{}});
    send({jsonrpc:'2.0',method:'textDocument/didOpen',params:{textDocument:{uri,languageId:'php',version:1,text:source}}});
    await wait(message => message.method === 'textDocument/publishDiagnostics' && message.params?.uri === uri);
    const method=kind==='definition'?'textDocument/definition':'textDocument/completion';
    const params={textDocument:{uri},position:{line:0,character:kind==='name'?source.indexOf("'de'")+3:kind==='parameter'?source.indexOf("['i'")+3:source.indexOf("'demo'")+2}};
    const warm = await request(2,method,params);
    if(kind==='definition')assert.equal(warm[0]?.uri,declarationUri);else assert.deepEqual((Array.isArray(warm)?warm:warm.items).map(item=>item.label),[kind==='name'?'demo':'id']);
    await writeFile(gate,'block');
    send({jsonrpc:'2.0',id:10,method:method,params});
    const deadline=Date.now()+5000;
    while(true){try{await readFile(started);break;}catch{assert.ok(Date.now()<deadline,'Provider did not start');await new Promise(done=>setTimeout(done,10));}}
    assert.equal(messages.some(message=>message.id===10),false);
    const before=messages.length;
    const reopened=kind==='name'?source.replace("'de'","'zz'"):kind==='parameter'?source.replace("['i'","['z'"):source.replace("'demo'","'none'");
    send({jsonrpc:'2.0',method:'textDocument/didClose',params:{textDocument:{uri}}});
    send({jsonrpc:'2.0',method:'textDocument/didOpen',params:{textDocument:{uri,languageId:'php',version:1,text:reopened}}});
    await wait(message=>messages.indexOf(message)>=before&&message.method==='textDocument/publishDiagnostics'&&message.params?.uri===uri&&message.params?.version===1);
    await writeFile(release,'release');
    const old=await wait(message=>message.id===10);
    const fresh=await request(13,method,params);
    assert.deepEqual(old.result,[]); assert.deepEqual(fresh,[]); results.push({phpVersion,indexingMode,kind,oldResult:old.result,freshResult:fresh});
    await request(14,'shutdown',null);
    send({jsonrpc:'2.0',method:'exit',params:null});
  } finally { child?.kill(); await rm(root,{recursive:true,force:true}); }
}
if (reportPath) await writeFile(reportPath,JSON.stringify(results,null,2)+'\n');
console.log(JSON.stringify(results,null,2));
