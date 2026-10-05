import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { expect, it } from 'vitest';
import { encodeLspMessage, LspMessageDecoder } from '../../testkit/src/index.js';

it.each(['onDemand', 'experimental'] as const)('keeps PHP 7 legacy constructors root-scoped and retracts them live (%s)', async indexingMode => {
  const base = await mkdtemp(join(tmpdir(), 'sophp-legacy-project-'));
  const roots = [join(base,'php7'),join(base,'php8')];
  const uris: string[] = [];
  const disk = '<?php // unchanged source\n';
  for (const root of roots) {
    await mkdir(join(root,'src'),{recursive:true});
    await writeFile(join(root,'composer.json'),JSON.stringify({autoload:{classmap:['src/']}}));
    const file=join(root,'src','Editing.php'); await writeFile(file,disk);uris.push(pathToFileURL(file).toString());
  }
  const root = roots[0]!;
  const server = spawn(process.execPath,[process.env.PHP_COMPANION_TEST_LEGACY_SERVER ?? resolve('dist/server.js'),'--stdio',
    '--parser-core-wasm',resolve('../../dist/web-tree-sitter.wasm'),'--php-wasm',resolve('../../dist/tree-sitter-php.wasm')],{stdio:'pipe'});
  const decoder = new LspMessageDecoder(), messages: any[] = [];
  const waiters: Array<{ matches: (message: any) => boolean; done: (message: any) => void }> = [];
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
      const timer = setTimeout(() => { waiters.splice(waiters.indexOf(waiter), 1); reject(new Error('Trait use LSP response timed out')); }, 15_000);
      waiters.push(waiter);
    });
  };
  let id = 0, version = 0, queries = 0; const versions = new Map<string,number>();
  const send = (message: object): void => { server.stdin.write(encodeLspMessage({ jsonrpc: '2.0', ...message })); };
  const request = async (method: string, params: object | null): Promise<any> => {
    const requestId = ++id, response = waitFor(message => message.id === requestId);
    send({ id: requestId, method, params }); const result = await response;
    expect(result.error).toBeUndefined(); return result.result;
  };
  const position = (source: string, offset: number): { line: number; character: number } => {
    const lines = source.slice(0, offset).split('\n'); return { line: lines.length - 1, character: lines.at(-1)!.length };
  };
  const query = async (uri: string, marked: string, expectedCodes: string[], signature?: string, completion?: string): Promise<void> => {
    const source = marked.replace('§', ''), offset = marked.indexOf('§'); version = (versions.get(uri) ?? 0)+1; versions.set(uri,version);
    send({ method: version === 1 ? 'textDocument/didOpen' : 'textDocument/didChange', params: version === 1
      ? { textDocument: { uri, languageId: 'php', version, text: source } }
      : { textDocument: { uri, version }, contentChanges: [{ text: source }] } });
    const result = await request('textDocument/signatureHelp', { textDocument: { uri }, position: position(source, offset) }); queries++;
    expect(result?.signatures?.[0]?.label?.includes(signature ?? '') ?? false, marked + JSON.stringify(result)).toBe(Boolean(signature));
    if (completion) {
      const result = await request('textDocument/completion', { textDocument: { uri }, position: position(source, offset) });
      const items = Array.isArray(result) ? result : result.items;
      if (completion.startsWith('$')) expect(items[0]?.label).toBe(completion);
      else expect(items.some((item: any) => item.label === completion)).toBe(true);
    }
    const published = await waitFor(message => message.method === 'textDocument/publishDiagnostics' && message.params.uri === uri && message.params.version === version);
    if(signature) expect(published.params.diagnostics.filter((item: any) => String(item.code).includes('syntax')),marked).toEqual([]);
    const codes = published.params.diagnostics.filter((item: any) => ['php.instantiation.invalid-target', 'php.instantiation.inaccessible-constructor',
      'php.argument.missing-required', 'php.argument.type-mismatch', 'php.argument.unknown-named'].includes(item.code)).map((item: any) => item.code).sort();
    expect(codes, marked).toEqual(expectedCodes.sort());
  };

  const headers = [
    ['class C {public function C(int $value){}}', 'int $value', undefined],
    ['class Base {public function Base(int $value){}} class C extends Base {}', 'int $value', undefined],
    ['class Base {public function __construct(string $value){}} class C extends Base {public function C(int $value){}}', 'int $value', 'string $value'],
    ['trait Init {public function C(int $value){}} class C {use Init;}', 'int $value', undefined],
    ['trait Init {public function seed(int $value){}} class C {use Init {seed as C;}}', 'int $value', undefined],
    ['namespace N; class C {public function C(int $value){}}', undefined, undefined],
    ['trait Init {public function __construct(string $value){}} class C {use Init; public function C(int $value){}}', undefined, 'string $value'],
    ['trait Init {public function C(int $value){}} class C {use Init; public function __construct(string $value){}}', undefined, 'string $value'],
  ] as const;
  const switchVersions = (a: string, b: string): void => send({method:'phpCompanion/phpVersions',params:{fallback:'8.5',
    versions:roots.map((root,index)=>({uri:pathToFileURL(root).toString(),version:index===0?a:b}))}});
  try {
    await request('initialize',{processId:null,rootUri:pathToFileURL(root).toString(),
      workspaceFolders:roots.map((root,index)=>({uri:pathToFileURL(root).toString(),name:'root'+index})),
      capabilities:{textDocument:{completion:{completionItem:{snippetSupport:true}}}},
      initializationOptions:{phpVersion:'8.5',indexingMode,phpVersions:roots.map((root,index)=>({uri:pathToFileURL(root).toString(),version:index===0?'7.2':'8.5'})),cacheDirectory:join(base,'.cache')}});
    send({method:'initialized',params:{}});
    if(indexingMode==='experimental') await waitFor(message=>message.method==='window/logMessage' && message.params?.message?.includes('complete=true'));
    for (const [header,php7,php8] of headers) for (const index of [0,1]) {
      const expected=index===0?php7:php8, document=uris[index]!;
      await query(document,'<?php '+header+' new C(§);',expected?['php.argument.missing-required']:[],expected);
      if(expected) await query(document,'<?php '+header+" new C([]§);",['php.argument.type-mismatch'],expected);
      if(expected) await query(document,'<?php '+header+' function run(string $offerA,int $offerZ){new C($offer§);}',[],expected,
        expected.startsWith('int')?'$offerZ':'$offerA');
    }
    for (const [a,b] of [['8.5','7.4'],['7.2','8.5']] as const) {
      switchVersions(a,b);
      for(const index of [0,1]) {
        const php7=(index===0?a:b).startsWith('7.');
        await query(uris[index]!,'<?php '+headers[0][0]+' new C(§);',php7?['php.argument.missing-required']:[],php7?'int $value':undefined);
      }
    }
    for (const root of roots) expect(await readFile(join(root,'src','Editing.php'),'utf8')).toBe(disk);
    expect(queries).toBe(36);
    if (process.env.SOPHP_D106_LSP_REPORT_DIR) await writeFile(join(process.env.SOPHP_D106_LSP_REPORT_DIR,indexingMode+'.json'),JSON.stringify({indexingMode,queries,diagnosticVersions:[...versions.values()],roots:2,diskUnchanged:true,liveVersionSwitches:2}));
    console.log(JSON.stringify({indexingMode,queries,diagnosticVersions:[...versions.values()],roots:2,diskUnchanged:true,liveVersionSwitches:2}));
  } finally {
    if(server.exitCode===null){const exited=once(server,'exit');server.kill();await exited;}
    await rm(base,{recursive:true,force:true});
  }
},60_000);

it('changes the selected PHP version for an open document outside workspace roots', async () => {
  const root = await mkdtemp(join(tmpdir(),'sophp-legacy-loose-'));
  const path=join(root,'Loose.php'), uri=pathToFileURL(path).toString();
  const disk='<?php // unchanged source\n'; await writeFile(path,disk);
  const server=spawn(process.execPath,[process.env.PHP_COMPANION_TEST_LEGACY_SERVER ?? resolve('dist/server.js'),'--stdio',
    '--parser-core-wasm',resolve('../../dist/web-tree-sitter.wasm'),'--php-wasm',resolve('../../dist/tree-sitter-php.wasm')],{stdio:'pipe'});
  const decoder = new LspMessageDecoder(), messages: any[] = [];
  const waiters: Array<{ matches: (message: any) => boolean; done: (message: any) => void }> = [];
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
      const timer = setTimeout(() => { waiters.splice(waiters.indexOf(waiter), 1); reject(new Error('Trait use LSP response timed out')); }, 15_000);
      waiters.push(waiter);
    });
  };
  let id = 0, version = 0, queries = 0; const versions = new Map<string,number>();
  const send = (message: object): void => { server.stdin.write(encodeLspMessage({ jsonrpc: '2.0', ...message })); };
  const request = async (method: string, params: object | null): Promise<any> => {
    const requestId = ++id, response = waitFor(message => message.id === requestId);
    send({ id: requestId, method, params }); const result = await response;
    expect(result.error).toBeUndefined(); return result.result;
  };
  const position = (source: string, offset: number): { line: number; character: number } => {
    const lines = source.slice(0, offset).split('\n'); return { line: lines.length - 1, character: lines.at(-1)!.length };
  };
  const query = async (uri: string, marked: string, expectedCodes: string[], signature?: string, completion?: string): Promise<void> => {
    const source = marked.replace('§', ''), offset = marked.indexOf('§'); version = (versions.get(uri) ?? 0)+1; versions.set(uri,version);
    send({ method: version === 1 ? 'textDocument/didOpen' : 'textDocument/didChange', params: version === 1
      ? { textDocument: { uri, languageId: 'php', version, text: source } }
      : { textDocument: { uri, version }, contentChanges: [{ text: source }] } });
    const result = await request('textDocument/signatureHelp', { textDocument: { uri }, position: position(source, offset) }); queries++;
    expect(result?.signatures?.[0]?.label?.includes(signature ?? '') ?? false, marked + JSON.stringify(result)).toBe(Boolean(signature));
    if (completion) {
      const result = await request('textDocument/completion', { textDocument: { uri }, position: position(source, offset) });
      const items = Array.isArray(result) ? result : result.items;
      if (completion.startsWith('$')) expect(items[0]?.label).toBe(completion);
      else expect(items.some((item: any) => item.label === completion)).toBe(true);
    }
    const published = await waitFor(message => message.method === 'textDocument/publishDiagnostics' && message.params.uri === uri && message.params.version === version);
    if(signature) expect(published.params.diagnostics.filter((item: any) => String(item.code).includes('syntax')),marked).toEqual([]);
    const codes = published.params.diagnostics.filter((item: any) => ['php.instantiation.invalid-target', 'php.instantiation.inaccessible-constructor',
      'php.argument.missing-required', 'php.argument.type-mismatch', 'php.argument.unknown-named'].includes(item.code)).map((item: any) => item.code).sort();
    expect(codes, marked).toEqual(expectedCodes.sort());
  };

  try {
    await request('initialize',{processId:null,rootUri:null,workspaceFolders:[],capabilities:{},
      initializationOptions:{phpVersion:'7.2',indexingMode:'onDemand',cacheDirectory:join(root,'.cache')}});
    send({method:'initialized',params:{}});
    const source='<?php class C {public function C(int $value){}} new C(§);';
    await query(uri,source,['php.argument.missing-required'],'int $value');
    send({method:'phpCompanion/phpVersions',params:{versions:[],fallback:'8.5'}});
    await query(uri,source,[]);
    send({method:'phpCompanion/phpVersions',params:{versions:[],fallback:'7.4'}});
    await query(uri,source,['php.argument.missing-required'],'int $value');
    expect(await readFile(path,'utf8')).toBe(disk); expect(queries).toBe(3);
    if (process.env.SOPHP_D106_LSP_REPORT_DIR) await writeFile(join(process.env.SOPHP_D106_LSP_REPORT_DIR,'loose.json'),JSON.stringify({queries,diagnosticVersions:version,diskUnchanged:true,liveVersionSwitches:2,roots:0}));
  } finally {
    if(server.exitCode===null){const exited=once(server,'exit');server.kill();await exited;}
    await rm(root,{recursive:true,force:true});
  }
},60_000);
