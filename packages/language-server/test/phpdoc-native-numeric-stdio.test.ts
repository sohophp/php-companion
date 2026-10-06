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




const scenarios = (['onDemand', 'progressive'] as const).flatMap(indexingMode =>
  (['7.2', '8.5'] as const).flatMap(phpVersion =>
    (['return', 'output'] as const).map(flavor => ({indexingMode, phpVersion, flavor}))));
it.each(scenarios)('numeric native input coherence $flavor / $indexingMode / PHP $phpVersion', async ({indexingMode, phpVersion, flavor}) => {
  const root = await mkdtemp(join(tmpdir(), 'sophp-native-numeric-'));
  let active: ChildProcessWithoutNullStreams | undefined;
  try {
    const row = '<?php namespace App;class Row{function rowOnly():string{return "row";}}';
    const other = '<?php namespace App;class Other{function otherOnly():string{return "other";}}';
    await mkdir(join(root, 'src'));
    await writeFile(join(root, 'src', 'Row.php'), row);
    await writeFile(join(root, 'src', 'Other.php'), other);
    await writeFile(join(root, 'composer.json'), JSON.stringify({autoload:{'psr-4':{'App\\':'src/'}}}));
    const uri = pathToFileURL(join(root, 'Consumer.php')).toString();
    const source = (native: string, input: string, strict: boolean, kind?: string): string => {
      const annotation = flavor === 'return' ? '@return ($mode is int ? Row : Other)'
        : '@param-out ($mode is int ? Row : Other) $value';
      return '<?php ' + (strict ? 'declare(strict_types=1);' : '')
        + `use App\\Row;use App\\Other;/** ${annotation} */function make(${native} $mode${flavor === 'output' ? ',&$value' : ''}){}`
        + `function run(){$input=${input};${flavor === 'return' ? '$v=make($input);' : 'make($input,$v);'}$v->${kind === 'Other' ? 'otherOnly' : 'rowOnly'}();}`;
    };
    const original = source('int', "'42'", false, 'Row');
    await writeFile(join(root, 'Consumer.php'), original);
    const stages = [
      {native:'int', input:"'42'", strict:false, kind:'Row'},
      {native:'int', input:"'wrong'", strict:false, kind:undefined},
      {native:'float', input:'42', strict:true, kind:'Other'},
      {native:'int', input:'42.0', strict:true, kind:undefined},
      {native:'int', input:"'42'", strict:false, kind:'Row'},
    ];
    const query = async (request: ReturnType<typeof client>['request'], text: string, kind?: string): Promise<void> => {
      const result = await request('textDocument/completion', {textDocument:{uri}, position:position(text, text.indexOf('->')+2)});
      expect((Array.isArray(result) ? result : result?.items)?.map((item:any) => item.label))
        .toEqual(kind === 'Row' ? ['rowOnly'] : kind === 'Other' ? ['otherOnly'] : []);
      const hover = await request('textDocument/hover', {textDocument:{uri}, position:position(text, text.lastIndexOf('$v')+1)});
      if (kind) expect(hover?.contents?.value).toContain(kind);
      else {
        expect(hover?.contents?.value ?? '').not.toContain('App\\Row');
        expect(hover?.contents?.value ?? '').not.toContain('App\\Other');
      }
      const signature = await request('textDocument/signatureHelp', {textDocument:{uri}, position:position(text, text.lastIndexOf('make(')+6)});
      expect(signature?.signatures?.[0]?.label).toContain('make(');
      if (kind) {
        const definition = await request('textDocument/definition', {textDocument:{uri}, position:position(text, text.indexOf('->')+4)});
        expect(definition).toEqual([{uri:pathToFileURL(join(root, 'src', kind+'.php')).toString(), range:{
          start:position(kind === 'Row' ? row : other, (kind === 'Row' ? row : other).indexOf('function ')+9),
          end:position(kind === 'Row' ? row : other, (kind === 'Row' ? row : other).indexOf('function ')+9+(kind === 'Row' ? 7 : 9)),
        }}]);
      }
    };
    for (let launch = 0; launch < 2; launch++) {
      active = spawn(process.execPath, [resolve('dist/server.js'), '--stdio'], {stdio:'pipe'});
      const {request, notify, wait} = client(active);
      await request('initialize', {processId:null, rootUri:pathToFileURL(root).toString(), capabilities:{},
        initializationOptions:{phpVersion, indexingMode, cacheDirectory:join(root, '.cache'), versionedDiagnostics:true}});
      notify('initialized', {});
      notify('textDocument/didOpen', {textDocument:{uri,languageId:'php',version:1,text:original}});
      // First protocol query, without index-ready or diagnostic prewarm.
      await query(request, original, 'Row');
      const activeStages = launch === 0 ? stages : [stages[0]!];
      for (const [index, stage] of activeStages.entries()) {
        const version = index + 2;
        const text = source(stage.native, stage.input, stage.strict, stage.kind);
        notify('textDocument/didChange', {textDocument:{uri,version},contentChanges:[{text}]});
        await query(request, text, stage.kind);
        const diagnostics = await wait(message => message.method === 'phpCompanion/versionedDiagnostics'
          && message.params?.uri === uri && message.params?.version === version);
        expect(diagnostics.params.diagnostics.filter((item:any) => item.code === 'php.argument.type-mismatch'))
          .toHaveLength(stage.kind ? 0 : 1);
      }
      await request('shutdown', null); const exited = once(active, 'exit'); notify('exit', null); await exited; active = undefined;
    }
    expect(await readFile(join(root, 'Consumer.php'), 'utf8')).toBe(original);
    expect(await readFile(join(root, 'src', 'Row.php'), 'utf8')).toBe(row);
    expect(await readFile(join(root, 'src', 'Other.php'), 'utf8')).toBe(other);
  } finally {
    if (active) {const exited = once(active, 'exit'); active.kill(); await exited;}
    await rm(root, {recursive:true,force:true});
  }
}, 40_000);
