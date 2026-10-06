import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { once } from 'node:events';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { expect, it } from 'vitest';
import { encodeLspMessage, LspMessageDecoder } from '../../testkit/src/index.js';

function position(source: string, offset: number): { line: number; character: number } {
  const lines = source.slice(0, offset).split('\n');
  return { line: lines.length - 1, character: lines.at(-1)!.length };
}

function client(server: ChildProcessWithoutNullStreams): {
  notify: (method: string, params: unknown) => void;
  request: (method: string, params: unknown) => Promise<any>;
  startRequest: (method: string, params: unknown) => { id: number; result: Promise<any> };
  wait: (predicate: (message: any) => boolean) => Promise<any>;
} {
  const decoder = new LspMessageDecoder(); const messages: any[] = [];
  const waiters: Array<{ predicate: (message: any) => boolean; resolve: (message: any) => void }> = [];
  let sequence = 0;
  server.stdout.on('data', (chunk: Buffer) => {
    for (const raw of decoder.push(chunk)) {
      const message = raw as any;
      if (message.method && message.id !== undefined) {
        server.stdin.write(encodeLspMessage({ jsonrpc: '2.0', id: message.id, result: null }));
        continue;
      }
      messages.push(message);
      for (const waiter of [...waiters]) if (waiter.predicate(message)) {
        waiters.splice(waiters.indexOf(waiter), 1); waiter.resolve(message);
      }
    }
  });
  const wait = (predicate: (message: any) => boolean): Promise<any> => {
    const found = messages.find(predicate); if (found) return Promise.resolve(found);
    return new Promise((resolveResponse, reject) => {
      const waiter = { predicate, resolve: (message: any): void => { clearTimeout(timer); resolveResponse(message); } };
      const timer = setTimeout(() => {
        waiters.splice(waiters.indexOf(waiter), 1);
        reject(new Error(`No LSP response; recent messages: ${JSON.stringify(messages.slice(-5))}`));
      }, 15_000);
      waiters.push(waiter);
    });
  };
  const startRequest = (method: string, params: unknown): { id: number; result: Promise<any> } => {
    const id = ++sequence; const response = wait(message => message.id === id);
    server.stdin.write(encodeLspMessage({ jsonrpc: '2.0', id, method, params }));
    return { id, result: response.then(message => { expect(message.error).toBeUndefined(); return message.result; }) };
  };
  return {
    wait,
    startRequest,
    notify: (method, params): void => { server.stdin.write(encodeLspMessage({ jsonrpc: '2.0', method, params })); },
    request: async (method, params): Promise<any> => {
      return startRequest(method, params).result;
    },
  };
}



const cases=[
 {name:'weak class literal',input:'Row::class',strict:false,known:true,incoming:''},
 {name:'weak integer range',input:'$mode',strict:false,known:true,incoming:'/** @param int<0,10> $mode */'},
 {name:'weak scalar union',input:'$mode',strict:false,known:true,incoming:'/** @param int|string $mode */'},
 {name:'strict scalar mismatch',input:'1',strict:true,known:false,incoming:''},
 {name:'weak object mismatch',input:'new Other()',strict:false,known:false,incoming:''},
 {name:'strict bool true',input:'true',strict:true,known:true,incoming:''},
 {name:'unknown subject',input:'$mode',strict:false,known:false,incoming:''},
];
const scenarios=(['onDemand','progressive'] as const).flatMap(indexingMode=>
 (['7.2','8.5'] as const).flatMap(phpVersion=>(['output','return'] as const).flatMap(flavor=>cases.map(test=>({...test,indexingMode,phpVersion,flavor})))));
it.each(scenarios)('$flavor $name, $indexingMode PHP $phpVersion',async ({input,strict,known,incoming,indexingMode,phpVersion,flavor})=>{
 const root=await mkdtemp(join(tmpdir(),'sophp-native-projection-'));let active:ChildProcessWithoutNullStreams|undefined;
 try{
  const doc=flavor==='output'?'@param-out ($mode is true ? Row : Row) $value':'@return ($mode is true ? Row : Row)';
  const declaration='<?php /** '+doc+' */function make(bool $mode'+(flavor==='output'?',&$value':'')+'){}';
  const call=flavor==='output'?'make('+input+',$v);':'$v=make('+input+');';
  const text='<?php '+(strict?'declare(strict_types=1);':'')+'class Row{function name():string{return "row";}}class Other{}'+incoming+'function run($mode){'+call+'$v->name();}';
  await writeFile(join(root,'functions.php'),declaration);await writeFile(join(root,'Consumer.php'),text);
  await writeFile(join(root,'composer.json'),JSON.stringify({autoload:{files:['functions.php']}}));
  const uri=pathToFileURL(join(root,'Consumer.php')).toString();
  active=spawn(process.execPath,[resolve('dist/server.js'),'--stdio'],{stdio:'pipe'});
  const {request,notify}=client(active);
  await request('initialize',{processId:null,rootUri:pathToFileURL(root).toString(),capabilities:{},initializationOptions:{phpVersion,indexingMode,cacheDirectory:join(root,'.cache')}});
  notify('initialized',{});notify('textDocument/didOpen',{textDocument:{uri,languageId:'php',version:1,text}});
  const result=await request('textDocument/completion',{textDocument:{uri},position:position(text,text.indexOf('->name')+6)});
  expect((Array.isArray(result)?result:result?.items)?.map((item:any)=>item.label)).toEqual(known?['name']:[]);
  const hover=await request('textDocument/hover',{textDocument:{uri},position:position(text,text.lastIndexOf('$v')+1)});
  if(known)expect(hover?.contents?.value).toContain('Row');else expect(hover?.contents?.value??'').not.toContain('Row');
  const replacement=flavor==='output'?'make('+(known?'new Other()':'true')+',$v);':'$v=make('+(known?'new Other()':'true')+');';
  const changed=text.replace(call,replacement);
  expect(changed).not.toBe(text);
  notify('textDocument/didChange',{textDocument:{uri,version:2},contentChanges:[{text:changed}]});
  const switched=await request('textDocument/completion',{textDocument:{uri},position:position(changed,changed.indexOf('->name')+6)});
  expect((Array.isArray(switched)?switched:switched?.items)?.map((item:any)=>item.label)).toEqual(known?[]:['name']);
  const changedHover=await request('textDocument/hover',{textDocument:{uri},position:position(changed,changed.lastIndexOf('$v')+1)});
  if(known)expect(changedHover?.contents?.value??'').not.toContain('Row');else expect(changedHover?.contents?.value).toContain('Row');
  notify('textDocument/didChange',{textDocument:{uri,version:3},contentChanges:[{text}]});
  expect(await request('textDocument/completion',{textDocument:{uri},position:position(text,text.indexOf('->name')+6)})).toEqual(result);
  await request('shutdown',null);const exited=once(active,'exit');notify('exit',null);await exited;active=undefined;
  expect(await readFile(join(root,'functions.php'),'utf8')).toBe(declaration);
  expect(await readFile(join(root,'Consumer.php'),'utf8')).toBe(text);
 }finally{if(active){const exited=once(active,'exit');active.kill();await exited;}await rm(root,{recursive:true,force:true});}
},40000);
