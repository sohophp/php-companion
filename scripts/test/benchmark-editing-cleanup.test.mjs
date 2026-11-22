import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {mkdtemp,readFile,rm,access,readdir} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {fileURLToPath,URL} from 'node:url';
import process from 'node:process';
import {clearTimeout,setTimeout} from 'node:timers';
import {setTimeout as delay} from 'node:timers/promises';
import {test} from 'node:test';

async function processInfo(pid) {
  try {
    const text=await readFile(`/proc/${pid}/stat`,'utf8');
    const fields=text.slice(text.lastIndexOf(') ')+2).split(' ');
    return {state:fields[0],startTicks:fields[19],command:(await readFile(`/proc/${pid}/cmdline`,'utf8')).split('\0')};
  } catch(error) {if(error.code==='ENOENT'||error.code==='ESRCH')return undefined;throw error;}
}

test('reaps its suspended real server after the original protocol timeout', {
  skip:process.platform!=='linux',timeout:20_000,
},async()=>{
  const workspace=fileURLToPath(new URL('../../',import.meta.url));
  const serverEntry=join(workspace,'dist/language-server.js');
  const assets=['web-tree-sitter.wasm','tree-sitter-php.wasm'].map(name=>join(workspace,'dist',name));
  for(const path of [serverEntry,...assets])await access(path);
  const directory=await mkdtemp(join(tmpdir(),'sophp-benchmark-cleanup-test-'));
  const benchmark=spawn(process.execPath,[join(workspace,'scripts/benchmark-editing.mjs'),'100','0',serverEntry,...assets],{
    cwd:workspace,stdio:['ignore','pipe','pipe'],
    env:{...process.env,TMPDIR:directory,SOPHP_BENCHMARK_INDEXING_MODE:'onDemand',
      SOPHP_BENCHMARK_FIXTURE_LAYOUT:'psr4',SOPHP_BENCHMARK_PHP_VERSION:'8.5'},
  });
  const exited=once(benchmark,'exit');let stderr='',owned,timer;
  benchmark.stderr.on('data',chunk=>stderr+=chunk.toString());
  try {
    const deadline=Date.now()+5000;
    while(!owned&&Date.now()<deadline) {
      const children=(await readFile(`/proc/${benchmark.pid}/task/${benchmark.pid}/children`,'utf8')).trim().split(/\s+/).filter(Boolean);
      for(const text of children) {
        const pid=Number(text),info=await processInfo(pid);
        if(info?.command.includes(serverEntry)){owned={pid,...info};break;}
      }
      if(!owned)await delay(5);
    }
    assert.ok(owned,'Require the actual benchmark-owned language server');
    process.kill(owned.pid,'SIGSTOP');
    const [code,signal]=await Promise.race([exited,new Promise((_,reject)=>{
      timer=setTimeout(()=>reject(new Error('Benchmark retained its suspended child after protocol timeout')),15_000);
    })]);
    clearTimeout(timer);assert.equal(code,1);assert.equal(signal,null);
    assert.match(stderr,/Timed out waiting for language server response/);
    const current=await processInfo(owned.pid);
    assert.ok(!current||current.startTicks!==owned.startTicks,'The benchmark must reap its child without test rescue');
    assert.deepEqual(await readdir(directory),[],'Delete the benchmark project only after its child exits');
  } finally {
    clearTimeout(timer);
    if(owned){const current=await processInfo(owned.pid);if(current&&current.startTicks===owned.startTicks)process.kill(owned.pid,'SIGKILL');}
    if(benchmark.exitCode===null&&benchmark.signalCode===null){benchmark.kill('SIGKILL');await exited;}
    await rm(directory,{recursive:true,force:true});
  }
});
