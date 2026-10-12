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
  return {
    wait,
    notify: (method, params): void => { server.stdin.write(encodeLspMessage({ jsonrpc: '2.0', method, params })); },
    request: async (method, params): Promise<any> => {
      const id = ++sequence; const response = wait(message => message.id === id);
      server.stdin.write(encodeLspMessage({ jsonrpc: '2.0', id, method, params }));
      const message = await response; expect(message.error).toBeUndefined(); return message.result;
    },
  };
}


it.each((['7.2', '8.5'] as const).flatMap(phpVersion =>
  (['onDemand', 'progressive'] as const).flatMap(indexingMode =>
    (['Row', 'int'] as const).map(parameter => [phpVersion, indexingMode, parameter] as const))))(
  'uses the current open Composer function after restoration at PHP %s/%s with %s parameter',
  async (phpVersion, indexingMode, parameter) => {
    const root = await mkdtemp(join(tmpdir(), 'sophp-function-publication-'));
    let active: ChildProcessWithoutNullStreams | undefined;
    try {
      await mkdir(join(root, 'src'));
      const functions = '<?php namespace App; function sendRow(Row $row): string {return "row";}',
        restored = parameter === 'Row' ? functions
          : '<?php namespace App; function sendRow(int $changed): string {return "changed";}',
        caller = '<?php namespace Client; use App\\Row; use function App\\sendRow as deliver; function run(Row $zRow,int $aWrong){deliver($);}';
      await writeFile(join(root, 'src', 'Row.php'), '<?php namespace App; class Row {}');
      await writeFile(join(root, 'src', 'functions.php'), functions);
      await writeFile(join(root, 'Caller.php'), caller);
      await writeFile(join(root, 'composer.json'), JSON.stringify({
        autoload: {'psr-4': {'App\\': 'src/'}, files: ['src/functions.php']},
      }));
      const uri = pathToFileURL(join(root, 'Caller.php')).toString(),
        functionUri = pathToFileURL(join(root, 'src', 'functions.php')).toString(),
        callPosition = position(caller, caller.indexOf('deliver(') + 2),
        argumentPosition = position(caller, caller.indexOf('$);') + 1);
      const server = spawn(process.execPath, [resolve('dist/server.js'), '--stdio'], {stdio: 'pipe'});
      active = server;
      const {request, notify, wait} = client(server);
      await request('initialize', {processId: null, rootUri: pathToFileURL(root).toString(), capabilities: {},
        initializationOptions: {testMode: true, phpVersion, indexingMode, cacheDirectory: join(root, '.cache')}});
      notify('initialized', {});
      notify('textDocument/didOpen', {textDocument: {uri, languageId: 'php', version: 1, text: caller}});
      // The first dependency query remains cold: no index-ready or diagnostic prewarm.
      const definition = [{uri: functionUri, range: {
        start: position(functions, functions.indexOf('sendRow')),
        end: position(functions, functions.indexOf('sendRow') + 7),
      }}];
      expect(await request('textDocument/definition', {textDocument: {uri}, position: callPosition})).toEqual(definition);
      notify('textDocument/didOpen', {textDocument: {uri: functionUri, languageId: 'php', version: 1, text: functions}});
      expect((await request('textDocument/completion', {textDocument: {uri}, position: argumentPosition}))[0]?.label).toBe('$zRow');
      notify('textDocument/didChange', {textDocument: {uri: functionUri, version: 2},
        contentChanges: [{text: functions.replace('sendRow', 'sendOther')}]});
      expect(await request('textDocument/hover', {textDocument: {uri}, position: callPosition})).toBeNull();
      expect(await request('textDocument/definition', {textDocument: {uri}, position: callPosition})).toEqual([]);
      expect(await request('phpCompanion/testPauseNextQuery', {method: 'openSourcePublication'})).toBe(true);
      notify('textDocument/didChange', {textDocument: {uri: functionUri, version: 3}, contentChanges: [{text: restored}]});
      await wait(message => message.method === 'window/logMessage'
        && message.params.message === '[test-query-paused] method=openSourcePublication');
      // Query while asynchronous publication is held. The open buffer is the
      // authority even when its restored name has no indexed source identity.
      const completion = await request('textDocument/completion', {textDocument: {uri}, position: argumentPosition});
      expect(completion[0]?.label).toBe(parameter === 'Row' ? '$zRow' : '$aWrong');
      expect((await request('textDocument/signatureHelp', {textDocument: {uri}, position: argumentPosition}))
        ?.signatures?.[0]?.label).toBe(parameter === 'Row' ? 'sendRow(Row $row): string' : 'sendRow(int $changed): string');
      expect((await request('textDocument/hover', {textDocument: {uri}, position: callPosition}))?.contents?.value)
        .toContain(parameter === 'Row' ? 'sendRow(Row $row)' : 'sendRow(int $changed)');
      expect(await request('textDocument/definition', {textDocument: {uri}, position: callPosition})).toEqual(definition);
      expect((await request('phpCompanion/testQueryState', {method: 'openSourcePublication', uri: functionUri}))?.paused).toBe(true);
      expect(await request('phpCompanion/testReleaseQuery', {method: 'openSourcePublication'})).toBe(true);
      await request('shutdown', null);
      const exited = once(server, 'exit'); notify('exit', null); await exited; active = undefined;
      expect(await readFile(join(root, 'src', 'functions.php'), 'utf8')).toBe(functions);
      expect(await readFile(join(root, 'Caller.php'), 'utf8')).toBe(caller);
    } finally {
      if (active) {const exited = once(active, 'exit'); active.kill(); await exited;}
      await rm(root, {recursive: true, force: true});
    }
  }, 40_000);
