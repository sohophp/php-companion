import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { resolve } from 'node:path';
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



it.each(['7.2', '8.5'] as const)('uses current control flow in variable completion and resolved detail at PHP %s', async phpVersion => {
  const server = spawn(process.execPath, [resolve('dist/server.js'), '--stdio'], { stdio: 'pipe' });
  try {
    const uri='file:///FlowCompletion.php',output=messagesFrom(server);let id=0,version=0;
    const request=async(method:string,params:object|null):Promise<any>=>{const requestId=++id;server.stdin.write(encode({jsonrpc:'2.0',id:requestId,method,params}));const response=await output.waitFor(m=>m.id===requestId);expect(response.error).toBeUndefined();return response.result;};
    await request('initialize',{processId:null,rootUri:null,capabilities:{},initializationOptions:{phpVersion}});
    const query=async(marked:string):Promise<any[]>=>{
      const source=marked.replace('§',''),offset=marked.indexOf('§');version++;
      server.stdin.write(encode({jsonrpc:'2.0',method:version===1?'textDocument/didOpen':'textDocument/didChange',params:version===1?{textDocument:{uri,languageId:'php',version,text:source}}:{textDocument:{uri,version},contentChanges:[{text:source}]}}));
      const result=await request('textDocument/completion',{textDocument:{uri},position:lspPosition(source,offset)});
      return(Array.isArray(result)?result:result.items).sort((a:any,b:any)=>a.sortText<b.sortText?-1:a.sortText>b.sortText?1:0);
    };
    const header='<?php function send(string $value):void{} ';
    const cases:Array<[string,string,string|undefined]>=[
      [header+'function run(?string $offerA,string $offerZ){if($offerA!==null){send($offer§);}}','$offerA','$offerA: string'],
      [header+'function run(?string $offerA,string $offerZ){if($offerA===null)return;send($offer§);}','$offerA','$offerA: string'],
      [header+'function run($offerA,string $offerZ){if(is_string($offerA)){send($offer§);}}','$offerA','$offerA: string'],
      [header+'/** @param mixed $offerA */ function run($offerA,string $offerZ){if(is_string($offerA)){send($offer§);}}','$offerA','$offerA: string'],
      ['<?php function send(bool $value):void{} function run(bool $offerA,int $offerZ){if($offerA===true){send($offer§);}}','$offerA','$offerA: true'],
      ['<?php class Good{} class Other{} function send(Good $value):void{} /** @param Good|Other $offerA */ function run($offerA,Other $offerZ){if($offerA instanceof Good){send($offer§);}}','$offerA','$offerA: Good'],
      [header+'function run(?string $offerA,string $offerZ){if($offerA!==null){$offerA=null;send($offer§);}}','$offerZ','$offerA: null'],
      [header+'function run(?string $offerA,string $offerZ){if(is_string($offerA)){unknown($offerA);send($offer§);}}','$offerZ',undefined],
      [header+'function mutate(&$value):void{} function run(?string $offerA,string $offerZ){if($offerA!==null){mutate($offerA);send($offer§);}}','$offerZ',undefined],
      [header+'function run(?string $offerA,string $offerZ){if($offerA!==null){}send($offer§);}','$offerZ','$offerA: null|string'],
      ['<?php namespace Business; function is_string($value):bool{return true;} namespace App; use function Business\\is_string; function send(string $value):void{} function run(?string $offerA,string $offerZ){if(is_string($offerA)){send($offer§);}}','$offerZ','$offerA: null|string'],
    ];
    for(const [marked,first,detail]of cases){
      const items=await query(marked);expect(items[0]?.label).toBe(first);
      const target=items.find(item=>item.label==='$offerA');expect(target).toBeDefined();
      expect((await request('completionItem/resolve',target)).detail).toBe(detail);
      const source=marked.replace('§',''),offset=marked.indexOf('§');expect(target.textEdit).toEqual({newText:'$offerA',range:{start:lspPosition(source,offset-6),end:lspPosition(source,offset)}});
    }
    const guarded=cases[0]![0],unguarded=guarded.replace('if($offerA!==null)','if(true)');
    const current=await query(guarded),resolved=await request('completionItem/resolve',current[0]);
    expect((await query(unguarded))[0]?.label).toBe('$offerZ');expect((await request('completionItem/resolve',resolved)).detail).toBeUndefined();
    expect((await query(guarded))[0]?.label).toBe('$offerA');
    await request('shutdown',null);server.stdin.write(encode({jsonrpc:'2.0',method:'exit'}));
  }finally{server.kill();}
},60_000);
