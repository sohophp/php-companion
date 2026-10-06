import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { once } from 'node:events';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { expect, it } from 'vitest';
import { encodeLspMessage, LspMessageDecoder } from '../../testkit/src/index.js';

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




const scenarios = (['onDemand', 'progressive'] as const).flatMap(indexingMode =>
  (['7.4', '8.5'] as const).map(phpVersion => ({indexingMode, phpVersion})));
it.each(scenarios)('refreshes native return/property diagnostics $indexingMode PHP $phpVersion', async ({indexingMode, phpVersion}) => {
  const root = await mkdtemp(join(tmpdir(), 'sophp-native-boundary-diagnostics-'));
  let server: ChildProcessWithoutNullStreams | undefined;
  try {
    await writeFile(join(root, 'composer.json'), JSON.stringify({autoload:{'psr-4':{'App\\':'./'}}}));
    const uri = pathToFileURL(join(root, 'Consumer.php')).toString();
    const source = (native: string, input: string, strict = false): string => '<?php '
      + (strict ? 'declare(strict_types=1);' : '')
      + `class Holder{public ${native} $mode;}function make():${native}{return ${input};}`
      + `function run(Holder $holder){$holder->mode=${input};}`;
    const original = source('int', "'wrong'"); await writeFile(join(root, 'Consumer.php'), original);
    server = spawn(process.execPath, [resolve('dist/server.js'), '--stdio'], {stdio:'pipe'});
    const {request, notify, wait} = client(server);
    await request('initialize', {processId:null,rootUri:pathToFileURL(root).toString(),capabilities:{},
      initializationOptions:{phpVersion,indexingMode,versionedDiagnostics:true}});
    notify('initialized', {});
    const stages = [
      {text:original,count:2,float:false},
      {text:source('string', "'wrong'"),count:0,float:false},
      {text:source('int','42.',true),count:2,float:true},
      {text:original,count:2,float:false},
    ];
    for(const [index,stage] of stages.entries()) {
      const version=index+1;
      if(index===0)notify('textDocument/didOpen',{textDocument:{uri,languageId:'php',version,text:stage.text}});
      else notify('textDocument/didChange',{textDocument:{uri,version},contentChanges:[{text:stage.text}]});
      const message=await wait(message=>message.method==='phpCompanion/versionedDiagnostics'
        &&message.params?.uri===uri&&message.params?.version===version);
      const diagnostics=message.params.diagnostics.filter((item:any)=>
        ['php.return.type-mismatch','php.assignment.type-mismatch'].includes(item.code));
      expect(diagnostics, JSON.stringify(message.params)).toHaveLength(stage.count);
      if(stage.count)expect(diagnostics.map((item:any)=>item.code).sort()).toEqual([
        'php.assignment.type-mismatch','php.return.type-mismatch']);
      if(stage.float)for(const item of diagnostics)expect(item.message).toContain('float');
    }
    await request('shutdown',null);const exited=once(server,'exit');notify('exit',null);await exited;server=undefined;
    expect(await readFile(join(root,'Consumer.php'),'utf8')).toBe(original);
  } finally {
    if(server){const exited=once(server,'exit');server.kill();await exited;}
    await rm(root,{recursive:true,force:true});
  }
},40_000);
