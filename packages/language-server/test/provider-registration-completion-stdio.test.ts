import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { once } from 'node:events';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import process from 'node:process';
import { pathToFileURL } from 'node:url';
import { expect, it } from 'vitest';
import { encodeLspMessage, LspMessageDecoder } from '../../testkit/dist/index.js';

function clientFor(server: ChildProcessWithoutNullStreams): {
  send: (message: object) => void;
  request: (method: string, params: unknown, timeout?: number) => Promise<any>;
  wait: (match: (message: any) => boolean, timeout?: number) => Promise<any>;
  messages: any[];
} {
  const decoder = new LspMessageDecoder(), messages: any[] = [];
  const waiters = new Set<{ match: (message: any) => boolean; done: (message: any) => void;
    fail: (error: Error) => void; timer: ReturnType<typeof setTimeout> }>();
  const send = (message: object): void => { server.stdin.write(encodeLspMessage({ jsonrpc: '2.0', ...message })); };
  server.stdout.on('data', chunk => {
    for (const message of decoder.push(chunk) as any[]) {
      messages.push(message);
      if (message.id !== undefined && message.method) send({ id: message.id, result: null });
      for (const waiter of waiters) if (waiter.match(message)) {
        waiters.delete(waiter); clearTimeout(waiter.timer); waiter.done(message);
      }
    }
  });
  server.on('exit', () => {
    for (const waiter of waiters) { clearTimeout(waiter.timer); waiter.fail(new Error('Owned LSP exited')); }
    waiters.clear();
  });
  const wait = (match: (message: any) => boolean, timeout = 10_000): Promise<any> => {
    const found = messages.find(match); if (found) return Promise.resolve(found);
    return new Promise((done, fail) => {
      const waiter = { match, done, fail, timer: setTimeout(() => {
        waiters.delete(waiter); fail(new Error('Response waited for the unrelated paused project index'));
      }, timeout) };
      waiters.add(waiter);
    });
  };
  let nextId = 0;
  return { send, wait, messages, request: async (method, params, timeout): Promise<any> => {
    const id = ++nextId; send({ id, method, params });
    const message = await wait(value => value.id === id && !value.method, timeout);
    expect(message.error).toBeUndefined(); return message.result;
  } };
}

it.each(['7.2', '8.5'].flatMap(phpVersion => ['progressive', 'experimental'].map(indexingMode => ({ phpVersion, indexingMode }))))(
  'returns declared PHP members before the provider-registration index is released at PHP $phpVersion in $indexingMode',
  async ({ phpVersion, indexingMode }) => {
    const root = await mkdtemp(join(tmpdir(), 'sophp-registration-completion-'));
    let server: ChildProcessWithoutNullStreams | undefined;
    let client: ReturnType<typeof clientFor> | undefined;
    let exited: Promise<unknown[]> | undefined;
    try {
      await mkdir(join(root, 'src'));
      await writeFile(join(root, 'composer.json'), JSON.stringify({ autoload: { 'psr-4': { 'App\\': 'src/' } } }));
      const source = '<?php namespace App; class Item { public function first(): int { return 1; } } function consume(Item $item): void { $item->fi; }';
      const uri = pathToFileURL(join(root, 'src/Item.php')).toString();
      await writeFile(join(root, 'src/Item.php'), source);
      const provider = join(root, 'provider.mjs');
      await writeFile(provider, `let input='';for await(const part of process.stdin)input+=part;const r=JSON.parse(input);const t=r.params.projectTypes.find(t=>t.fqcn==='App\\\\Item');process.stdout.write(JSON.stringify({protocolVersion:1,id:r.id,result:{schema:1,providerId:'vendor.registration',generation:r.params.generation,complete:true,methods:[{ownerFqcn:t.fqcn,name:'added',returnType:'int',uri:t.uri,start:t.start,end:t.end}],properties:[],literalMethodReturns:[]}}));`);
      server = spawn(process.execPath, [resolve('../../dist/language-server.js'), '--stdio',
        '--parser-core-wasm', resolve('../../dist/web-tree-sitter.wasm'), '--php-wasm', resolve('../../dist/tree-sitter-php.wasm')], { stdio: 'pipe' });
      exited = once(server, 'exit'); client = clientFor(server);
      await client.request('initialize', { processId: null, rootUri: pathToFileURL(root).toString(), capabilities: {},
        initializationOptions: { phpVersion, indexingMode, testMode: true, testPauseNextQueries: ['indexProjectSource'] } });
      client.send({ method: 'initialized', params: {} });
      await client.wait(message => message.method === 'window/logMessage'
        && message.params.message === '[test-query-paused] method=indexProjectSource');
      client.send({ method: 'phpCompanion/bundledSemanticProviders', params: { providers: [{
        providerId: 'vendor.registration', command: process.execPath, args: [provider], requiresProjectTypes: true,
      }] } });
      client.send({ method: 'textDocument/didOpen', params: { textDocument: { uri, languageId: 'php', version: 1, text: source } } });
      const position = { line: 0, character: source.indexOf('->fi') + 4 };
      // The gate stays closed: success proves independence from that index,
      // rather than a faster run that happens to finish indexing first.
      const result = await client.request('textDocument/completion', { textDocument: { uri }, position }, 2_000);
      expect(result.isIncomplete).toBe(true);
      expect(result.items).toContainEqual(expect.objectContaining({ label: 'first', detail: 'App\\Item::first(): int' }));
      expect(await client.request('phpCompanion/testQueryState', { method: 'indexProjectSource', uri })).toMatchObject({ paused: true });
      expect(await client.request('phpCompanion/testReleaseQuery', { method: 'indexProjectSource' })).toBe(true);
      await client.wait(message => message.method === 'window/logMessage'
        && /vendor\.registration.*committed/.test(message.params.message));
      const changed = source.replace('->fi;', '->a;');
      client.send({ method: 'textDocument/didChange', params: { textDocument: { uri, version: 2 }, contentChanges: [{ text: changed }] } });
      const synthetic = await client.request('textDocument/completion', { textDocument: { uri },
        position: { line: 0, character: changed.indexOf('->a') + 3 } });
      expect(synthetic.items).toContainEqual(expect.objectContaining({ label: 'added' }));
    } finally {
      if (server && client && server.exitCode === null && server.signalCode === null) {
        await client.request('phpCompanion/testReleaseQuery', { method: 'indexProjectSource' });
        await client.request('shutdown', null); client.send({ method: 'exit', params: null });
      }
      if (exited) await exited;
      await rm(root, { recursive: true, force: true });
    }
  },
);

it.each(['7.2', '8.5'])(
  'retires replaced synthetic members while returning source members at PHP %s', async phpVersion => {
    const root = await mkdtemp(join(tmpdir(), 'sophp-registration-completion-replacement-'));
    let server: ChildProcessWithoutNullStreams | undefined;
    let client: ReturnType<typeof clientFor> | undefined;
    let exited: Promise<unknown[]> | undefined;
    const calls = join(root, 'calls.jsonl'), release = join(root, 'release');
    try {
      await mkdir(join(root, 'src'));
      await writeFile(join(root, 'composer.json'), JSON.stringify({ autoload: { 'psr-4': { 'App\\': 'src/' } } }));
      const source = '<?php namespace App; class Item { public function first(): int { return 1; } } function consume(Item $item): void { $item->; }';
      const uri = pathToFileURL(join(root, 'src/Item.php')).toString();
      await writeFile(join(root, 'src/Item.php'), source);
      const provider = join(root, 'provider.mjs');
      await writeFile(provider, `import{appendFileSync,existsSync}from'node:fs';let input='';for await(const part of process.stdin)input+=part;const r=JSON.parse(input),state=process.argv[2];appendFileSync(${JSON.stringify(calls)},JSON.stringify({pid:process.pid,state})+'\\n');while(state==='held'&&!existsSync(${JSON.stringify(release)}))await new Promise(done=>setTimeout(done,5));const t=r.params.projectTypes.find(t=>t.fqcn==='App\\\\Item');process.stdout.write(JSON.stringify({protocolVersion:1,id:r.id,result:{schema:1,providerId:'vendor.registration',generation:r.params.generation,complete:true,methods:[{ownerFqcn:t.fqcn,name:state==='held'?'addedNew':'addedOld',returnType:'int',uri:t.uri,start:t.start,end:t.end}],properties:[],literalMethodReturns:[]}}));`);
      const descriptor = (state: string): object => ({ providerId: 'vendor.registration', command: process.execPath,
        args: [provider, state], requiresProjectTypes: true });
      server = spawn(process.execPath, [resolve('../../dist/language-server.js'), '--stdio',
        '--parser-core-wasm', resolve('../../dist/web-tree-sitter.wasm'), '--php-wasm', resolve('../../dist/tree-sitter-php.wasm')], { stdio: 'pipe' });
      exited = once(server, 'exit'); client = clientFor(server);
      await client.request('initialize', { processId: null, rootUri: pathToFileURL(root).toString(), capabilities: {},
        initializationOptions: { phpVersion, indexingMode: 'progressive', bundledSemanticProviders: [descriptor('initial')] } });
      client.send({ method: 'initialized', params: {} });
      await client.wait(message => message.method === 'window/logMessage' && /vendor\.registration.*committed/.test(message.params.message));
      client.send({ method: 'textDocument/didOpen', params: { textDocument: { uri, languageId: 'php', version: 1, text: source } } });
      const params = { textDocument: { uri }, position: { line: 0, character: source.indexOf('->;') + 2 } };
      expect((await client.request('textDocument/completion', params)).items).toContainEqual(expect.objectContaining({ label: 'addedOld' }));
      client.send({ method: 'phpCompanion/bundledSemanticProviders', params: { providers: [descriptor('held')] } });
      const deadline = Date.now() + 10_000;
      while (!await readFile(calls, 'utf8').then(text => text.includes('"state":"held"'))) {
        if (Date.now() > deadline) throw new Error('Replacement provider did not reach its owned gate');
        await new Promise(done => setTimeout(done, 5));
      }
      const before = client.messages.length;
      const pending = await client.request('textDocument/completion', params, 2_000);
      expect(pending.isIncomplete).toBe(true);
      expect(pending.items).toContainEqual(expect.objectContaining({ label: 'first' }));
      expect(pending.items).not.toContainEqual(expect.objectContaining({ label: 'addedOld' }));
      expect(pending.items).not.toContainEqual(expect.objectContaining({ label: 'addedNew' }));
      await writeFile(release, 'yes');
      await client.wait(message => client!.messages.indexOf(message) >= before && message.method === 'window/logMessage'
        && /vendor\.registration.*committed/.test(message.params.message));
      const current = await client.request('textDocument/completion', params);
      expect(current.items).toContainEqual(expect.objectContaining({ label: 'addedNew' }));
      expect(current.items).not.toContainEqual(expect.objectContaining({ label: 'addedOld' }));
    } finally {
      await writeFile(release, 'yes');
      if (server && client && server.exitCode === null && server.signalCode === null) {
        await client.request('shutdown', null); client.send({ method: 'exit', params: null });
      }
      if (exited) await exited;
      const owned = await readFile(calls, 'utf8').then(text => text.trim().split('\n').map(line => JSON.parse(line) as { pid: number }), () => []);
      for (const { pid } of owned) expect(() => process.kill(pid, 0)).toThrow();
      await rm(root, { recursive: true, force: true });
    }
  },
);
