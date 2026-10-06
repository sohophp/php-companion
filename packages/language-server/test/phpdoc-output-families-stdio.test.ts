import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { once } from 'node:events';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
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



const families = [
 {name: 'class input constructor', declaration: '/** @template T of object */class Maker{/** @param class-string<T> $class\n * @param-out T $value */function __construct(string $class,&$value){}}', call: 'new \\App\\Maker(\\App\\Row::class,$v);'},
 {name: 'inherited constructor', declaration: '/** @template T */class Base{/** @param-out T $value */function __construct(&$value){}}/** @extends Base<Row> */class Maker extends Base{}', call: 'new \\App\\Maker($v);'},
 {name: 'trait constructor', declaration: '/** @template T */trait Build{/** @param-out T $value */function __construct(&$value){}}class Maker{/** @use Build<Row> */use Build;}', call: 'new \\App\\Maker($v);'},
 {name: 'conditional true', declaration: '/** @param-out ($mode is true ? Row : int) $value */function make(bool $mode,&$value){}', call: '\\App\\make(true,$v);'},
 {name: 'conditional default', declaration: '/** @param-out ($mode is true ? Row : int) $value */function make(&$value,bool $mode=true){}', call: '\\App\\make($v);'},
 {name: 'variadic named', declaration: '/** @param-out Row $values */function make(&...$values){}', call: '\\App\\make(first:$first,result:$v);'},
 {name: 'variadic generic', declaration: '/** @template T of object\n * @param class-string<T> $class\n * @param-out T $values */function make(string $class,&...$values){}', call: '\\App\\make(\\App\\Row::class,$first,$v);'},
 {name: 'callback constructor', declaration: 'class Maker{/** @template T of object\n * @param callable():T $factory\n * @param-out T $value */function __construct(callable $factory,&$value){}}', call: 'new \\App\\Maker(function():\\App\\Row{return new \\App\\Row();},$v);'},
];
const scenarios = (['onDemand','progressive'] as const).flatMap(indexingMode =>
 (['hover','completion','definition'] as const).flatMap(method =>
 families.flatMap(family => (family.name === 'inherited constructor' || family.name === 'variadic generic' ? ['7.2','8.5'] : ['8.5'])
  .map(phpVersion => ({...family,indexingMode,method,phpVersion})))));
it.each(scenarios)('first $name output query $method / $indexingMode / PHP $phpVersion', async ({declaration,call,indexingMode,method,phpVersion}) => {
 const root=await mkdtemp(join(tmpdir(),'sophp-output-families-'));let active:ChildProcessWithoutNullStreams|undefined;
 try {
  await mkdir(join(root,'src'));
  const row='<?php namespace App;class Row{public function name():string{return "row";}}';
  const definitions='<?php namespace App;'+declaration;
  const caller='<?php namespace Client;function run(){'+call+'$v->name();}';
  await writeFile(join(root,'src','Row.php'),row);
  await writeFile(join(root,'src','Definitions.php'),definitions);
  await writeFile(join(root,'Caller.php'),caller);
  await writeFile(join(root,'composer.json'),JSON.stringify({autoload:{'psr-4':{'App\\':'src/'},files:['src/Definitions.php']}}));
  const uri=pathToFileURL(join(root,'Caller.php')).toString();
  active=spawn(process.execPath,[resolve('dist/server.js'),'--stdio'],{stdio:'pipe'});
  const {request,notify}=client(active);
  await request('initialize',{processId:null,rootUri:pathToFileURL(root).toString(),capabilities:{},initializationOptions:{phpVersion,indexingMode,cacheDirectory:join(root,'.cache')}});
  notify('initialized',{});notify('textDocument/didOpen',{textDocument:{uri,languageId:'php',version:1,text:caller}});
  const offset=method==='hover'?caller.lastIndexOf('$v')+1:caller.indexOf('->name')+(method==='definition'?3:6);
  const first=await request('textDocument/'+method,{textDocument:{uri},position:position(caller,offset)});
  if(method==='hover')expect(first?.contents?.value).toContain('Row');
  else if(method==='completion')expect((Array.isArray(first)?first:first?.items)?.map((item:any)=>item.label)).toEqual(['name']);
  else expect(first).toEqual([{uri:pathToFileURL(join(root,'src','Row.php')).toString(),range:{start:position(row,row.indexOf('function name')+9),end:position(row,row.indexOf('function name')+13)}}]);
  const changed=caller.replace('$v->name();','unknown($v);$v->name();');
  notify('textDocument/didChange',{textDocument:{uri,version:2},contentChanges:[{text:changed}]});
  const withdrawn=await request('textDocument/completion',{textDocument:{uri},position:position(changed,changed.indexOf('->name')+6)});
  expect((Array.isArray(withdrawn)?withdrawn:withdrawn?.items)?.map((item:any)=>item.label)).toEqual([]);
  notify('textDocument/didChange',{textDocument:{uri,version:3},contentChanges:[{text:caller}]});
  expect(await request('textDocument/'+method,{textDocument:{uri},position:position(caller,offset)})).toEqual(first);
  await request('shutdown',null);const exited=once(active,'exit');notify('exit',null);await exited;active=undefined;
  expect(await readFile(join(root,'src','Definitions.php'),'utf8')).toBe(definitions);
 }finally{if(active){const exited=once(active,'exit');active.kill();await exited;}await rm(root,{recursive:true,force:true});}
},40_000);
