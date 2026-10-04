import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { mkdtemp, mkdir, writeFile, readFile, rm } from 'node:fs/promises';
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

function lspOffset(source: string, position: { line: number; character: number }): number {
  const lines = source.split('\n');
  return lines.slice(0, position.line).reduce((offset, line) => offset + line.length + 1, 0) + position.character;
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



const variants = (['7.2', '8.5'] as const).flatMap(phpVersion => ['onDemand', 'progressive'].map(indexingMode => ({phpVersion, indexingMode})));
it.each(variants)('completes root imports and withdraws alias candidates at PHP $phpVersion/$indexingMode', verify, 30_000);
async function verify({phpVersion, indexingMode}: typeof variants[number]): Promise<void> {
  const root = await mkdtemp(join(tmpdir(), 'sophp-root-import-lsp-')); let server: ChildProcessWithoutNullStreams | undefined;
  try {
    const rootUri = pathToFileURL(root).toString(), path = join(root, 'Consumer.php'), uri = pathToFileURL(path).toString();
    const original = '<?php namespace Consumer;';
    const catalog = '<?php function rootImportFunction():void{} const ROOT_IMPORT_CONST=1; namespace RootImportNamespace; class Other {} function nsImportFunction():void{} const NS_IMPORT_CONST=2;';
    await writeFile(path, original); await writeFile(join(root, 'Catalog.php'), catalog);
    await mkdir(join(root, 'src')); await writeFile(join(root, 'src', 'RootImportEntity.php'), '<?php class RootImportEntity {}');
    await writeFile(join(root, 'composer.json'), JSON.stringify({autoload:{'psr-4':{'':'src/'},files:['Catalog.php', 'Consumer.php']}}));
    server = spawn(process.execPath, [resolve('../../dist/language-server.js'), '--stdio', '--parser-core-wasm', resolve('../../dist/web-tree-sitter.wasm'), '--php-wasm', resolve('../../dist/tree-sitter-php.wasm')], {stdio:'pipe'});
    const output=messagesFrom(server); let id=1, version=0;
    const request=async(method:string,params:object):Promise<any>=>{
      const requestId=id++;server!.stdin.write(encode({jsonrpc:'2.0',id:requestId,method,params}));
      const response=await output.waitFor(message=>message.id===requestId);expect(response.error).toBeUndefined();return response.result;
    };
    const notify=(method:string,params:object):void=>{server!.stdin.write(encode({jsonrpc:'2.0',method,params}));};
    await request('initialize',{processId:null,rootUri,capabilities:{},initializationOptions:{phpVersion,indexingMode}});notify('initialized',{});
    const observations: object[]=[];
    for(const [tail,label,kind] of [
      ['use RootImportEn§tity;','RootImportEntity',7],['use \\RootImportEn§tity;','RootImportEntity',7],
      ['use stdClass as Existing, RootImportEn§tity;','RootImportEntity',7],
      ['USE RootImportEn§tity;','RootImportEntity',7],
      ['use /* ; 😀 */ RootImportEn§tity;','RootImportEntity',7],
      ['use RootImportName§space;','RootImportNamespace\\',9],
      ['use function rootImportF§unction;','rootImportFunction',3],
      ['use function strlen as Existing, rootImportF§unction;','rootImportFunction',3],
      ['USE CONST PHP_VERSION AS Existing, ROOT_IMPORT_C§ONST;','ROOT_IMPORT_CONST',21],
      ['use const /* ; */ ROOT_IMPORT_C§ONST;','ROOT_IMPORT_CONST',21],
      ['use RootImportEntity as rootImportF§;','',0],
      ['use RootImportEntity as ROOT_IMPORT_C§;','',0],
      ['use RootImportEntity as pub§;','',0],
      ['use function rootImportFunction as rootImportF§;','',0],
      ['use const ROOT_IMPORT_CONST as ROOT_IMPORT_C§;','',0],
      ['use stdClass as Existing, RootImportEntity as rootImportF§;','',0],
      ['use RootImportEn§tity;','RootImportEntity',7],
      ['use Shm§op;',phpVersion==='8.5'?'Shmop':'',7],
      ['use \\Shm§op;',phpVersion==='8.5'?'Shmop':'',7],
      ['use RootImportNamespace\\{Oth§er};','Other',7],
      ['use RootImportNamespace\\{/* { ; 😀 } */ Oth§er};','Other',7],
      ['use RootImportNamespace\\{function /* { ; */ nsImportF§unction};','nsImportFunction',3],
      ['use RootImportNamespace\\{const /* { ; */ NS_IMPORT_C§ONST};','NS_IMPORT_CONST',21],
      ['use RootImportEntity, stdCl§ass;','stdClass',7],
    ] as const){
      const marked='<?php namespace Consumer; '+tail,source=marked.replace('§',''),offset=marked.indexOf('§');version++;
      notify(version===1?'textDocument/didOpen':'textDocument/didChange',version===1
        ?{textDocument:{uri,languageId:'php',version,text:source}}
        :{textDocument:{uri,version},contentChanges:[{text:source}]});
      await output.waitFor(message=>message.method==='textDocument/publishDiagnostics'&&message.params?.uri===uri&&message.params?.version===version);
      const result=await request('textDocument/completion',{textDocument:{uri},position:lspPosition(source,offset)});
      const items=(Array.isArray(result)?result:result?.items??[]) as Array<{label:string;kind:number;detail?:string;textEdit?:{newText:string;range:{start:{line:number;character:number};end:{line:number;character:number}}};insertText?:string;additionalTextEdits?:unknown[]}>;
      observations.push({marked,items});
      console.log('Root import state: '+JSON.stringify({phpVersion,indexingMode,marked,items}));
      if(!label){expect(items,marked).toEqual([]);continue;}
      const item=items.find(value=>value.label===label);expect(item,marked).toBeDefined();expect(item!.kind).toBe(kind);
      expect(item!.textEdit,marked).toBeDefined();
      expect(item!.additionalTextEdits).toBeUndefined();
      if(!tail.includes('{'))expect(item!.textEdit?.newText??item!.insertText).toBe(label);
      expect(items.every(value=>value.kind===kind||value.kind===9),marked).toBe(true);
      const start=offset-(/[A-Za-z0-9_]*$/u.exec(source.slice(0,offset))?.[0].length??0);
      const end=offset+(/^[A-Za-z0-9_]*/u.exec(source.slice(offset))?.[0].length??0);
      const accepted=item!.textEdit
        ?source.slice(0,lspOffset(source,item!.textEdit.range.start))+item!.textEdit.newText+source.slice(lspOffset(source,item!.textEdit.range.end))
        :source.slice(0,start)+item!.insertText+source.slice(end);
      expect(accepted,marked).toBe(source.slice(0,start)+label+source.slice(end));
    }
    expect(await readFile(path,'utf8')).toBe(original);await request('shutdown',{});notify('exit',{});
    console.log('Root import protocol proof: '+JSON.stringify({phpVersion,indexingMode,observations,diskUnchanged:true}));
  } finally {server?.kill();await rm(root,{recursive:true,force:true});}
}
