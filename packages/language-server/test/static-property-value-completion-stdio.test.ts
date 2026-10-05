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


it.each(['7.2', '8.5'].flatMap(phpVersion => ['onDemand', 'progressive'].map(indexingMode => ({phpVersion,indexingMode}))))(
  'refreshes static array property keys through $indexingMode stdio at PHP $phpVersion', async ({phpVersion,indexingMode}) => {
    const root = await mkdtemp(join(tmpdir(), 'sophp-static-property-lsp-')); let server: ChildProcessWithoutNullStreams | undefined;
    try {
      const path = join(root, 'Consumer.php'), uri = pathToFileURL(path).toString(), original = '<?php';
      await writeFile(path, original);
      await mkdir(join(root,'src'));
      const ownerPath=join(root,'src','Config.php'), ownerUri=pathToFileURL(ownerPath).toString();
      const ownerSource='<?php namespace External; class Config extends Base {}';
      await writeFile(join(root,'src','Base.php'),'<?php namespace External; class Base {/** @var array{mode:string} */ public static $options;}');
      await writeFile(ownerPath,ownerSource);
      await writeFile(join(root, 'composer.json'), JSON.stringify({autoload:{files:['Consumer.php'],'psr-4':{'External\\':'src/'}}}));
      server = spawn(process.execPath, [resolve('../../dist/language-server.js'), '--stdio', '--parser-core-wasm',
        resolve('../../dist/web-tree-sitter.wasm'), '--php-wasm', resolve('../../dist/tree-sitter-php.wasm')], {stdio:'pipe'});
      const output = messagesFrom(server); let id = 1, version = 0;
      const notify = (method: string, params: object): void => {server!.stdin.write(encode({jsonrpc:'2.0',method,params}));};
      const request = async (method: string, params: object): Promise<any> => {
        const requestId=id++; server!.stdin.write(encode({jsonrpc:'2.0',id:requestId,method,params}));
        const response=await output.waitFor(message=>message.id===requestId); expect(response.error).toBeUndefined(); return response.result;
      };
      await request('initialize', {processId:null, capabilities:{textDocument:{completion:{completionItem:{snippetSupport:true}}}},
        rootUri:pathToFileURL(root).toString(),initializationOptions:{phpVersion,indexingMode}}); notify('initialized',{});
      const check = async (marked: string, labels: string[], replacement?: string): Promise<void> => {
        const source=marked.replace('§',''), offset=marked.indexOf('§'); version++;
        notify(version===1?'textDocument/didOpen':'textDocument/didChange',version===1
          ? {textDocument:{uri,languageId:'php',version,text:source}}
          : {textDocument:{uri,version},contentChanges:[{text:source}]});
        await output.waitFor(message=>message.method==='textDocument/publishDiagnostics' && message.params?.uri===uri && message.params?.version===version);
        const result=await request('textDocument/completion',{textDocument:{uri},position:lspPosition(source,offset)});
        const items=Array.isArray(result)?result:result?.items??[];
        expect(items.map((item:any)=>item.label)).toEqual(labels);
        if(replacement){
          const edit=items[0].textEdit; expect(edit.newText).toBe(replacement);
          const begin=source.lastIndexOf('[',offset)+1, end=offset+(source[offset]==="'"?1:0);
          expect(edit.range).toEqual({start:lspPosition(source,begin),end:lspPosition(source,end)});
        }
      };
      await check("<?php function read(){External\\Config::$options['mo§'];}",['mode'],"'mode'");
      await check("<?php function read(){External\\Config::$options['mo§",['mode'],"'mode'");
      await check("<?php class Child extends External\\Base {function read(){parent::$options['mo§'];}}",['mode'],"'mode'");
      const property='/** @var array{mode:string,payload:array{trace:string}} */ public static $options;';
      for(const expression of ['Config::$options', '(Config::$options)', 'Child::$options']) {
        for(const closed of [false,true]) {
          const marked=`<?php class Config {${property}} class Child extends Config {} function read(){${expression}['mo§${closed?"'];}":''}`;
          await check(marked,['mode'],"'mode'");
        }
      }
      await check(`<?php class Config {${property}} function read(){Config::$options['payload']['tr§'];}`,['trace'],"'trace'");
      await check(`<?php class Config {${property}} function read(){ $data=Config::$options; $data['mo§'];}`,['mode'],"'mode'");
      for(const key of ['mode','other','mode'])
        await check(`<?php class Config {/** @var array{${key}:string} */ public static $options;} function read(){Config::$options['mo§'];}`,key==='mode'?['mode']:[],key==='mode'?"'mode'":undefined);
      for(const declaration of [
        '/** @var array{mode:string} */ private static $options;',
        '/** @var array{mode:string} */ public $options;',
        '/** @var array{mode:string}|array */ public static $options;',
      ]) await check(`<?php class Config {${declaration}} function read(){Config::$options['mo§'];}`,[]);
      let ownerVersion=0;
      for(const key of ['mode','other','mode']) {
        const ownerText=`<?php namespace External; class Config {/** @var array{${key}:string} */ public static $options;}`; ownerVersion++;
        notify(ownerVersion===1?'textDocument/didOpen':'textDocument/didChange',ownerVersion===1
          ? {textDocument:{uri:ownerUri,languageId:'php',version:ownerVersion,text:ownerText}}
          : {textDocument:{uri:ownerUri,version:ownerVersion},contentChanges:[{text:ownerText}]});
        await output.waitFor(message=>message.method==='textDocument/publishDiagnostics' && message.params?.uri===ownerUri && message.params?.version===ownerVersion);
        await check("<?php function read(){External\\Config::$options['mo§'];}",key==='mode'?['mode']:[],key==='mode'?"'mode'":undefined);
      }
      expect(await readFile(path,'utf8')).toBe(original); expect(await readFile(ownerPath,'utf8')).toBe(ownerSource);
      await request('shutdown',{}); notify('exit',{});
    } finally {server?.kill();await rm(root,{recursive:true,force:true});}
  }, 60_000,
);
