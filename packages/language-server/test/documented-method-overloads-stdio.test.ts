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

const scenarios = (['onDemand', 'progressive'] as const).flatMap(indexingMode => [false, true].map(staticMethod => ({indexingMode, staticMethod})));
it.each(scenarios)('keeps documented overload queries coherent static=$staticMethod in $indexingMode', async ({indexingMode, staticMethod}) => {
  const root = await mkdtemp(join(tmpdir(), 'sophp-documented-overloads-'));
  let server: ChildProcessWithoutNullStreams | undefined;
  try {
    const intResult = '<?php namespace App;class IntResult{function intOnly(){}function common(){}}';
    const floatResult = '<?php namespace App;class FloatResult{function floatOnly(){}function common(){}}';
    const factory = '<?php namespace App;/** @method '+(staticMethod?'static ':'')+'IntResult pick(int $value)\n * @method '
      +(staticMethod?'static ':'')+'FloatResult pick(float $value) */class Factory{}';
    await mkdir(join(root,'src'));
    for (const [name,text] of [['IntResult.php',intResult],['FloatResult.php',floatResult],['Factory.php',factory]] as const) await writeFile(join(root,'src',name),text);
    await writeFile(join(root,'composer.json'),JSON.stringify({autoload:{'psr-4':{'App\\':'src/'}}}));
    const uri=pathToFileURL(join(root,'Consumer.php')).toString();
    const source=(input:string):string=>'<?php use App\\Factory;function run(Factory $factory,int|float $argument){$v='
      +(staticMethod?'Factory::pick(':'$factory->pick(')+input+');$v->common();}';
    const original=source('42');await writeFile(join(root,'Consumer.php'),original);
    for(let launch=0;launch<2;launch++){
      server=spawn(process.execPath,[resolve('dist/server.js'),'--stdio'],{stdio:'pipe'});
      const {request,notify}=client(server);
      await request('initialize',{processId:null,rootUri:pathToFileURL(root).toString(),capabilities:{},
        initializationOptions:{phpVersion:'8.5',indexingMode,cacheDirectory:join(root,'.cache')}});notify('initialized',{});
      const stages=launch===0?[
        {input:'42',members:['common','intOnly'],owners:['IntResult']},
        {input:'42.',members:['common','floatOnly'],owners:['FloatResult']},
        {input:"'bad'",members:[],owners:[]},
        {input:'$argument',members:['common'],owners:['FloatResult','IntResult']},
        {input:'42',members:['common','intOnly'],owners:['IntResult']},
      ]:[{input:'42',members:['common','intOnly'],owners:['IntResult']}];
      for(const[index,stage]of stages.entries()){
        const text=source(stage.input),version=index+1;
        if(index===0)notify('textDocument/didOpen',{textDocument:{uri,languageId:'php',version,text}});
        else notify('textDocument/didChange',{textDocument:{uri,version},contentChanges:[{text}]});
        const access=text.lastIndexOf('->')+2;
        // Completion is the first query: no indexing barrier or provider prewarm.
        const result=await request('textDocument/completion',{textDocument:{uri},position:position(text,access)});
        expect((Array.isArray(result)?result:result?.items)?.map((item:any)=>item.label).sort()).toEqual(stage.members);
        const hover=await request('textDocument/hover',{textDocument:{uri},position:position(text,text.lastIndexOf('$v')+1)});
        for(const owner of stage.owners)expect(hover?.contents?.value).toContain('App\\'+owner);
        for(const owner of ['IntResult','FloatResult'].filter(name=>!stage.owners.includes(name)))expect(hover?.contents?.value??'').not.toContain('App\\'+owner);
        const definition=await request('textDocument/definition',{textDocument:{uri},position:position(text,access+2)});
        const expected=stage.owners.map(owner=>{
          const declaration=owner==='IntResult'?intResult:floatResult,start=declaration.indexOf('common');
          return{uri:pathToFileURL(join(root,'src',owner+'.php')).toString(),range:{start:position(declaration,start),end:position(declaration,start+6)}};
        });
        expect((definition??[]).sort((a:any,b:any)=>a.uri.localeCompare(b.uri))).toEqual(expected.sort((a,b)=>a.uri.localeCompare(b.uri)));
        if(stage.owners.length){
          const help=await request('textDocument/signatureHelp',{textDocument:{uri},position:position(text,text.indexOf('pick(')+5+stage.input.length)});
          expect(help?.signatures?.length).toBe(stage.owners.length);
          for(const owner of stage.owners)expect(help?.signatures?.some((signature:any)=>signature.label.endsWith(': '+owner)),JSON.stringify(help)).toBe(true);
        }
      }
      await request('shutdown',null);const exited=once(server,'exit');notify('exit',null);await exited;server=undefined;
    }
    expect(await readFile(join(root,'Consumer.php'),'utf8')).toBe(original);
    expect(await readFile(join(root,'src','Factory.php'),'utf8')).toBe(factory);
  }finally{
    if(server){const exited=once(server,'exit');server.kill();await exited;}
    await rm(root,{recursive:true,force:true});
  }
},40_000);

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
