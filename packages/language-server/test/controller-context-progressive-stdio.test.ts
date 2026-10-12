import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { mkdtemp, mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { expect, it } from 'vitest';
import { encodeLspMessage, LspMessageDecoder } from '../../testkit/dist/index.js';

function clientFor(server: ChildProcessWithoutNullStreams): {
  send: (message: object) => boolean; request: (method: string, params: unknown) => Promise<any>;
  wait: (match: (value: any) => boolean) => Promise<any>; messages: any[]; dispose: () => void;
} {
  const messages: any[] = [], decoder = new LspMessageDecoder();
  const waiters = new Set<{ match: (value: any) => boolean; resolve: (value: any) => void; reject: (error: Error) => void; timer: ReturnType<typeof setTimeout> }>();
  const send = (message: object): boolean => server.stdin.write(encodeLspMessage({ jsonrpc: '2.0', ...message }));
  const failAll = (error: Error): void => { for (const waiter of waiters) { clearTimeout(waiter.timer); waiter.reject(error); } waiters.clear(); };
  server.on('error', failAll);
  server.on('exit', (code, signal) => failAll(new Error(`LSP exited: ${code}/${signal}`)));
  server.stdout.on('data', chunk => {
    for (const message of decoder.push(chunk) as any[]) {
      messages.push(message);
      if (message.method && message.id !== undefined) send({ id: message.id, result: null });
      for (const waiter of waiters) if (waiter.match(message)) {
        waiters.delete(waiter); clearTimeout(waiter.timer); waiter.resolve(message);
      }
    }
  });
  const wait = (match: (value: any) => boolean): Promise<any> => {
    const found = messages.find(match); if (found) return Promise.resolve(found);
    return new Promise((resolveWait, reject) => {
      const waiter = { match, resolve: resolveWait, reject, timer: setTimeout(() => {
        waiters.delete(waiter); reject(new Error(`LSP timeout: ${JSON.stringify(messages.slice(-8))}`));
      }, 15_000) };
      waiters.add(waiter);
    });
  };
  let nextId = 1;
  const request = async (method: string, params: unknown): Promise<any> => {
    const id = nextId++; send({ id, method, params });
    const response = await wait(message => message.id === id && !message.method);
    expect(response.error).toBeUndefined(); return response.result;
  };
  return { send, request, wait, messages, dispose: (): void => { for (const waiter of waiters) clearTimeout(waiter.timer); waiters.clear(); } };
}

it.each([['7.2', 'onDemand'], ['8.5', 'onDemand'], ['7.2', 'progressive'], ['8.5', 'progressive']] as const)(
  'exports real Symfony contexts and current buffer types at PHP %s in %s', async (phpVersion, indexingMode) => {
    const root = await mkdtemp(join(tmpdir(), 'sophp-progressive-context-'));
    let server: ChildProcessWithoutNullStreams | undefined, client: ReturnType<typeof clientFor> | undefined;
    try {
      await mkdir(join(root, 'src'));
      await writeFile(join(root, 'composer.json'), JSON.stringify({ autoload: { 'psr-4': { 'App\\': 'src/' } } }));
      const controller = join(root, 'src', 'PageController.php'), uri = pathToFileURL(controller).toString();
      const user = join(root, 'src', 'User.php'), userUri = pathToFileURL(user).toString();
      const source = (template: string): string => `<?php namespace App; final class PageController { public function show(): void { $user = new User(); $this->render('${template}', ['user' => $user]); } }`;
      const userSource = (method: string): string => `<?php namespace App; final class User { public function ${method}(): string { return 'Ada'; } }`;
      await writeFile(controller, source('page.html.twig')); await writeFile(user, userSource('getName'));
      server = spawn(process.execPath, [resolve('../../dist/language-server.js'), '--stdio', '--parser-core-wasm', resolve('../../dist/web-tree-sitter.wasm'), '--php-wasm', resolve('../../dist/tree-sitter-php.wasm')], { stdio: 'pipe' });
      client = clientFor(server);
      const rootUri = pathToFileURL(root).toString();
      await client.request('initialize', { processId: null, rootUri, capabilities: {}, initializationOptions: {
        phpVersion, indexingMode, testMode: true, bundledSemanticProviders: [{
          providerId: 'php-companion.symfony.controller-contexts', command: process.execPath,
          args: [resolve('../provider-symfony-controller-contexts/dist/cli.js'), '--parser-core-wasm', resolve('../../dist/web-tree-sitter.wasm'), '--php-wasm', resolve('../../dist/tree-sitter-php.wasm')],
          requiresProjectTypes: true, acceptsDocumentSnapshots: true, replacesControllerContexts: true,
        }],
      } });
      client.send({ method: 'initialized', params: {} });
      const contexts = (): Promise<any> => client!.request('phpCompanion/interop/contexts', { rootUri });
      const check = (result: any, template: string, method = 'getName'): void => {
        expect(result, JSON.stringify(client!.messages.filter(message => message.method === 'window/logMessage'))).not.toBeNull(); expect(result.contexts).toHaveLength(1);
        expect(result.contexts[0]).toMatchObject({ template, variables: [{ name: 'user', type: { kind: 'named', name: 'App\\User' } }] });
        expect(result.types['App\\User'].members).toContainEqual(expect.objectContaining({ name: method, kind: 'method' }));
      };
      check(await contexts(), 'page.html.twig');
      if (indexingMode === 'progressive') {
        await client.wait(message => message.method === 'window/logMessage' && /\[index:\d+\] end /.test(message.params.message));
        check(await contexts(), 'page.html.twig');
      }
      const refreshed = async (documentUri: string, version: number, action: () => void): Promise<void> => {
        const before = client!.messages.length; action();
        await client!.wait(message => client!.messages.indexOf(message) >= before && message.method === 'window/logMessage'
          && message.params.message === `[test-interop-document-refreshed] uri=${documentUri} version=${version}`);
      };
      await refreshed(uri, 1, () => client!.send({ method: 'textDocument/didOpen', params: { textDocument: { uri, languageId: 'php', version: 1, text: source('unsaved.html.twig') } } }));
      check(await contexts(), 'unsaved.html.twig');
      await refreshed(uri, 2, () => client!.send({ method: 'textDocument/didChange', params: { textDocument: { uri, version: 2 }, contentChanges: [{ text: source('changed.html.twig') }] } }));
      check(await contexts(), 'changed.html.twig');
      await refreshed(userUri, 1, () => client!.send({ method: 'textDocument/didOpen', params: { textDocument: { uri: userUri, languageId: 'php', version: 1, text: userSource('getEditedName') } } }));
      const editedTypes = await contexts(); check(editedTypes, 'changed.html.twig', 'getEditedName');
      expect(editedTypes.types['App\\User'].members).not.toContainEqual(expect.objectContaining({ name: 'getName', kind: 'method' }));
      client.send({ method: 'textDocument/didClose', params: { textDocument: { uri: userUri } } });
      client.send({ method: 'textDocument/didClose', params: { textDocument: { uri } } });
      check(await contexts(), 'page.html.twig');
      expect(await readFile(controller, 'utf8')).toBe(source('page.html.twig'));
      const watch = (type: number): void => { client!.send({ method: 'workspace/didChangeWatchedFiles', params: { changes: [{ uri, type }] } }); };
      await writeFile(controller, source('disk.html.twig')); watch(2); check(await contexts(), 'disk.html.twig');
      await rm(controller); watch(3); expect((await contexts()).contexts).toEqual([]);
      await writeFile(controller, source('recreated.html.twig')); watch(1); check(await contexts(), 'recreated.html.twig');
      expect(await readFile(user, 'utf8')).toBe(userSource('getName'));
      const watchUser = (type: number): void => { client!.send({ method: 'workspace/didChangeWatchedFiles', params: { changes: [{ uri: userUri, type }] } }); };
      await writeFile(user, userSource('getDiskName')); watchUser(2);
      check(await contexts(), 'recreated.html.twig', 'getDiskName');
      await rm(user); watchUser(3);
      const removedType = await contexts();
      expect(removedType.contexts).toMatchObject([{ template: 'recreated.html.twig' }]);
      expect(removedType.types['App\\User']?.members ?? []).toEqual([]);
      await writeFile(user, userSource('getName')); watchUser(1);
      check(await contexts(), 'recreated.html.twig');
      await client.request('shutdown', null); client.send({ method: 'exit', params: {} });
    } finally { client?.dispose(); server?.kill(); await rm(root, { recursive: true, force: true }); }
  },
);

it.each([['7.2', 'one'], ['8.5', 'one'], ['7.2', 'all'], ['8.5', 'all']] as const)(
  'shares progressive Controller preparation at PHP %s when %s callers cancel', async (phpVersion, cancellation) => {
    const root = await mkdtemp(join(tmpdir(), 'sophp-progressive-context-cancel-'));
    let server: ChildProcessWithoutNullStreams | undefined, client: ReturnType<typeof clientFor> | undefined;
    try {
      await writeFile(join(root, 'composer.json'), JSON.stringify({ autoload: { 'psr-4': { 'App\\': './' } } }));
      await writeFile(join(root, 'PageController.php'), "<?php namespace App; final class PageController { public function show(): void { $this->render('page.html.twig'); } }");
      const release = join(root, 'release'), calls = join(root, 'calls.txt'), provider = join(root, 'gated-provider.mjs');
      // Delay execution, then forward the unchanged request to the real provider.
      await writeFile(provider, `import { appendFileSync, existsSync } from 'node:fs';import { spawnSync } from 'node:child_process';let input='';for await(const part of process.stdin)input+=part;appendFileSync(${JSON.stringify(calls)},JSON.parse(input).id+'\\n');while(!existsSync(${JSON.stringify(release)}))await new Promise(done=>setTimeout(done,10));const child=spawnSync(process.execPath,${JSON.stringify([resolve('../provider-symfony-controller-contexts/dist/cli.js'), '--parser-core-wasm', resolve('../../dist/web-tree-sitter.wasm'), '--php-wasm', resolve('../../dist/tree-sitter-php.wasm')])},{input,encoding:'utf8'});process.stdout.write(child.stdout??'');process.stderr.write(child.stderr??'');process.exitCode=child.status??1;`);
      server = spawn(process.execPath, [resolve('../../dist/language-server.js'), '--stdio', '--parser-core-wasm', resolve('../../dist/web-tree-sitter.wasm'), '--php-wasm', resolve('../../dist/tree-sitter-php.wasm')], { stdio: 'pipe' });
      client = clientFor(server); const rootUri = pathToFileURL(root).toString();
      await client.request('initialize', { processId: null, rootUri, capabilities: { window: { workDoneProgress: true } }, initializationOptions: {
        phpVersion, indexingMode: 'progressive', bundledSemanticProviders: [{ providerId: 'php-companion.symfony.controller-contexts', command: process.execPath,
          args: [provider], requiresProjectTypes: true, acceptsDocumentSnapshots: true, replacesControllerContexts: true }],
      } });
      client.send({ method: 'initialized', params: {} });
      client.send({ id: 100, method: 'phpCompanion/interop/contexts', params: { rootUri } });
      client.send({ id: 101, method: 'phpCompanion/interop/contexts', params: { rootUri } });
      await client.wait(message => message.method === 'window/logMessage' && message.params.message.startsWith('Reference source facts ready in '));
      const deadline = Date.now() + 5_000;
      while (!await readFile(calls, 'utf8').then(text => text.trim().length > 0, () => false)) {
        if (Date.now() > deadline) throw new Error('Real Controller provider did not reach the gate');
        await new Promise(done => setTimeout(done, 10));
      }
      client.send({ method: '$/cancelRequest', params: { id: 100 } });
      expect((await client.wait(message => message.id === 100 && !message.method)).result).toBeNull();
      expect(client.messages.some(message => message.id === 101 && !message.method)).toBe(false);
      if (cancellation === 'all') {
        client.send({ method: '$/cancelRequest', params: { id: 101 } });
        expect((await client.wait(message => message.id === 101 && !message.method)).result).toBeNull();
        client.send({ id: 102, method: 'phpCompanion/interop/contexts', params: { rootUri } });
      }
      await writeFile(release, 'release');
      const surviving = await client.wait(message => message.id === (cancellation === 'all' ? 102 : 101) && !message.method);
      expect(surviving.error).toBeUndefined(); expect(surviving.result.contexts).toMatchObject([{ template: 'page.html.twig' }]);
      await client.wait(message => message.method === 'window/logMessage' && /\[index:\d+\] end /.test(message.params.message));
      expect((await client.request('phpCompanion/interop/contexts', { rootUri })).contexts).toEqual(surviving.result.contexts);
      expect((await readFile(calls, 'utf8')).trim().split('\n')).toHaveLength(1);
      const begins = client.messages.filter(message => message.method === '$/progress' && message.params.value.kind === 'begin' && message.params.value.title === 'Finding Symfony controller contexts');
      expect(begins).toHaveLength(1);
      expect(client.messages.filter(message => message.method === '$/progress' && message.params.token === begins[0].params.token && message.params.value.kind === 'end')).toHaveLength(1);
      await client.request('shutdown', null); client.send({ method: 'exit', params: {} });
    } finally { client?.dispose(); server?.kill(); await rm(root, { recursive: true, force: true }); }
  },
);
