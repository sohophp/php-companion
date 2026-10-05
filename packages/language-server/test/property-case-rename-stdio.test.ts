import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { createHash } from 'node:crypto';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { expect, it } from 'vitest';
import { encodeLspMessage, LspMessageDecoder } from '../../testkit/src/index.js';

it.each(['7.2','8.5'].flatMap(phpVersion=>['onDemand','progressive'].map(indexingMode=>({phpVersion,indexingMode}))))(
  'keeps property Rename case-scoped at $phpVersion in $indexingMode', async ({phpVersion,indexingMode})=>{
  const root=await mkdtemp(join(tmpdir(),'sophp-property-case-'));
  await mkdir(join(root,'src'));
  await writeFile(join(root,'composer.json'),JSON.stringify({autoload:{'psr-4':{'App\\':'src/'}}}));
  const file=join(root,'src','C.php'),disk='<?php namespace App; class C {}';await writeFile(file,disk);
  const uri=pathToFileURL(file).toString();
  const server = spawn(process.execPath, [resolve('dist/server.js'), '--stdio', '--parser-core-wasm',
    resolve('../../dist/web-tree-sitter.wasm'), '--php-wasm', resolve('../../dist/tree-sitter-php.wasm')], { stdio: 'pipe' });
  const decoder = new LspMessageDecoder(), messages: any[] = [];
  const waiters: Array<{ matches: (message: any) => boolean; done: (message: any) => void }> = [];
  let stderr = ''; server.stderr.on('data', chunk => { stderr += chunk; });
  server.stdout.on('data', chunk => {
    for (const message of decoder.push(chunk) as any[]) {
      messages.push(message);
      for (const waiter of [...waiters]) if (waiter.matches(message)) {
        waiters.splice(waiters.indexOf(waiter), 1); waiter.done(message);
      }
    }
  });
  const waitFor = (matches: (message: any) => boolean): Promise<any> => {
    const existing = messages.find(matches); if (existing) return Promise.resolve(existing);
    return new Promise((done, reject) => {
      const waiter = { matches, done: (message: any): void => { clearTimeout(timer); done(message); } };
      const timer = setTimeout(() => { waiters.splice(waiters.indexOf(waiter), 1); reject(new Error(`Rename timed out: ${stderr}`)); }, 15_000);
      waiters.push(waiter);
    });
  };
  let id = 0, version = 0;
  const send = (message: object): void => { server.stdin.write(encodeLspMessage({ jsonrpc: '2.0', ...message })); };
  const request = async (method: string, params: object | null): Promise<any> => {
    const requestId = ++id, response = waitFor(message => message.id === requestId);
    send({ id: requestId, method, params }); const result = await response;
    expect(result.error).toBeUndefined(); return result.result;
  };
  const position = (source: string, offset: number): { line: number; character: number } => {
    const lines = source.slice(0, offset).split('\n'); return { line: lines.length - 1, character: lines.at(-1)!.length };
  };
  const offsetAt = (source: string, pos: { line: number; character: number }): number =>
    source.split('\n').slice(0, pos.line).reduce((count, line) => count + line.length + 1, 0) + pos.character;
  try {
    await request('initialize',{processId:null,rootUri:pathToFileURL(root).toString(),capabilities:{workspace:{workspaceEdit:{documentChanges:true}}},
      initializationOptions:{phpVersion,indexingMode}});send({method:'initialized',params:{}});
    const fixtures=[
      '<?php namespace App; class C {public $options;public $Options;function read(){return $this->options.$this->Options;}}',
      '<?php namespace App; class C {private $options;private $Options;function read(){return $this->options.$this->Options;}}',
      '<?php namespace App; class C {protected $options;protected $Options;function read(){return $this->options.$this->Options;}}',
      '<?php namespace App; class C {public static $options;public static $Options;function read(){return self::$options.self::$Options;}}',
      '<?php namespace App; trait T {public $options;public $Options;function read(){return $this->options.$this->Options;}} class C {use T;} function read(C $c){return $c->options.$c->Options;}',
      ...(phpVersion==='8.5'?['<?php namespace App; class C {function __construct(public $options,public $Options){echo $options.$Options;} function read(){return $this->options.$this->Options;}} new C(options:1,Options:2);']:[]),
    ];
    for(const source of fixtures) {
      version++;send({method:version===1?'textDocument/didOpen':'textDocument/didChange',params:version===1
        ?{textDocument:{uri,languageId:'php',version,text:source}}
        :{textDocument:{uri,version},contentChanges:[{text:source}]}});
      await waitFor(message=>message.method==='textDocument/publishDiagnostics' && message.params?.uri===uri && message.params?.version===version);
      for(const name of ['options','Options']) {
        const params={textDocument:{uri},position:position(source,source.indexOf('$'+name)+2)};
        const expected=[...source.matchAll(new RegExp(`(?<![A-Za-z0-9_])${name}(?![A-Za-z0-9_])`,'g'))]
          .map(match=>({start:match.index!,end:match.index!+name.length}));
        const refs=await request('textDocument/references',{...params,context:{includeDeclaration:true}});
        expect(refs.map((location:any)=>({start:offsetAt(source,location.range.start)+(source[offsetAt(source,location.range.start)]==='$'?1:0),end:offsetAt(source,location.range.end)}))
          .sort((a:any,b:any)=>a.start-b.start)).toEqual(expected);
        expect((await request('textDocument/prepareRename',params))?.placeholder).toBe(name);
        const plan=await request('textDocument/rename',{...params,newName:'settings'});
        expect(plan).not.toBeNull();expect(Object.keys(plan.changes)).toEqual([uri]);
        const edits=plan.changes[uri].map((edit:any)=>({start:offsetAt(source,edit.range.start),end:offsetAt(source,edit.range.end),newText:edit.newText}));
        expect(edits.map(({start,end}:any)=>({start,end})).sort((a:any,b:any)=>a.start-b.start)).toEqual(expected);
        const actual=edits.sort((a:any,b:any)=>b.start-a.start).reduce((text:string,edit:any)=>text.slice(0,edit.start)+edit.newText+text.slice(edit.end),source);
        expect(actual).toBe(expected.slice().sort((a,b)=>b.start-a.start).reduce((text,edit)=>text.slice(0,edit.start)+'settings'+text.slice(edit.end),source));
        expect(plan.phpCompanion.sourceHashes[uri]).toBe(createHash('sha256').update(source).digest('hex'));
        expect(await request('textDocument/rename',{...params,newName:name==='options'?'Options':'options'})).toBeNull();
      }
    }
    expect(await readFile(file,'utf8')).toBe(disk);await request('shutdown',null);send({method:'exit'});await once(server,'exit');
  }finally{if(server.exitCode===null)server.kill();await rm(root,{recursive:true,force:true});}
},90_000);
