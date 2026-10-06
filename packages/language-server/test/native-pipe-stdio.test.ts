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

const scenarios = (['onDemand', 'progressive'] as const).flatMap(indexingMode =>
  (['function', 'static', 'instance', 'arrow', 'closure'] as const).map(form => ({ indexingMode, form })));
it.each(scenarios)('refreshes native pipe $form results in $indexingMode mode', async ({indexingMode, form}) => {
  const root = await mkdtemp(join(tmpdir(), 'sophp-native-pipe-'));
  let server: ChildProcessWithoutNullStreams | undefined;
  try {
    const row = '<?php namespace App;class Row{function rowOnly():string{return "row";}}';
    await mkdir(join(root, 'src'));
    await writeFile(join(root, 'src', 'Row.php'), row);
    await writeFile(join(root, 'composer.json'), JSON.stringify({autoload:{'psr-4':{'App\\':'src/'}}}));
    const uri = pathToFileURL(join(root, 'Consumer.php')).toString();
    const source = (native: string, input: string, strict = false): string => {
      const body = `(${native} $mode):Row{return new Row();}`;
      const defs = form === 'function' ? `function make${body}` : form === 'static'
        ? `class Factory{static function make${body}}` : form === 'instance' ? `class Factory{function make${body}}` : '';
      const callback = form === 'function' ? 'make(...)' : form === 'static' ? 'Factory::make(...)'
        : form === 'instance' ? '$factory->make(...)' : form === 'arrow' ? `(fn(${native} $mode):Row=>new Row())` : `(function${body})`;
      return '<?php ' + (strict ? 'declare(strict_types=1);' : '') + `use App\\Row;${defs}function run(){`
        + (form === 'instance' ? '$factory=new Factory();' : '') + `$input=${input};$v=$input |> ${callback};$v->rowOnly();}`;
    };
    const original = source('int', "'42'");
    await writeFile(join(root, 'Consumer.php'), original);
    for (let launch = 0; launch < 2; launch++) {
      server = spawn(process.execPath, [resolve('dist/server.js'), '--stdio'], {stdio:'pipe'});
      const { request, notify } = client(server);
      await request('initialize', {processId:null,rootUri:pathToFileURL(root).toString(),capabilities:{},
        initializationOptions:{phpVersion:'8.5',indexingMode,cacheDirectory:join(root,'.cache')}});
      notify('initialized', {});
      const stages = launch === 0 ? [
        {text:original,accepted:true},
        {text:source('int',"'wrong'"),accepted:false},
        {text:source('int','42.',true),accepted:false},
        {text:source('float','42.',true),accepted:true},
        {text:original,accepted:true},
      ] : [{text:original,accepted:true}];
      for (const [index,stage] of stages.entries()) {
        const version=index+1;
        if (index===0) notify('textDocument/didOpen',{textDocument:{uri,languageId:'php',version,text:stage.text}});
        else notify('textDocument/didChange',{textDocument:{uri,version},contentChanges:[{text:stage.text}]});
        // The first request is completion; no readiness or semantic prewarm.
        const result = await request('textDocument/completion',{textDocument:{uri},position:position(stage.text,stage.text.indexOf('->rowOnly')+2)});
        expect((Array.isArray(result)?result:result?.items)?.map((item:any)=>item.label)).toEqual(stage.accepted?['rowOnly']:[]);
        const hover = await request('textDocument/hover',{textDocument:{uri},position:position(stage.text,stage.text.lastIndexOf('$v')+1)});
        if (stage.accepted) {
          expect(hover?.contents?.value).toContain('App\\Row');
          const definition = await request('textDocument/definition',{textDocument:{uri},position:position(stage.text,stage.text.indexOf('->rowOnly')+4)});
          const start=row.indexOf('rowOnly');
          expect(definition).toEqual([{uri:pathToFileURL(join(root,'src','Row.php')).toString(),
            range:{start:position(row,start),end:position(row,start+7)}}]);
        } else expect(hover?.contents?.value??'').not.toContain('App\\Row');
      }
      await request('shutdown',null);const exited=once(server,'exit');notify('exit',null);await exited;server=undefined;
    }
    expect(await readFile(join(root,'Consumer.php'),'utf8')).toBe(original);
  } finally {
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
