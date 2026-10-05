import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { mkdtemp, writeFile, readFile, rm, mkdir } from 'node:fs/promises';
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


it.each(['7.2','8.5'].flatMap(phpVersion=>['onDemand','progressive'].map(indexingMode=>({phpVersion,indexingMode}))))(
  'loads current array receiver origins at PHP $phpVersion in $indexingMode', async ({phpVersion,indexingMode})=>{
    const root=await mkdtemp(join(tmpdir(),'sophp-array-origin-lsp-')); let server:ChildProcessWithoutNullStreams|undefined;
    try {
      await mkdir(join(root,'src'));
      const uri=pathToFileURL(join(root,'Consumer.php')).toString(); await writeFile(join(root,'Consumer.php'),'<?php');
      const cases=[
        ['static local', '$data=External\\TYPE::$options; $data[\'mo§\'];'],
        ['static alias', '$data=External\\TYPE::$options; $copy=$data; $copy[\'mo§\'];'],
        ['instance property', '$holder=new External\\TYPE(); $holder->options[\'mo§\'];'],
        ['instance local', '$holder=new External\\TYPE(); $data=$holder->options; $data[\'mo§\'];'],
        ['parameter property', '$holder->options[\'mo§\'];'],
        ['static method', 'External\\TYPE::readOptions()[\'mo§\'];'],
        ['static method local', '$data=External\\TYPE::readOptions(); $data[\'mo§\'];'],
        ['instance method', '$holder=new External\\TYPE(); $holder->readItems()[\'mo§\'];'],
        ['instance method local', '$holder=new External\\TYPE(); $data=$holder->readItems(); $data[\'mo§\'];'],
        ['replaced scalar', '$data=External\\TYPE::$options; $data=42; $data[\'mo§\'];'],
        ['unknown mutation', '$data=External\\TYPE::$options; unknown($data); $data[\'mo§\'];'],
        ['by value call', '$data=External\\TYPE::$options; observe($data); $data[\'mo§\'];'],
        ['property exact case', '$holder=new External\\TYPE(); $holder->options[\'mo§\'];'],
        ['property distinct case', '$holder=new External\\TYPE(); $holder->Options[\'up§\'];'],
        ['wrong property case', '$holder=new External\\TYPE(); $holder->OPTIONS[\'mo§\'];'],
        ['wrong local property case', '$holder=new External\\TYPE(); $data=$holder->OPTIONS; $data[\'mo§\'];'],
        ['method case', '$holder=new External\\TYPE(); $holder->READITEMS()[\'mo§\'];'],
        ['static method case', 'External\\TYPE::READOPTIONS()[\'mo§\'];'],
        ['intermediate property case', '$holder=new External\\TYPE(); $holder->inner->options[\'mo§\'];'],
        ['wrong intermediate case', '$holder=new External\\TYPE(); $holder->INNER->options[\'mo§\'];'],
      ];
      for(const [index,[label]] of cases.entries()) {
        const property=(label.startsWith('static') && !label.includes('method') || ['replaced scalar','unknown mutation','by value call'].includes(label))?'static ':'';
        await writeFile(join(root,'src',`Origin${index}.php`),`<?php namespace External; class Origin${index} {/** @var array{mode:string} */ public ${property}$options; /** @var array{upper:string} */ public $Options; /** @var Origin${index} */ public $inner; /** @return array{mode:string} */ public static function readOptions():array{return [];} /** @return array{mode:string} */ public function readItems():array{return [];}}`);
      }
      await writeFile(join(root,'composer.json'),JSON.stringify({autoload:{files:['Consumer.php'],'psr-4':{'External\\':'src/'}}}));
      server=spawn(process.execPath,[resolve('../../dist/language-server.js'),'--stdio','--parser-core-wasm',resolve('../../dist/web-tree-sitter.wasm'),'--php-wasm',resolve('../../dist/tree-sitter-php.wasm')],{stdio:'pipe'});
      const output=messagesFrom(server); let id=1,version=0;
      const notify=(method:string,params:object):void=>{server!.stdin.write(encode({jsonrpc:'2.0',method,params}));};
      const request=async(method:string,params:object):Promise<any>=>{const requestId=id++;server!.stdin.write(encode({jsonrpc:'2.0',id:requestId,method,params}));const response=await output.waitFor(message=>message.id===requestId);expect(response.error).toBeUndefined();return response.result;};
      await request('initialize',{processId:null,capabilities:{},rootUri:pathToFileURL(root).toString(),initializationOptions:{phpVersion,indexingMode}});notify('initialized',{});
      for(const [index,[label,body]] of cases.entries()) {
        const marked=`<?php function observe(array $data):void{} function consume(${label==='parameter property'?`External\\Origin${index} $holder`:''}){${body.replaceAll('TYPE',`Origin${index}`)}}`,source=marked.replace('§','');version++;
        notify(version===1?'textDocument/didOpen':'textDocument/didChange',version===1?{textDocument:{uri,languageId:'php',version,text:source}}:{textDocument:{uri,version},contentChanges:[{text:source}]});
        await output.waitFor(message=>message.method==='textDocument/publishDiagnostics' && message.params?.uri===uri && message.params?.version===version);
        const result=await request('textDocument/completion',{textDocument:{uri},position:lspPosition(source,marked.indexOf('§'))});
        const items=Array.isArray(result)?result:result?.items??[];
        expect(items.map((item:any)=>item.label),label).toEqual(['replaced scalar','unknown mutation'].includes(label) || label.startsWith('wrong ')
          ? [] : [label==='property distinct case'?'upper':'mode']);
      }
      expect(await readFile(join(root,'Consumer.php'),'utf8')).toBe('<?php');await request('shutdown',{});notify('exit',{});
    }finally{server?.kill();await rm(root,{recursive:true,force:true});}
  },60_000,
);
