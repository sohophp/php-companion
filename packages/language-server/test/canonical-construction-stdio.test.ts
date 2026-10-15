import { appendFileSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { expect, it } from 'vitest';
import { encodeLspMessage, LspMessageDecoder } from '../../testkit/src/index.js';


it.each([['7.2','onDemand'],['7.2','experimental'],['8.1','onDemand'],['8.1','experimental'],['8.5','onDemand'],['8.5','experimental']] as const)(
  'proves canonical cross-file construction at PHP %s (%s)', async (phpVersion,indexingMode) => {
  const root = await mkdtemp(join(tmpdir(), 'sophp-canonical-constructors-'));
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
  const init = '<?php namespace Origin; trait Init {public function __construct(int $value){}}';
  const direct = '<?php declare(strict_types=1); namespace Consumer; class C {use \\Origin\\Init;} ';
  try {
    await request('initialize', {processId:null,rootUri:pathToFileURL(root).toString(),capabilities:{textDocument:{completion:{completionItem:{snippetSupport:true}}}},
      initializationOptions:{phpVersion,indexingMode,cacheDirectory:join(root,'.cache')}});
    send({method:'initialized',params:{}});
    if(indexingMode === 'experimental') await waitFor(message => message.method === 'window/logMessage' && message.params?.message?.includes('complete=true'));
    await dependency('Init',init);
    await query(direct+'new C(§);',['php.argument.missing-required'],'int $value',phpVersion !== '7.2' ? 'value:' : undefined);
    await query(direct+"new C('wrong'§);",['php.argument.type-mismatch'],'int $value');
    await query(direct+'new C(42§);',[],'int $value');
    await query(direct+'new C; §',['php.argument.missing-required']);
    if(phpVersion !== '7.2') await query(direct+'new C(other:42§);',['php.argument.unknown-named'],'int $value');
    // Native and nested Trait origins, constructor aliases, precedence and a parent class.
    await dependency('Mid','<?php namespace Origin; trait Mid {use Init;}');
    await dependency('Base','<?php namespace Origin; class Base {use Init;}');
    for(const header of ['class C {use \\Origin\\Mid;}','class C extends \\Origin\\Base {}']) {
      await query('<?php namespace Consumer; '+header+' new C(§);',['php.argument.missing-required'],'int $value');
    }
    await dependency('Init','<?php namespace Origin; trait Init {public function seed(int $value){}}');
    const alias = '<?php namespace Consumer; class C {use \\Origin\\Init {seed as __construct;}} ';
    await query(alias+'new C(§);',['php.argument.missing-required'],'int $value');
    await query(alias+'new C(42§);',[],'int $value');
    await dependency('Init',init);
    await dependency('Other','<?php namespace Origin; trait Other {public function __construct(string $text){}}');
    const selection = '<?php namespace Consumer; use Origin\\Init as Selected; use Origin\\Other as Other; class C {use Selected,Other {Selected::__construct insteadof Other;}} ';
    await query(selection+'new C(§);',['php.argument.missing-required'],'int $value');
    await query('<?php namespace Consumer; class C {use \\Origin\\Init,\\Origin\\Other;} new C(§);',[]);
    await query('<?php namespace Consumer; class C {use \\Origin\\Init,\\Origin\\Missing;} new C(§);',[]);
    // An ordinary external class constructor is equally concrete; final is unnecessary.
    await dependency('Box','<?php namespace Origin; class Box {public function __construct(int $value){}}');
    await query('<?php namespace Consumer; new \\Origin\\Box(§);',['php.argument.missing-required'],'int $value');
    // Keep virtual calls conservative even when a Trait implementation is currently visible.
    await query('<?php namespace Consumer; class C {use \\Origin\\Init; public static function make(){return new static();}} §',[]);
    await query('<?php namespace Consumer; trait Caller {use \\Origin\\Init; public function make(){return new self();}} §',[]);
    // A uniquely loaded source with the wrong PSR-4 path is not canonical in onDemand.
    await dependency('WrongSource','<?php namespace Origin; trait OffPath {public function __construct(int $value){}}');
    await query('<?php namespace Consumer; class C {use \\Origin\\OffPath;} new C(§);',indexingMode === 'onDemand' ? [] : ['php.argument.missing-required'],'int $value');
    // PHP 7 has no native ArrayObject input floor here; preserve the existing unknown result.
    // PHP 8's native floor must still report exactly once.
    await query("<?php new \\ArrayObject('wrong'); §",phpVersion === '7.2' ? [] : ['php.argument.type-mismatch']);
    // Same-length unpersisted contract edits must withdraw and restore diagnostics.
    const generic = '<?php namespace Origin; /** @template T */ trait Init {/** @param T $value */ public function __construct($value){}}';
    await dependency('Init',generic);
    for(const target of ['int','string','int']) {
      const text = `<?php declare(strict_types=1); namespace Consumer; class C {/** @use \\Origin\\Init<${target}> */ use \\Origin\\Init;} new C('wrong'§);`;
      await query(text,target === 'int' ? ['php.argument.type-mismatch'] : [],`${target} $value`);
    }
    expect(await readFile(file,'utf8')).toBe(disk);
    expect(await readFile(join(root,'origin','Init.php'),'utf8')).toBe(init);
    console.log(JSON.stringify({phpVersion,indexingMode,queries,diagnosticVersions:version,diskUnchanged:true}));
  } finally {
    if(server.exitCode === null){const exited=once(server,'exit');server.kill();await exited;}
    await rm(root,{recursive:true,force:true});
  }
});

it.each(['7.2','8.5'].flatMap(phpVersion => ['ambiguous-psr4','valid-classmap','wrong-classmap','invalid-classmap'].map(evidence=>({phpVersion,evidence}))))(
  'requires canonical Composer evidence: $evidence at PHP $phpVersion', async ({phpVersion,evidence}) => {
  const indexingMode='onDemand';
  const root = await mkdtemp(join(tmpdir(), 'sophp-canonical-constructors-'));
  await mkdir(join(root, 'src')); await mkdir(join(root, 'origin'));
  await writeFile(join(root, 'composer.json'), JSON.stringify({ autoload: { 'psr-4': { 'Consumer\\': 'src/', 'Origin\\': evidence === 'ambiguous-psr4' ? ['origin/','alternative/'] : 'origin/' } } }));
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
    const codes = published.params.diagnostics.filter((item: any) => ['php.instantiation.invalid-target', 'php.instantiation.inaccessible-constructor',
      'php.argument.missing-required', 'php.argument.type-mismatch', 'php.argument.unknown-named'].includes(item.code)).map((item: any) => item.code).sort();
    expect(codes, marked).toEqual(expectedCodes.sort());
  };


  try {
    const source='<?php namespace Origin; trait Init {public function __construct(int $value){}}';
    const dependencyPath=join(root,'origin',evidence === 'ambiguous-psr4' ? 'Init.php' : 'Legacy.php');
    const dependencyUri=pathToFileURL(dependencyPath).toString(); await writeFile(dependencyPath,source);
    if(evidence !== 'ambiguous-psr4'){
      await mkdir(join(root,'vendor','composer'),{recursive:true});
      const value=evidence === 'invalid-classmap' ? "getenv('UNPROVEN_SOURCE')" : `$baseDir . '/origin/${evidence === 'valid-classmap' ? 'Legacy' : 'Other'}.php'`;
      await writeFile(join(root,'vendor','composer','autoload_classmap.php'),`<?php
$vendorDir = dirname(__DIR__);
$baseDir = dirname($vendorDir);
return array(
  'Origin\\\\Init' => ${value},
);
`);
    }
    await request('initialize',{processId:null,rootUri:pathToFileURL(root).toString(),capabilities:{},initializationOptions:{phpVersion,indexingMode,cacheDirectory:join(root,'.cache')}});
    send({method:'initialized',params:{}});
    send({method:'textDocument/didOpen',params:{textDocument:{uri:dependencyUri,languageId:'php',version:1,text:source}}});
    await waitFor(message=>message.method === 'textDocument/publishDiagnostics' && message.params.uri === dependencyUri && message.params.version === 1);
    const header='<?php declare(strict_types=1); namespace Consumer; class C {use \\Origin\\Init;} ';
    await query(header+'new C(§);',evidence === 'valid-classmap' ? ['php.argument.missing-required'] : [],'int $value');
    await query(header+"new C('wrong'§);",evidence === 'valid-classmap' ? ['php.argument.type-mismatch'] : [],'int $value');
    expect(await readFile(file,'utf8')).toBe(disk);expect(await readFile(dependencyPath,'utf8')).toBe(source);
    console.log(JSON.stringify({phpVersion,evidence,queries,diagnosticVersions:version,diskUnchanged:true}));
  } finally {
    if(server.exitCode === null){const exited=once(server,'exit');server.kill();await exited;}
    await rm(root,{recursive:true,force:true});
  }
});

it.each(['7.2','8.5'])('withdraws an interrupted constructor diagnostic after a Trait contract changes at PHP %s', async phpVersion => {
  const caseStarted = performance.now();
  const root = await mkdtemp(join(tmpdir(), 'sophp-canonical-constructors-'));
  await mkdir(join(root, 'src')); await mkdir(join(root, 'origin'));
  await writeFile(join(root, 'composer.json'), JSON.stringify({ autoload: { 'psr-4': { 'Consumer\\': 'src/', 'Origin\\': 'origin/' } } }));
  const file = join(root, 'src', 'Editing.php'), uri = pathToFileURL(file).toString();
  const disk = '<?php namespace Consumer; // unchanged disk baseline\n';
  await writeFile(file, disk);
  const server = spawn(process.execPath, [process.env.PHP_COMPANION_TEST_CANONICAL_SERVER ?? resolve('dist/server.js'), '--stdio', '--parser-core-wasm', resolve('../../dist/web-tree-sitter.wasm'), '--php-wasm', resolve('../../dist/tree-sitter-php.wasm')], { stdio: 'pipe' });
  const traceDirectory = process.env.PHP_COMPANION_TEST_CONSTRUCTOR_TRACE_DIR;
  const tracePath = traceDirectory ? join(traceDirectory, `constructor-${phpVersion}.jsonl`) : undefined;
  const recordTrace = (event: object): void => {
    if (tracePath) appendFileSync(tracePath, JSON.stringify({ atMs: performance.now() - caseStarted, ...event }) + '\n');
  };
  recordTrace({ event: 'server-started', phpVersion, pid: server.pid, command: server.spawnargs });
  server.stderr.on('data', chunk => recordTrace({ event: 'stderr', text: chunk.toString() }));
  server.on('exit', (code, signal) => recordTrace({ event: 'server-exited', code, signal }));
  const decoder = new LspMessageDecoder(), messages: any[] = [];
  const waiters: Array<{ matches: (message: any) => boolean; done: (message: any) => void }> = [];
  server.stdout.on('data', chunk => {
    for (const message of decoder.push(chunk) as any[]) {
      recordTrace({ event: 'received', message });
      messages.push(message);
      for (const waiter of [...waiters]) if (waiter.matches(message)) {
        waiters.splice(waiters.indexOf(waiter), 1); waiter.done(message);
      }
    }
  });
  const waitFor = (matches: (message: any) => boolean): Promise<any> => {
    recordTrace({ event: 'wait', predicate: matches.toString() });
    const existing = messages.find(matches); if (existing) return Promise.resolve(existing);
    return new Promise((done, reject) => {
      const waiter = { matches, done: (message: any): void => { clearTimeout(timer); done(message); } };
      const timer = setTimeout(() => { waiters.splice(waiters.indexOf(waiter), 1); reject(new Error('Trait use LSP response timed out')); }, 15_000);
      waiters.push(waiter);
    });
  };
  let id = 0;
  const send = (message: object): void => { recordTrace({ event: 'sent', message }); server.stdin.write(encodeLspMessage({ jsonrpc: '2.0', ...message })); };
  const request = async (method: string, params: object | null): Promise<any> => {
    const requestId = ++id, response = waitFor(message => message.id === requestId);
    send({ id: requestId, method, params }); const result = await response;
    expect(result.error).toBeUndefined(); return result.result;
  };
  const position = (source: string, offset: number): { line: number; character: number } => {
    const lines = source.slice(0, offset).split('\n'); return { line: lines.length - 1, character: lines.at(-1)!.length };
  };
  try {
    const dependencyPath=join(root,'origin','Init.php'), dependencyUri=pathToFileURL(dependencyPath).toString();
    const original='<?php namespace Origin; trait Init {public function __construct(int $value){}}';
    await writeFile(dependencyPath,original);
    await request('initialize',{processId:null,rootUri:pathToFileURL(root).toString(),capabilities:{},initializationOptions:{phpVersion,indexingMode:'onDemand',testMode:true,cacheDirectory:join(root,'.cache')}});
    send({method:'initialized',params:{}});
    send({method:'textDocument/didOpen',params:{textDocument:{uri:dependencyUri,languageId:'php',version:1,text:original}}});
    await waitFor(message=>message.method === 'textDocument/publishDiagnostics' && message.params.uri === dependencyUri && message.params.version === 1);
    const source="<?php declare(strict_types=1); namespace Consumer; class C {use \\Origin\\Init;} new C('wrong');";
    send({method:'textDocument/didOpen',params:{textDocument:{uri,languageId:'php',version:1,text:source}}});
    // didOpen also schedules content validation. Its unchanged int contract may
    // legitimately publish while the other validation is paused. Keep this
    // positive control separate from the resumed, post-edit publication.
    const beforeChange=await waitFor(message=>message.method === 'textDocument/publishDiagnostics' && message.params.uri === uri && message.params.version === 1);
    expect(beforeChange.params.diagnostics.filter((item:any)=>item.code === 'php.argument.type-mismatch')).toHaveLength(1);
    // Both initial validations must finish before arming the pause. An older
    // validation may be discarded, so two publications are not guaranteed.
    const initialDeadline=Date.now()+5_000;
    while(true) {
      const state=await request('phpCompanion/testQueryState',{method:'diagnostics',uri});
      expect(state.version).toBe(1);
      if(state.pending === 0) break;
      expect(Date.now()).toBeLessThan(initialDeadline);
      await new Promise(done=>setTimeout(done,20));
    }
    expect(await request('phpCompanion/testPauseNextQuery',{method:'constructorDiagnostics'})).toBe(true);
    send({method:'textDocument/didChange',params:{textDocument:{uri:dependencyUri,version:2},contentChanges:[{text:original.replace('int $value','float $value')}]}});
    await waitFor(message=>message.method === 'textDocument/publishDiagnostics' && message.params.uri === dependencyUri && message.params.version === 2);
    await waitFor(message=>message.method === 'window/logMessage' && message.params.message === '[test-query-paused] method=constructorDiagnostics');
    const changedAt=messages.length;
    send({method:'textDocument/didChange',params:{textDocument:{uri:dependencyUri,version:3},contentChanges:[{text:original.replace('int $value','string $value')}]}});
    await waitFor(message=>message.method === 'textDocument/publishDiagnostics' && message.params.uri === dependencyUri && message.params.version === 3);
    // Observe the updated contract while the obsolete proof is still paused.
    const refreshed=await waitFor(message=>messages.indexOf(message) >= changedAt && message.method === 'textDocument/publishDiagnostics' && message.params.uri === uri && message.params.version === 1
      && message.params.diagnostics.every((item:any)=>item.code !== 'php.argument.type-mismatch'));
    expect(refreshed.params.diagnostics.filter((item:any)=>item.code === 'php.argument.type-mismatch')).toEqual([]);
    expect(await request('phpCompanion/testReleaseQuery',{method:'constructorDiagnostics'})).toBe(true);
    const resumed=await waitFor(message=>message.method === 'window/logMessage' && message.params.message.startsWith('[test-constructor-proof]'));
    expect(resumed.params.message).toContain('proven=0');
    // Releasing an obsolete proof need not repeat an already current publication.
    // The revision guard above must reject it, and the latest client state stays current.
    const published=messages.filter(message=>messages.indexOf(message) >= changedAt && message.method === 'textDocument/publishDiagnostics' && message.params.uri === uri && message.params.version === 1).at(-1);
    expect(published).toBeDefined();
    expect(published.params.diagnostics.filter((item:any)=>item.code === 'php.argument.type-mismatch')).toEqual([]);
    const offset=source.indexOf("'wrong'")+3;
    const signature=await request('textDocument/signatureHelp',{textDocument:{uri},position:position(source,offset)});
    expect(signature.signatures[0].label).toContain('string $value');
    expect(await readFile(dependencyPath,'utf8')).toBe(original);expect(await readFile(file,'utf8')).toBe(disk);
    console.log(JSON.stringify({phpVersion,interruptedProof:true,obsoleteMismatchWithdrawn:true,diskUnchanged:true}));
  } finally {
    recordTrace({ event: 'cleanup-started' });
    if(server.exitCode === null){const exited=once(server,'exit');server.kill();await exited;}
    await rm(root,{recursive:true,force:true});
  }
});
