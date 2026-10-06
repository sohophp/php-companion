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


it.each((['onDemand', 'progressive'] as const).flatMap(mode =>
 (['hover', 'definition', 'completion'] as const).map(method => [mode, method] as const)))(
 'resolves a first output variable query in %s/%s without index prewarm', async (indexingMode, method) => {
 const root = await mkdtemp(join(tmpdir(), 'sophp-output-query-'));
 let active: ChildProcessWithoutNullStreams | undefined;
 try {
  await mkdir(join(root, 'src'));
  const row = '<?php namespace App; class Row {public function name(): string {return "row";}}';
  const functions = '<?php namespace App; /** @param-out Row $value */ function fill(&$value): void {}';
  const caller = '<?php namespace Client; use function App\\fill as build; function run(){build($v);$v->name();}';
  await writeFile(join(root, 'src', 'Row.php'), row);
  await writeFile(join(root, 'src', 'functions.php'), functions);
  await writeFile(join(root, 'Caller.php'), caller);
  await writeFile(join(root, 'composer.json'), JSON.stringify({autoload: {'psr-4': {'App\\': 'src/'}, files: ['src/functions.php']}}));
  const uri = pathToFileURL(join(root, 'Caller.php')).toString();
  active = spawn(process.execPath, [resolve('dist/server.js'), '--stdio'], {stdio: 'pipe'});
  const {request, notify} = client(active);
  await request('initialize', {processId: null, rootUri: pathToFileURL(root).toString(), capabilities: {},
   initializationOptions: {phpVersion: '8.5', indexingMode, cacheDirectory: join(root, '.cache')}});
  notify('initialized', {});
  notify('textDocument/didOpen', {textDocument: {uri, languageId: 'php', version: 1, text: caller}});
  // This request is the first query: no empty retries, completion or index-ready prewarm.
  const offset = method === 'hover' ? caller.lastIndexOf('$v') + 1
   : caller.indexOf('->name') + (method === 'definition' ? 3 : 6);
  const queryParams = {textDocument: {uri}, position: position(caller, offset)};
  const firstStarted = performance.now();
  const first = await request('textDocument/' + method, queryParams);
  const firstQueryMs = performance.now() - firstStarted;
  if (method === 'hover') expect(first?.contents?.value).toContain('Row');
  else if (method === 'completion') expect((Array.isArray(first) ? first : first?.items)?.map((x: any) => x.label)).toContain('name');
  else expect(first).toEqual([{uri: pathToFileURL(join(root, 'src', 'Row.php')).toString(), range: {
   start: position(row, row.indexOf('function name') + 'function '.length), end: position(row, row.indexOf('function name') + 'function '.length + 4),
  }}]);
  if (method === 'completion') {
   const timings: number[] = [];
   for (let sample = 0; sample < 25; sample++) {
    const started = performance.now();
    const result = await request('textDocument/completion', queryParams);
    expect(result).toEqual(first);
    if (sample >= 5) timings.push(performance.now() - started);
   }
   const p95Ms = [...timings].sort((a, b) => a - b)[Math.ceil(timings.length * 0.95) - 1]!;
   if (process.env.PHP_COMPANION_TEST_OUTPUT_TIMING_DIR) await writeFile(
    join(process.env.PHP_COMPANION_TEST_OUTPUT_TIMING_DIR, `output-completion-${indexingMode}.json`),
    JSON.stringify({phpVersion: '8.5', indexingMode, firstQueryMs, warmSamples: timings.length, p95Ms,
     scope: 'isolated stdio output variable, three files, unchanged document; first query without explicit semantic prewarm'}));
   expect(p95Ms).toBeLessThanOrEqual(150);
  }
  const functionsUri = pathToFileURL(join(root, 'src', 'functions.php')).toString();
  const changed = functions.replace('@param-out Row', '@param-out int');
  notify('textDocument/didOpen', {textDocument: {uri: functionsUri, languageId: 'php', version: 1, text: changed}});
  const query = async (name: string, queryOffset: number): Promise<any> => request('textDocument/' + name,
   {textDocument: {uri}, position: position(caller, queryOffset)});
  const valueOffset = caller.lastIndexOf('$v') + 1;
  const changedHover = await query('hover', valueOffset);
  expect(changedHover?.contents?.value).toContain('int');
  expect(changedHover?.contents?.value).not.toContain('Row');
  const changedMembers = await query('completion', caller.indexOf('->name') + 6);
  expect((Array.isArray(changedMembers) ? changedMembers : changedMembers?.items)?.map((x: any) => x.label)).not.toContain('name');
  expect(await query('definition', caller.indexOf('->name') + 3)).toEqual([]);
  notify('textDocument/didChange', {textDocument: {uri: functionsUri, version: 2}, contentChanges: [{text: functions}]});
  const restored = await query(method, offset);
  expect(restored).toEqual(first);
  await request('shutdown', null);
  const exited = once(active, 'exit'); notify('exit', null); await exited; active = undefined;
  expect(await readFile(join(root, 'src', 'functions.php'), 'utf8')).toBe(functions);
 } finally {
  if (active) {const exited = once(active, 'exit'); active.kill(); await exited;}
  await rm(root, {recursive: true, force: true});
 }
}, 40_000);

it.each(['onDemand', 'progressive'] as const)('preserves generic output keys and literals in protocol queries in %s', async indexingMode => {
 const root = await mkdtemp(join(tmpdir(), 'sophp-output-template-')); let active: ChildProcessWithoutNullStreams | undefined;
 try {
  const text = `<?php class Row{function name():string{return 'row';}}
/**
 * @template T of object
 * @param class-string<T> $class
 * @param-out array{T: T, label: 'T'} $value
 */ function make(string $class,&$value){}
function run(){make(Row::class,$v);$v['T']->name();}`;
  const path = join(root, 'Consumer.php'), uri = pathToFileURL(path).toString();
  await writeFile(path, text); await writeFile(join(root, 'composer.json'), '{}');
  active = spawn(process.execPath, [resolve('dist/server.js'), '--stdio'], {stdio: 'pipe'});
  const {request, notify} = client(active);
  await request('initialize', {processId: null, rootUri: pathToFileURL(root).toString(), capabilities: {},
   initializationOptions: {phpVersion: '8.5', indexingMode, cacheDirectory: join(root, '.cache')}});
  notify('initialized', {}); notify('textDocument/didOpen', {textDocument: {uri, languageId: 'php', version: 1, text}});
  const hover = await request('textDocument/hover', {textDocument: {uri}, position: position(text, text.lastIndexOf('$v') + 1)});
  expect(hover?.contents?.value).toContain("$v: array{T: Row, label: 'T'}");
  const members = await request('textDocument/completion', {textDocument: {uri}, position: position(text, text.indexOf('->name') + 6)});
  expect((Array.isArray(members) ? members : members?.items)?.map((item: any) => item.label)).toEqual(['name']);
  const changed = text.replace("$v['T']->name()", "unknown($v);$v['T']->name()");
  notify('textDocument/didChange', {textDocument: {uri, version: 2}, contentChanges: [{text: changed}]});
  const withdrawn = await request('textDocument/completion', {textDocument: {uri}, position: position(changed, changed.indexOf('->name') + 6)});
  expect((Array.isArray(withdrawn) ? withdrawn : withdrawn?.items)?.map((item: any) => item.label)).toEqual([]);
  await request('shutdown', null); const exited = once(active, 'exit'); notify('exit', null); await exited; active = undefined;
  expect(await readFile(path, 'utf8')).toBe(text);
 } finally {
  if (active) { const exited = once(active, 'exit'); active.kill(); await exited; }
  await rm(root, {recursive: true, force: true});
 }
}, 40_000);

it.each((['7.2', '8.5'] as const).flatMap(phpVersion =>
 (['onDemand', 'progressive'] as const).map(indexingMode => ({phpVersion, indexingMode}))))(
 'uses real builtin output contracts at PHP $phpVersion in $indexingMode', async ({phpVersion, indexingMode}) => {
 const root = await mkdtemp(join(tmpdir(), 'sophp-builtin-output-')); let active: ChildProcessWithoutNullStreams | undefined;
 try {
  const cases = [
   ["intltz_get_canonical_id('UTC',$v);", 'bool'],
   ["IntlTimeZone::getCanonicalID('UTC',$v);", 'bool'],
   ['intltz_get_offset($zone,0.0,false,$v,$dst);', 'int'],
   ['$zone->getOffset(0.0,false,$raw,$v);', 'int'],
   ['$filter->filter($in,$out,$v,false);', 'int'],
   ['intltz_get_offset($zone,0.0,false,$v,$v);', undefined],
   ["if($flag){intltz_get_canonical_id('UTC',$v);}", undefined],
   ["intltz_get_canonical_id('UTC',$v);unknown($v);", undefined],
  ] as const;
  const source = (body: string): string => `<?php function run(IntlTimeZone $zone,php_user_filter $filter,$in,$out,$flag){${body}useValue($v);}`;
  const path = join(root, 'Consumer.php'), disk = source(cases[0][0]), uri = pathToFileURL(path).toString();
  await writeFile(path, disk); await writeFile(join(root, 'composer.json'), '{}');
  active = spawn(process.execPath, [resolve('dist/server.js'), '--stdio'], {stdio: 'pipe'});
  const {request, notify} = client(active);
  await request('initialize', {processId: null, rootUri: pathToFileURL(root).toString(), capabilities: {},
   initializationOptions: {phpVersion, indexingMode, cacheDirectory: join(root, '.cache')}});
  notify('initialized', {}); let version = 0;
  for (const [body, expected] of cases) {
   const text = source(body); version++;
   if (version === 1) notify('textDocument/didOpen', {textDocument: {uri, languageId: 'php', version, text}});
   else notify('textDocument/didChange', {textDocument: {uri, version}, contentChanges: [{text}]});
   const hover = await request('textDocument/hover', {textDocument: {uri}, position: position(text, text.lastIndexOf('$v') + 1)});
   expect(hover?.contents?.value?.match(/\$v: ([^\n]*)/)?.[1], body).toBe(expected);
  }
  expect(await readFile(path, 'utf8')).toBe(disk);
  await request('shutdown', null); const exited = once(active, 'exit'); notify('exit', null); await exited; active = undefined;
 } finally {
  if (active) { const exited = once(active, 'exit'); active.kill(); await exited; }
  await rm(root, {recursive: true, force: true});
 }
}, 40_000);

it.each(['onDemand', 'progressive'] as const)('withdraws cancelled and obsolete output source queries in %s', async indexingMode => {
 const root = await mkdtemp(join(tmpdir(), 'sophp-output-cancel-')); let active: ChildProcessWithoutNullStreams | undefined;
 try {
  await mkdir(join(root, 'src'));
  const caller = '<?php function run(){App\\fill($v);useValue($v);}';
  const path = join(root, 'Consumer.php'), uri = pathToFileURL(path).toString();
  await writeFile(path, caller);
  await writeFile(join(root, 'src', 'Row.php'), '<?php namespace App;class Row{}');
  await writeFile(join(root, 'src', 'functions.php'), '<?php namespace App;/** @param-out Row $value */function fill(&$value){}');
  await writeFile(join(root, 'composer.json'), JSON.stringify({autoload: {'psr-4': {'App\\': 'src/'}, files: ['src/functions.php']}}));
  active = spawn(process.execPath, [resolve('dist/server.js'), '--stdio'], {stdio: 'pipe'});
  const {request, notify, startRequest} = client(active);
  await request('initialize', {processId: null, rootUri: pathToFileURL(root).toString(), capabilities: {},
   initializationOptions: {phpVersion: '8.5', indexingMode, testMode: true, cacheDirectory: join(root, '.cache')}});
  notify('initialized', {}); notify('textDocument/didOpen', {textDocument: {uri, languageId: 'php', version: 1, text: caller}});
  const method = 'hoverValueSources';
  const paused = async (): Promise<void> => {
   const deadline = Date.now() + 5_000;
   while (Date.now() < deadline) {
    if ((await request('phpCompanion/testQueryState', {method, uri})).paused) return;
    await new Promise(done => setTimeout(done, 10));
   }
   throw new Error('Output Hover did not pause after source hydration');
  };
  const params = {textDocument: {uri}, position: position(caller, caller.lastIndexOf('$v') + 1)};
  expect(await request('phpCompanion/testPauseNextQuery', {method})).toBe(true);
  const cancelled = startRequest('textDocument/hover', params); await paused();
  notify('$/cancelRequest', {id: cancelled.id});
  expect(await request('phpCompanion/testReleaseQuery', {method})).toBe(true);
  expect(await cancelled.result).toBeNull();
  expect((await request('textDocument/hover', params))?.contents?.value).toContain('$v: App\\Row');
  expect(await request('phpCompanion/testPauseNextQuery', {method})).toBe(true);
  const stale = startRequest('textDocument/hover', params); await paused();
  const changed = caller.replace('useValue($v)', '$v=123;useValue($v)');
  notify('textDocument/didChange', {textDocument: {uri, version: 2}, contentChanges: [{text: changed}]});
  expect(await request('phpCompanion/testReleaseQuery', {method})).toBe(true);
  expect(await stale.result).toBeNull();
  expect((await request('textDocument/hover', {textDocument: {uri}, position: position(changed, changed.lastIndexOf('$v') + 1)}))?.contents?.value).toContain('$v: int');
  expect(await readFile(path, 'utf8')).toBe(caller);
  await request('shutdown', null); const exited = once(active, 'exit'); notify('exit', null); await exited; active = undefined;
 } finally {
  if (active) { const exited = once(active, 'exit'); active.kill(); await exited; }
  await rm(root, {recursive: true, force: true});
 }
}, 40_000);
