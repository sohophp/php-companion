import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdir, mkdtemp, readFile, realpath, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { expect, it } from 'vitest';
import { encodeLspMessage, LspMessageDecoder } from '../../testkit/dist/index.js';

const scenarios = ['symfony', 'bundled', 'configured'].flatMap(source =>
  ['7.2', '8.5'].flatMap(phpVersion => [false, true].flatMap(nonempty =>
    ['control', 'duplicate', 'changed'].map(mode => ({ source, phpVersion, nonempty, mode })))));

it.each(scenarios)('keeps unchanged route configuration reference inputs at PHP $phpVersion ($source, $nonempty, $mode)',
  async ({ source, phpVersion, nonempty, mode }) => {
    const owned = await realpath(await mkdtemp(join(tmpdir(), 'sophp-route-config-reference-')));
    const root = join(owned, 'project'), control = join(owned, 'control'), runtime = resolve('../../dist');
    await mkdir(join(root, 'src'), { recursive: true }); await mkdir(join(root, 'config')); await mkdir(control);
    const row = '<?php namespace App; class Row { public function keep(): void {} }\n';
    const use = '<?php namespace App; function run(Row $row): void { $row->keep(); }\n';
    const rootUri = pathToFileURL(root).toString(), rowUri = pathToFileURL(join(root, 'src/Row.php')).toString();
    const useUri = pathToFileURL(join(root, 'src/UseRow.php')).toString();
    await writeFile(join(root, 'composer.json'), JSON.stringify({ autoload: { 'psr-4': { 'App\\': 'src/' } } }));
    await writeFile(join(root, 'src/Row.php'), row); await writeFile(join(root, 'src/UseRow.php'), use);
    await writeFile(join(root, 'config/services.yaml'), 'services:\n  App\\Row:\n    class: App\\Row\n');
    const provider = join(owned, 'event-provider.mjs');
    await writeFile(provider, String.raw`import {existsSync,writeFileSync} from 'node:fs'; import {join} from 'node:path';
const control=process.argv[2]; let input=''; for await(const chunk of process.stdin) input+=chunk;
const request=JSON.parse(input); writeFileSync(join(control,'ready.json'),JSON.stringify({pid:process.pid}));
while(!existsSync(join(control,'release'))) await new Promise(done=>setTimeout(done,5));
process.stdout.write(JSON.stringify({protocolVersion:1,id:request.id,result:{schema:1,providerId:request.id.split(':')[0],generation:request.params.generation,complete:true,methods:[],properties:[],literalMethodReturns:[],eventSubscriptions:[],eventDispatches:[]}}));`);
    const services = { providerId: 'php-companion.symfony.services', command: process.execPath,
      args: [resolve('../provider-symfony-services/dist/cli.js'), '--parser-core-wasm', join(runtime, 'web-tree-sitter.wasm'), '--php-wasm', join(runtime, 'tree-sitter-php.wasm')],
      replacesContainerServices: true, requiresProjectTypes: true, acceptsDocumentSnapshots: true, timeoutMs: 15_000 };
    const events = { providerId: 'vendor.gated.events', command: process.execPath, args: [provider, control],
      replacesEventRelations: true, requiresContainerServices: true, requiresProjectTypes: true, acceptsDocumentSnapshots: true, timeoutMs: 15_000 };
    const routeProvider = { providerId: 'php-companion.symfony.routes', command: process.execPath,
      args: [resolve('../provider-symfony-routes/dist/cli.js'), '--parser-core-wasm', join(runtime, 'web-tree-sitter.wasm'), '--php-wasm', join(runtime, 'tree-sitter-php.wasm')],
      timeoutMs: 15_000, cacheUntilInvalidated: true };
    const configuredRoutes = nonempty || source !== 'symfony' ? [{ uri: rootUri, external: false }] : [];
    const descriptors = nonempty ? [routeProvider] : [];
    const changedDescriptors = [{ ...routeProvider, timeoutMs: 10_000 }];
    const server = spawn(process.execPath, [join(runtime, 'language-server.js'), '--stdio', '--parser-core-wasm',
      join(runtime, 'web-tree-sitter.wasm'), '--php-wasm', join(runtime, 'tree-sitter-php.wasm')], { stdio: 'pipe' });
    const closed = once(server, 'close'), decoder = new LspMessageDecoder(), messages: any[] = [];
    const pending = new Map<number, { done: (response: any) => void; fail: (error: Error) => void; timer: ReturnType<typeof setTimeout> }>();
    let id = 0, stderr = '';
    const send = (message: object): void => { server.stdin.write(encodeLspMessage({ jsonrpc: '2.0', ...message })); };
    server.stderr.on('data', chunk => { stderr += chunk.toString(); });
    server.stdout.on('data', chunk => {
      for (const message of decoder.push(chunk) as any[]) {
        messages.push(message);
        if (message.id !== undefined && message.method) send({ id: message.id, result: null });
        const waiter = pending.get(message.id);
        if (waiter && !message.method) { clearTimeout(waiter.timer); pending.delete(message.id); waiter.done(message); }
      }
    });
    server.on('close', () => {
      for (const waiter of pending.values()) { clearTimeout(waiter.timer); waiter.fail(new Error(`Route configuration server closed: ${stderr}`)); }
      pending.clear();
    });
    const request = (method: string, params: unknown): Promise<any> => {
      const own = ++id;
      const response = new Promise<any>((done, fail) => {
        pending.set(own, { done, fail, timer: setTimeout(() => {
          pending.delete(own); fail(new Error(`${method} timed out: ${stderr}`));
        }, 20_000) });
        send({ id: own, method, params });
      });
      void response.catch(() => {}); return response;
    };
    const query = (): Promise<any> => request('textDocument/references', { textDocument: { uri: useUri },
      position: { line: 0, character: use.indexOf('keep') + 1 }, context: { includeDeclaration: true } });
    const expectReferences = (response: any): void => {
      expect(response.error).toBeUndefined(); expect(response.result).toHaveLength(2);
      for (const [uri, source] of [[rowUri, row], [useUri, use]]) expect(response.result).toContainEqual({ uri,
        range: { start: { line: 0, character: source.indexOf('keep') }, end: { line: 0, character: source.indexOf('keep') + 4 } } });
    };
    try {
      expect((await request('initialize', { processId: null, rootUri, capabilities: {}, initializationOptions: {
        phpVersion, indexingMode: 'onDemand', cacheDirectory: join(owned, 'cache'), bundledSemanticProviders: [services],
        symfonyRouteProviders: configuredRoutes,
        ...(source === 'bundled' ? { bundledRouteProviders: descriptors } : {}),
        ...(source === 'configured' ? { routeProviders: descriptors } : {}),
      } })).error).toBeUndefined();
      send({ method: 'initialized', params: {} });
      for (const [uri, text] of [[rowUri, row], [useUri, use]]) send({ method: 'textDocument/didOpen',
        params: { textDocument: { uri, languageId: 'php', version: 1, text } } });
      expectReferences(await query());
      send({ method: 'phpCompanion/bundledSemanticProviders', params: { providers: [services, events] } });
      const after = messages.length, response = query(), deadline = Date.now() + 15_000;
      while (true) {
        const ready = await readFile(join(control, 'ready.json'), 'utf8').catch(error => {
          if (error.code === 'ENOENT') return undefined; throw error;
        });
        if (ready) break;
        if (Date.now() > deadline) throw new Error('Event provider did not reach the reference gate');
        await new Promise(done => setTimeout(done, 5));
      }
      expect(messages.slice(after).some(message => message.method === 'window/logMessage'
        && /\[references:\d+\] routes elapsedMs=/.test(message.params.message))).toBe(true);
      if (mode !== 'control') {
        if (source === 'symfony') send({ method: 'phpCompanion/symfonyRouteProviders', params: { providers:
          mode === 'changed' ? [{ uri: rootUri, external: false, environment: 'prod' }] : configuredRoutes } });
        else if (source === 'bundled') send({ method: 'phpCompanion/bundledRouteProviders', params: { providers:
          mode === 'changed' ? changedDescriptors : descriptors } });
        else send({ method: 'workspace/didChangeConfiguration', params: { settings: { phpCompanion: { routeProviders:
          mode === 'changed' ? changedDescriptors : descriptors } } } });
      }
      // MethodNotFound confirms the preceding configuration notification was dispatched.
      expect((await request('phpCompanion/privateObservationBarrier', {})).error?.code).toBe(-32601);
      await writeFile(join(control, 'release'), 'yes');
      const result = await response;
      if (mode === 'changed') expect(result.error?.code).toBe(-32801);
      else expectReferences(result);
      expect(await readFile(join(root, 'src/Row.php'), 'utf8')).toBe(row);
      expect(await readFile(join(root, 'src/UseRow.php'), 'utf8')).toBe(use);
    } finally {
      await writeFile(join(control, 'release'), 'yes');
      try {
        if (server.exitCode === null && server.signalCode === null) {
          expect((await request('shutdown', null)).error).toBeUndefined(); send({ method: 'exit', params: null });
        }
        await closed; expect(server.exitCode).toBe(0); expect(stderr).toBe('');
      } finally {
        if (server.exitCode === null && server.signalCode === null) { server.kill(); await closed; }
        await rm(owned, { recursive: true, force: true });
      }
    }
  }, 60_000);
