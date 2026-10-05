import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { expect, it } from 'vitest';
import { encodeLspMessage, LspMessageDecoder } from '../../testkit/src/index.js';


it.each([['7.2','onDemand'],['7.2','experimental'],['8.1','onDemand'],['8.1','experimental'],['8.5','onDemand'],['8.5','experimental']] as const)(
  'resolves qualified and multiple Trait exclusions at PHP %s (%s)', async (phpVersion,indexingMode) => {
  const root = await mkdtemp(join(tmpdir(), 'sophp-qualified-precedence-'));
  await mkdir(join(root, 'src')); await mkdir(join(root, 'origin'));
  await writeFile(join(root, 'composer.json'), JSON.stringify({ autoload: { 'psr-4': { 'Consumer\\': 'src/', 'Origin\\': 'origin/' } } }));
  const file = join(root, 'src', 'Editing.php'), uri = pathToFileURL(file).toString();
  const disk = '<?php namespace Consumer; // unchanged disk baseline\n';
  await writeFile(file, disk);
  const server = spawn(process.execPath, [process.env.PHP_COMPANION_TEST_CANONICAL_SERVER ?? resolve('dist/server.js'), '--stdio', '--parser-core-wasm', resolve('../../dist/web-tree-sitter.wasm'), '--php-wasm', resolve('../../dist/tree-sitter-php.wasm')], { stdio: 'pipe' });
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
  let id = 0, version = 0, queries = 0;
  const send = (message: object): void => { server.stdin.write(encodeLspMessage({ jsonrpc: '2.0', ...message })); };
  const request = async (method: string, params: object | null): Promise<any> => {
    const requestId = ++id, response = waitFor(message => message.id === requestId);
    send({ id: requestId, method, params }); const result = await response;
    expect(result.error).toBeUndefined(); return result.result;
  };
  const position = (source: string, offset: number): { line: number; character: number } => {
    const lines = source.slice(0, offset).split('\n'); return { line: lines.length - 1, character: lines.at(-1)!.length };
  };
  const query = async (marked: string, expectedCodes: string[], signature?: string, completion?: string): Promise<void> => {
    const source = marked.replace('§', ''), offset = marked.indexOf('§'); version++;
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

  const opened = new Map<string,number>();
  const dependency = async (name: string, source: string): Promise<void> => {
    const path = join(root,'origin',name+'.php'), dependencyUri = pathToFileURL(path).toString();
    const next = (opened.get(dependencyUri) ?? 0)+1; opened.set(dependencyUri,next);
    if (next === 1) await writeFile(path,source);
    send({method:next === 1 ? 'textDocument/didOpen' : 'textDocument/didChange',params:next === 1
      ? {textDocument:{uri:dependencyUri,languageId:'php',version:next,text:source}}
      : {textDocument:{uri:dependencyUri,version:next},contentChanges:[{text:source}]}});
    await waitFor(message => message.method === 'textDocument/publishDiagnostics' && message.params.uri === dependencyUri && message.params.version === next);
  };
  const a='<?php namespace Origin; /** @template T */ trait A {/** @param T $value */ public function __construct($value){}}';
  const b='<?php namespace Origin; trait B {public function __construct(string $value){}}';
  const d='<?php namespace Origin; trait D {public function __construct(bool $value){}}';
  const formats = [
    ['Consumer','\\Origin\\A::__construct insteadof \\Origin\\B,\\Origin\\D'],
    ['', 'Origin\\A::__construct insteadof Origin\\B,Origin\\D'],
    ['Origin','namespace\\A::__construct insteadof namespace\\B,namespace\\D'],
    ['Origin','A::__construct insteadof B,D'],
    ['Consumer','\\Origin\\A::__construct /* 😀 */ insteadof /* ;, */ \\Origin\\B,\n /* 😀 */ \\Origin\\D'],
  ] as const;
  const header=(namespace:string,clause:string):string => `<?php declare(strict_types=1); ${namespace ? 'namespace '+namespace+';' : ''} class C {/** @use \\Origin\\A<int> */ use \\Origin\\A,\\Origin\\B,\\Origin\\D {${clause};}} `;
  try {
    await request('initialize', {processId:null,rootUri:pathToFileURL(root).toString(),capabilities:{textDocument:{completion:{completionItem:{snippetSupport:true}}}},
      initializationOptions:{phpVersion,indexingMode,cacheDirectory:join(root,'.cache')}});
    send({method:'initialized',params:{}});
    if(indexingMode === 'experimental') await waitFor(message => message.method === 'window/logMessage' && message.params?.message?.includes('complete=true'));
    await dependency('A',a);await dependency('B',b);await dependency('D',d);
    for(const [namespace,clause] of formats) {
      const base=header(namespace,clause);
      await query(base+'new C(§);',['php.argument.missing-required'],'int $value');
      await query(base+"new C('wrong'§);",['php.argument.type-mismatch'],'int $value');
      await query(base+'new C(42§);',[],'int $value');
      await query(base+'function run(string $offerA,int $offerZ){new C($offer§);}',[],'int $value','$offerZ');
    }
    const [namespace,clause]=formats[0];
    const base=header(namespace,clause),switched=header(namespace,clause.replace('A::__construct','B::__construct').replace('B,','A,'));
    await query(switched+'new C(42§);',['php.argument.type-mismatch'],'string $value');
    await query(switched+'function run(string $offerA,int $offerZ){new C($offer§);}',[],'string $value','$offerA');
    await query(base+'new C(42§);',[],'int $value');
    await query(header(namespace,'')+'new C(§);',[]);
    await query(header(namespace,clause.replace('D',''))+'new C(§);',[]);
    if(phpVersion !== '7.2') await query(base+'new C(other:42§);',['php.argument.unknown-named'],'int $value');
    if(phpVersion === '8.5') await query(header(namespace,clause+'; \\Origin\\A::__construct as final selectedCtor')+'new C(§);',['php.argument.missing-required'],'int $value');
    await dependency('A',a.replace('@param T','@param string'));
    await query(base+'new C(42§);',['php.argument.type-mismatch'],'string $value');
    await dependency('A',a);
    await query(base+'new C(42§);',[],'int $value');
    expect(await readFile(file,'utf8')).toBe(disk);
    expect(await readFile(join(root,'origin','A.php'),'utf8')).toBe(a);
    console.log(JSON.stringify({phpVersion,indexingMode,queries,diagnosticVersions:version,diskUnchanged:true}));
  } finally {
    if(server.exitCode === null){const exited=once(server,'exit');server.kill();await exited;}
    await rm(root,{recursive:true,force:true});
  }
});
