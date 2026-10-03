import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { mkdtemp, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { expect, it } from 'vitest';
function encode(message: object): string {
  const body = JSON.stringify(message);
  return `Content-Length: ${Buffer.byteLength(body)}\r\n\r\n${body}`;
}

function lspPosition(source: string, offset: number): { line: number; character: number } {
  const lines = source.slice(0, offset).split('\n');
  return { line: lines.length - 1, character: lines.at(-1)!.length };
}

function messagesFrom(process: ChildProcessWithoutNullStreams): {
  messages: object[];
  waitFor: (predicate: (message: any) => boolean, timeoutMs?: number) => Promise<any>;
} {
  const messages: object[] = [];
  const waiters: Array<{ predicate: (message: any) => boolean; resolve: (message: any) => void }> = [];
  let buffer = Buffer.alloc(0);
  process.stdout.on('data', (chunk: Buffer) => {
    buffer = Buffer.concat([buffer, chunk]);
    while (true) {
      const headerEnd = buffer.indexOf('\r\n\r\n');
      if (headerEnd < 0) return;
      const match = /Content-Length: (\d+)/i.exec(buffer.subarray(0, headerEnd).toString('ascii'));
      if (!match) throw new Error('Language server emitted an invalid LSP header.');
      const length = Number(match[1]);
      const bodyStart = headerEnd + 4;
      if (buffer.length < bodyStart + length) return;
      const message = JSON.parse(buffer.subarray(bodyStart, bodyStart + length).toString('utf8')) as object;
      buffer = buffer.subarray(bodyStart + length);
      messages.push(message);
      for (const waiter of [...waiters]) {
        if (waiter.predicate(message)) {
          waiters.splice(waiters.indexOf(waiter), 1);
          waiter.resolve(message);
        }
      }
    }
  });
  return {
    messages,
    waitFor: (predicate, timeoutMs = 15_000): Promise<any> => {
      const existing = messages.find(predicate);
      if (existing) return Promise.resolve(existing);
      return new Promise((resolvePromise, reject) => {
        const timer = setTimeout(() => reject(new Error(`Timed out waiting for language server response; logs: ${JSON.stringify(messages.filter((message) => message.method === 'window/logMessage').slice(-12))}; recent messages: ${JSON.stringify(messages.slice(-5))}`)), timeoutMs);
        waiters.push({ predicate, resolve: (message) => { clearTimeout(timer); resolvePromise(message); } });
      });
    },
  };
}


it.each(['7.2','8.5'] as const)('respects magic method modifiers and static edits at PHP %s',async phpVersion=>{
 const root=await mkdtemp(join(tmpdir(),'sophp-magic-declaration-lsp-'));let server:ChildProcessWithoutNullStreams|undefined;
 try {
  const path=join(root,'Magic.php'),uri=pathToFileURL(path).toString(),rootUri=pathToFileURL(root).toString();
  const original='<?php class Current {}';await writeFile(path,original);
  await writeFile(join(root,'composer.json'),JSON.stringify({autoload:{files:['Magic.php']}}));
  server=spawn(process.execPath,[resolve('../../dist/language-server.js'),'--stdio','--parser-core-wasm',resolve('../../dist/web-tree-sitter.wasm'),'--php-wasm',resolve('../../dist/tree-sitter-php.wasm')],{stdio:'pipe'});
  const output=messagesFrom(server);let id=1;
  const request=async(method:string,params:object):Promise<any>=>{
   const requestId=id++;server!.stdin.write(encode({jsonrpc:'2.0',id:requestId,method,params}));
   const response=await output.waitFor(message=>message.id===requestId);expect(response.error).toBeUndefined();return response.result;
  };
  const notify=(method:string,params:object):void=>{server!.stdin.write(encode({jsonrpc:'2.0',method,params}));};
  await request('initialize',{processId:null,capabilities:{},rootUri,initializationOptions:{phpVersion}});notify('initialized',{});
  await output.waitFor(message=>message.method==='window/logMessage'&&message.params?.message?.includes('complete=true'));
  let version=0;
  const cases=[
   ['<?php class Current { public static function // comment\n __§($name,$args){} }',['__callStatic','__set_state']],
   ['<?php class Current { public function /* name\n comment */ __ca§($name,$args){} }',['__call','__callStatic']],
   ['<?php class Current { public static function __§($name,$args){} }',['__callStatic','__set_state']],
   ['<?php class Current { static /* comment */ public function __§($name,$args){} }',['__callStatic','__set_state']],
   ['<?php class Current { public function __§($name,$args){} }',null],
   ['<?php class Current { private function __§(){} }',['__construct','__destruct','__clone']],
   ['<?php class Current { private static function __§(){} }',[]],
   ['<?php class Current { PUBLIC STATIC FUNCTION __§($name,$args){} }',['__callStatic','__set_state']],
   ['<?php class Current { public function /* hé漢 */ __ca§($name,$args){} }',['__call','__callStatic']],
  ] as const;
  for(const [marked,expected] of cases) {
   const source=marked.replace('§',''),offset=marked.indexOf('§');version++;
   notify(version===1?'textDocument/didOpen':'textDocument/didChange',version===1?{textDocument:{uri,languageId:'php',version,text:source}}:{textDocument:{uri,version},contentChanges:[{text:source}]});
   await output.waitFor(message=>message.method==='textDocument/publishDiagnostics'&&message.params?.uri===uri&&message.params?.version===version);
   const result=await request('textDocument/completion',{textDocument:{uri},position:lspPosition(source,offset)});
   const items=Array.isArray(result)?result:result?.items??[];
   const labels=items.map((item:{label:string})=>item.label);
   if(expected) expect(labels).toEqual([...expected]); else expect(labels).toContain('__construct');
   for(const item of items) {
    const needsStatic=['__callStatic','__set_state'].includes(item.label) && !/static.*function/i.test(source.replace(/\/\*.*?\*\//g,''));
    expect(item.additionalTextEdits?.length??0).toBe(needsStatic?1:0);
    if(needsStatic) expect(item.additionalTextEdits[0].newText).toBe('static ');
   }
   for(const item of items) expect(item.textEdit.newText).toBe(item.label);
  }
  const largeSource='<?php class Current {\n'+Array.from({length:1500},(_,index)=>
   `/** comment ${index} ${'documentation '.repeat(8)} */ public const VALUE${index} = ${index};\n`).join('')+'public function __ca($name,$args){} }';
  version++;
  notify('textDocument/didChange',{textDocument:{uri,version},contentChanges:[{text:largeSource}]});
  await output.waitFor(message=>message.method==='textDocument/publishDiagnostics'&&message.params?.uri===uri&&message.params?.version===version);
  const position=lspPosition(largeSource,largeSource.lastIndexOf('__ca')+4),timings:number[]=[];
  let firstQueryMs=0;
  for(let sample=0;sample<25;sample++) {
   const started=performance.now();
   const result=await request('textDocument/completion',{textDocument:{uri},position});
   const elapsed=performance.now()-started;
   const items=Array.isArray(result)?result:result?.items??[];
   expect(items.map((item:{label:string})=>item.label)).toEqual(['__call','__callStatic']);
   expect(items[1].additionalTextEdits[0].newText).toBe('static ');
   if(sample===0) firstQueryMs=elapsed;
   if(sample>=5) timings.push(elapsed);
  }
  const p95Ms=[...timings].sort((a,b)=>a-b)[Math.ceil(timings.length*0.95)-1]!;
  const timing={phpVersion,sourceBytes:Buffer.byteLength(largeSource),comments:1500,warmSamples:timings.length,firstQueryMs,p95Ms,scope:'isolated real stdio, 1500-comment document'};
  if(process.env.PHP_COMPANION_TEST_MAGIC_MODIFIER_TIMING_DIR)
   await writeFile(join(process.env.PHP_COMPANION_TEST_MAGIC_MODIFIER_TIMING_DIR,`magic-modifier-stdio-${phpVersion}.json`),JSON.stringify(timing));
  expect(p95Ms).toBeLessThanOrEqual(150);
  expect(await readFile(path,'utf8')).toBe(original);await request('shutdown',{});notify('exit',{});
 } finally {server?.kill();await rm(root,{recursive:true,force:true});}
},30_000);
