import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { join, resolve, sep } from 'node:path';
import { mkdtemp, mkdir, rename, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { pathToFileURL } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';

function encode(message: object): string {
  const body = JSON.stringify(message);
  return `Content-Length: ${Buffer.byteLength(body)}\r\n\r\n${body}`;
}

function lspPosition(source: string, offset: number): { line: number; character: number } {
  const lines = source.slice(0, offset).split('\n');
  return { line: lines.length - 1, character: lines.at(-1)!.length };
}

function lspOffset(source: string, position: { line: number; character: number }): number {
  const lines = source.split('\n');
  return lines.slice(0, position.line).reduce((total, line) => total + line.length + 1, 0) + position.character;
}

function messagesFrom(process: ChildProcessWithoutNullStreams): {
  messages: object[];
  waitFor: (predicate: (message: any) => boolean, timeoutMs?: number) => Promise<any>;
} {
  const messages: object[] = [];
  const waiters: Array<{ predicate: (message: any) => boolean; resolve: (message: any) => void }> = [];
  let buffer = Buffer.alloc(0);
  process.stdout.on('data', (chunk: Buffer) => {
    buffer = Buffer.concat([buffer, chunk]);
    while (true) {
      const headerEnd = buffer.indexOf('\r\n\r\n');
      if (headerEnd < 0) return;
      const match = /Content-Length: (\d+)/i.exec(buffer.subarray(0, headerEnd).toString('ascii'));
      if (!match) throw new Error('Language server emitted an invalid LSP header.');
      const length = Number(match[1]);
      const bodyStart = headerEnd + 4;
      if (buffer.length < bodyStart + length) return;
      const message = JSON.parse(buffer.subarray(bodyStart, bodyStart + length).toString('utf8')) as object;
      buffer = buffer.subarray(bodyStart + length);
      messages.push(message);
      for (const waiter of [...waiters]) {
        if (waiter.predicate(message)) {
          waiters.splice(waiters.indexOf(waiter), 1);
          waiter.resolve(message);
        }
      }
    }
  });
  return {
    messages,
    waitFor: (predicate, timeoutMs = 5_000): Promise<any> => {
      const existing = messages.find(predicate);
      if (existing) return Promise.resolve(existing);
      return new Promise((resolvePromise, reject) => {
        const timer = setTimeout(() => reject(new Error('Timed out waiting for language server response.')), timeoutMs);
        waiters.push({ predicate, resolve: (message) => { clearTimeout(timer); resolvePromise(message); } });
      });
    },
  };
}

describe('language server stdio', () => {
  let server: ChildProcessWithoutNullStreams | undefined;
  afterEach(() => server?.kill());

  it('restores Symfony YAML and compiled-container facts on a hot language-server start', async () => {
    const root = await mkdtemp(join(tmpdir(), 'php-companion-symfony-hot-'));
    try {
      const cacheDirectory = join(root, '.cache'); const sourceDirectory = join(root, 'src');
      const configDirectory = join(root, 'config'); const containerDirectory = join(root, 'var', 'cache', 'dev');
      await mkdir(sourceDirectory); await mkdir(configDirectory); await mkdir(containerDirectory, { recursive: true });
      const source = `<?php namespace Psr\\Container { interface ContainerInterface { public function get(string $id): mixed; } }
        namespace App { class Mailer { public function send(): void {} }
        function run(\\Psr\\Container\\ContainerInterface $container): void { $container->get('app.mailer')->se; } }`;
      const sourcePath = join(sourceDirectory, 'App.php'); const sourceUri = pathToFileURL(sourcePath).toString();
      await writeFile(join(root, 'composer.json'), JSON.stringify({ autoload: { classmap: ['src/App.php'] } }));
      await writeFile(join(root, 'composer.lock'), '{}');
      await writeFile(sourcePath, source);
      await writeFile(join(configDirectory, 'services.yaml'), 'services:\n  app.mailer:\n    class: App\\Mailer\n    public: true\n');
      await writeFile(join(containerDirectory, 'App_KernelDevDebugContainer.xml'),
        '<?xml version="1.0"?><container><services><service id="app.mailer" class="App\\Mailer" public="true"/></services></container>');
      const rootUri = pathToFileURL(root).toString();
      const start = async (id: number, expectedCached: number): Promise<ReturnType<typeof messagesFrom>> => {
        server = spawn(process.execPath, [resolve('dist/server.js'), '--stdio'], { stdio: 'pipe' });
        const output = messagesFrom(server);
        server.stdin.write(encode({ jsonrpc: '2.0', id, method: 'initialize', params: {
          processId: null, capabilities: {}, rootUri, initializationOptions: { cacheDirectory },
        } }));
        await output.waitFor((message) => message.id === id);
        server.stdin.write(encode({ jsonrpc: '2.0', method: 'initialized', params: {} }));
        await output.waitFor((message) => message.method === 'window/logMessage'
          && message.params?.message?.includes(`Loaded Symfony facts from 2 sources (${expectedCached} cached)`));
        return output;
      };
      const stop = async (output: ReturnType<typeof messagesFrom>, id: number): Promise<void> => {
        server!.stdin.write(encode({ jsonrpc: '2.0', id, method: 'shutdown', params: null }));
        await output.waitFor((message) => message.id === id);
        server!.stdin.write(encode({ jsonrpc: '2.0', method: 'exit', params: null }));
        await new Promise<void>((resolveExit) => server!.once('exit', () => resolveExit()));
      };

      const cold = await start(220, 0); await stop(cold, 221);
      const hot = await start(222, 2);
      server.stdin.write(encode({ jsonrpc: '2.0', method: 'textDocument/didOpen', params: {
        textDocument: { uri: sourceUri, languageId: 'php', version: 1, text: source },
      } }));
      await hot.waitFor((message) => message.method === 'textDocument/publishDiagnostics' && message.params?.uri === sourceUri);
      const offset = source.indexOf('->se') + 4;
      server.stdin.write(encode({ jsonrpc: '2.0', id: 223, method: 'textDocument/completion', params: {
        textDocument: { uri: sourceUri }, position: lspPosition(source, offset),
      } }));
      expect((await hot.waitFor((message) => message.id === 223)).result).toContainEqual(expect.objectContaining({ label: 'send' }));
      await stop(hot, 224);
    } finally { await rm(root, { recursive: true, force: true }); }
  });

  it('restores validated transitive callable factory facts on a hot language-server start', async () => {
    const root = await mkdtemp(join(tmpdir(), 'php-companion-callable-hot-'));
    try {
      const cacheDirectory = join(root, '.cache'); const sourceDirectory = join(root, 'src'); await mkdir(sourceDirectory);
      const consumer = '<?php namespace HotCallable; class Consumer { public function run(): void { $state = outer(); foreach ($state as &$value) {} } }';
      const consumerPath = join(sourceDirectory, 'Consumer.php'); const consumerUri = pathToFileURL(consumerPath).toString();
      await writeFile(join(root, 'composer.json'), JSON.stringify({ autoload: { classmap: ['src'] } }));
      await writeFile(join(root, 'composer.lock'), '{}');
      await writeFile(join(sourceDirectory, 'Inner.php'), '<?php namespace HotCallable; class State { public function __construct(public readonly int $id) {} } function inner(): State { return new State(1); }');
      await writeFile(join(sourceDirectory, 'Middle.php'), '<?php namespace HotCallable; function middle(): State { return inner(); }');
      await writeFile(join(sourceDirectory, 'Outer.php'), '<?php namespace HotCallable; function outer(): State { return middle(); }');
      await writeFile(consumerPath, consumer);
      const rootUri = pathToFileURL(root).toString();
      const start = async (id: number, restored: number, deferred: number): Promise<ReturnType<typeof messagesFrom>> => {
        server = spawn(process.execPath, [resolve('dist/server.js'), '--stdio'], { stdio: 'pipe' });
        const output = messagesFrom(server);
        server.stdin.write(encode({ jsonrpc: '2.0', id, method: 'initialize', params: {
          processId: null, capabilities: {}, rootUri, initializationOptions: { cacheDirectory },
        } }));
        await output.waitFor((message) => message.id === id);
        server.stdin.write(encode({ jsonrpc: '2.0', method: 'initialized', params: {} }));
        await output.waitFor((message) => message.method === 'window/logMessage'
          && message.params?.message?.includes(`Restored ${restored} callable factory facts`));
        await output.waitFor((message) => message.method === 'window/logMessage'
          && message.params?.message?.includes(`deferred implementations=${deferred}`));
        return output;
      };
      const openAndDiagnose = async (output: ReturnType<typeof messagesFrom>, version: number): Promise<void> => {
        server!.stdin.write(encode({ jsonrpc: '2.0', method: 'textDocument/didOpen', params: {
          textDocument: { uri: consumerUri, languageId: 'php', version, text: consumer },
        } }));
        const diagnostics = await output.waitFor((message) => message.method === 'textDocument/publishDiagnostics'
          && message.params?.uri === consumerUri && message.params?.diagnostics?.some((item: any) => item.code === 'php.assignment.readonly-property'));
        expect(diagnostics.params.diagnostics).toContainEqual(expect.objectContaining({ code: 'php.assignment.readonly-property' }));
      };
      const stop = async (output: ReturnType<typeof messagesFrom>, id: number): Promise<void> => {
        server!.stdin.write(encode({ jsonrpc: '2.0', id, method: 'shutdown', params: null }));
        await output.waitFor((message) => message.id === id);
        server!.stdin.write(encode({ jsonrpc: '2.0', method: 'exit', params: null }));
        await new Promise<void>((resolveExit) => server!.once('exit', () => resolveExit()));
      };

      const cold = await start(225, 0, 0); await openAndDiagnose(cold, 1); await stop(cold, 226);
      const hot = await start(227, 3, 4); await openAndDiagnose(hot, 1); await stop(hot, 228);
    } finally { await rm(root, { recursive: true, force: true }); }
  });

  it('combines resource settings with explicit Composer platform extension exclusions and refreshes resource settings', async () => {
    const root = await mkdtemp(join(tmpdir(), 'php-companion-extensions-'));
    try {
      const rootUri = pathToFileURL(root).toString();
      const path = join(root, 'ExtensionConsumer.php'); const uri = pathToFileURL(path).toString();
      const source = '<?php use DOMDocument as ImportedDocument; use function mb_strlen as mb_length; use const FILTER_VALIDATE_INT as FILTER_INT; $document = new DOMDocument(); $imported = new ImportedDocument(); mb_strlen("text"); mb_length("text"); filter_var("1", FILTER_VALIDATE_INT); filter_var("1", FILTER_INT); $reader = new XMLReader(); $pdo = new PDO("sqlite::memory:");';
      await writeFile(join(root, 'composer.json'), JSON.stringify({ config: { platform: { 'ext-mbstring': false } }, autoload: { files: ['ExtensionConsumer.php'] } }));
      await writeFile(path, source);
      server = spawn(process.execPath, [resolve('dist/server.js'), '--stdio'], { stdio: 'pipe' });
      const output = messagesFrom(server);
      server.stdin.write(encode({ jsonrpc: '2.0', id: 201, method: 'initialize', params: {
        processId: null, capabilities: {}, rootUri,
        initializationOptions: { phpExtensionAvailability: [{
          uri: rootUri, disabledExtensions: ['dom', 'filter', 'unknown-extension'],
          runtime: { executable: '/usr/bin/php8.5', version: '8.5.3', versionId: 80503, sapi: 'cli',
            loadedExtensions: ['core', 'dom', 'filter', 'mbstring', 'pdo', 'simplexml', 'xml', 'xmlwriter'], scannedConfigurationFiles: [] },
        }] },
      } }));
      await output.waitFor((message) => message.id === 201);
      server.stdin.write(encode({ jsonrpc: '2.0', method: 'initialized', params: {} }));
      await output.waitFor((message) => message.method === 'window/logMessage' && message.params?.message?.includes('complete=true'));
      server.stdin.write(encode({ jsonrpc: '2.0', method: 'textDocument/didOpen', params: { textDocument: { uri, languageId: 'php', version: 1, text: source } } }));
      const initialDiagnostics = await output.waitFor((message) => message.method === 'textDocument/publishDiagnostics' && message.params?.uri === uri
        && message.params.diagnostics.some((diagnostic: any) => diagnostic.code === 'php.extension.unavailable'));
      const unavailable = initialDiagnostics.params.diagnostics.filter((diagnostic: any) => diagnostic.code === 'php.extension.unavailable');
      expect(unavailable.map((diagnostic: any) => source.slice(lspOffset(source, diagnostic.range.start), lspOffset(source, diagnostic.range.end))))
        .toEqual(['DOMDocument', 'ImportedDocument', 'XMLReader', 'mb_strlen', 'mb_length', 'filter_var', 'filter_var', 'FILTER_VALIDATE_INT', 'FILTER_INT']);
      expect(unavailable.map((diagnostic: any) => diagnostic.data.extensions)).toEqual([
        [expect.objectContaining({ extension: 'dom', setting: true, composer: false })],
        [expect.objectContaining({ extension: 'dom', setting: true, composer: false })],
        [expect.objectContaining({ extension: 'xmlreader', setting: false, composer: false, runtime: true,
          detectedRuntime: expect.objectContaining({ executable: '/usr/bin/php8.5', version: '8.5.3', sapi: 'cli' }) })],
        [expect.objectContaining({ extension: 'mbstring', setting: false, composer: true })],
        [expect.objectContaining({ extension: 'mbstring', setting: false, composer: true })],
        [expect.objectContaining({ extension: 'filter', setting: true, composer: false })],
        [expect.objectContaining({ extension: 'filter', setting: true, composer: false })],
        [expect.objectContaining({ extension: 'filter', setting: true, composer: false })],
        [expect.objectContaining({ extension: 'filter', setting: true, composer: false })],
      ]);
      expect(initialDiagnostics.params.diagnostics.some((diagnostic: any) => diagnostic.code === 'php.type.unresolved'
        || diagnostic.code === 'php.function.unresolved' || diagnostic.code === 'php.constant.unresolved')).toBe(false);
      const definition = async (id: number, needle: string): Promise<any[]> => {
        server!.stdin.write(encode({ jsonrpc: '2.0', id, method: 'textDocument/definition', params: { textDocument: { uri }, position: lspPosition(source, source.lastIndexOf(needle) + 2) } }));
        return (await output.waitFor((message) => message.id === id)).result;
      };
      expect(await definition(202, 'DOMDocument')).toEqual([]);
      expect(await definition(203, 'mb_strlen')).toEqual([]);
      expect(await definition(204, 'PDO(')).toMatchObject([{ uri: 'php-companion-builtin:/common-core.php' }]);

      server.stdin.write(encode({ jsonrpc: '2.0', method: 'phpCompanion/phpExtensionAvailability', params: { roots: [{
        uri: rootUri, disabledExtensions: [], runtime: { executable: '/usr/bin/php8.5', version: '8.5.3', versionId: 80503, sapi: 'cli',
          loadedExtensions: ['core', 'dom', 'filter', 'mbstring', 'pdo', 'simplexml', 'xml', 'xmlwriter'], scannedConfigurationFiles: [] },
      }] } }));
      const refreshedDiagnostics = await output.waitFor((message) => message.method === 'textDocument/publishDiagnostics' && message.params?.uri === uri
        && message.params.diagnostics.filter((diagnostic: any) => diagnostic.code === 'php.extension.unavailable').length === 3);
      expect(refreshedDiagnostics.params.diagnostics.filter((diagnostic: any) => diagnostic.code === 'php.extension.unavailable')
        .map((diagnostic: any) => diagnostic.data.extensions))
        .toEqual([
          [expect.objectContaining({ extension: 'xmlreader', setting: false, composer: false, runtime: true })],
          [expect.objectContaining({ extension: 'mbstring', setting: false, composer: true })],
          [expect.objectContaining({ extension: 'mbstring', setting: false, composer: true })],
        ]);
      expect(await definition(205, 'DOMDocument')).toMatchObject([{ uri: 'php-companion-builtin:/common-core.php' }]);
      expect(await definition(206, 'mb_strlen')).toEqual([]);
      expect(await definition(207, 'XMLReader')).toEqual([]);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it('ignores runtime extension absence when the detected PHP minor differs from the target', async () => {
    const root = await mkdtemp(join(tmpdir(), 'php-companion-runtime-mismatch-'));
    try {
      const rootUri = pathToFileURL(root).toString(); const path = join(root, 'RuntimeConsumer.php');
      const uri = pathToFileURL(path).toString(); const source = '<?php $reader = new XMLReader();';
      await writeFile(join(root, 'composer.json'), JSON.stringify({ autoload: { files: ['RuntimeConsumer.php'] } })); await writeFile(path, source);
      server = spawn(process.execPath, [resolve('dist/server.js'), '--stdio'], { stdio: 'pipe' }); const output = messagesFrom(server);
      server.stdin.write(encode({ jsonrpc: '2.0', id: 208, method: 'initialize', params: { processId: null, capabilities: {}, rootUri,
        initializationOptions: { phpVersion: '8.5', phpExtensionAvailability: [{ uri: rootUri, disabledExtensions: [], runtime: {
          executable: '/usr/bin/php8.4', version: '8.4.12', versionId: 80412, sapi: 'cli', loadedExtensions: [], scannedConfigurationFiles: [],
        } }] } } }));
      await output.waitFor((message) => message.id === 208); server.stdin.write(encode({ jsonrpc: '2.0', method: 'initialized', params: {} }));
      await output.waitFor((message) => message.method === 'window/logMessage' && message.params?.message?.includes('complete=true'));
      server.stdin.write(encode({ jsonrpc: '2.0', method: 'textDocument/didOpen', params: { textDocument: { uri, languageId: 'php', version: 1, text: source } } }));
      const diagnostics = await output.waitFor((message) => message.method === 'textDocument/publishDiagnostics' && message.params?.uri === uri);
      expect(diagnostics.params.diagnostics.some((diagnostic: any) => diagnostic.code === 'php.extension.unavailable')).toBe(false);
    } finally { await rm(root, { recursive: true, force: true }); }
  });

  it('refreshes Composer platform extension exclusions after a watched manifest change', async () => {
    const root = await mkdtemp(join(tmpdir(), 'php-companion-composer-extensions-'));
    try {
      const path = join(root, 'ExtensionConsumer.php'); const uri = pathToFileURL(path).toString();
      const composerPath = join(root, 'composer.json'); const source = '<?php mb_strlen("text");';
      await writeFile(composerPath, JSON.stringify({ config: { platform: { 'ext-mbstring': false } }, autoload: { files: ['ExtensionConsumer.php'] } }));
      await writeFile(path, source);
      server = spawn(process.execPath, [resolve('dist/server.js'), '--stdio'], { stdio: 'pipe' });
      const output = messagesFrom(server);
      server.stdin.write(encode({ jsonrpc: '2.0', id: 211, method: 'initialize', params: { processId: null, capabilities: {}, rootUri: pathToFileURL(root).toString() } }));
      await output.waitFor((message) => message.id === 211);
      server.stdin.write(encode({ jsonrpc: '2.0', method: 'initialized', params: {} }));
      await output.waitFor((message) => message.method === 'window/logMessage' && message.params?.message?.includes('complete=true'));
      server.stdin.write(encode({ jsonrpc: '2.0', method: 'textDocument/didOpen', params: { textDocument: { uri, languageId: 'php', version: 1, text: source } } }));
      const unavailableDiagnostics = await output.waitFor((message) => message.method === 'textDocument/publishDiagnostics' && message.params?.uri === uri
        && message.params.diagnostics.some((diagnostic: any) => diagnostic.code === 'php.extension.unavailable'));
      expect(unavailableDiagnostics.params.diagnostics).toContainEqual(expect.objectContaining({
        code: 'php.extension.unavailable', data: expect.objectContaining({ fqcn: 'mb_strlen' }),
      }));
      const definition = async (id: number): Promise<any[]> => {
        server!.stdin.write(encode({ jsonrpc: '2.0', id, method: 'textDocument/definition', params: { textDocument: { uri }, position: lspPosition(source, source.indexOf('mb_strlen') + 2) } }));
        return (await output.waitFor((message) => message.id === id)).result;
      };
      expect(await definition(212)).toEqual([]);
      await writeFile(composerPath, JSON.stringify({ autoload: { files: ['ExtensionConsumer.php'] } }));
      server.stdin.write(encode({ jsonrpc: '2.0', method: 'workspace/didChangeWatchedFiles', params: { changes: [{ uri: pathToFileURL(composerPath).toString(), type: 2 }] } }));
      await output.waitFor((message) => message.method === 'window/logMessage' && message.params?.message?.includes('complete=true')
        && output.messages.filter((candidate: any) => candidate.method === 'window/logMessage' && candidate.params?.message?.includes('complete=true')).length >= 2);
      await output.waitFor((message) => message.method === 'textDocument/publishDiagnostics' && message.params?.uri === uri
        && message.params.diagnostics.every((diagnostic: any) => diagnostic.code !== 'php.extension.unavailable'));
      expect(await definition(213)).toMatchObject([{ uri: 'php-companion-builtin:/common-core.php' }]);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it('keeps open buffers authoritative across watched create, delete, move, and Composer autoload changes', async () => {
    const root = await mkdtemp(join(tmpdir(), 'php-companion-lifecycle-'));
    try {
      const sourceDirectory = join(root, 'src'); const mappedDirectory = join(root, 'mapped');
      await mkdir(sourceDirectory); await mkdir(mappedDirectory);
      const composerPath = join(root, 'composer.json');
      await writeFile(composerPath, JSON.stringify({ autoload: { 'psr-4': { 'App\\': 'src/' } } }));
      const servicePath = join(sourceDirectory, 'Service.php'); const movedServicePath = join(sourceDirectory, 'MovedService.php');
      const addedPath = join(sourceDirectory, 'Added.php'); const mappedPath = join(mappedDirectory, 'MappedService.php');
      const consumerPath = join(sourceDirectory, 'Consumer.php');
      await writeFile(servicePath, '<?php namespace App; class Service { public function fromOpenBuffer(): void {} }');
      await writeFile(mappedPath, '<?php namespace Mapped; class MappedService { public function mappedMethod(): void {} }');
      await writeFile(consumerPath, '<?php namespace App; function disk(Service $service): void { $service->diskOnly; }');
      const openSource = `<?php namespace App;
        function run(Service $service): void {
          $service->fromOpenB;
          $added = new Add;
          $mapped = new \\Mapped\\MappedService;
        }`;
      const rootUri = pathToFileURL(root).toString(); const consumerUri = pathToFileURL(consumerPath).toString();
      const serviceUri = pathToFileURL(servicePath).toString(); const movedServiceUri = pathToFileURL(movedServicePath).toString();
      const addedUri = pathToFileURL(addedPath).toString(); const mappedUri = pathToFileURL(mappedPath).toString();
      server = spawn(process.execPath, [resolve('dist/server.js'), '--stdio'], { stdio: 'pipe' });
      const output = messagesFrom(server);
      server.stdin.write(encode({ jsonrpc: '2.0', id: 214, method: 'initialize', params: { processId: null, capabilities: { workspace: { didChangeWatchedFiles: { dynamicRegistration: true } } }, rootUri } }));
      await output.waitFor((message) => message.id === 214);
      server.stdin.write(encode({ jsonrpc: '2.0', method: 'initialized', params: {} }));
      const registration = await output.waitFor((message) => message.method === 'client/registerCapability');
      server.stdin.write(encode({ jsonrpc: '2.0', id: registration.id, result: null }));
      let completedIndexes = 0;
      const waitForNextIndex = async (): Promise<void> => {
        completedIndexes += 1;
        await output.waitFor((message) => message.method === 'window/logMessage' && message.params?.message?.includes('complete=true')
          && output.messages.filter((candidate: any) => candidate.method === 'window/logMessage' && candidate.params?.message?.includes('complete=true')).length >= completedIndexes);
      };
      await waitForNextIndex();
      server.stdin.write(encode({ jsonrpc: '2.0', method: 'textDocument/didOpen', params: { textDocument: { uri: consumerUri, languageId: 'php', version: 1, text: openSource } } }));
      await output.waitFor((message) => message.method === 'textDocument/publishDiagnostics' && message.params.uri === consumerUri);
      const completion = async (id: number, marker: string): Promise<any[]> => {
        server!.stdin.write(encode({ jsonrpc: '2.0', id, method: 'textDocument/completion', params: { textDocument: { uri: consumerUri }, position: lspPosition(openSource, openSource.indexOf(marker) + marker.length) } }));
        return (await output.waitFor((message) => message.id === id)).result;
      };
      expect(await completion(215, 'fromOpenB')).toMatchObject([{ label: 'fromOpenBuffer' }]);

      await writeFile(consumerPath, '<?php namespace App; function changedOnDisk(): void {}');
      server.stdin.write(encode({ jsonrpc: '2.0', method: 'workspace/didChangeWatchedFiles', params: { changes: [{ uri: consumerUri, type: 2 }] } }));
      await new Promise((resolvePromise) => setTimeout(resolvePromise, 50));
      expect(await completion(216, 'fromOpenB')).toMatchObject([{ label: 'fromOpenBuffer' }]);

      await writeFile(addedPath, '<?php namespace App; class Added { public function addedMethod(): void {} }');
      server.stdin.write(encode({ jsonrpc: '2.0', method: 'workspace/didChangeWatchedFiles', params: { changes: [{ uri: addedUri, type: 1 }] } }));
      await waitForNextIndex();
      expect(await completion(217, 'Add')).toEqual(expect.arrayContaining([expect.objectContaining({ label: 'Added' })]));

      await rm(addedPath);
      server.stdin.write(encode({ jsonrpc: '2.0', method: 'workspace/didChangeWatchedFiles', params: { changes: [{ uri: addedUri, type: 3 }] } }));
      await waitForNextIndex();
      expect((await completion(218, 'Add')).some((item) => item.label === 'Added')).toBe(false);

      await rename(servicePath, movedServicePath);
      server.stdin.write(encode({ jsonrpc: '2.0', method: 'workspace/didChangeWatchedFiles', params: { changes: [{ uri: serviceUri, type: 3 }, { uri: movedServiceUri, type: 1 }] } }));
      await waitForNextIndex();
      const serviceOffset = openSource.indexOf('Service $service') + 2;
      server.stdin.write(encode({ jsonrpc: '2.0', id: 219, method: 'textDocument/definition', params: { textDocument: { uri: consumerUri }, position: lspPosition(openSource, serviceOffset) } }));
      expect((await output.waitFor((message) => message.id === 219)).result).toMatchObject([{ uri: movedServiceUri }]);
      expect(await completion(220, 'fromOpenB')).toMatchObject([{ label: 'fromOpenBuffer' }]);

      const mappedOffset = openSource.indexOf('MappedService') + 2;
      server.stdin.write(encode({ jsonrpc: '2.0', id: 221, method: 'textDocument/definition', params: { textDocument: { uri: consumerUri }, position: lspPosition(openSource, mappedOffset) } }));
      expect((await output.waitFor((message) => message.id === 221)).result).toEqual([]);
      await writeFile(composerPath, JSON.stringify({ autoload: { 'psr-4': { 'App\\': 'src/', 'Mapped\\': 'mapped/' } } }));
      server.stdin.write(encode({ jsonrpc: '2.0', method: 'workspace/didChangeWatchedFiles', params: { changes: [{ uri: pathToFileURL(composerPath).toString(), type: 2 }] } }));
      await waitForNextIndex();
      server.stdin.write(encode({ jsonrpc: '2.0', id: 222, method: 'textDocument/definition', params: { textDocument: { uri: consumerUri }, position: lspPosition(openSource, mappedOffset) } }));
      expect((await output.waitFor((message) => message.id === 222)).result).toMatchObject([{ uri: mappedUri }]);
      expect(await completion(223, 'fromOpenB')).toMatchObject([{ label: 'fromOpenBuffer' }]);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it('renames a unique type and its matching PSR-4 file through documentChanges', async () => {
    const root = await mkdtemp(join(tmpdir(), 'php-companion-type-rename-'));
    try {
      await mkdir(join(root, 'src'), { recursive: true });
      await writeFile(join(root, 'composer.json'), JSON.stringify({ autoload: { 'psr-4': { 'App\\': 'src/' } } }));
      const declaration = '<?php namespace App; class OldName {}';
      const source = '<?php namespace App; /** @return OldName */ function make(OldName $value): OldName { return new OldName(); } function imported(): UniqueService {}';
      const declarationPath = join(root, 'src', 'OldName.php'); const sourcePath = join(root, 'src', 'UseType.php');
      const mismatchedPath = join(root, 'src', 'WrongFile.php'); const mismatchedUri = pathToFileURL(mismatchedPath).toString();
      const declarationUri = pathToFileURL(declarationPath).toString(); const uri = pathToFileURL(sourcePath).toString();
      await mkdir(join(root, 'src', 'External'), { recursive: true });
      await writeFile(declarationPath, declaration); await writeFile(sourcePath, source);
      await writeFile(mismatchedPath, '<?php namespace App; class RightFile {}');
      await writeFile(join(root, 'src', 'External', 'UniqueService.php'), '<?php namespace App\\External; class UniqueService {}');
      server = spawn(process.execPath, [resolve('dist/server.js'), '--stdio'], { stdio: 'pipe' });
      const output = messagesFrom(server);
      server.stdin.write(encode({ jsonrpc: '2.0', id: 101, method: 'initialize', params: { processId: null, capabilities: {}, rootUri: pathToFileURL(root).toString() } }));
      await output.waitFor((message) => message.id === 101);
      server.stdin.write(encode({ jsonrpc: '2.0', method: 'initialized', params: {} }));
      await output.waitFor((message) => message.method === 'window/logMessage' && message.params?.message?.includes('complete=true'));
      server.stdin.write(encode({ jsonrpc: '2.0', method: 'textDocument/didOpen', params: { textDocument: { uri, languageId: 'php', version: 1, text: source } } }));
      server.stdin.write(encode({ jsonrpc: '2.0', method: 'textDocument/didOpen', params: { textDocument: { uri: mismatchedUri, languageId: 'php', version: 1, text: '<?php namespace App; class RightFile {}' } } }));
      const mismatchDiagnostics = (await output.waitFor((message) => message.method === 'textDocument/publishDiagnostics'
        && message.params?.uri === mismatchedUri && message.params.diagnostics?.some((item: { code?: string }) => item.code === 'php.type.filename'))).params.diagnostics;
      const filenameDiagnostic = mismatchDiagnostics.find((item: { code?: string }) => item.code === 'php.type.filename');
      server.stdin.write(encode({ jsonrpc: '2.0', id: 112, method: 'textDocument/codeAction', params: {
        textDocument: { uri: mismatchedUri }, range: filenameDiagnostic.range, context: { diagnostics: [filenameDiagnostic] },
      } }));
      expect((await output.waitFor((message) => message.id === 112)).result).toEqual(expect.arrayContaining([expect.objectContaining({
        edit: { documentChanges: [expect.objectContaining({ kind: 'rename', oldUri: mismatchedUri, newUri: pathToFileURL(join(root, 'src', 'RightFile.php')).toString() })] },
      })]));
      const position = lspPosition(source, source.indexOf('OldName $') + 2);
      server.stdin.write(encode({ jsonrpc: '2.0', id: 102, method: 'textDocument/prepareRename', params: { textDocument: { uri }, position } }));
      expect((await output.waitFor((message) => message.id === 102)).result).toMatchObject({ placeholder: 'OldName' });
      server.stdin.write(encode({ jsonrpc: '2.0', id: 103, method: 'textDocument/rename', params: {
        textDocument: { uri }, position, newName: 'NewName', phpCompanion: { renameFile: true, includePhpDoc: false },
      } }));
      const edit = (await output.waitFor((message) => message.id === 103)).result;
      expect(edit.changes).toBeUndefined();
      expect(edit.documentChanges.at(-1)).toMatchObject({ kind: 'rename', oldUri: declarationUri, newUri: pathToFileURL(join(root, 'src', 'NewName.php')).toString() });
      const textChanges = edit.documentChanges.slice(0, -1);
      expect(textChanges.find((change: { textDocument: { uri: string } }) => change.textDocument.uri === declarationUri)?.edits).toHaveLength(1);
      const useEdits = textChanges.find((change: { textDocument: { uri: string } }) => change.textDocument.uri === uri)?.edits;
      expect(useEdits).toHaveLength(3);
      expect(useEdits.every((item: { newText: string }) => item.newText === 'NewName')).toBe(true);
      const importStart = source.indexOf('UniqueService'); const importPosition = lspPosition(source, importStart + 2);
      server.stdin.write(encode({ jsonrpc: '2.0', id: 104, method: 'phpCompanion/importCandidates', params: { textDocument: { uri }, position: importPosition, name: 'UniqueService' } }));
      const candidates = (await output.waitFor((message) => message.id === 104)).result;
      expect(candidates).toMatchObject([{ fqcn: 'App\\External\\UniqueService', aliasRequired: false }]);
      server.stdin.write(encode({ jsonrpc: '2.0', id: 105, method: 'phpCompanion/addImport', params: {
        textDocument: { uri }, position: importPosition,
        range: { start: lspPosition(source, importStart), end: lspPosition(source, importStart + 'UniqueService'.length) },
        name: 'UniqueService', fqcn: 'App\\External\\UniqueService',
      } }));
      const importEdit = (await output.waitFor((message) => message.id === 105)).result;
      expect(importEdit.changes[uri]).toMatchObject([{ newText: expect.stringContaining('use App\\External\\UniqueService;') }]);
      const copiedStart = source.indexOf('OldName $');
      server.stdin.write(encode({ jsonrpc: '2.0', id: 106, method: 'phpCompanion/copyTypeSymbols', params: {
        textDocument: { uri }, ranges: [{ start: lspPosition(source, copiedStart), end: lspPosition(source, copiedStart + 'OldName'.length) }],
      } }));
      expect((await output.waitFor((message) => message.id === 106)).result).toMatchObject([{ fqcn: 'App\\OldName', alias: 'OldName' }]);
      server.stdin.write(encode({ jsonrpc: '2.0', id: 107, method: 'phpCompanion/planTypeImports', params: {
        textDocument: { uri }, position: importPosition, symbols: [{ fqcn: 'App\\External\\UniqueService', sourceAlias: 'UniqueService' }],
      } }));
      expect((await output.waitFor((message) => message.id === 107)).result).toMatchObject({
        replacements: {}, edit: { changes: { [uri]: [{ newText: expect.stringContaining('use App\\External\\UniqueService;') }] } },
      });
      server.stdin.write(encode({ jsonrpc: '2.0', id: 108, method: 'phpCompanion/unresolvedTypeNames', params: { textDocument: { uri } } }));
      expect((await output.waitFor((message) => message.id === 108)).result).toEqual(expect.arrayContaining([expect.objectContaining({ name: 'UniqueService' })]));
      const movedDeclarationUri = pathToFileURL(join(root, 'src', 'Moved', 'OldName.php')).toString();
      await mkdir(join(root, 'src', 'Moved'), { recursive: true });
      await rename(declarationPath, join(root, 'src', 'Moved', 'OldName.php'));
      server.stdin.write(encode({ jsonrpc: '2.0', id: 1081, method: 'phpCompanion/planSafeMove', params: {
        moves: [{ oldUri: declarationUri, newUri: movedDeclarationUri, source: declaration }], includeFileOperations: false,
      } }));
      const racedMove = (await output.waitFor((message) => message.id === 1081)).result;
      expect(racedMove.error).toBeUndefined();
      expect(racedMove.edit.changes[movedDeclarationUri]).toEqual(expect.arrayContaining([expect.objectContaining({ newText: 'App\\Moved' })]));
      await rename(join(root, 'src', 'Moved', 'OldName.php'), declarationPath);
      server.stdin.write(encode({ jsonrpc: '2.0', id: 109, method: 'phpCompanion/planSafeMove', params: {
        moves: [{ oldUri: declarationUri, newUri: movedDeclarationUri }], includeFileOperations: true,
      } }));
      const move = (await output.waitFor((message) => message.id === 109)).result;
      expect(move.error).toBeUndefined();
      expect(move.edit.documentChanges[0]).toMatchObject({ kind: 'rename', oldUri: declarationUri, newUri: movedDeclarationUri });
      expect(move.edit.documentChanges.find((change: { textDocument?: { uri: string } }) => change.textDocument?.uri === movedDeclarationUri)?.edits)
        .toEqual(expect.arrayContaining([expect.objectContaining({ newText: 'App\\Moved' })]));
      expect(move.edit.documentChanges.find((change: { textDocument?: { uri: string } }) => change.textDocument?.uri === uri)?.edits)
        .toEqual(expect.arrayContaining([expect.objectContaining({ newText: '\\App\\Moved\\OldName' })]));
      server.stdin.write(encode({ jsonrpc: '2.0', method: 'textDocument/didChange', params: {
        textDocument: { uri, version: 2 }, contentChanges: [{ text: `${source} ` }],
      } }));
      server.stdin.write(encode({ jsonrpc: '2.0', id: 110, method: 'phpCompanion/planSafeMove', params: {
        moves: [{ oldUri: declarationUri, newUri: movedDeclarationUri }], includeFileOperations: true,
      } }));
      expect((await output.waitFor((message) => message.id === 110)).result.error).toContain('save related file');
      server.stdin.write(encode({ jsonrpc: '2.0', method: 'textDocument/didChange', params: {
        textDocument: { uri, version: 3 }, contentChanges: [{ text: source }],
      } }));
      await rename(declarationPath, join(root, 'src', 'Moved', 'OldName.php'));
      server.stdin.write(encode({ jsonrpc: '2.0', id: 111, method: 'phpCompanion/reconcileSafeMove', params: { moves: move.reconciliation } }));
      const reconciliation = (await output.waitFor((message) => message.id === 111, 10_000)).result;
      expect(reconciliation.error).toBeUndefined();
      expect(reconciliation.edit.changes[movedDeclarationUri]).toEqual(expect.arrayContaining([expect.objectContaining({ newText: 'App\\Moved' })]));
      expect(reconciliation.edit.changes[uri]).toEqual(expect.arrayContaining([expect.objectContaining({ newText: '\\App\\Moved\\OldName' })]));
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it('completes static YAML routes only for proven Symfony methods and observes unsaved route edits', async () => {
    const root = await mkdtemp(join(tmpdir(), 'php-companion-route-completion-'));
    try {
      await mkdir(join(root, 'config', 'routes'), { recursive: true });
      await writeFile(join(root, 'composer.json'), JSON.stringify({ autoload: { classmap: ['./Controller.php'] } }));
      const source = String.raw`<?php
namespace Symfony\Bundle\FrameworkBundle\Controller { abstract class AbstractController { public function generateUrl(string $route, array $parameters = []): string {} } }
namespace App {
#[\Symfony\Component\Routing\Attribute\Route('/base', name: 'class_')] class Controller extends \Symfony\Bundle\FrameworkBundle\Controller\AbstractController { #[\Symfony\Component\Routing\Attribute\Route('/attribute', name: 'attribute')] public function url(): string { return $this->GENERATEURL('admin.'); } public function namedUrl(): string { return $this->generateUrl(parameters: [], route: 'admin.'); } public function wrongName(): string { return $this->generateUrl(name: 'admin.'); } public function doubleUrl(): string { return $this->generateUrl("admin."); } }
class Other { public function generateUrl(string $route, array $parameters = []): string {} public function url(): string { return $this->generateUrl('admin.'); } }
}`;
      const uri = pathToFileURL(join(root, 'Controller.php')).toString();
      const routeUri = pathToFileURL(join(root, 'config', 'routes', 'admin.yaml')).toString();
      await writeFile(join(root, 'Controller.php'), source);
      await writeFile(join(root, 'config', 'routes.yaml'), 'admin:\n  resource: routes/admin.yaml\n  name_prefix: admin.\n');
      await writeFile(join(root, 'config', 'routes', 'admin.yaml'), 'home: {path: /admin}\n');
      server = spawn(process.execPath, [resolve('dist/server.js'), '--stdio'], { stdio: 'pipe' });
      const output = messagesFrom(server);
      server.stdin.write(encode({ jsonrpc: '2.0', id: 1, method: 'initialize', params: { processId: null, capabilities: {}, rootUri: pathToFileURL(root).toString() } }));
      await output.waitFor((message) => message.id === 1);
      server.stdin.write(encode({ jsonrpc: '2.0', method: 'initialized', params: {} }));
      await output.waitFor((message) => message.method === 'window/logMessage' && message.params?.message?.includes('complete=true'));
      server.stdin.write(encode({ jsonrpc: '2.0', method: 'textDocument/didOpen', params: { textDocument: { uri, languageId: 'php', version: 1, text: source } } }));
      const query = async (id: number, offset: number): Promise<any[]> => {
        server!.stdin.write(encode({ jsonrpc: '2.0', id, method: 'textDocument/completion', params: { textDocument: { uri }, position: lspPosition(source, offset) } }));
        return (await output.waitFor((message) => message.id === id)).result;
      };
      const offset = source.indexOf("'admin.'") + 7;
      // Unimported attributes do not leak into route candidates.

      const items = await query(2, offset);
      expect(items.map((item) => item.label)).toEqual(['admin.home']);
      expect(items[0].textEdit.newText).toBe('admin.home');
      await writeFile(join(root, 'config', 'routes.yaml'), 'admin:\n  resource: routes/admin.yaml\n  name_prefix: admin.\ncontroller:\n  resource: ../Controller.php\n  type: attribute\n  name_prefix: admin.\n  prefix: /prefix\n');
      const imported = await query(30, offset);
      expect(imported.map((item) => item.label)).toEqual(['admin.class_attribute', 'admin.home']);
      expect(imported[0].detail).toBe('/prefix/base/attribute (source declaration)');
      await mkdir(join(root, 'controllers', 'nested'), { recursive: true });
      await writeFile(join(root, 'controllers', 'nested', 'Imported.php'), String.raw`<?php namespace Nested; class Imported { #[\Symfony\Component\Routing\Attribute\Route('/nested', name: 'nested')] public function run() {} }`);
      await writeFile(join(root, 'controllers', 'skip.txt'), String.raw`<?php class Ignore { #[\Symfony\Component\Routing\Attribute\Route('/wrong', name: 'wrong')] public function run() {} }`);
      await symlink(join(root, 'controllers'), join(root, 'controllers', 'nested', 'loop'), process.platform === 'win32' ? 'junction' : 'dir');
      await writeFile(join(root, 'config', 'routes.yaml'), 'controllers:\n  resource: ../controllers/\n  type: attribute\n  name_prefix: admin.\n');
      expect((await query(31, offset)).map((item) => item.label)).toEqual(['admin.nested']);
      for (const [id, exclude] of [[32, '../controllers/nested'], [33, '../controllers/nested/Imported.php']] as const) {
        await writeFile(join(root, 'config', 'routes.yaml'), `controllers:\n  resource: ../controllers/\n  type: attribute\n  name_prefix: admin.\n  exclude: ${exclude}\n`);
        expect((await query(id, offset)).map((item) => item.label)).toEqual([]);
      }
      await writeFile(join(root, 'config', 'routes.yaml'), 'controllers:\n  resource: ../controllers/\n  type: attribute\n  name_prefix: admin.\n  exclude: ../controllers/nest\n');
      expect((await query(34, offset)).map((item) => item.label)).toEqual(['admin.nested']);
      for (const [id, resource] of [[35, '../controllers/**/*.php'], [36, '../{controllers,missing}/**/Import?d.[p][h][p]']] as const) {
        await writeFile(join(root, 'config', 'routes.yaml'), `controllers:\n  resource: "${resource}"\n  type: attribute\n  name_prefix: admin.\n`);
        expect((await query(id, offset)).map((item) => item.label)).toEqual(['admin.nested']);
      }
      await writeFile(join(root, 'config', 'routes.yaml'), 'controllers:\n  resource: ../controllers/**/*.php\n  type: attribute\n  name_prefix: admin.\n  exclude: ../controllers/**/Import*.php\n');
      expect((await query(37, offset)).map((item) => item.label)).toEqual([]);
      await writeFile(join(root, 'config', 'routes.yaml'), 'all: {resource: "routes/*.{yaml,yml}", name_prefix: admin.}');
      expect((await query(38, offset)).map((item) => item.label)).toEqual(['admin.home']);



      await writeFile(join(root, 'config', 'routes.yaml'), 'admin:\n  resource: routes/admin.yaml\n  name_prefix: admin.\n');

      await mkdir(join(root, 'mapped', 'Nested'), { recursive: true });
      await writeFile(join(root, 'mapped', 'Nested', 'Valid.php'), String.raw`<?php namespace App\Nested;
class Valid { #[\Symfony\Component\Routing\Attribute\Route('/mapped', name: 'mapped')] public function run() {} }
class Extra { #[\Symfony\Component\Routing\Attribute\Route('/extra', name: 'extra')] public function run() {} }`);
      for (const [id, namespace, expected] of [[39, 'App', ['admin.mapped']], [40, 'Other', []]] as const) {
        await writeFile(join(root, 'config', 'routes.yaml'), `controllers:\n  resource: {path: ../mapped, namespace: '${namespace}'}\n  type: attribute\n  name_prefix: admin.\n`);
        expect((await query(id, offset)).map((item) => item.label)).toEqual(expected);
      }
      await writeFile(join(root, 'config', 'routes.yaml'), "controllers:\n  resource: {path: ../mapped, namespace: App}\n  type: attribute\n  exclude: ../mapped/Nested/Valid.php\n");
      expect((await query(41, offset)).map((item) => item.label)).toEqual([]);
      await writeFile(join(root, 'config', 'routes.yaml'), 'admin:\n  resource: routes/admin.yaml\n  name_prefix: admin.\n');

      await writeFile(join(root, 'mapped', 'Nested', 'Valid.php'), String.raw`<?php namespace App\Nested;
class Valid { #[\Symfony\Component\Routing\Attribute\Route('/implicit')] public function indexAction() {} }`);
      await writeFile(join(root, 'config', 'routes.yaml'), "controllers:\n  resource: {path: ../mapped, namespace: App}\n  type: attribute\n  name_prefix: admin.\n");
      expect((await query(42, offset)).map((item) => item.label)).toEqual([]);
      await writeFile(join(root, 'composer.json'), JSON.stringify({ require: { 'symfony/framework-bundle': '^7.4' }, autoload: { classmap: ['./Controller.php'] } }));
      expect((await query(43, offset)).map((item) => item.label)).toEqual(['admin.app_nested_valid_index']);
      await writeFile(join(root, 'config', 'routes.yaml'), 'admin:\n  resource: routes/admin.yaml\n  name_prefix: admin.\n');

      const rootUri = pathToFileURL(root).toString();
      server.stdin.write(encode({ jsonrpc: '2.0', method: 'phpCompanion/symfonyRouteProviders', params: { providers: [{ uri: rootUri, external: true }] } }));
      expect((await query(20, offset)).some((item) => item.label === 'admin.home')).toBe(false);
      server.stdin.write(encode({ jsonrpc: '2.0', method: 'phpCompanion/symfonyRouteProviders', params: { providers: [{ uri: rootUri, external: 'invalid' }] } }));
      expect((await query(21, offset)).some((item) => item.label === 'admin.home')).toBe(false);
      server.stdin.write(encode({ jsonrpc: '2.0', method: 'phpCompanion/symfonyRouteProviders', params: { providers: [
        { uri: pathToFileURL(join(root, '..')).toString(), external: true }, { uri: rootUri, external: false },
      ] } }));
      expect((await query(22, offset)).map((item) => item.label)).toEqual(['admin.home']);
      server.stdin.write(encode({ jsonrpc: '2.0', method: 'phpCompanion/symfonyRouteProviders', params: { providers: [] } }));

      const namedOffset = source.indexOf("route: 'admin.'") + "route: 'admin.".length;
      expect((await query(7, namedOffset)).map((item) => item.label)).toEqual(['admin.home']);
      const wrongOffset = source.indexOf("name: 'admin.'") + "name: 'admin.".length;
      expect((await query(8, wrongOffset)).some((item) => item.label === 'admin.home')).toBe(false);

      expect((await query(3, source.lastIndexOf("'admin.'") + 7)).some((item) => item.label === 'admin.home')).toBe(false);
      server.stdin.write(encode({ jsonrpc: '2.0', method: 'textDocument/didOpen', params: { textDocument: { uri: routeUri, languageId: 'yaml', version: 1, text: 'edited: {path: /edited}\n' } } }));
      expect((await query(4, offset)).map((item) => item.label)).toEqual(['admin.edited']);
      const unusualName = String.raw`account.'"$id\end`;
      server.stdin.write(encode({ jsonrpc: '2.0', method: 'textDocument/didChange', params: { textDocument: { uri: routeUri, version: 2 }, contentChanges: [{ text: `${JSON.stringify(unusualName)}: {path: /escaped}\n` }] } }));
      const singleQuoted = await query(5, offset);
      expect(singleQuoted.map((item) => item.label)).toEqual([`admin.${unusualName}`]);
      expect(singleQuoted[0].textEdit.newText).toBe(String.raw`admin.account.\'"$id\\end`);
      const doubleQuoted = await query(6, source.indexOf('"admin."') + 7);
      expect(doubleQuoted[0].textEdit.newText).toBe(String.raw`admin.account.'\"\$id\\end`);

    } finally { await rm(root, { recursive: true, force: true }); }
  });

  it('negotiates capabilities and serves diagnostics and symbols', async () => {
    server = spawn(process.execPath, [resolve('dist/server.js'), '--stdio'], { stdio: 'pipe' });
    const output = messagesFrom(server);
    server.stdin.write(encode({ jsonrpc: '2.0', id: 1, method: 'initialize', params: { processId: null, capabilities: {}, rootUri: null } }));
    const initialized = await output.waitFor((message) => message.id === 1);
    expect(initialized.result.capabilities).toMatchObject({ positionEncoding: 'utf-16', documentSymbolProvider: true, workspaceSymbolProvider: true, completionProvider: { triggerCharacters: ['>', ':', '(', ','] }, hoverProvider: true, definitionProvider: true, typeDefinitionProvider: true, implementationProvider: true, typeHierarchyProvider: true, semanticTokensProvider: { legend: { tokenTypes: expect.arrayContaining(['variable', 'parameter', 'method', 'type']) }, full: true }, inlayHintProvider: true, codeActionProvider: { codeActionKinds: expect.arrayContaining(['refactor.extract', 'refactor.inline', 'source.organizeImports']) }, textDocumentSync: 2 });
    server.stdin.write(encode({ jsonrpc: '2.0', method: 'initialized', params: {} }));
    server.stdin.write(encode({ jsonrpc: '2.0', method: 'textDocument/didOpen', params: { textDocument: { uri: 'file:///Broken.php', languageId: 'php', version: 1, text: '<?php class Broken { public function run( }' } } }));
    const diagnostics = await output.waitFor((message) => message.method === 'textDocument/publishDiagnostics');
    expect(diagnostics.params).toMatchObject({ uri: 'file:///Broken.php', version: 1 });
    expect(diagnostics.params.diagnostics.length).toBeGreaterThan(0);

    server.stdin.write(encode({ jsonrpc: '2.0', method: 'textDocument/didChange', params: { textDocument: { uri: 'file:///Broken.php', version: 2 }, contentChanges: [{ text: '<?php interface Fixed {}' }] } }));
    await output.waitFor((message) => message.method === 'textDocument/publishDiagnostics' && message.params.version === 2);
    server.stdin.write(
      encode({ jsonrpc: '2.0', method: 'textDocument/didChange', params: { textDocument: { uri: 'file:///Broken.php', version: 3 }, contentChanges: [{ text: '<?php interface Fixed {' }] } })
      + encode({ jsonrpc: '2.0', method: 'textDocument/didChange', params: { textDocument: { uri: 'file:///Broken.php', version: 4 }, contentChanges: [{ text: '<?php interface Fixed {}' }] } }),
    );
    await output.waitFor((message) => message.method === 'textDocument/publishDiagnostics' && message.params.version === 4);
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 50));
    const lastVersionFour = output.messages.findLastIndex((message: any) => message.method === 'textDocument/publishDiagnostics' && message.params.version === 4);
    expect(output.messages.slice(lastVersionFour + 1).some((message: any) => message.method === 'textDocument/publishDiagnostics' && message.params.version === 3)).toBe(false);
    server.stdin.write(encode({ jsonrpc: '2.0', id: 2, method: 'textDocument/documentSymbol', params: { textDocument: { uri: 'file:///Broken.php' } } }));
    const symbols = await output.waitFor((message) => message.id === 2);
    expect(symbols.result).toMatchObject([{ name: 'Fixed', kind: 11 }]);

    const extractUri = 'file:///Extract.php'; const extractSource = '<?php\nfunction create(): object {\n    $result = new stdClass();\n    return $result;\n}';
    server.stdin.write(encode({ jsonrpc: '2.0', method: 'textDocument/didOpen', params: { textDocument: { uri: extractUri, languageId: 'php', version: 1, text: extractSource } } }));
    await output.waitFor((message) => message.method === 'textDocument/publishDiagnostics' && message.params.uri === extractUri);
    const expressionStart = extractSource.indexOf('new stdClass()'); const expressionEnd = expressionStart + 'new stdClass()'.length;
    server.stdin.write(encode({ jsonrpc: '2.0', id: 43, method: 'textDocument/codeAction', params: { textDocument: { uri: extractUri }, range: { start: lspPosition(extractSource, expressionStart), end: lspPosition(extractSource, expressionEnd) }, context: { diagnostics: [], only: ['refactor.extract'] } } }));
    expect((await output.waitFor((message) => message.id === 43)).result).toMatchObject([{
      title: 'Extract to $extracted', kind: 'refactor.extract', edit: { changes: { [extractUri]: expect.arrayContaining([
        expect.objectContaining({ newText: '    $extracted = new stdClass();\n' }), expect.objectContaining({ newText: '$extracted' }),
      ]) } },
    }]);
    const declarationStart = extractSource.indexOf('$result');
    server.stdin.write(encode({ jsonrpc: '2.0', id: 44, method: 'textDocument/codeAction', params: { textDocument: { uri: extractUri }, range: { start: lspPosition(extractSource, declarationStart), end: lspPosition(extractSource, declarationStart) }, context: { diagnostics: [], only: ['refactor.inline'] } } }));
    expect((await output.waitFor((message) => message.id === 44)).result).toMatchObject([{
      title: 'Inline $result', kind: 'refactor.inline', edit: { changes: { [extractUri]: expect.arrayContaining([
        expect.objectContaining({ newText: '' }), expect.objectContaining({ newText: 'new stdClass()' }),
      ]) } },
    }]);

    const methodUri = 'file:///ExtractMethod.php'; const methodSource = '<?php\nclass WorkerService { public function prepare(): void {} }\nclass Worker {\n    public function run(WorkerService $service, string $message): void\n    {\n        $service->prepare();\n        $this->notify($message);\n        $this->finish();\n    }\n    public function produce(): WorkerService\n    {\n        $this->finish();\n        $result = new WorkerService();\n        return $result;\n    }\n    private function notify(string $message): void {}\n    private function finish(): void {}\n}';
    server.stdin.write(encode({ jsonrpc: '2.0', method: 'textDocument/didOpen', params: { textDocument: { uri: methodUri, languageId: 'php', version: 1, text: methodSource } } }));
    await output.waitFor((message) => message.method === 'textDocument/publishDiagnostics' && message.params.uri === methodUri);
    const methodStart = methodSource.indexOf('$service->prepare()'); const methodEnd = methodSource.indexOf(';', methodSource.indexOf('$this->finish()')) + 1;
    server.stdin.write(encode({ jsonrpc: '2.0', id: 45, method: 'textDocument/codeAction', params: { textDocument: { uri: methodUri }, range: { start: lspPosition(methodSource, methodStart), end: lspPosition(methodSource, methodEnd) }, context: { diagnostics: [], only: ['refactor.extract'] } } }));
    expect((await output.waitFor((message) => message.id === 45)).result).toMatchObject([{
      title: 'Extract method extractedMethod', kind: 'refactor.extract', edit: { changes: { [methodUri]: expect.arrayContaining([
        expect.objectContaining({ newText: '        $this->extractedMethod($service, $message);\n' }),
        expect.objectContaining({ newText: expect.stringContaining('private function extractedMethod(WorkerService $service, string $message): void') }),
      ]) } },
    }]);
    const outputStart = methodSource.lastIndexOf('$this->finish()'); const outputEnd = methodSource.indexOf(';', methodSource.indexOf('$result =', outputStart)) + 1;
    server.stdin.write(encode({ jsonrpc: '2.0', id: 46, method: 'textDocument/codeAction', params: { textDocument: { uri: methodUri }, range: { start: lspPosition(methodSource, outputStart), end: lspPosition(methodSource, outputEnd) }, context: { diagnostics: [], only: ['refactor.extract'] } } }));
    expect((await output.waitFor((message) => message.id === 46)).result).toMatchObject([{
      title: 'Extract method extractedMethod', kind: 'refactor.extract', edit: { changes: { [methodUri]: expect.arrayContaining([
        expect.objectContaining({ newText: '        $result = $this->extractedMethod();\n' }),
        expect.objectContaining({ newText: expect.stringContaining('private function extractedMethod(): \\WorkerService') }),
      ]) } },
    }]);

    const removeUri = 'file:///RemoveParameter.php'; const removeSource = '<?php\nclass Formatter {\n    /**\n     * @param int $unused obsolete\n     */\n    private function format(string $prefix, int $unused, string $suffix): string { return $prefix . $suffix; }\n    public function run(): void { $this->format("a", 1, "b"); $this->format(suffix: "b", unused: 2, prefix: "a"); }\n}';
    server.stdin.write(encode({ jsonrpc: '2.0', method: 'textDocument/didOpen', params: { textDocument: { uri: removeUri, languageId: 'php', version: 1, text: removeSource } } }));
    await output.waitFor((message) => message.method === 'textDocument/publishDiagnostics' && message.params.uri === removeUri);
    const removeOffset = removeSource.indexOf('int $unused,') + 4;
    server.stdin.write(encode({ jsonrpc: '2.0', id: 47, method: 'textDocument/codeAction', params: { textDocument: { uri: removeUri }, range: { start: lspPosition(removeSource, removeOffset), end: lspPosition(removeSource, removeOffset) }, context: { diagnostics: [], only: ['refactor.rewrite'] } } }));
    const removeAction = (await output.waitFor((message) => message.id === 47)).result;
    expect(removeAction).toMatchObject([{ title: 'Remove unused parameter $unused', kind: 'refactor.rewrite' }]);
    expect(removeAction[0].edit.changes[removeUri]).toHaveLength(4);

    const namedSource = '<?php class Builder { static function make(string &$first = "x", int ...$second): void {} } Builder::make(second: 2, fi';
    server.stdin.write(encode({ jsonrpc: '2.0', method: 'textDocument/didOpen', params: { textDocument: { uri: 'file:///Named.php', languageId: 'php', version: 1, text: namedSource } } }));
    await output.waitFor((message) => message.method === 'textDocument/publishDiagnostics' && message.params.uri === 'file:///Named.php');
    server.stdin.write(encode({ jsonrpc: '2.0', id: 4, method: 'textDocument/completion', params: { textDocument: { uri: 'file:///Named.php' }, position: { line: 0, character: namedSource.length } } }));
    expect((await output.waitFor((message) => message.id === 4)).result).toMatchObject([{ label: 'first:', insertText: 'first: ' }]);
    server.stdin.write(encode({ jsonrpc: '2.0', id: 5, method: 'textDocument/hover', params: { textDocument: { uri: 'file:///Named.php' }, position: { line: 0, character: namedSource.lastIndexOf('Builder') + 1 } } }));
    expect((await output.waitFor((message) => message.id === 5)).result.contents.value).toContain('class Builder');
    server.stdin.write(encode({ jsonrpc: '2.0', id: 7, method: 'textDocument/signatureHelp', params: { textDocument: { uri: 'file:///Named.php' }, position: { line: 0, character: namedSource.length } } }));
    expect((await output.waitFor((message) => message.id === 7)).result.signatures[0].label).toBe('make(string &$first = "x", int ...$second): void');
    const flowSource = '<?php class FlowType { function proven(): void {} } class Other {} function flow(?FlowType $left, FlowType|Other $right): void { if ($left !== null && $right instanceof FlowType) { $left->pro; $right->pro; } if ($left !== null || unknown()) { $left->unsafe; } try {} catch (FlowType $error) { $error->pro; } }';
    server.stdin.write(encode({ jsonrpc: '2.0', method: 'textDocument/didOpen', params: { textDocument: { uri: 'file:///Flow.php', languageId: 'php', version: 1, text: flowSource } } }));
    await output.waitFor((message) => message.method === 'textDocument/publishDiagnostics' && message.params.uri === 'file:///Flow.php');
    for (const [id, marker] of [[20, '$left->pro'], [21, '$right->pro'], [22, '$error->pro']] as const) {
      const character = flowSource.indexOf(marker) + marker.length;
      server.stdin.write(encode({ jsonrpc: '2.0', id, method: 'textDocument/completion', params: { textDocument: { uri: 'file:///Flow.php' }, position: { line: 0, character } } }));
      expect((await output.waitFor((message) => message.id === id)).result).toMatchObject([{ label: 'proven' }]);
    }
    const unsafeCharacter = flowSource.indexOf('$left->unsafe') + '$left->unsafe'.length;
    server.stdin.write(encode({ jsonrpc: '2.0', id: 23, method: 'textDocument/completion', params: { textDocument: { uri: 'file:///Flow.php' }, position: { line: 0, character: unsafeCharacter } } }));
    expect((await output.waitFor((message) => message.id === 23)).result).toEqual([]);
    const assertionSource = '<?php namespace AssertFlow; class Base {} class Ready extends Base { function onlyReady(): void {} } /** @phpstan-assert Ready $value */ function assertReady(Base $value): void {} /** @phpstan-assert-if-true Ready $value */ function isReady(Base $value): bool { return true; } /** @phpstan-assert-if-true !null $value */ function isPresent(?Ready $value): bool { return true; } /** @phpstan-assert-if-true !false $value */ function isFound(Ready|false $value): bool { return true; } function run(Base $proven, Base $conditional, Base $compound, ?Ready $nullable, Ready|false $falseable, Base $loop, Base $doShort): void { assertReady($proven); $proven->only; if (isReady($conditional)) { $conditional->only; } $conditional->outside; if (isReady($compound) && unknown()) { $compound->only; } if (isPresent($nullable)) { $nullable->only; } if (isFound($falseable)) { $falseable->only; } while (isReady($loop)) { $loop->only; } $loop->outside; do {} while (isReady($doShort) && $doShort->only); }';
    server.stdin.write(encode({ jsonrpc: '2.0', method: 'textDocument/didOpen', params: { textDocument: { uri: 'file:///Assertion.php', languageId: 'php', version: 1, text: assertionSource } } }));
    await output.waitFor((message) => message.method === 'textDocument/publishDiagnostics' && message.params.uri === 'file:///Assertion.php');
    const assertedCharacter = assertionSource.indexOf('$proven->only') + '$proven->only'.length;
    server.stdin.write(encode({ jsonrpc: '2.0', id: 120, method: 'textDocument/completion', params: { textDocument: { uri: 'file:///Assertion.php' }, position: { line: 0, character: assertedCharacter } } }));
    expect((await output.waitFor((message) => message.id === 120)).result).toMatchObject([{ label: 'onlyReady' }]);
    const conditionalCharacter = assertionSource.indexOf('$conditional->only') + '$conditional->only'.length;
    server.stdin.write(encode({ jsonrpc: '2.0', id: 121, method: 'textDocument/completion', params: { textDocument: { uri: 'file:///Assertion.php' }, position: { line: 0, character: conditionalCharacter } } }));
    expect((await output.waitFor((message) => message.id === 121)).result).toMatchObject([{ label: 'onlyReady' }]);
    const outsideConditionalCharacter = assertionSource.indexOf('$conditional->outside') + '$conditional->outside'.length;
    server.stdin.write(encode({ jsonrpc: '2.0', id: 122, method: 'textDocument/completion', params: { textDocument: { uri: 'file:///Assertion.php' }, position: { line: 0, character: outsideConditionalCharacter } } }));
    expect((await output.waitFor((message) => message.id === 122)).result).toEqual([]);
    const compoundCharacter = assertionSource.indexOf('$compound->only') + '$compound->only'.length;
    server.stdin.write(encode({ jsonrpc: '2.0', id: 123, method: 'textDocument/completion', params: { textDocument: { uri: 'file:///Assertion.php' }, position: { line: 0, character: compoundCharacter } } }));
    expect((await output.waitFor((message) => message.id === 123)).result).toMatchObject([{ label: 'onlyReady' }]);
    const nonNullCharacter = assertionSource.indexOf('$nullable->only') + '$nullable->only'.length;
    server.stdin.write(encode({ jsonrpc: '2.0', id: 124, method: 'textDocument/completion', params: { textDocument: { uri: 'file:///Assertion.php' }, position: { line: 0, character: nonNullCharacter } } }));
    expect((await output.waitFor((message) => message.id === 124)).result).toMatchObject([{ label: 'onlyReady' }]);
    const falseableCharacter = assertionSource.indexOf('$falseable->only') + '$falseable->only'.length;
    server.stdin.write(encode({ jsonrpc: '2.0', id: 137, method: 'textDocument/completion', params: { textDocument: { uri: 'file:///Assertion.php' }, position: { line: 0, character: falseableCharacter } } }));
    expect((await output.waitFor((message) => message.id === 137)).result).toMatchObject([{ label: 'onlyReady' }]);
    const loopAssertionCharacter = assertionSource.indexOf('$loop->only') + '$loop->only'.length;
    server.stdin.write(encode({ jsonrpc: '2.0', id: 149, method: 'textDocument/completion', params: { textDocument: { uri: 'file:///Assertion.php' }, position: { line: 0, character: loopAssertionCharacter } } }));
    expect((await output.waitFor((message) => message.id === 149)).result).toMatchObject([{ label: 'onlyReady' }]);
    const outsideLoopCharacter = assertionSource.indexOf('$loop->outside') + '$loop->outside'.length;
    server.stdin.write(encode({ jsonrpc: '2.0', id: 150, method: 'textDocument/completion', params: { textDocument: { uri: 'file:///Assertion.php' }, position: { line: 0, character: outsideLoopCharacter } } }));
    expect((await output.waitFor((message) => message.id === 150)).result).toEqual([]);
    const doShortCharacter = assertionSource.indexOf('$doShort->only') + '$doShort->only'.length;
    server.stdin.write(encode({ jsonrpc: '2.0', id: 151, method: 'textDocument/completion', params: { textDocument: { uri: 'file:///Assertion.php' }, position: { line: 0, character: doShortCharacter } } }));
    expect((await output.waitFor((message) => message.id === 151)).result).toMatchObject([{ label: 'onlyReady' }]);
    const genericNegativeSource = `<?php namespace GenericNegativeAssert;
      class User { function onlyUser(): void {} } class Other {}
      /** @template T of object */ class Box { /** @return T */ function get() {} }
      /** @phpstan-assert-if-true !Box<Other> $value */ function excludesOther($value): bool { return true; }
      /** @param Box<User>|Box<Other> $value */ function run($value): void {
        if (excludesOther($value)) { $value->get()->only; }
      }`;
    server.stdin.write(encode({ jsonrpc: '2.0', method: 'textDocument/didOpen', params: { textDocument: { uri: 'file:///GenericNegativeAssertion.php', languageId: 'php', version: 1, text: genericNegativeSource } } }));
    await output.waitFor((message) => message.method === 'textDocument/publishDiagnostics' && message.params.uri === 'file:///GenericNegativeAssertion.php');
    const genericNegativeOffset = genericNegativeSource.indexOf('$value->get()->only') + '$value->get()->only'.length;
    server.stdin.write(encode({ jsonrpc: '2.0', id: 138, method: 'textDocument/completion', params: { textDocument: { uri: 'file:///GenericNegativeAssertion.php' }, position: lspPosition(genericNegativeSource, genericNegativeOffset) } }));
    expect((await output.waitFor((message) => message.id === 138)).result).toMatchObject([{ label: 'onlyUser' }]);
    const intersectionNegativeSource = `<?php namespace IntersectionNegativeAssert;
      class Ready { function onlyReady(): void {} } interface Marker { function onlyMarker(): void; } class Rejected implements Marker {}
      /** @phpstan-assert-if-true !(Rejected&Marker) $value */ function excludesRejected($value): bool { return true; }
      /** @phpstan-assert-if-true !Rejected $value */ function excludesRejectedClass($value): bool { return true; }
      /** @param Ready|(Rejected&Marker) $value
       * @param (Ready&Marker)|Rejected $remaining */ function run($value, $remaining): void {
        if (excludesRejected($value)) { $value->only; }
        if (excludesRejectedClass($remaining)) { $remaining->onlyMarker; }
      }`;
    server.stdin.write(encode({ jsonrpc: '2.0', method: 'textDocument/didOpen', params: { textDocument: { uri: 'file:///IntersectionNegativeAssertion.php', languageId: 'php', version: 1, text: intersectionNegativeSource } } }));
    await output.waitFor((message) => message.method === 'textDocument/publishDiagnostics' && message.params.uri === 'file:///IntersectionNegativeAssertion.php');
    const intersectionNegativeOffset = intersectionNegativeSource.indexOf('$value->only') + '$value->only'.length;
    server.stdin.write(encode({ jsonrpc: '2.0', id: 139, method: 'textDocument/completion', params: { textDocument: { uri: 'file:///IntersectionNegativeAssertion.php' }, position: lspPosition(intersectionNegativeSource, intersectionNegativeOffset) } }));
    expect((await output.waitFor((message) => message.id === 139)).result).toMatchObject([{ label: 'onlyReady' }]);
    const remainingIntersectionOffset = intersectionNegativeSource.indexOf('$remaining->onlyMarker') + '$remaining->onlyMarker'.length;
    server.stdin.write(encode({ jsonrpc: '2.0', id: 140, method: 'textDocument/completion', params: { textDocument: { uri: 'file:///IntersectionNegativeAssertion.php' }, position: lspPosition(intersectionNegativeSource, remainingIntersectionOffset) } }));
    expect((await output.waitFor((message) => message.id === 140)).result).toContainEqual(expect.objectContaining({ label: 'onlyMarker' }));
    const conditionalReturnSource = `<?php namespace ConditionalReturnFlow;
      class Ready { function onlyReady(): void {} function common(): void {} }
      class Other { function onlyOther(): void {} function common(): void {} }
      class Impossible { function impossible(): void {} }
      /** @return ($flag is true ? Ready : Other) */ function choose(bool $flag) {}
      /** @return ($flag is true ? ($flag is false ? Impossible : Ready) : Other) */ function chooseNested(bool $flag) {}
      /** @return ($left is true ? ($right is false ? Impossible : Ready) : Other) */ function chooseCross(bool $left, bool $right) {}
      function run(bool $dynamic): void {
        $ready = choose(true); $ready->only;
        $other = choose(false); $other->only;
        $unknown = choose($dynamic); $unknown->common;
        $nested = chooseNested($dynamic); $nested->common; $nested->impossible;
        $cross = chooseCross($dynamic, $dynamic); $cross->common; $cross->impossible;
      }
      /**
       * @param callable(bool $flag): ($flag is true ? Ready : Other) $chooseReady
       * @param callable(bool $flag): ($flag is true ? Ready : Other) $chooseOther
       * @param callable(bool $flag): ($flag is true ? Ready : Other) $chooseUnknown
       */
      function callableRun(callable $chooseReady, callable $chooseOther, callable $chooseUnknown, bool $dynamic): void {
        $callableReady = $chooseReady(true); $callableReady->only;
        $callableOther = $chooseOther(flag: false); $callableOther->only;
        $callableUnknown = $chooseUnknown($dynamic); $callableUnknown->common;
      }`;
    server.stdin.write(encode({ jsonrpc: '2.0', method: 'textDocument/didOpen', params: { textDocument: { uri: 'file:///ConditionalReturn.php', languageId: 'php', version: 1, text: conditionalReturnSource } } }));
    await output.waitFor((message) => message.method === 'textDocument/publishDiagnostics' && message.params.uri === 'file:///ConditionalReturn.php');
    for (const [id, marker, label] of [[141, '$ready->only', 'onlyReady'], [142, '$other->only', 'onlyOther'], [143, '$unknown->common', 'common']] as const) {
      const markerOffset = conditionalReturnSource.indexOf(marker) + marker.length;
      server.stdin.write(encode({ jsonrpc: '2.0', id, method: 'textDocument/completion', params: { textDocument: { uri: 'file:///ConditionalReturn.php' }, position: lspPosition(conditionalReturnSource, markerOffset) } }));
      expect((await output.waitFor((message) => message.id === id)).result).toContainEqual(expect.objectContaining({ label }));
    }
    for (const [id, marker, label] of [[144, '$callableReady->only', 'onlyReady'], [145, '$callableOther->only', 'onlyOther'], [146, '$callableUnknown->common', 'common']] as const) {
      const markerOffset = conditionalReturnSource.indexOf(marker) + marker.length;
      server.stdin.write(encode({ jsonrpc: '2.0', id, method: 'textDocument/completion', params: { textDocument: { uri: 'file:///ConditionalReturn.php' }, position: lspPosition(conditionalReturnSource, markerOffset) } }));
      expect((await output.waitFor((message) => message.id === id)).result).toContainEqual(expect.objectContaining({ label }));
    }
    const nestedCommonOffset = conditionalReturnSource.indexOf('$nested->common') + '$nested->common'.length;
    server.stdin.write(encode({ jsonrpc: '2.0', id: 147, method: 'textDocument/completion', params: { textDocument: { uri: 'file:///ConditionalReturn.php' }, position: lspPosition(conditionalReturnSource, nestedCommonOffset) } }));
    expect((await output.waitFor((message) => message.id === 147)).result).toContainEqual(expect.objectContaining({ label: 'common' }));
    const nestedImpossibleOffset = conditionalReturnSource.indexOf('$nested->impossible') + '$nested->impossible'.length;
    server.stdin.write(encode({ jsonrpc: '2.0', id: 148, method: 'textDocument/completion', params: { textDocument: { uri: 'file:///ConditionalReturn.php' }, position: lspPosition(conditionalReturnSource, nestedImpossibleOffset) } }));
    expect((await output.waitFor((message) => message.id === 148)).result).toEqual([]);
    const crossCommonOffset = conditionalReturnSource.indexOf('$cross->common') + '$cross->common'.length;
    server.stdin.write(encode({ jsonrpc: '2.0', id: 152, method: 'textDocument/completion', params: { textDocument: { uri: 'file:///ConditionalReturn.php' }, position: lspPosition(conditionalReturnSource, crossCommonOffset) } }));
    expect((await output.waitFor((message) => message.id === 152)).result).toContainEqual(expect.objectContaining({ label: 'common' }));
    const crossImpossibleOffset = conditionalReturnSource.indexOf('$cross->impossible') + '$cross->impossible'.length;
    server.stdin.write(encode({ jsonrpc: '2.0', id: 153, method: 'textDocument/completion', params: { textDocument: { uri: 'file:///ConditionalReturn.php' }, position: lspPosition(conditionalReturnSource, crossImpossibleOffset) } }));
    expect((await output.waitFor((message) => message.id === 153)).result).toEqual([]);
    const magicSource = `<?php namespace MagicFlow;
      class User { public string $name; } class Other {}
      /** @property User $owner resolved owner
       * @property-read User $createdBy immutable creator
       * @property-write User $payload accepted payload
       * @method User find(int $id, string $label = 'default') lookup
       * @method User locate(int $id)
       * @method Other locate(string $slug)
       * @method T fetch<T of User>(class-string<T> $type) */
      class Model {}
      function run(Model $model, mixed $key): void { $model->ow; $model->owner->na; $model->createdBy->na; $model->find(1)->na;
        $model->locate(1)->na; $model->locate($key)->na; $model->fetch(User::class)->na; $model->fetch(Other::class)->na;
        $method = 'find'; $model->{$method}(1); $model->{'owner'}; $used = 'find'; echo $used; $model->{$used}(1);
        $assignedMethod = 'find'; $dynamicResult = $model->{$assignedMethod}(1); $dynamicResult->na;
        $directMethod = 'find'; $model->{$directMethod}(1)->na;
        $model->createdBy = new User(); $model->payload = new Other(); $model->payload->na; }`;
    server.stdin.write(encode({ jsonrpc: '2.0', method: 'textDocument/didOpen', params: { textDocument: { uri: 'file:///Magic.php', languageId: 'php', version: 1, text: magicSource } } }));
    await output.waitFor((message) => message.method === 'textDocument/publishDiagnostics' && message.params.uri === 'file:///Magic.php');
    const magicCompletion = magicSource.indexOf('$model->ow') + '$model->ow'.length;
    server.stdin.write(encode({ jsonrpc: '2.0', id: 154, method: 'textDocument/completion', params: { textDocument: { uri: 'file:///Magic.php' }, position: lspPosition(magicSource, magicCompletion) } }));
    expect((await output.waitFor((message) => message.id === 154)).result.map((item: { label: string }) => item.label)).toEqual(['owner']);
    const magicChain = magicSource.indexOf('$model->find(1)->na') + '$model->find(1)->na'.length;
    server.stdin.write(encode({ jsonrpc: '2.0', id: 155, method: 'textDocument/completion', params: { textDocument: { uri: 'file:///Magic.php' }, position: lspPosition(magicSource, magicChain) } }));
    expect((await output.waitFor((message) => message.id === 155)).result).toContainEqual(expect.objectContaining({ label: 'name' }));
    const magicSignature = magicSource.indexOf('$model->find(1)') + '$model->find('.length;
    server.stdin.write(encode({ jsonrpc: '2.0', id: 156, method: 'textDocument/signatureHelp', params: { textDocument: { uri: 'file:///Magic.php' }, position: lspPosition(magicSource, magicSignature) } }));
    expect((await output.waitFor((message) => message.id === 156)).result.signatures[0].label).toBe('find(int $id, string $label = null): User');
    const magicDefinition = magicSource.indexOf('owner->na') + 2;
    server.stdin.write(encode({ jsonrpc: '2.0', id: 157, method: 'textDocument/definition', params: { textDocument: { uri: 'file:///Magic.php' }, position: lspPosition(magicSource, magicDefinition) } }));
    expect((await output.waitFor((message) => message.id === 157)).result).toHaveLength(1);
    const dynamicMethodDefinition = magicSource.indexOf('$method', magicSource.indexOf('$method') + 1) + 2;
    server.stdin.write(encode({ jsonrpc: '2.0', id: 167, method: 'textDocument/definition', params: { textDocument: { uri: 'file:///Magic.php' }, position: lspPosition(magicSource, dynamicMethodDefinition) } }));
    expect((await output.waitFor((message) => message.id === 167)).result).toHaveLength(1);
    const dynamicMethodArguments = magicSource.indexOf('$method}(1)') + '$method}('.length;
    server.stdin.write(encode({ jsonrpc: '2.0', id: 170, method: 'textDocument/signatureHelp', params: { textDocument: { uri: 'file:///Magic.php' }, position: lspPosition(magicSource, dynamicMethodArguments) } }));
    expect((await output.waitFor((message) => message.id === 170)).result.signatures[0].label).toBe('find(int $id, string $label = null): User');
    const dynamicAssignedChain = magicSource.indexOf('$dynamicResult->na') + '$dynamicResult->na'.length;
    server.stdin.write(encode({ jsonrpc: '2.0', id: 171, method: 'textDocument/completion', params: { textDocument: { uri: 'file:///Magic.php' }, position: lspPosition(magicSource, dynamicAssignedChain) } }));
    expect((await output.waitFor((message) => message.id === 171)).result).toContainEqual(expect.objectContaining({ label: 'name' }));
    const dynamicDirectChain = magicSource.indexOf('$model->{$directMethod}(1)->na') + '$model->{$directMethod}(1)->na'.length;
    server.stdin.write(encode({ jsonrpc: '2.0', id: 172, method: 'textDocument/completion', params: { textDocument: { uri: 'file:///Magic.php' }, position: lspPosition(magicSource, dynamicDirectChain) } }));
    expect((await output.waitFor((message) => message.id === 172)).result).toContainEqual(expect.objectContaining({ label: 'name' }));
    const dynamicPropertyDefinition = magicSource.indexOf("'owner'", magicSource.indexOf('function run')) + 2;
    server.stdin.write(encode({ jsonrpc: '2.0', id: 168, method: 'textDocument/definition', params: { textDocument: { uri: 'file:///Magic.php' }, position: lspPosition(magicSource, dynamicPropertyDefinition) } }));
    expect((await output.waitFor((message) => message.id === 168)).result).toHaveLength(1);
    const usedDynamicDefinition = magicSource.indexOf('$used', magicSource.indexOf('$used') + 1) + 2;
    server.stdin.write(encode({ jsonrpc: '2.0', id: 169, method: 'textDocument/definition', params: { textDocument: { uri: 'file:///Magic.php' }, position: lspPosition(magicSource, usedDynamicDefinition) } }));
    expect((await output.waitFor((message) => message.id === 169)).result).toEqual([]);
    const magicReadChain = magicSource.indexOf('$model->createdBy->na') + '$model->createdBy->na'.length;
    server.stdin.write(encode({ jsonrpc: '2.0', id: 158, method: 'textDocument/completion', params: { textDocument: { uri: 'file:///Magic.php' }, position: lspPosition(magicSource, magicReadChain) } }));
    expect((await output.waitFor((message) => message.id === 158)).result).toContainEqual(expect.objectContaining({ label: 'name' }));
    const magicWriteOnlyRead = magicSource.indexOf('$model->payload->na') + '$model->payload->na'.length;
    server.stdin.write(encode({ jsonrpc: '2.0', id: 159, method: 'textDocument/completion', params: { textDocument: { uri: 'file:///Magic.php' }, position: lspPosition(magicSource, magicWriteOnlyRead) } }));
    expect((await output.waitFor((message) => message.id === 159)).result).toEqual([]);
    const magicOverload = magicSource.indexOf('$model->locate(1)') + '$model->locate('.length;
    server.stdin.write(encode({ jsonrpc: '2.0', id: 160, method: 'textDocument/signatureHelp', params: { textDocument: { uri: 'file:///Magic.php' }, position: lspPosition(magicSource, magicOverload) } }));
    expect((await output.waitFor((message) => message.id === 160)).result.signatures.map((item: { label: string }) => item.label)).toEqual([
      'locate(int $id): User', 'locate(string $slug): Other',
    ]);
    const magicTypedOverload = magicSource.indexOf('$model->locate(1)') + '$model->locate(1'.length;
    server.stdin.write(encode({ jsonrpc: '2.0', id: 162, method: 'textDocument/signatureHelp', params: { textDocument: { uri: 'file:///Magic.php' }, position: lspPosition(magicSource, magicTypedOverload) } }));
    expect((await output.waitFor((message) => message.id === 162)).result.signatures.map((item: { label: string }) => item.label)).toEqual(['locate(int $id): User']);
    const magicAmbiguousChain = magicSource.indexOf('$model->locate($key)->na') + '$model->locate($key)->na'.length;
    server.stdin.write(encode({ jsonrpc: '2.0', id: 161, method: 'textDocument/completion', params: { textDocument: { uri: 'file:///Magic.php' }, position: lspPosition(magicSource, magicAmbiguousChain) } }));
    expect((await output.waitFor((message) => message.id === 161)).result).toEqual([]);
    const magicTemplateChain = magicSource.indexOf('$model->fetch(User::class)->na') + '$model->fetch(User::class)->na'.length;
    server.stdin.write(encode({ jsonrpc: '2.0', id: 163, method: 'textDocument/completion', params: { textDocument: { uri: 'file:///Magic.php' }, position: lspPosition(magicSource, magicTemplateChain) } }));
    expect((await output.waitFor((message) => message.id === 163)).result).toContainEqual(expect.objectContaining({ label: 'name' }));
    const magicInvalidTemplateChain = magicSource.indexOf('$model->fetch(Other::class)->na') + '$model->fetch(Other::class)->na'.length;
    server.stdin.write(encode({ jsonrpc: '2.0', id: 164, method: 'textDocument/completion', params: { textDocument: { uri: 'file:///Magic.php' }, position: lspPosition(magicSource, magicInvalidTemplateChain) } }));
    expect((await output.waitFor((message) => message.id === 164)).result).toEqual([]);
    const templateAssertionSource = `<?php namespace TemplateAssertFlow;
      class Base {} class Ready extends Base { function onlyReady(): void {} }
      /** @template T of Base
       * @param class-string<T> $type
       * @phpstan-assert T $value */
      function assertType(string $type, Base $value): void {}
      function run(Base $value): void { assertType(Ready::class, $value); $value->only; }`;
    server.stdin.write(encode({ jsonrpc: '2.0', method: 'textDocument/didOpen', params: { textDocument: { uri: 'file:///TemplateAssertion.php', languageId: 'php', version: 1, text: templateAssertionSource } } }));
    await output.waitFor((message) => message.method === 'textDocument/publishDiagnostics' && message.params.uri === 'file:///TemplateAssertion.php');
    const templateAssertionOffset = templateAssertionSource.indexOf('$value->only') + '$value->only'.length;
    server.stdin.write(encode({ jsonrpc: '2.0', id: 125, method: 'textDocument/completion', params: { textDocument: { uri: 'file:///TemplateAssertion.php' }, position: lspPosition(templateAssertionSource, templateAssertionOffset) } }));
    expect((await output.waitFor((message) => message.id === 125)).result).toMatchObject([{ label: 'onlyReady' }]);
    const propertyAssertionSource = `<?php namespace PropertyAssertFlow;
      class Base {} class Ready extends Base { function onlyReady(): void {} } class Holder { public Base $value; }
      /** @phpstan-assert Ready $holder->value */ function assertHolder(Holder $holder): void {}
      function run(Holder $holder): void { assertHolder($holder); $holder->value->only; }`;
    server.stdin.write(encode({ jsonrpc: '2.0', method: 'textDocument/didOpen', params: { textDocument: { uri: 'file:///PropertyAssertion.php', languageId: 'php', version: 1, text: propertyAssertionSource } } }));
    await output.waitFor((message) => message.method === 'textDocument/publishDiagnostics' && message.params.uri === 'file:///PropertyAssertion.php');
    const propertyAssertionOffset = propertyAssertionSource.indexOf('$holder->value->only') + '$holder->value->only'.length;
    server.stdin.write(encode({ jsonrpc: '2.0', id: 126, method: 'textDocument/completion', params: { textDocument: { uri: 'file:///PropertyAssertion.php' }, position: lspPosition(propertyAssertionSource, propertyAssertionOffset) } }));
    expect((await output.waitFor((message) => message.id === 126)).result).toMatchObject([{ label: 'onlyReady' }]);
    const methodAssertionSource = `<?php namespace MethodAssertFlow;
      class Base {} class Ready extends Base { function onlyReady(): void {} }
      class Guard { /** @phpstan-assert Ready $value */ function requireReady(Base $value): void {} }
      function run(Guard $guard, Base $value): void { $guard->requireReady($value); $value->only; }`;
    server.stdin.write(encode({ jsonrpc: '2.0', method: 'textDocument/didOpen', params: { textDocument: { uri: 'file:///MethodAssertion.php', languageId: 'php', version: 1, text: methodAssertionSource } } }));
    await output.waitFor((message) => message.method === 'textDocument/publishDiagnostics' && message.params.uri === 'file:///MethodAssertion.php');
    const methodAssertionOffset = methodAssertionSource.indexOf('$value->only') + '$value->only'.length;
    server.stdin.write(encode({ jsonrpc: '2.0', id: 127, method: 'textDocument/completion', params: { textDocument: { uri: 'file:///MethodAssertion.php' }, position: lspPosition(methodAssertionSource, methodAssertionOffset) } }));
    expect((await output.waitFor((message) => message.id === 127)).result).toMatchObject([{ label: 'onlyReady' }]);
    const thisAssertionSource = `<?php namespace ThisAssertFlow;
      class Base {} class Ready extends Base { function onlyReady(): void {} }
      class Holder { public Base $value; /** @phpstan-assert Ready $this->value */ function requireReady(): void {} }
      function run(Holder $holder): void { $holder->requireReady(); $holder->value->only; }`;
    server.stdin.write(encode({ jsonrpc: '2.0', method: 'textDocument/didOpen', params: { textDocument: { uri: 'file:///ThisAssertion.php', languageId: 'php', version: 1, text: thisAssertionSource } } }));
    await output.waitFor((message) => message.method === 'textDocument/publishDiagnostics' && message.params.uri === 'file:///ThisAssertion.php');
    const thisAssertionOffset = thisAssertionSource.indexOf('$holder->value->only') + '$holder->value->only'.length;
    server.stdin.write(encode({ jsonrpc: '2.0', id: 128, method: 'textDocument/completion', params: { textDocument: { uri: 'file:///ThisAssertion.php' }, position: lspPosition(thisAssertionSource, thisAssertionOffset) } }));
    expect((await output.waitFor((message) => message.id === 128)).result).toMatchObject([{ label: 'onlyReady' }]);
    const nestedAssertionSource = `<?php namespace NestedAssertFlow;
      class Base {} class Ready extends Base { function onlyReady(): void {} }
      class Child { public Base $value; } class Holder { public Child $child; }
      /** @phpstan-assert Ready $holder->child->value */ function requireNested(Holder $holder): void {}
      function run(Holder $holder): void { requireNested($holder); $holder->child->value->only; }`;
    server.stdin.write(encode({ jsonrpc: '2.0', method: 'textDocument/didOpen', params: { textDocument: { uri: 'file:///NestedAssertion.php', languageId: 'php', version: 1, text: nestedAssertionSource } } }));
    await output.waitFor((message) => message.method === 'textDocument/publishDiagnostics' && message.params.uri === 'file:///NestedAssertion.php');
    const nestedAssertionOffset = nestedAssertionSource.indexOf('$holder->child->value->only') + '$holder->child->value->only'.length;
    server.stdin.write(encode({ jsonrpc: '2.0', id: 129, method: 'textDocument/completion', params: { textDocument: { uri: 'file:///NestedAssertion.php' }, position: lspPosition(nestedAssertionSource, nestedAssertionOffset) } }));
    expect((await output.waitFor((message) => message.id === 129)).result).toMatchObject([{ label: 'onlyReady' }]);
    const negativePropertySource = `<?php namespace NegativePropertyFlow;
      class Ready { function onlyReady(): void {} } class Holder { public ?Ready $value; }
      /** @phpstan-assert !null $holder->value */ function requirePresent(Holder $holder): void {}
      function run(Holder $holder): void { requirePresent($holder); $holder->value->only; }`;
    server.stdin.write(encode({ jsonrpc: '2.0', method: 'textDocument/didOpen', params: { textDocument: { uri: 'file:///NegativePropertyAssertion.php', languageId: 'php', version: 1, text: negativePropertySource } } }));
    await output.waitFor((message) => message.method === 'textDocument/publishDiagnostics' && message.params.uri === 'file:///NegativePropertyAssertion.php');
    const negativePropertyOffset = negativePropertySource.indexOf('$holder->value->only') + '$holder->value->only'.length;
    server.stdin.write(encode({ jsonrpc: '2.0', id: 130, method: 'textDocument/completion', params: { textDocument: { uri: 'file:///NegativePropertyAssertion.php' }, position: lspPosition(negativePropertySource, negativePropertyOffset) } }));
    expect((await output.waitFor((message) => message.id === 130)).result).toMatchObject([{ label: 'onlyReady' }]);
    const templatePropertySource = `<?php namespace TemplatePropertyFlow;
      class Base {} class Ready extends Base { function onlyReady(): void {} } class Holder { public Base $value; }
      /** @template T of Base
       * @param class-string<T> $type
       * @phpstan-assert T $holder->value */
      function requireType(string $type, Holder $holder): void {}
      function run(Holder $holder): void { requireType(Ready::class, $holder); $holder->value->only; }`;
    server.stdin.write(encode({ jsonrpc: '2.0', method: 'textDocument/didOpen', params: { textDocument: { uri: 'file:///TemplatePropertyAssertion.php', languageId: 'php', version: 1, text: templatePropertySource } } }));
    await output.waitFor((message) => message.method === 'textDocument/publishDiagnostics' && message.params.uri === 'file:///TemplatePropertyAssertion.php');
    const templatePropertyOffset = templatePropertySource.indexOf('$holder->value->only') + '$holder->value->only'.length;
    server.stdin.write(encode({ jsonrpc: '2.0', id: 131, method: 'textDocument/completion', params: { textDocument: { uri: 'file:///TemplatePropertyAssertion.php' }, position: lspPosition(templatePropertySource, templatePropertyOffset) } }));
    expect((await output.waitFor((message) => message.id === 131)).result).toMatchObject([{ label: 'onlyReady' }]);
    const shortCircuitAssertionSource = `<?php namespace ShortCircuitAssertFlow;
      class Base {} class Ready extends Base { function onlyReady(): bool { return true; } }
      /** @phpstan-assert-if-true Ready $value */ function isReady(Base $value): bool { return true; }
      function run(Base $value): void { if (isReady($value) && $value->only) {} }`;
    server.stdin.write(encode({ jsonrpc: '2.0', method: 'textDocument/didOpen', params: { textDocument: { uri: 'file:///ShortCircuitAssertion.php', languageId: 'php', version: 1, text: shortCircuitAssertionSource } } }));
    await output.waitFor((message) => message.method === 'textDocument/publishDiagnostics' && message.params.uri === 'file:///ShortCircuitAssertion.php');
    const shortCircuitAssertionOffset = shortCircuitAssertionSource.indexOf('$value->only') + '$value->only'.length;
    server.stdin.write(encode({ jsonrpc: '2.0', id: 132, method: 'textDocument/completion', params: { textDocument: { uri: 'file:///ShortCircuitAssertion.php' }, position: lspPosition(shortCircuitAssertionSource, shortCircuitAssertionOffset) } }));
    expect((await output.waitFor((message) => message.id === 132)).result).toMatchObject([{ label: 'onlyReady' }]);
    const guardAssertionSource = `<?php namespace GuardAssertFlow;
      class Base {} class Ready extends Base { function onlyReady(): void {} }
      /** @phpstan-assert-if-true Ready $value */ function isReady(Base $value): bool { return true; }
      function run(bool $flag, Base $value, Base $caught, Base $switched, Base $looped): void { if (!isReady($value)) { if ($flag) { return; } else { throw new \\RuntimeException(); } } $value->only; if (!isReady($caught)) { try { return; } catch (\\RuntimeException $error) { throw $error; } finally { echo 'done'; } } $caught->only; if (!isReady($switched)) { switch (random_int(1, 2)) { case 1: return; default: throw new \\RuntimeException(); } } $switched->only; if (!isReady($looped)) { do { return; } while ($flag); } $looped->only; }`;
    server.stdin.write(encode({ jsonrpc: '2.0', method: 'textDocument/didOpen', params: { textDocument: { uri: 'file:///GuardAssertion.php', languageId: 'php', version: 1, text: guardAssertionSource } } }));
    await output.waitFor((message) => message.method === 'textDocument/publishDiagnostics' && message.params.uri === 'file:///GuardAssertion.php');
    const guardAssertionOffset = guardAssertionSource.indexOf('$value->only') + '$value->only'.length;
    server.stdin.write(encode({ jsonrpc: '2.0', id: 133, method: 'textDocument/completion', params: { textDocument: { uri: 'file:///GuardAssertion.php' }, position: lspPosition(guardAssertionSource, guardAssertionOffset) } }));
    expect((await output.waitFor((message) => message.id === 133)).result).toMatchObject([{ label: 'onlyReady' }]);
    const tryGuardAssertionOffset = guardAssertionSource.indexOf('$caught->only') + '$caught->only'.length;
    server.stdin.write(encode({ jsonrpc: '2.0', id: 134, method: 'textDocument/completion', params: { textDocument: { uri: 'file:///GuardAssertion.php' }, position: lspPosition(guardAssertionSource, tryGuardAssertionOffset) } }));
    expect((await output.waitFor((message) => message.id === 134)).result).toMatchObject([{ label: 'onlyReady' }]);
    const switchGuardAssertionOffset = guardAssertionSource.indexOf('$switched->only') + '$switched->only'.length;
    server.stdin.write(encode({ jsonrpc: '2.0', id: 135, method: 'textDocument/completion', params: { textDocument: { uri: 'file:///GuardAssertion.php' }, position: lspPosition(guardAssertionSource, switchGuardAssertionOffset) } }));
    expect((await output.waitFor((message) => message.id === 135)).result).toMatchObject([{ label: 'onlyReady' }]);
    const loopGuardAssertionOffset = guardAssertionSource.indexOf('$looped->only') + '$looped->only'.length;
    server.stdin.write(encode({ jsonrpc: '2.0', id: 136, method: 'textDocument/completion', params: { textDocument: { uri: 'file:///GuardAssertion.php' }, position: lspPosition(guardAssertionSource, loopGuardAssertionOffset) } }));
    expect((await output.waitFor((message) => message.id === 136)).result).toMatchObject([{ label: 'onlyReady' }]);
    const genericSource = '<?php interface Row {} class User implements Row { function name(): string {} } /** @template T of Row */ class BaseRepository { /** @return T */ function find() {} } /** @extends BaseRepository<User> */ class UserRepository extends BaseRepository {} function generic(UserRepository $repository): void { $repository->find()->na; }';
    server.stdin.write(encode({ jsonrpc: '2.0', method: 'textDocument/didOpen', params: { textDocument: { uri: 'file:///Generic.php', languageId: 'php', version: 1, text: genericSource } } }));
    await output.waitFor((message) => message.method === 'textDocument/publishDiagnostics' && message.params.uri === 'file:///Generic.php');
    server.stdin.write(encode({ jsonrpc: '2.0', id: 24, method: 'textDocument/completion', params: { textDocument: { uri: 'file:///Generic.php' }, position: { line: 0, character: genericSource.indexOf('na;') + 2 } } }));
    expect((await output.waitFor((message) => message.id === 24)).result).toMatchObject([{ label: 'name' }]);
    server.stdin.write(encode({ jsonrpc: '2.0', id: 25, method: 'textDocument/hover', params: { textDocument: { uri: 'file:///Generic.php' }, position: { line: 0, character: genericSource.lastIndexOf('find()') + 1 } } }));
    expect((await output.waitFor((message) => message.id === 25)).result.contents.value).toContain(': User');
    const genericIterableSource = `<?php
      use IteratorAggregate;
      /** @phpstan-template TKey of array-key
       * @template-covariant TValue
       * @template-extends IteratorAggregate<TKey, TValue> */
      interface ReadableCollection extends IteratorAggregate {}
      /** @phpstan-template TKey of array-key
       * @phpstan-template TValue
       * @template-extends ReadableCollection<TKey, TValue> */
      interface Collection extends ReadableCollection {
        /** @return mixed
         * @phpstan-return TValue|null */
        public function get(int|string $key);
        /** @return Collection<mixed>
         * @phpstan-return Collection<TKey, TValue> */
        public function filter(callable $predicate);
        /** @phpstan-template U of object
         * @phpstan-param Closure(TValue): U $func
         * @phpstan-return Collection<TKey, U> */
        public function map(Closure $func);
      }
      class IteratedUser { public function name(): string {} }
      class IteratedView { public function title(): string {} }
      /** @phpstan-param Collection<int, IteratedUser> $users */
      function iterateGeneric(Collection $users): void {
        foreach ($users as $user) { $user->na; }
        $users->get(0)?->na;
        $users->filter(fn(IteratedUser $user): bool => true)->get(0)?->na;
        $users->map(fn(IteratedUser $user): IteratedView => new IteratedView())->get(0)?->ti;
        $views = $users->map(fn(IteratedUser $user): IteratedView => new IteratedView());
        $views->get(0)?->ti;
      }`;
    server.stdin.write(encode({ jsonrpc: '2.0', method: 'textDocument/didOpen', params: { textDocument: { uri: 'file:///GenericIterable.php', languageId: 'php', version: 1, text: genericIterableSource } } }));
    await output.waitFor((message) => message.method === 'textDocument/publishDiagnostics' && message.params.uri === 'file:///GenericIterable.php');
    for (const [id, match] of [...genericIterableSource.matchAll(/na;/g)].map((item, index) => [28 + index, item.index] as const)) {
      server.stdin.write(encode({ jsonrpc: '2.0', id, method: 'textDocument/completion', params: { textDocument: { uri: 'file:///GenericIterable.php' }, position: lspPosition(genericIterableSource, match + 2) } }));
      expect((await output.waitFor((message) => message.id === id)).result).toMatchObject([{ label: 'name' }]);
    }
    for (const [id, match] of [...genericIterableSource.matchAll(/ti;/g)].map((item, index) => [32 + index, item.index] as const)) {
      server.stdin.write(encode({ jsonrpc: '2.0', id, method: 'textDocument/completion', params: { textDocument: { uri: 'file:///GenericIterable.php' }, position: lspPosition(genericIterableSource, match + 2) } }));
      expect((await output.waitFor((message) => message.id === id)).result).toMatchObject([{ label: 'title' }]);
    }
    const organizeSource = '<?php namespace Imports;\nuse Vendor\\Unused;\nuse Vendor\\Used;\nfunction run(Used $used): void {}\n';
    server.stdin.write(encode({ jsonrpc: '2.0', method: 'textDocument/didOpen', params: { textDocument: { uri: 'file:///Organize.php', languageId: 'php', version: 1, text: organizeSource } } }));
    await output.waitFor((message) => message.method === 'textDocument/publishDiagnostics' && message.params.uri === 'file:///Organize.php');
    server.stdin.write(encode({ jsonrpc: '2.0', id: 9, method: 'textDocument/codeAction', params: { textDocument: { uri: 'file:///Organize.php' }, range: { start: { line: 0, character: 0 }, end: { line: 0, character: 0 } }, context: { diagnostics: [], only: ['source.organizeImports'] } } }));
    expect((await output.waitFor((message) => message.id === 9)).result).toMatchObject([{ title: 'Organize Imports', kind: 'source.organizeImports', edit: { changes: { 'file:///Organize.php': [{ newText: 'use Vendor\\Used;\n' }] } } }]);
    server.stdin.write(encode({ jsonrpc: '2.0', id: 6, method: 'textDocument/semanticTokens/full', params: { textDocument: { uri: 'file:///Named.php' } } }));
    expect((await output.waitFor((message) => message.id === 6)).result.data.length).toBeGreaterThan(0);
    const cancellationStarted = Date.now();
    server.stdin.write(
      encode({ jsonrpc: '2.0', id: 8, method: 'workspace/symbol', params: { query: '' } })
      + encode({ jsonrpc: '2.0', method: '$/cancelRequest', params: { id: 8 } }),
    );
    expect((await output.waitFor((message) => message.id === 8)).result).toEqual([]);
    expect(Date.now() - cancellationStarted).toBeLessThan(100);

    server.stdin.write(encode({ jsonrpc: '2.0', id: 3, method: 'shutdown', params: null }));
    await output.waitFor((message) => message.id === 3);
    server.stdin.write(encode({ jsonrpc: '2.0', method: 'exit', params: null }));
  });

  it('refreshes indexed PHP files after a watched disk change', async () => {
    const root = await mkdtemp(join(tmpdir(), 'php-companion-watch-'));
    try {
      await mkdir(join(root, 'src'));
      await mkdir(join(root, 'config'));
      await writeFile(join(root, 'composer.json'), JSON.stringify({ autoload: { 'psr-4': { 'App\\': 'src/' } } }));
      await writeFile(join(root, 'composer.lock'), '{}');
      const servicePath = join(root, 'src', 'Service.php');
      await writeFile(servicePath, `<?php namespace Psr\\Container { interface ContainerInterface { public function get(string $id): mixed; } }
        namespace App {
          use Doctrine\\Bundle\\DoctrineBundle\\Repository\\ServiceEntityRepository;
          class Order { public function number(): string {} }
          interface Transport { public function shared(): Mailer; public function route(): MailResult|OtherResult; }
          interface Auditable { public function audit(): void; }
          interface Other { public function shared(): Mailer; public function route(): MailResult|OtherResult; }
          class MailResult { public function finish(): void {} }
          class OtherResult { public function finish(): void {} }
          class Mailer implements Transport, Auditable { public function send(): void {} public function shared(): Mailer { return $this; } public function audit(): void {} }
          class Holder { public Mailer $mailer; }
          class Provider { public Holder $holder; }
          /**
           * @template TKey
           * @template TValue
           */ class Collection { /** @return TValue */ public function first() {} }
          #[\\Doctrine\\ORM\\Mapping\\Entity] class User { #[\\Doctrine\\ORM\\Mapping\\OneToMany(targetEntity: Order::class)] public Collection $orders; public function name(): string {} }
          class UserRepository extends ServiceEntityRepository { public function __construct($registry) { parent::__construct($registry, User::class); } }
          class Service { public function oldMethod(): void {} public function provider(): Provider {} }
          function choose(): Transport|Other {}
        }
        namespace Vendor\\Bundle { class Mailer { public function deliver(): void {} } }`);
      const servicesPath = join(root, 'config', 'services.yaml');
      await writeFile(servicesPath, 'services:\n  _defaults:\n    public: false\n    autowire: true\n    bind:\n      \'App\\Transport $bound\': \'@app.mailer\'\n  App\\:\n    resource: ../src/*\n  app.mailer:\n    class: App\\Mailer\n    public: true\n  \'App\\Transport $audit\': \'@app.mailer\'\n  \'(App\\Auditable&App\\Transport)|App\\Other\': \'@app.mailer\'\n  App\\ExplicitCallConsumer:\n    calls:\n      - setTransport: [\'@app.mailer\']\n  App\\ExplicitPropertyConsumer:\n    properties:\n      configuredProperty: \'@app.mailer\'\n');
      const compiledCallsPath = join(root, 'src', 'CompiledCalls.php');
      const compiledCalls = '<?php namespace App; final class CompiledCallConsumer { #[\\Symfony\\Contracts\\Service\\Attribute\\Required] public \\Vendor\\Bundle\\Mailer $propertyMailer; public function __construct(#[\\Symfony\\Component\\DependencyInjection\\Attribute\\Autowire(service: "bundle.mailer")] private \\Vendor\\Bundle\\Mailer $mailer) {} public function setMailer(\\Vendor\\Bundle\\Mailer $mailer): void {} }';
      await writeFile(compiledCallsPath, compiledCalls);
      await writeFile(join(root, 'src', 'Invoice.php'), '<?php namespace Domain\\Billing; class Invoice {}');
      const consumer = '<?php namespace App; final class WiredConsumer { public function __construct(private Transport $transport) {} } final class BoundConsumer { public function __construct(private Transport $bound) {} } final class TargetConsumer { public function __construct(#[\\Symfony\\Component\\DependencyInjection\\Attribute\\Target("audit")] private Transport $transport) {} } final class UnionConsumer { public function __construct(private Transport|Auditable $combined) {} } final class IntersectionConsumer { public function __construct(private Transport&Auditable $strict) {} } final class DnfConsumer { public function __construct(private (Transport&Auditable)|Other $dnf) {} } final class RequiredConsumer { #[\\Symfony\\Contracts\\Service\\Attribute\\Required] public Transport $requiredProperty; #[\\Symfony\\Contracts\\Service\\Attribute\\Required] public function setTransport(Transport $required): void {} } abstract class RequiredBase { #[\\Symfony\\Contracts\\Service\\Attribute\\Required] public function setInherited(Transport $inherited): void {} } final class RequiredChild extends RequiredBase { public function setInherited(Transport $prototype): void {} } final class ExplicitCallConsumer { #[\\Symfony\\Contracts\\Service\\Attribute\\Required] public function setTransport(Transport $configured): void {} } final class ExplicitPropertyConsumer { #[\\Symfony\\Contracts\\Service\\Attribute\\Required] public Transport $configuredProperty; } final class CompiledController { public function send(\\Vendor\\Bundle\\Mailer $bundleMailer): void {} } function composite((Transport&Auditable)|Other $dnf, (Transport&Auditable)|Other|null $nullable): void { $dnf->sha; $dnf->shared(); $dnf->route()->fi; $route = $dnf->route(); $route->fi; $dnf->audit(); $nullable->shared(); $copy = $dnf; $copy->sha; $copy->shared(); $choice = choose(); $choice->sha; $choice->shared(); } function catching(): void { try {} catch (Transport|Other $exception) { $exception->sha; $exception->shared(); } } function run(Service $service): void { $invoice = new Inv; $helper = localH; $service->newM; $nested = $service->provider()->holder->mailer; $nested->se; } function doctrine(UserRepository $repo): void { $user = $repo->find(1); $repo->fi; $user?->na; $user?->orders?->first()?->nu; } function iterate(User $user): void { foreach ($user->orders as $order) { $order->nu; } } function iterateRepository(UserRepository $repo): void { foreach ($repo->findAll() as $user) { $user->na; } } function service(\\Psr\\Container\\ContainerInterface $container): void { $container->get("app.mailer")->se; $mailer = $container->get("app.mailer"); $mailer->se; $container->get("bundle.mailer")->del; } function property(Holder $holder): void { $mailer = $holder->mailer; $mailer->se; } function wired(#[\\Symfony\\Component\\DependencyInjection\\Attribute\\Autowire(service: "App\\Serv")] object $service): void {}';
      await writeFile(join(root, 'src', 'Consumer.php'), consumer);
      await mkdir(join(root, 'var', 'cache', 'dev'), { recursive: true });
      await writeFile(join(root, 'var', 'cache', 'dev', 'App_KernelDevDebugContainer.xml'), `<?xml version="1.0"?><container><services>
        <service id="bundle.mailer" class="Vendor\\Bundle\\Mailer" public="true"/>
        <service id="app.compiled_call_consumer" class="App\\CompiledCallConsumer"><argument type="service" id="bundle.mailer"/><call method="setMailer"><argument type="service" id="bundle.mailer"/></call><property name="propertyMailer" type="service" id="bundle.mailer"/></service>
        <service id=".service_locator.bundle" class="Symfony\\Component\\DependencyInjection\\ServiceLocator"><tag name="container.service_locator"/><argument type="collection"><argument key="bundleMailer" type="service_closure" id="bundle.mailer"/></argument></service>
        <service id=".service_locator.bundle.context" class="Symfony\\Component\\DependencyInjection\\ServiceLocator"><tag name="container.service_locator_context" id="App\\CompiledController::send()"/><factory service=".service_locator.bundle" method="withContext"/></service>
      </services></container>`);
      server = spawn(process.execPath, [resolve('dist/server.js'), '--stdio'], { stdio: 'pipe' });
      const output = messagesFrom(server); const rootUri = pathToFileURL(root).toString();
      server.stdin.write(encode({ jsonrpc: '2.0', id: 10, method: 'initialize', params: { processId: null, capabilities: { window: { workDoneProgress: true }, workspace: { didChangeWatchedFiles: { dynamicRegistration: true } } }, rootUri } }));
      await output.waitFor((message) => message.id === 10);
      server.stdin.write(encode({ jsonrpc: '2.0', method: 'initialized', params: {} }));
      const progressCreate = await output.waitFor((message) => message.method === 'window/workDoneProgress/create');
      server.stdin.write(encode({ jsonrpc: '2.0', id: progressCreate.id, result: null }));
      const progressToken = progressCreate.params.token;
      await output.waitFor((message) => message.method === '$/progress' && message.params.token === progressToken && message.params.value.kind === 'begin');
      const registration = await output.waitFor((message) => message.method === 'client/registerCapability');
      server.stdin.write(encode({ jsonrpc: '2.0', id: registration.id, result: null }));
      await output.waitFor((message) => message.method === 'window/logMessage' && message.params?.message?.includes('Indexed 4 PHP files'));
      await output.waitFor((message) => message.method === '$/progress' && message.params.token === progressToken && message.params.value.kind === 'end');
      const consumerUri = pathToFileURL(join(root, 'src', 'Consumer.php')).toString();
      server.stdin.write(encode({ jsonrpc: '2.0', method: 'textDocument/didOpen', params: { textDocument: { uri: consumerUri, languageId: 'php', version: 1, text: consumer } } }));
      const initialDiagnostics = await output.waitFor((message) => message.method === 'textDocument/publishDiagnostics' && message.params.uri === consumerUri);
      expect(initialDiagnostics.params.diagnostics).toEqual(expect.arrayContaining([
        expect.objectContaining({ code: 'php.member.unresolved', message: expect.stringContaining('audit') }),
        expect.objectContaining({ code: 'php.member.possibly-null', message: expect.stringContaining('shared') }),
      ]));
      const compiledCallsUri = pathToFileURL(compiledCallsPath).toString();
      server.stdin.write(encode({ jsonrpc: '2.0', method: 'textDocument/didOpen', params: { textDocument: { uri: compiledCallsUri, languageId: 'php', version: 1, text: compiledCalls } } }));
      await output.waitFor((message) => message.method === 'textDocument/publishDiagnostics' && message.params.uri === compiledCallsUri);
      for (const [id, needle] of [[77, 'Mailer $mailer)'], [78, 'Mailer $mailer):'], [79, 'Mailer $propertyMailer']] as const) {
        const typeOffset = compiledCalls.indexOf(needle) + 3;
        server.stdin.write(encode({ jsonrpc: '2.0', id, method: 'textDocument/hover', params: { textDocument: { uri: compiledCallsUri }, position: lspPosition(compiledCalls, typeOffset) } }));
        expect((await output.waitFor((message) => message.id === id)).result).toMatchObject({ contents: { value: expect.stringContaining('(compiled)') } });
      }
      server.stdin.write(encode({ jsonrpc: '2.0', id: 12, method: 'textDocument/completion', params: { textDocument: { uri: consumerUri }, position: { line: 0, character: consumer.indexOf('Inv;') + 3 } } }));
      const typeCompletion = await output.waitFor((message) => message.id === 12);
      expect(typeCompletion.result).toEqual(expect.arrayContaining([
        expect.objectContaining({ label: 'Invoice', detail: 'Domain\\Billing\\Invoice', additionalTextEdits: [expect.objectContaining({ newText: expect.stringContaining('use Domain\\Billing\\Invoice;') })] }),
      ]));
      server.stdin.write(encode({ jsonrpc: '2.0', id: 16, method: 'textDocument/completion', params: { textDocument: { uri: consumerUri }, position: { line: 0, character: consumer.indexOf('$repo->fi') + '$repo->fi'.length } } }));
      expect((await output.waitFor((message) => message.id === 16)).result).toEqual(expect.arrayContaining([
        expect.objectContaining({ label: 'find', detail: expect.stringContaining('App\\User|null') }),
        expect.objectContaining({ label: 'findAll' }), expect.objectContaining({ label: 'findBy' }), expect.objectContaining({ label: 'findOneBy' }),
      ]));
      server.stdin.write(encode({ jsonrpc: '2.0', id: 17, method: 'textDocument/completion', params: { textDocument: { uri: consumerUri }, position: { line: 0, character: consumer.indexOf('na;') + 2 } } }));
      expect((await output.waitFor((message) => message.id === 17)).result).toMatchObject([{ label: 'name' }]);
      server.stdin.write(encode({ jsonrpc: '2.0', id: 18, method: 'textDocument/completion', params: { textDocument: { uri: consumerUri }, position: { line: 0, character: consumer.indexOf('nu;') + 2 } } }));
      expect((await output.waitFor((message) => message.id === 18)).result).toMatchObject([{ label: 'number' }]);
      server.stdin.write(encode({ jsonrpc: '2.0', id: 19, method: 'textDocument/completion', params: { textDocument: { uri: consumerUri }, position: { line: 0, character: consumer.lastIndexOf('nu;') + 2 } } }));
      expect((await output.waitFor((message) => message.id === 19)).result).toMatchObject([{ label: 'number' }]);
      server.stdin.write(encode({ jsonrpc: '2.0', id: 31, method: 'textDocument/completion', params: { textDocument: { uri: consumerUri }, position: { line: 0, character: consumer.lastIndexOf('na;') + 2 } } }));
      expect((await output.waitFor((message) => message.id === 31)).result).toMatchObject([{ label: 'name' }]);
      for (const [id, match] of [...consumer.matchAll(/se;/g)].map((item, index) => [35 + index, item.index] as const)) {
        server.stdin.write(encode({ jsonrpc: '2.0', id, method: 'textDocument/completion', params: { textDocument: { uri: consumerUri }, position: { line: 0, character: match + 2 } } }));
        expect((await output.waitFor((message) => message.id === id)).result).toMatchObject([{ label: 'send' }]);
      }
      const serviceIdOffset = consumer.indexOf('App\\Serv') + 'App\\Serv'.length;
      server.stdin.write(encode({ jsonrpc: '2.0', id: 39, method: 'textDocument/completion', params: { textDocument: { uri: consumerUri }, position: lspPosition(consumer, serviceIdOffset) } }));
      expect((await output.waitFor((message) => message.id === 39)).result).toEqual(expect.arrayContaining([
        expect.objectContaining({ label: 'App\\Service', detail: 'App\\Service', textEdit: expect.objectContaining({ newText: 'App\\Service' }) }),
      ]));
      const definitionSource = consumer.replace('App\\Serv', 'App\\Service');
      server.stdin.write(encode({ jsonrpc: '2.0', method: 'textDocument/didChange', params: { textDocument: { uri: consumerUri, version: 2 }, contentChanges: [{ text: definitionSource }] } }));
      await output.waitFor((message) => message.method === 'textDocument/publishDiagnostics' && message.params.uri === consumerUri && message.params.version === 2);
      server.stdin.write(encode({ jsonrpc: '2.0', id: 40, method: 'textDocument/definition', params: { textDocument: { uri: consumerUri }, position: lspPosition(definitionSource, definitionSource.indexOf('App\\Service') + 5) } }));
      expect((await output.waitFor((message) => message.id === 40)).result).toMatchObject([{ uri: pathToFileURL(servicePath).toString() }]);
      server.stdin.write(encode({ jsonrpc: '2.0', id: 42, method: 'textDocument/hover', params: { textDocument: { uri: consumerUri }, position: lspPosition(definitionSource, definitionSource.indexOf('App\\Service') + 5) } }));
      expect((await output.waitFor((message) => message.id === 42)).result).toMatchObject({ contents: { value: expect.stringContaining('class App\\Service') } });
      const transportOffset = definitionSource.indexOf('Transport $transport') + 3;
      server.stdin.write(encode({ jsonrpc: '2.0', id: 48, method: 'textDocument/hover', params: { textDocument: { uri: consumerUri }, position: lspPosition(definitionSource, transportOffset) } }));
      expect((await output.waitFor((message) => message.id === 48)).result).toMatchObject({ contents: { value: expect.stringContaining('(inferred)') } });
      server.stdin.write(encode({ jsonrpc: '2.0', id: 49, method: 'textDocument/definition', params: { textDocument: { uri: consumerUri }, position: lspPosition(definitionSource, transportOffset) } }));
      expect((await output.waitFor((message) => message.id === 49)).result).toMatchObject([{ uri: pathToFileURL(servicePath).toString() }]);
      const boundOffset = definitionSource.indexOf('Transport $bound') + 3;
      server.stdin.write(encode({ jsonrpc: '2.0', id: 52, method: 'textDocument/hover', params: { textDocument: { uri: consumerUri }, position: lspPosition(definitionSource, boundOffset) } }));
      expect((await output.waitFor((message) => message.id === 52)).result).toMatchObject({ contents: { value: expect.stringContaining('(binding)') } });
      const targetOffset = definitionSource.lastIndexOf('Transport $transport') + 3;
      server.stdin.write(encode({ jsonrpc: '2.0', id: 53, method: 'textDocument/hover', params: { textDocument: { uri: consumerUri }, position: lspPosition(definitionSource, targetOffset) } }));
      expect((await output.waitFor((message) => message.id === 53)).result).toMatchObject({ contents: { value: expect.stringContaining('(named alias)') } });
      for (const [id, needle] of [[54, 'Transport|Auditable'], [55, 'Transport&Auditable']] as const) {
        const combinedOffset = definitionSource.indexOf(needle) + 3;
        server.stdin.write(encode({ jsonrpc: '2.0', id, method: 'textDocument/hover', params: { textDocument: { uri: consumerUri }, position: lspPosition(definitionSource, combinedOffset) } }));
        expect((await output.waitFor((message) => message.id === id)).result).toMatchObject({ contents: { value: expect.stringContaining('(inferred)') } });
      }
      const requiredOffset = definitionSource.indexOf('Transport $required)') + 3;
      server.stdin.write(encode({ jsonrpc: '2.0', id: 56, method: 'textDocument/hover', params: { textDocument: { uri: consumerUri }, position: lspPosition(definitionSource, requiredOffset) } }));
      expect((await output.waitFor((message) => message.id === 56)).result).toMatchObject({ contents: { value: expect.stringContaining('Symfony autowiring') } });
      const inheritedOffset = definitionSource.indexOf('Transport $inherited') + 3;
      server.stdin.write(encode({ jsonrpc: '2.0', id: 58, method: 'textDocument/hover', params: { textDocument: { uri: consumerUri }, position: lspPosition(definitionSource, inheritedOffset) } }));
      expect((await output.waitFor((message) => message.id === 58)).result).toMatchObject({ contents: { value: expect.stringContaining('Symfony autowiring') } });
      const prototypeOffset = definitionSource.indexOf('Transport $prototype') + 3;
      server.stdin.write(encode({ jsonrpc: '2.0', id: 61, method: 'textDocument/hover', params: { textDocument: { uri: consumerUri }, position: lspPosition(definitionSource, prototypeOffset) } }));
      expect((await output.waitFor((message) => message.id === 61)).result).toMatchObject({ contents: { value: expect.stringContaining('Symfony autowiring') } });
      const configuredOffset = definitionSource.indexOf('Transport $configured') + 3;
      server.stdin.write(encode({ jsonrpc: '2.0', id: 57, method: 'textDocument/hover', params: { textDocument: { uri: consumerUri }, position: lspPosition(definitionSource, configuredOffset) } }));
      expect((await output.waitFor((message) => message.id === 57)).result).toMatchObject({ contents: { value: expect.not.stringContaining('Symfony autowiring') } });
      const dnfOffset = definitionSource.indexOf('Other $dnf') + 2;
      server.stdin.write(encode({ jsonrpc: '2.0', id: 67, method: 'textDocument/hover', params: { textDocument: { uri: consumerUri }, position: lspPosition(definitionSource, dnfOffset) } }));
      expect((await output.waitFor((message) => message.id === 67)).result).toMatchObject({ contents: { value: expect.stringContaining('Symfony autowiring') } });
      server.stdin.write(encode({ jsonrpc: '2.0', id: 68, method: 'textDocument/definition', params: { textDocument: { uri: consumerUri }, position: lspPosition(definitionSource, dnfOffset) } }));
      expect((await output.waitFor((message) => message.id === 68)).result).toMatchObject([{ uri: pathToFileURL(servicePath).toString() }]);
      const compositeCompletion = definitionSource.indexOf('$dnf->sha') + '$dnf->sha'.length;
      server.stdin.write(encode({ jsonrpc: '2.0', id: 69, method: 'textDocument/completion', params: { textDocument: { uri: consumerUri }, position: lspPosition(definitionSource, compositeCompletion) } }));
      expect((await output.waitFor((message) => message.id === 69)).result).toMatchObject([{ label: 'shared' }]);
      const compositeMember = definitionSource.indexOf('shared();', definitionSource.indexOf('function composite')) + 2;
      server.stdin.write(encode({ jsonrpc: '2.0', id: 70, method: 'textDocument/definition', params: { textDocument: { uri: consumerUri }, position: lspPosition(definitionSource, compositeMember) } }));
      expect((await output.waitFor((message) => message.id === 70)).result).toHaveLength(2);
      server.stdin.write(encode({ jsonrpc: '2.0', id: 71, method: 'textDocument/hover', params: { textDocument: { uri: consumerUri }, position: lspPosition(definitionSource, compositeMember) } }));
      expect((await output.waitFor((message) => message.id === 71)).result).toMatchObject({ contents: { value: expect.stringContaining('shared') } });
      const compositeReturn = definitionSource.indexOf('->fi', definitionSource.indexOf('function composite')) + 4;
      server.stdin.write(encode({ jsonrpc: '2.0', id: 80, method: 'textDocument/completion', params: { textDocument: { uri: consumerUri }, position: lspPosition(definitionSource, compositeReturn) } }));
      expect((await output.waitFor((message) => message.id === 80)).result).toMatchObject([{ label: 'finish' }]);
      const assignedCompositeReturn = definitionSource.indexOf('$route->fi') + '$route->fi'.length;
      server.stdin.write(encode({ jsonrpc: '2.0', id: 81, method: 'textDocument/completion', params: { textDocument: { uri: consumerUri }, position: lspPosition(definitionSource, assignedCompositeReturn) } }));
      expect((await output.waitFor((message) => message.id === 81)).result).toMatchObject([{ label: 'finish' }]);
      const copyCompletion = definitionSource.indexOf('$copy->sha') + '$copy->sha'.length;
      server.stdin.write(encode({ jsonrpc: '2.0', id: 74, method: 'textDocument/completion', params: { textDocument: { uri: consumerUri }, position: lspPosition(definitionSource, copyCompletion) } }));
      expect((await output.waitFor((message) => message.id === 74)).result).toMatchObject([{ label: 'shared' }]);
      const copyMember = definitionSource.indexOf('shared();', definitionSource.indexOf('$copy->sha')) + 2;
      server.stdin.write(encode({ jsonrpc: '2.0', id: 75, method: 'textDocument/definition', params: { textDocument: { uri: consumerUri }, position: lspPosition(definitionSource, copyMember) } }));
      expect((await output.waitFor((message) => message.id === 75)).result).toHaveLength(2);
      const choiceCompletion = definitionSource.indexOf('$choice->sha') + '$choice->sha'.length;
      server.stdin.write(encode({ jsonrpc: '2.0', id: 76, method: 'textDocument/completion', params: { textDocument: { uri: consumerUri }, position: lspPosition(definitionSource, choiceCompletion) } }));
      expect((await output.waitFor((message) => message.id === 76)).result).toMatchObject([{ label: 'shared' }]);
      const catchCompletion = definitionSource.indexOf('$exception->sha') + '$exception->sha'.length;
      server.stdin.write(encode({ jsonrpc: '2.0', id: 72, method: 'textDocument/completion', params: { textDocument: { uri: consumerUri }, position: lspPosition(definitionSource, catchCompletion) } }));
      expect((await output.waitFor((message) => message.id === 72)).result).toMatchObject([{ label: 'shared' }]);
      const catchMember = definitionSource.indexOf('shared();', definitionSource.indexOf('function catching')) + 2;
      server.stdin.write(encode({ jsonrpc: '2.0', id: 73, method: 'textDocument/definition', params: { textDocument: { uri: consumerUri }, position: lspPosition(definitionSource, catchMember) } }));
      expect((await output.waitFor((message) => message.id === 73)).result).toHaveLength(2);
      const requiredPropertyOffset = definitionSource.indexOf('Transport $requiredProperty') + 3;
      server.stdin.write(encode({ jsonrpc: '2.0', id: 59, method: 'textDocument/hover', params: { textDocument: { uri: consumerUri }, position: lspPosition(definitionSource, requiredPropertyOffset) } }));
      expect((await output.waitFor((message) => message.id === 59)).result).toMatchObject({ contents: { value: expect.stringContaining('Symfony autowiring') } });
      const configuredPropertyOffset = definitionSource.indexOf('Transport $configuredProperty') + 3;
      server.stdin.write(encode({ jsonrpc: '2.0', id: 60, method: 'textDocument/hover', params: { textDocument: { uri: consumerUri }, position: lspPosition(definitionSource, configuredPropertyOffset) } }));
      expect((await output.waitFor((message) => message.id === 60)).result).toMatchObject({ contents: { value: expect.not.stringContaining('Symfony autowiring') } });
      const bundleOffset = definitionSource.indexOf('Mailer $bundleMailer') + 3;
      server.stdin.write(encode({ jsonrpc: '2.0', id: 62, method: 'textDocument/hover', params: { textDocument: { uri: consumerUri }, position: lspPosition(definitionSource, bundleOffset) } }));
      expect((await output.waitFor((message) => message.id === 62)).result).toMatchObject({ contents: { value: expect.stringContaining('(compiled)') } });
      server.stdin.write(encode({ jsonrpc: '2.0', id: 63, method: 'textDocument/definition', params: { textDocument: { uri: consumerUri }, position: lspPosition(definitionSource, bundleOffset) } }));
      expect((await output.waitFor((message) => message.id === 63)).result).toMatchObject([{ uri: pathToFileURL(servicePath).toString() }]);
      const bundleMember = definitionSource.indexOf('->del') + '->del'.length;
      server.stdin.write(encode({ jsonrpc: '2.0', id: 65, method: 'textDocument/completion', params: { textDocument: { uri: consumerUri }, position: lspPosition(definitionSource, bundleMember) } }));
      expect((await output.waitFor((message) => message.id === 65)).result).toMatchObject([{ label: 'deliver' }]);
      await writeFile(servicesPath, 'services: {}\n');
      server.stdin.write(encode({ jsonrpc: '2.0', method: 'workspace/didChangeWatchedFiles', params: { changes: [{ uri: pathToFileURL(servicesPath).toString(), type: 2 }] } }));
      await new Promise((resolvePromise) => setTimeout(resolvePromise, 50));
      server.stdin.write(encode({ jsonrpc: '2.0', id: 64, method: 'textDocument/hover', params: { textDocument: { uri: consumerUri }, position: lspPosition(definitionSource, bundleOffset) } }));
      expect((await output.waitFor((message) => message.id === 64)).result).toMatchObject({ contents: { value: expect.not.stringContaining('(compiled)') } });
      server.stdin.write(encode({ jsonrpc: '2.0', id: 66, method: 'textDocument/completion', params: { textDocument: { uri: consumerUri }, position: lspPosition(definitionSource, bundleMember) } }));
      expect((await output.waitFor((message) => message.id === 66)).result).toEqual([]);
      const containerAssignmentMember = consumer.indexOf('$mailer->se', consumer.indexOf('$mailer = $container')) + '$mailer->se'.length;
      server.stdin.write(encode({ jsonrpc: '2.0', id: 41, method: 'textDocument/completion', params: { textDocument: { uri: consumerUri }, position: lspPosition(definitionSource, containerAssignmentMember) } }));
      expect((await output.waitFor((message) => message.id === 41)).result).toEqual([]);
      await writeFile(servicePath, '<?php namespace App; class Service { public function newMethod(): void {} } function localHelper(): Service {}');
      server.stdin.write(encode({ jsonrpc: '2.0', method: 'workspace/didChangeWatchedFiles', params: { changes: [{ uri: pathToFileURL(servicePath).toString(), type: 2 }] } }));
      await new Promise((resolvePromise) => setTimeout(resolvePromise, 100));
      server.stdin.write(encode({ jsonrpc: '2.0', id: 11, method: 'textDocument/completion', params: { textDocument: { uri: consumerUri }, position: { line: 0, character: consumer.indexOf('newM') + 4 } } }));
      const completion = await output.waitFor((message) => message.id === 11);
      expect(completion.result).toMatchObject([{ label: 'newMethod' }]);
      server.stdin.write(encode({ jsonrpc: '2.0', id: 15, method: 'textDocument/completion', params: { textDocument: { uri: consumerUri }, position: { line: 0, character: consumer.indexOf('localH;') + 6 } } }));
      expect((await output.waitFor((message) => message.id === 15)).result).toMatchObject([{ label: 'localHelper', kind: 3 }]);
      const serviceUri = pathToFileURL(servicePath).toString();
      server.stdin.write(encode({ jsonrpc: '2.0', method: 'textDocument/didOpen', params: { textDocument: { uri: serviceUri, languageId: 'php', version: 1, text: '<?php namespace App; class Service {}' } } }));
      await output.waitFor((message) => message.method === 'textDocument/publishDiagnostics' && message.params.uri === serviceUri);
      server.stdin.write(encode({ jsonrpc: '2.0', method: 'textDocument/didClose', params: { textDocument: { uri: serviceUri } } }));
      await new Promise((resolvePromise) => setTimeout(resolvePromise, 100));
      server.stdin.write(encode({ jsonrpc: '2.0', id: 13, method: 'textDocument/completion', params: { textDocument: { uri: consumerUri }, position: { line: 0, character: consumer.indexOf('newM') + 4 } } }));
      expect((await output.waitFor((message) => message.id === 13)).result).toMatchObject([{ label: 'newMethod' }]);
      const wrongUri = pathToFileURL(join(root, 'src', 'Wrong.php')).toString();
      server.stdin.write(encode({ jsonrpc: '2.0', method: 'textDocument/didOpen', params: { textDocument: { uri: wrongUri, languageId: 'php', version: 1, text: '<?php namespace Wrong; class Wrong {}' } } }));
      const namespaceDiagnostics = await output.waitFor((message) => message.method === 'textDocument/publishDiagnostics' && message.params.uri === wrongUri);
      expect(namespaceDiagnostics.params.diagnostics).toMatchObject([{ code: 'php.namespace.psr4', data: { expectedNamespace: 'App' } }]);
      server.stdin.write(encode({ jsonrpc: '2.0', id: 14, method: 'textDocument/codeAction', params: { textDocument: { uri: wrongUri }, range: namespaceDiagnostics.params.diagnostics[0].range, context: { diagnostics: namespaceDiagnostics.params.diagnostics } } }));
      expect((await output.waitFor((message) => message.id === 14)).result).toMatchObject([{ kind: 'quickfix', isPreferred: true, edit: { changes: { [wrongUri]: [{ newText: 'App' }] } } }]);
    } finally { await rm(root, { recursive: true, force: true }); }
  });

  it('isolates semantic queries between workspace roots with identical FQCNs', async () => {
    const parent = await mkdtemp(join(tmpdir(), 'php-companion-multiroot-'));
    const firstRoot = join(parent, 'first'); const secondRoot = join(parent, 'second');
    try {
      for (const [root, method] of [[firstRoot, 'firstOnly'], [secondRoot, 'secondOnly']] as const) {
        await mkdir(join(root, 'src'), { recursive: true });
        await writeFile(join(root, 'composer.json'), JSON.stringify({ autoload: { 'psr-4': { 'App\\': 'src/' } } }));
        await writeFile(join(root, 'src', 'Service.php'), `<?php namespace App; class Service { public function ${method}(): void {} }`);
      }
      server = spawn(process.execPath, [resolve('dist/server.js'), '--stdio'], { stdio: 'pipe' });
      const output = messagesFrom(server);
      server.stdin.write(encode({ jsonrpc: '2.0', id: 20, method: 'initialize', params: { processId: null, capabilities: { workspace: { didChangeWatchedFiles: { dynamicRegistration: true } } }, workspaceFolders: [
        { uri: pathToFileURL(firstRoot).toString(), name: 'first' }, { uri: pathToFileURL(secondRoot).toString(), name: 'second' },
      ] } }));
      await output.waitFor((message) => message.id === 20);
      server.stdin.write(encode({ jsonrpc: '2.0', method: 'initialized', params: {} }));
      const registration = await output.waitFor((message) => message.method === 'client/registerCapability');
      server.stdin.write(encode({ jsonrpc: '2.0', id: registration.id, result: null }));
      await output.waitFor((message) => message.method === 'window/logMessage' && message.params?.message?.includes(secondRoot));
      for (const [id, root, prefix, expected] of [[21, firstRoot, 'second', []], [22, secondRoot, 'second', ['secondOnly']]] as const) {
        const uri = pathToFileURL(join(root, 'src', 'Consumer.php')).toString();
        const source = `<?php namespace App; function run(Service $service): void { $service->${prefix} }`;
        server.stdin.write(encode({ jsonrpc: '2.0', method: 'textDocument/didOpen', params: { textDocument: { uri, languageId: 'php', version: 1, text: source } } }));
        await output.waitFor((message) => message.method === 'textDocument/publishDiagnostics' && message.params.uri === uri);
        server.stdin.write(encode({ jsonrpc: '2.0', id, method: 'textDocument/completion', params: { textDocument: { uri }, position: { line: 0, character: source.indexOf(prefix) + prefix.length } } }));
        expect((await output.waitFor((message) => message.id === id)).result.map((item: { label: string }) => item.label)).toEqual(expected);
      }
    } finally { await rm(parent, { recursive: true, force: true }); }
  });

  it('preserves vscode-remote URIs through indexing, navigation, and file invalidation', async () => {
    const root = await mkdtemp(join(tmpdir(), 'php-companion-remote-'));
    try {
      await mkdir(join(root, 'src'), { recursive: true });
      await writeFile(join(root, 'composer.json'), JSON.stringify({ autoload: { 'psr-4': { 'App\\': 'src/' } } }));
      const servicePath = join(root, 'src', 'Service.php');
      const consumerPath = join(root, 'src', 'Consumer.php');
      await writeFile(servicePath, '<?php namespace App; class Service { public function oldMethod(): void {} }');
      const source = '<?php namespace App; function run(Service $service): void { $service->newM; }';
      await writeFile(consumerPath, source);
      const remote = (path: string): string => { const uri = new URL('vscode-remote://test/'); uri.pathname = path.split(sep).join('/'); return uri.toString(); };
      const rootUri = remote(root); const serviceUri = remote(servicePath); const consumerUri = remote(consumerPath);
      server = spawn(process.execPath, [resolve('dist/server.js'), '--stdio'], { stdio: 'pipe' });
      const output = messagesFrom(server);
      server.stdin.write(encode({ jsonrpc: '2.0', id: 25, method: 'initialize', params: { processId: null, capabilities: {}, rootUri } }));
      await output.waitFor((message) => message.id === 25);
      server.stdin.write(encode({ jsonrpc: '2.0', method: 'initialized', params: {} }));
      await output.waitFor((message) => message.method === 'window/logMessage' && message.params?.message?.includes('complete=true'));
      server.stdin.write(encode({ jsonrpc: '2.0', method: 'textDocument/didOpen', params: { textDocument: { uri: consumerUri, languageId: 'php', version: 1, text: source } } }));
      await output.waitFor((message) => message.method === 'textDocument/publishDiagnostics' && message.params.uri === consumerUri);
      const typeOffset = source.indexOf('Service $') + 2;
      server.stdin.write(encode({ jsonrpc: '2.0', id: 26, method: 'textDocument/definition', params: { textDocument: { uri: consumerUri }, position: { line: 0, character: typeOffset } } }));
      expect((await output.waitFor((message) => message.id === 26)).result).toMatchObject([{ uri: serviceUri }]);
      await writeFile(servicePath, '<?php namespace App; class Service { public function newMethod(): void {} }');
      server.stdin.write(encode({ jsonrpc: '2.0', method: 'workspace/didChangeWatchedFiles', params: { changes: [{ uri: serviceUri, type: 2 }] } }));
      await new Promise((resolvePromise) => setTimeout(resolvePromise, 100));
      server.stdin.write(encode({ jsonrpc: '2.0', id: 27, method: 'textDocument/completion', params: { textDocument: { uri: consumerUri }, position: { line: 0, character: source.indexOf('newM') + 4 } } }));
      expect((await output.waitFor((message) => message.id === 27)).result).toMatchObject([{ label: 'newMethod' }]);
    } finally { await rm(root, { recursive: true, force: true }); }
  });

  it('renames a private method and only its directly resolved references', async () => {
    const root = await mkdtemp(join(tmpdir(), 'php-companion-private-rename-'));
    try {
      await mkdir(join(root, 'src'), { recursive: true });
      await writeFile(join(root, 'composer.json'), JSON.stringify({ autoload: { 'psr-4': { 'App\\': 'src/' } } }));
      await writeFile(join(root, 'src', 'ConstructedReadonlyState.php'), `<?php namespace App;
        class ConstructedReadonlyState { public readonly int $later; public readonly int $createdBody; public function __construct(public readonly int $createdId, private readonly string $hidden) { $this->createdBody = 1; } }
      `);
      await writeFile(join(root, 'src', 'InheritedConstructedReadonlyState.php'), '<?php namespace App; class InheritedConstructedReadonlyState extends ConstructedReadonlyState { public function __construct(int $createdId, string $hidden, bool $alternate = false) { if ($alternate) { parent::__construct($createdId, $hidden); } else { parent::__construct($createdId, $hidden); } } } class ConstructedReadonlyStateFactory { public static function createLocal(): InheritedConstructedReadonlyState { $state = new InheritedConstructedReadonlyState(7, "local"); return $state; } public static function createMatched(int $mode): InheritedConstructedReadonlyState { return match ($mode) { 1, 2 => new InheritedConstructedReadonlyState(5, "match"), default => new InheritedConstructedReadonlyState(6, "match-default") }; } public static function create(bool $alternate = false): InheritedConstructedReadonlyState { switch ($alternate ? 1 : 0) { case 1: return new InheritedConstructedReadonlyState(4, "switch"); default: break; } foreach ([$alternate] as $candidate) { if ($candidate) { return new InheritedConstructedReadonlyState(3, "loop"); } continue; } try { if ($alternate) { throw new \\RuntimeException(); } return new InheritedConstructedReadonlyState(1, "hidden"); } catch (\\RuntimeException $error) { return new InheritedConstructedReadonlyState(2, "alternate"); } finally { $completed = true; } } }');
      const uri = pathToFileURL(join(root, 'src', 'Service.php')).toString();
      const source = `<?php declare(strict_types=1); namespace App; class Service {
        public string $state = '';
        private function normalize(string $value): string { return $value; }
        private function occupied(): void {}
        public function run(): string { return $this->normalize('x'); }
        public function readState(): string { return $this->state; }
      } class Other { private function normalize(): void { $this->normalize(); } }
      function formatValue(string $value): string { return $value; }
      function useFormat(): string { return formatValue('x'); }
      interface Contract { public function send(string $message): void; }
      class Sender implements Contract { public function send(string $payload): void { echo $payload; } }
      function invoke(Sender $sender, Contract $contract): void { $sender->send(payload: 'x'); $contract->send(message: 'y'); }
      class Payload { public function __construct(public string $label) { echo $label; } }
      class ChildPayload extends Payload {}
      function payloads(Payload $payload, ChildPayload $child): string { new Payload(label: 'a'); new ChildPayload(label: 'b'); return $payload->label . $child->label; }
      trait SharedAction {
        public const ACTION_KIND = 'shared';
        public string $state = '';
        public function act(): void { $this->act(); }
        public function state(): string { return $this->state; }
        public function actionKind(): string { return self::ACTION_KIND; }
      }
      trait AlternateAction { public function act(): void {} }
      class ActionHost { use SharedAction, AlternateAction { SharedAction::act insteadof AlternateAction; SharedAction::act as protected aliasAct; } public function host(): string { $this->act(); $this->aliasAct(); return $this->state; } }
      class ActionChild extends ActionHost { public function child(): string { $this->act(); return $this->state; } }
      const GLOBAL_STATE = 'ready';
      class ConstantBase { public const MODE = 'base'; public function ownMode(): string { return self::MODE; } }
      class ConstantChild extends ConstantBase {}
      enum DeliveryState: string { case Ready = 'ready'; case ready = 'lower'; }
      function readConstants(): mixed { return GLOBAL_STATE . ConstantChild::MODE . ActionHost::ACTION_KIND . ActionChild::ACTION_KIND . DeliveryState::Ready->value . DeliveryState::from('ready')->value; }
      function acceptCount(int $count): void {}
      /** @param class-string<ConstructedReadonlyState> $type */ function acceptStateClass(string $type): void {} class UnrelatedState {}
      /** @param callable(ConstructedReadonlyState): ConstructedReadonlyState $factory */ function acceptStateTransform(callable $factory): void {}
      class GenericParent {} class GenericChild extends GenericParent {}
      /** @template-covariant T */ class CovariantProducer {} /** @template T */ class InvariantBox {}
      /** @template-covariant T */ class UnionProducer {}
      /** @param CovariantProducer<GenericParent> $value */ function acceptProducer(CovariantProducer $value): void {}
      /** @param InvariantBox<GenericParent> $value */ function acceptInvariantBox(InvariantBox $value): void {}
      /** @template T
       * @param UnionProducer<T> $producer
       * @return T */ function genericProducerValue(UnionProducer $producer) {}
      /** @template T
       * @param InvariantBox<T> $box
       * @return T */ function genericInvariantValue(InvariantBox $box) {}
      /** @param CovariantProducer<GenericChild> $producer
       * @param InvariantBox<GenericChild> $box */
      function checkGenericVariance(CovariantProducer $producer, InvariantBox $box): void { acceptProducer($producer); acceptInvariantBox($box); }
      /** @template-covariant A
       * @template-covariant B */ class GenericPair {}
      /** @template-covariant T */ class GenericEnvelope {}
      /** @param GenericPair<InheritedConstructedReadonlyState, UnrelatedState> $pair */ function acceptCorrelatedPair(GenericPair $pair): void {}
      /** @param GenericEnvelope<GenericPair<InheritedConstructedReadonlyState, UnrelatedState>> $value */ function acceptNestedCorrelated(GenericEnvelope $value): void {}
      /** @template T
       * @template U
       * @param GenericPair<T, U> $pair
       * @return GenericPair<T, U> */ function preserveGenericPair(GenericPair $pair) {}
      /** @template T
       * @template U
       * @param GenericEnvelope<GenericPair<T, U>> $value
       * @return GenericEnvelope<GenericPair<T, U>> */ function preserveNestedGenericPair(GenericEnvelope $value) {}
      /** @template X
       * @template Y
       * @extends GenericPair<Y, X> */ class ReversedPair extends GenericPair {}
      /** @template Z
       * @extends ReversedPair<Z, GenericChild> */ class RecursivePair extends ReversedPair {}
      /** @param GenericPair<GenericParent, GenericChild> $value */ function acceptGenericPair(GenericPair $value): void {}
      /** @template T
       * @param GenericPair<GenericChild, T> $pair
       * @return T */ function genericPairSecond(GenericPair $pair) {}
      /** @param ReversedPair<GenericChild, GenericChild> $valid
       * @param ReversedPair<GenericParent, GenericChild> $invalid */
      function checkGenericInheritance(ReversedPair $valid, ReversedPair $invalid): void { acceptGenericPair($valid); acceptGenericPair($invalid); }
      function inheritedState(): InheritedConstructedReadonlyState { return new InheritedConstructedReadonlyState(); }
      function unrelatedState(): UnrelatedState { return new UnrelatedState(); }
      function acceptState(ConstructedReadonlyState $state): void {}
      function checkCallResults(): void { acceptState(inheritedState()); acceptState(unrelatedState()); }
      function acceptCheckedCallState(ConstructedReadonlyState $state): void {}
      function checkedStateFor(InheritedConstructedReadonlyState $state): UnrelatedState { return new UnrelatedState(); }
      class CheckedCallProvider { public function stateFor(InheritedConstructedReadonlyState $state): UnrelatedState { return new UnrelatedState(); } }
      /** @param array{state: InheritedConstructedReadonlyState} $shapedCallArguments */
      function checkValidatedCallResults(CheckedCallProvider $provider, array $dynamicCallArguments, array $shapedCallArguments): void { acceptCheckedCallState(checkedStateFor(new InheritedConstructedReadonlyState())); acceptCheckedCallState(checkedStateFor(state: new InheritedConstructedReadonlyState())); acceptCheckedCallState(checkedStateFor(...[new InheritedConstructedReadonlyState()])); $localCallArguments = [new InheritedConstructedReadonlyState()]; acceptCheckedCallState(checkedStateFor(...$localCallArguments)); acceptCheckedCallState(checkedStateFor(...$shapedCallArguments)); acceptCheckedCallState(checkedStateFor(new UnrelatedState())); acceptCheckedCallState(checkedStateFor()); acceptCheckedCallState(checkedStateFor(...[new UnrelatedState()])); acceptCheckedCallState(checkedStateFor(...$dynamicCallArguments)); $mutatedCallArguments = [new InheritedConstructedReadonlyState()]; $mutatedCallArguments[] = new InheritedConstructedReadonlyState(); acceptCheckedCallState(checkedStateFor(...$mutatedCallArguments)); acceptCheckedCallState($provider->stateFor(new InheritedConstructedReadonlyState())); acceptCheckedCallState($provider->stateFor(new UnrelatedState())); }
      class LateBase { public function selfResult(): self {} public function staticResult(): static {} }
      class LateChild extends LateBase {}
      function acceptLateChild(LateChild $value): void {}
      function checkLateCallResults(LateChild $child, ?LateChild $maybe): void { acceptLateChild($child->staticResult()); acceptLateChild($child->selfResult()); acceptLateChild($maybe?->staticResult()); }
      function acceptCallableState(ConstructedReadonlyState $state): void {}
      /** @param callable(): InheritedConstructedReadonlyState $valid
       * @param callable(): UnrelatedState $invalid
       * @param callable(InheritedConstructedReadonlyState, string=): UnrelatedState $withArgument */
      function checkCallableResults(callable $valid, callable $invalid, callable $withArgument): void { acceptCallableState($valid()); acceptCallableState($invalid()); acceptCallableState($withArgument(new InheritedConstructedReadonlyState())); }
      function acceptNamedCallableState(ConstructedReadonlyState $state): void {}
      /** @param callable(InheritedConstructedReadonlyState $state, string $label=): UnrelatedState $named
       * @param callable(InheritedConstructedReadonlyState $state, string $label=): UnrelatedState $unpacked
       * @param callable(InheritedConstructedReadonlyState $state, string $label=): UnrelatedState $namedUnpacked
       * @param callable(InheritedConstructedReadonlyState $state, string $label=): UnrelatedState $invalid
       * @param callable(): UnrelatedState $aliased
       * @param callable(InheritedConstructedReadonlyState $state, string $label=): UnrelatedState $variableUnpacked
       * @param callable(ConstructedReadonlyState $state): UnrelatedState $subclassArgument
       * @param callable(InheritedConstructedReadonlyState ...$states): UnrelatedState $variadic
       * @param callable(InheritedConstructedReadonlyState ...$states): UnrelatedState $namedVariadic
       * @param callable(mixed $value): UnrelatedState $mixedArgument
       * @param callable(InheritedConstructedReadonlyState $state): UnrelatedState $wrongArgument
       * @param callable(InheritedConstructedReadonlyState $state): UnrelatedState $wrongNamedType
       * @param callable(InheritedConstructedReadonlyState $state): UnrelatedState $wrongUnpackedType
       * @param callable(InheritedConstructedReadonlyState $state): UnrelatedState $wrongVariableUnpackedType
       * @param callable(InheritedConstructedReadonlyState ...$states): UnrelatedState $wrongVariadic
       * @param callable(InheritedConstructedReadonlyState ...$states): UnrelatedState $wrongNamedVariadic
       * @param callable(InheritedConstructedReadonlyState $state): UnrelatedState $shapedUnpacked
       * @param callable(InheritedConstructedReadonlyState $state): UnrelatedState $builtShapeUnpacked
       * @param callable(InheritedConstructedReadonlyState $state): UnrelatedState $builtPositionalUnpacked
       * @param array{state: InheritedConstructedReadonlyState} $shapedArguments */
      function checkNamedCallableResults(callable $named, callable $unpacked, callable $namedUnpacked, callable $invalid, callable $aliased, callable $variableUnpacked, callable $subclassArgument, callable $variadic, callable $namedVariadic, callable $mixedArgument, callable $wrongArgument, callable $wrongNamedType, callable $wrongUnpackedType, callable $wrongVariableUnpackedType, callable $wrongVariadic, callable $wrongNamedVariadic, callable $shapedUnpacked, callable $builtShapeUnpacked, callable $builtPositionalUnpacked, mixed $dynamic, array $shapedArguments): void { acceptNamedCallableState($named(state: new InheritedConstructedReadonlyState())); acceptNamedCallableState($unpacked(...[new InheritedConstructedReadonlyState(), 'ready'])); acceptNamedCallableState($namedUnpacked(...['state' => new InheritedConstructedReadonlyState()])); acceptNamedCallableState($shapedUnpacked(...$shapedArguments)); $builtNamedCallableArguments = []; $builtNamedCallableArguments['state'] = new InheritedConstructedReadonlyState(); acceptNamedCallableState($builtShapeUnpacked(...$builtNamedCallableArguments)); $builtPositionalCallableArguments = []; $builtPositionalCallableArguments[] = new InheritedConstructedReadonlyState(); acceptNamedCallableState($builtPositionalUnpacked(...$builtPositionalCallableArguments)); acceptNamedCallableState($invalid(missing: new InheritedConstructedReadonlyState())); $alias = $aliased; acceptNamedCallableState($alias()); $arguments = [new InheritedConstructedReadonlyState(), 'ready']; acceptNamedCallableState($variableUnpacked(...$arguments)); acceptNamedCallableState($subclassArgument(new InheritedConstructedReadonlyState())); acceptNamedCallableState($variadic(new InheritedConstructedReadonlyState(), new InheritedConstructedReadonlyState())); acceptNamedCallableState($namedVariadic(extra: new InheritedConstructedReadonlyState())); acceptNamedCallableState($mixedArgument($dynamic)); acceptNamedCallableState($wrongArgument('wrong')); acceptNamedCallableState($wrongNamedType(state: 'wrong')); acceptNamedCallableState($wrongUnpackedType(...['wrong'])); $wrongArguments = ['wrong']; acceptNamedCallableState($wrongVariableUnpackedType(...$wrongArguments)); acceptNamedCallableState($wrongVariadic(new InheritedConstructedReadonlyState(), 'wrong')); acceptNamedCallableState($wrongNamedVariadic(extra: 'wrong')); }
      function acceptGenericTemplateState(ConstructedReadonlyState $state): void {}
      /** @template T
       * @param T $value
       * @return T */ function genericIdentity($value) {}
      /** @template T
       * @param list<T> $values
       * @return T */ function genericFirst(array $values) {}
      class GenericCallMethods { /** @template T
       * @param T $value
       * @return T */ public function keep($value) {} }
      /** @param array{value: UnrelatedState} $shapedGenericArguments
       * @param ReversedPair<UnrelatedState, GenericChild> $reorderedGenericPair
       * @param RecursivePair<GenericParent> $recursiveGenericPair
       * @param UnionProducer<InheritedConstructedReadonlyState>|UnionProducer<UnrelatedState> $unionProducer
       * @param InvariantBox<InheritedConstructedReadonlyState>|InvariantBox<UnrelatedState> $invariantUnionBox
       * @param GenericPair<InheritedConstructedReadonlyState, UnrelatedState>|GenericPair<UnrelatedState, InheritedConstructedReadonlyState> $correlatedPair
       * @param GenericEnvelope<GenericPair<InheritedConstructedReadonlyState, UnrelatedState>|GenericPair<UnrelatedState, InheritedConstructedReadonlyState>> $nestedCorrelatedPair */
      function checkGenericCallResults(GenericCallMethods $methods, array $dynamicGenericArguments, array $shapedGenericArguments, ReversedPair $reorderedGenericPair, RecursivePair $recursiveGenericPair, $unionProducer, $invariantUnionBox, $correlatedPair, $nestedCorrelatedPair): void { acceptGenericTemplateState(genericIdentity(new UnrelatedState())); acceptGenericTemplateState(genericIdentity(value: new UnrelatedState())); acceptGenericTemplateState(genericFirst(['wrong'])); acceptGenericTemplateState($methods->keep(new UnrelatedState())); acceptGenericTemplateState(genericIdentity(...[new UnrelatedState()])); $localGenericArguments = [new UnrelatedState()]; acceptGenericTemplateState(genericIdentity(...$localGenericArguments)); $builtNamedGenericArguments = []; $builtNamedGenericArguments['value'] = new UnrelatedState(); acceptGenericTemplateState(genericIdentity(...$builtNamedGenericArguments)); $builtPositionalGenericArguments = []; $builtPositionalGenericArguments[] = new UnrelatedState(); acceptGenericTemplateState(genericIdentity(...$builtPositionalGenericArguments)); acceptGenericTemplateState(genericIdentity(...$shapedGenericArguments)); acceptGenericTemplateState(genericPairSecond($reorderedGenericPair)); acceptGenericTemplateState(genericPairSecond($recursiveGenericPair)); acceptGenericTemplateState(genericProducerValue($unionProducer)); acceptGenericTemplateState(genericInvariantValue($invariantUnionBox)); acceptCorrelatedPair(preserveGenericPair($correlatedPair)); acceptNestedCorrelated(preserveNestedGenericPair($nestedCorrelatedPair)); acceptGenericTemplateState(genericIdentity(new InheritedConstructedReadonlyState())); acceptGenericTemplateState(genericIdentity(new UnrelatedState(), new UnrelatedState())); acceptGenericTemplateState(genericIdentity(...$dynamicGenericArguments)); }
      /** @return list<string> */ function stringResults() {}
      /** @param list<int> $values */ function acceptLocalIntegers(array $values): void {}
      function checkLocalResults(): void { $values = stringResults(); echo 'safe'; acceptLocalIntegers($values); }
      /** @param list<int> $values */ function acceptMutatedIntegers(array $values): void {}
      /** @param array{id: int} $value */ function acceptMutatedShape(array $value): void {}
      /** @param list<int> $values */ function acceptVariableMutatedIntegers(array $values): void {} /** @param array{id: int} $value */ function acceptVariableMutatedShape(array $value): void {}
      function checkArrayMutations(string $label): void { $values = []; $values[] = 1; $values[] = 'wrong'; acceptMutatedIntegers($values); $shape = []; $shape['id'] = 'wrong'; acceptMutatedShape($shape); $variable = []; $variable[] = $label; acceptVariableMutatedIntegers($variable); $indexed = [1]; $indexed[0] = $label; acceptVariableMutatedIntegers($indexed); $variableShape = []; $variableShape['id'] = $label; acceptVariableMutatedShape($variableShape); }
      class ChainProvider { public function nested(): ChainProvider {} public function unrelated(): UnrelatedState {} public function inherited(): InheritedConstructedReadonlyState {} public function maybe(): ?ChainProvider {} public function label(): string {} /** @return list<string> */ public function labels() {} }
      function acceptChainState(ConstructedReadonlyState $state): void {}
      function acceptChainInt(int $value): void {} /** @param list<int> $values */ function acceptChainIntegers(array $values): void {}
      function checkChainResults(ChainProvider $provider): void { acceptChainState($provider->nested()->inherited()); acceptChainState($provider->nested()->unrelated()); acceptChainState($provider->maybe()?->inherited()); acceptChainInt($provider->nested()->label()); acceptChainIntegers($provider->nested()->labels()); }
      interface ChainLeft { public function next(): ChainProvider; } interface ChainRight { public function next(): ChainProvider; }
      function acceptCompositeChainState(ConstructedReadonlyState $state): void {}
      function checkCompositeChain(ChainLeft|ChainRight $receiver, ChainLeft|ChainRight|null $maybe): void { acceptCompositeChainState($receiver->next()->unrelated()); acceptCompositeChainState($maybe?->next()?->inherited()); }
      function acceptConditionalInt(int $value): void {} function acceptConditionalState(ConstructedReadonlyState $state): void {}
      function checkConditionalValues(bool $first, bool $second): void { if ($first) { $value = 1; } elseif ($second) { $value = 'wrong'; } else { $value = 2; } acceptConditionalInt($value); if ($first) { $state = inheritedState(); } else { $state = unrelatedState(); } acceptConditionalState($state); }
      function acceptSwitchInt(int $value): void {} function acceptSwitchState(ConstructedReadonlyState $state): void {}
      function checkSwitchValues(int $mode): void { switch ($mode) { case 1: $value = 1; break; case 2: $value = 'wrong'; break; default: $value = 2; } acceptSwitchInt($value); switch ($mode) { case 1: echo 'fallthrough'; case 2: $state = inheritedState(); break; default: $state = unrelatedState(); } acceptSwitchState($state); }
      function acceptTryInt(int $value): void {} function acceptTryState(ConstructedReadonlyState $state): void {} /** @param list<int> $values */ function acceptTryIntegers(array $values): void {}
      function checkTryValues(bool $flag): void { try { $value = 1; } catch (\\RuntimeException $error) { $value = 'wrong'; } acceptTryInt($value); try { if ($flag) { $state = inheritedState(); } else { $state = unrelatedState(); } } catch (\\RuntimeException $error) { $state = inheritedState(); } finally { echo 'done'; } acceptTryState($state); try { echo 'before'; } finally { $values = ['wrong']; } acceptTryIntegers($values); }
      function acceptDoInt(int $value): void {} function acceptDoState(ConstructedReadonlyState $state): void {}
      function checkDoValues(bool $again, bool $flag): void { do { $value = 'wrong'; } while ($again); acceptDoInt($value); do { if ($flag) { $state = inheritedState(); } else { $state = unrelatedState(); } } while (false); acceptDoState($state); }
      function acceptLoopInt(int $value): void {} function acceptLoopState(ConstructedReadonlyState $state): void {}
      function checkProvenLoops(bool $flag): void { for ($index = 0; $index < 2; $index++) { $value = 'wrong'; } acceptLoopInt($value); while (true) { if ($flag) { $state = inheritedState(); } else { $state = unrelatedState(); } break; } acceptLoopState($state); }
      function acceptForeachInt(int $value): void {} function acceptForeachState(ConstructedReadonlyState $state): void {}
      function checkProvenForeach(bool $flag): void { foreach ([1] as $item) { $value = 'wrong'; } acceptForeachInt($value); $items = [1, 2]; foreach ($items as $item) { if ($flag) { $state = inheritedState(); } else { $state = unrelatedState(); } } acceptForeachState($state); }
      /** @param list<int> $values */ function acceptIntegerList(array $values): void {} /** @param non-empty-list<string> $values */ function acceptNonEmptyLabels(array $values): void {}
      /** @param array{id: int, name?: string} $payload */ function acceptPayloadShape(array $payload): void {}
      /** @param array{id: int, meta: array{active: bool}, tags: list<string>} $payload */ function acceptNestedPayload(array $payload): void {}
      function takeReference(mixed &$value): void {}
      class StrictState { public int $count; public readonly int $id; public readonly int $branch; public readonly int $loop; public readonly int $repeat; public readonly int $finite; public readonly int $tryState; public readonly int $finallyState; public readonly int $switchState; public readonly int $nestedSwitchState; public readonly int $whole; public readonly array $items; public function __construct(public readonly int $version) { $this->version = 2; $this->id = 1; $this->id = 2; } public function initializeBranch(bool $flag): void { if ($flag) { $this->branch = 1; } else { $this->branch = 2; } $this->branch = 3; } public function initializeLoop(bool $flag): void { $this->loop = 1; while ($flag) { $this->loop = 2; } } public function repeatForever(): void { while (true) { $this->repeat = 1; } } public function repeatFinite(): void { for ($index = 0; $index < 2; $index++) { $this->finite = 1; } } public function initializeTry(): void { try { $this->tryState = 1; } catch (\\Exception $error) { $this->tryState = 2; } finally { echo 'done'; } $this->tryState = 3; } public function initializeFinally(): void { try { echo 'before'; } finally { $this->finallyState = 1; } $this->finallyState = 2; } public function initializeSwitch(int $value): void { switch ($value) { case 1: $this->switchState = 1; break; default: $this->switchState = 2; } $this->switchState = 3; } public function initializeNestedSwitch(int $outer, int $inner): void { switch ($outer) { case 1: switch ($inner) { case 1: $this->nestedSwitchState = 1; break; default: $this->nestedSwitchState = 2; } break; default: $this->nestedSwitchState = 3; } $this->nestedSwitchState = 4; } public function iterateWhole(): void { $this->whole = 1; foreach ($this as &$value) {} } public function iterateConstructed(): void { $state = ConstructedReadonlyStateFactory::create(); foreach ($state as &$value) {} } public function iterateMatched(): void { $state = ConstructedReadonlyStateFactory::createMatched(1); foreach ($state as &$value) {} } public function iterateLocal(): void { $state = ConstructedReadonlyStateFactory::createLocal(); foreach ($state as &$value) {} } public function mutateInternally(): void { $this->id += 1; $this->items[] = 1; $reference =& $this->id; takeReference(value: $this->id); sort($this->items); array_pop($this->items); array_shift($this->items); array_push($this->items, 1); array_unshift($this->items, 1); array_splice($this->items, 0); shuffle($this->items); usort($this->items, fn ($a, $b) => $a <=> $b); preg_match('/x/', 'x', $this->items); preg_match_all('/x/', 'x', $this->items); parse_str('x=1', $this->items); foreach ($this->items as &$item) {} } }
      readonly class ReadonlyState { public int $revision; }
      function strictProblems(StrictState $state, ReadonlyState $readonlyState, DeliveryState $delivery, array $dynamic): string { acceptCount('1'); DeliveryState::from(1); acceptStateClass(InheritedConstructedReadonlyState::class); acceptStateClass(UnrelatedState::class); acceptStateClass('App\\\\ConstructedReadonlyState'); acceptStateTransform(fn (ConstructedReadonlyState $state): InheritedConstructedReadonlyState => new InheritedConstructedReadonlyState()); acceptStateTransform(fn (UnrelatedState $state): ConstructedReadonlyState => new ConstructedReadonlyState()); acceptStateTransform(fn (ConstructedReadonlyState $state): UnrelatedState => new UnrelatedState()); acceptIntegerList([1, 2]); acceptIntegerList(['wrong']); acceptIntegerList($dynamic); $localBadList = ['local-wrong']; echo 'safe-list'; acceptIntegerList($localBadList); acceptNonEmptyLabels(['ready']); acceptNonEmptyLabels([]); acceptPayloadShape(['id' => 1]); acceptPayloadShape(['id' => 'wrong']); acceptPayloadShape(['name' => 'missing']); acceptPayloadShape($dynamic); $localBadShape = ['id' => 'local-wrong']; echo 'safe-shape'; acceptPayloadShape($localBadShape); acceptNestedPayload(['id' => 1, 'meta' => ['active' => true], 'tags' => ['ready']]); acceptNestedPayload(['id' => 1, 'meta' => ['active' => 'wrong'], 'tags' => ['ready']]); acceptNestedPayload(['id' => 1, 'meta' => nested(), 'tags' => ['ready']]); $state->count = '1'; $state->id = 1; $readonlyState->revision = 2; $delivery->value = 'other'; return false; }`;
      await writeFile(join(root, 'src', 'Service.php'), source);
      server = spawn(process.execPath, [resolve('dist/server.js'), '--stdio'], { stdio: 'pipe' }); const output = messagesFrom(server);
      server.stdin.write(encode({ jsonrpc: '2.0', id: 28, method: 'initialize', params: { processId: null, capabilities: {}, rootUri: pathToFileURL(root).toString() } }));
      await output.waitFor((message) => message.id === 28); server.stdin.write(encode({ jsonrpc: '2.0', method: 'initialized', params: {} }));
      await output.waitFor((message) => message.method === 'window/logMessage' && message.params?.message?.includes('complete=true'), 10_000);
      server.stdin.write(encode({ jsonrpc: '2.0', method: 'textDocument/didOpen', params: { textDocument: { uri, languageId: 'php', version: 1, text: source } } }));
      const initialDiagnostics = await output.waitFor(
        (message) => message.method === 'textDocument/publishDiagnostics' && message.params.uri === uri,
        10_000,
      );
      expect(initialDiagnostics.params.diagnostics.map((item: { code?: string }) => item.code)).toEqual(expect.arrayContaining(['php.argument.type-mismatch', 'php.return.type-mismatch', 'php.assignment.type-mismatch', 'php.assignment.readonly-property']));
      expect(initialDiagnostics.params.diagnostics.filter((item: { code?: string }) => item.code === 'php.assignment.readonly-property')).toHaveLength(33);
      expect(initialDiagnostics.params.diagnostics.some((item: { code?: string; message?: string }) => item.code === 'php.assignment.readonly-property'
        && item.message?.includes('iterate') && item.message.includes('$whole'))).toBe(true);
      expect(initialDiagnostics.params.diagnostics.some((item: { code?: string; message?: string }) => item.code === 'php.assignment.readonly-property'
        && item.message?.includes('iterate') && item.message.includes('$createdBody') && item.message.includes('$createdId'))).toBe(true);
      expect(initialDiagnostics.params.diagnostics.some((item: { code?: string; message?: string }) => item.code === 'php.argument.type-mismatch' && item.message?.includes('DeliveryState::from'))).toBe(true);
      expect(initialDiagnostics.params.diagnostics.some((item: { code?: string; message?: string }) => item.code === 'php.argument.type-mismatch'
        && item.message?.includes('acceptStateClass') && item.message.includes('class-string<App\\ConstructedReadonlyState>'))).toBe(true);
      expect(initialDiagnostics.params.diagnostics.some((item: { code?: string; message?: string }) => item.code === 'php.argument.type-mismatch'
        && item.message?.includes('acceptIntegerList') && item.message.includes('list<int>'))).toBe(true);
      expect(initialDiagnostics.params.diagnostics.some((item: { code?: string; message?: string }) => item.code === 'php.argument.type-mismatch'
        && item.message?.includes('acceptNonEmptyLabels') && item.message.includes('non-empty-list<string>'))).toBe(true);
      expect(initialDiagnostics.params.diagnostics.some((item: { code?: string; message?: string }) => item.code === 'php.argument.type-mismatch'
        && item.message?.includes('acceptPayloadShape') && item.message.includes('array{id: int, name?: string}') && item.message.includes('array{id: string}'))).toBe(true);
      expect(initialDiagnostics.params.diagnostics.some((item: { code?: string; message?: string }) => item.code === 'php.argument.type-mismatch'
        && item.message?.includes('acceptPayloadShape') && item.message.includes('array{name: string}'))).toBe(true);
      expect(initialDiagnostics.params.diagnostics.some((item: { code?: string; message?: string }) => item.code === 'php.argument.type-mismatch'
        && item.message?.includes('acceptNestedPayload') && item.message.includes('meta: array{active: string}') && item.message.includes('meta: array{active: bool}'))).toBe(true);
      expect(initialDiagnostics.params.diagnostics.filter((item: { code?: string; message?: string }) => item.code === 'php.argument.type-mismatch'
        && item.message?.includes('acceptIntegerList') && item.message.includes('non-empty-list<string>'))).toHaveLength(2);
      expect(initialDiagnostics.params.diagnostics.filter((item: { code?: string; message?: string }) => item.code === 'php.argument.type-mismatch'
        && item.message?.includes('acceptPayloadShape') && item.message.includes('array{id: string}'))).toHaveLength(2);
      expect(initialDiagnostics.params.diagnostics.filter((item: { code?: string; message?: string }) => item.code === 'php.argument.type-mismatch'
        && item.message?.includes('acceptStateTransform') && item.message.includes('callable(App\\ConstructedReadonlyState): App\\ConstructedReadonlyState'))).toHaveLength(2);
      expect(initialDiagnostics.params.diagnostics.some((item: { code?: string; message?: string }) => item.code === 'php.argument.type-mismatch'
        && item.message?.includes('acceptInvariantBox') && item.message.includes('InvariantBox<App\\GenericChild>') && item.message.includes('InvariantBox<App\\GenericParent>'))).toBe(true);
      expect(initialDiagnostics.params.diagnostics.some((item: { code?: string; message?: string }) => item.code === 'php.argument.type-mismatch'
        && item.message?.includes('acceptGenericPair') && item.message.includes('ReversedPair<App\\GenericParent, App\\GenericChild>')
        && item.message.includes('GenericPair<App\\GenericParent, App\\GenericChild>'))).toBe(true);
      expect(initialDiagnostics.params.diagnostics.some((item: { code?: string; message?: string }) => item.code === 'php.argument.type-mismatch'
        && item.message?.includes('acceptState') && item.message.includes('App\\UnrelatedState') && item.message.includes('App\\ConstructedReadonlyState'))).toBe(true);
      expect(initialDiagnostics.params.diagnostics.filter((item: { code?: string; message?: string }) => item.code === 'php.argument.type-mismatch'
        && item.message?.includes('acceptCheckedCallState'))).toHaveLength(7);
      expect(initialDiagnostics.params.diagnostics.some((item: { code?: string; message?: string }) => item.code === 'php.argument.type-mismatch'
        && item.message?.includes('acceptLateChild') && item.message.includes('App\\LateBase') && item.message.includes('App\\LateChild'))).toBe(true);
      expect(initialDiagnostics.params.diagnostics.some((item: { code?: string; message?: string }) => item.code === 'php.argument.type-mismatch'
        && item.message?.includes('acceptLateChild') && item.message.includes('App\\LateChild|null'))).toBe(true);
      expect(initialDiagnostics.params.diagnostics.some((item: { code?: string; message?: string }) => item.code === 'php.argument.type-mismatch'
        && item.message?.includes('acceptCallableState') && item.message.includes('App\\UnrelatedState')
        && item.message.includes('App\\ConstructedReadonlyState'))).toBe(true);
      expect(initialDiagnostics.params.diagnostics.filter((item: { code?: string; message?: string }) => item.code === 'php.argument.type-mismatch'
        && item.message?.includes('acceptCallableState') && item.message.includes('App\\UnrelatedState'))).toHaveLength(2);
      expect(initialDiagnostics.params.diagnostics.filter((item: { code?: string; message?: string }) => item.code === 'php.argument.type-mismatch'
        && item.message?.includes('acceptNamedCallableState') && item.message.includes('App\\UnrelatedState'))).toHaveLength(12);
      expect(initialDiagnostics.params.diagnostics.filter((item: { code?: string; message?: string }) => item.code === 'php.argument.type-mismatch'
        && item.message?.includes('acceptGenericTemplateState'))).toHaveLength(13);
      expect(initialDiagnostics.params.diagnostics.some((item: { code?: string; message?: string }) => item.code === 'php.argument.type-mismatch'
        && item.message?.includes('acceptCorrelatedPair')
        && item.message.includes('GenericPair<App\\InheritedConstructedReadonlyState, App\\UnrelatedState>|App\\GenericPair<App\\UnrelatedState, App\\InheritedConstructedReadonlyState>'))).toBe(true);
      expect(initialDiagnostics.params.diagnostics.some((item: { code?: string; message?: string }) => item.code === 'php.argument.type-mismatch'
        && item.message?.includes('acceptNestedCorrelated')
        && item.message.includes('GenericEnvelope<App\\GenericPair<App\\InheritedConstructedReadonlyState, App\\UnrelatedState>>|App\\GenericEnvelope<App\\GenericPair<App\\UnrelatedState, App\\InheritedConstructedReadonlyState>>'))).toBe(true);
      expect(initialDiagnostics.params.diagnostics.some((item: { code?: string; message?: string }) => item.code === 'php.argument.type-mismatch'
        && item.message?.includes('acceptLocalIntegers') && item.message.includes('list<string>') && item.message.includes('list<int>'))).toBe(true);
      expect(initialDiagnostics.params.diagnostics.some((item: { code?: string; message?: string }) => item.code === 'php.argument.type-mismatch'
        && item.message?.includes('acceptMutatedIntegers') && item.message.includes('non-empty-list<int|string>') && item.message.includes('list<int>'))).toBe(true);
      expect(initialDiagnostics.params.diagnostics.some((item: { code?: string; message?: string }) => item.code === 'php.argument.type-mismatch'
        && item.message?.includes('acceptMutatedShape') && item.message.includes('array{id: string}') && item.message.includes('array{id: int}'))).toBe(true);
      expect(initialDiagnostics.params.diagnostics.filter((item: { code?: string; message?: string }) => item.code === 'php.argument.type-mismatch'
        && item.message?.includes('acceptVariableMutatedIntegers') && item.message.includes('list<int>'))).toHaveLength(2);
      expect(initialDiagnostics.params.diagnostics.some((item: { code?: string; message?: string }) => item.code === 'php.argument.type-mismatch'
        && item.message?.includes('acceptVariableMutatedShape') && item.message.includes('array{id: string}') && item.message.includes('array{id: int}'))).toBe(true);
      expect(initialDiagnostics.params.diagnostics.some((item: { code?: string; message?: string }) => item.code === 'php.argument.type-mismatch'
        && item.message?.includes('acceptChainState') && item.message.includes('App\\UnrelatedState') && item.message.includes('App\\ConstructedReadonlyState'))).toBe(true);
      expect(initialDiagnostics.params.diagnostics.some((item: { code?: string; message?: string }) => item.code === 'php.argument.type-mismatch'
        && item.message?.includes('acceptChainState') && item.message.includes('App\\InheritedConstructedReadonlyState|null'))).toBe(true);
      expect(initialDiagnostics.params.diagnostics.some((item: { code?: string; message?: string }) => item.code === 'php.argument.type-mismatch'
        && item.message?.includes('acceptChainInt') && item.message.includes('string') && item.message.includes('int'))).toBe(true);
      expect(initialDiagnostics.params.diagnostics.some((item: { code?: string; message?: string }) => item.code === 'php.argument.type-mismatch'
        && item.message?.includes('acceptChainIntegers') && item.message.includes('list<string>') && item.message.includes('list<int>'))).toBe(true);
      expect(initialDiagnostics.params.diagnostics.some((item: { code?: string; message?: string }) => item.code === 'php.argument.type-mismatch'
        && item.message?.includes('acceptCompositeChainState') && item.message.includes('App\\UnrelatedState')
        && item.message.includes('App\\ConstructedReadonlyState'))).toBe(true);
      expect(initialDiagnostics.params.diagnostics.some((item: { code?: string; message?: string }) => item.code === 'php.argument.type-mismatch'
        && item.message?.includes('acceptCompositeChainState') && item.message.includes('App\\InheritedConstructedReadonlyState|null'))).toBe(true);
      expect(initialDiagnostics.params.diagnostics.some((item: { code?: string; message?: string }) => item.code === 'php.argument.type-mismatch'
        && item.message?.includes('acceptConditionalInt') && item.message.includes('int|string') && item.message.includes('int'))).toBe(true);
      expect(initialDiagnostics.params.diagnostics.some((item: { code?: string; message?: string }) => item.code === 'php.argument.type-mismatch'
        && item.message?.includes('acceptConditionalState') && item.message.includes('App\\InheritedConstructedReadonlyState|App\\UnrelatedState')
        && item.message.includes('App\\ConstructedReadonlyState'))).toBe(true);
      expect(initialDiagnostics.params.diagnostics.some((item: { code?: string; message?: string }) => item.code === 'php.argument.type-mismatch'
        && item.message?.includes('acceptSwitchInt') && item.message.includes('int|string') && item.message.includes('int'))).toBe(true);
      expect(initialDiagnostics.params.diagnostics.some((item: { code?: string; message?: string }) => item.code === 'php.argument.type-mismatch'
        && item.message?.includes('acceptSwitchState') && item.message.includes('App\\InheritedConstructedReadonlyState|App\\UnrelatedState')
        && item.message.includes('App\\ConstructedReadonlyState'))).toBe(true);
      expect(initialDiagnostics.params.diagnostics.some((item: { code?: string; message?: string }) => item.code === 'php.argument.type-mismatch'
        && item.message?.includes('acceptTryInt') && item.message.includes('int|string') && item.message.includes('int'))).toBe(true);
      expect(initialDiagnostics.params.diagnostics.some((item: { code?: string; message?: string }) => item.code === 'php.argument.type-mismatch'
        && item.message?.includes('acceptTryState') && item.message.includes('App\\InheritedConstructedReadonlyState|App\\UnrelatedState')
        && item.message.includes('App\\ConstructedReadonlyState'))).toBe(true);
      expect(initialDiagnostics.params.diagnostics.some((item: { code?: string; message?: string }) => item.code === 'php.argument.type-mismatch'
        && item.message?.includes('acceptTryIntegers') && item.message.includes('non-empty-list<string>') && item.message.includes('list<int>'))).toBe(true);
      expect(initialDiagnostics.params.diagnostics.some((item: { code?: string; message?: string }) => item.code === 'php.argument.type-mismatch'
        && item.message?.includes('acceptDoInt') && item.message.includes('string') && item.message.includes('int'))).toBe(true);
      expect(initialDiagnostics.params.diagnostics.some((item: { code?: string; message?: string }) => item.code === 'php.argument.type-mismatch'
        && item.message?.includes('acceptDoState') && item.message.includes('App\\InheritedConstructedReadonlyState|App\\UnrelatedState')
        && item.message.includes('App\\ConstructedReadonlyState'))).toBe(true);
      expect(initialDiagnostics.params.diagnostics.some((item: { code?: string; message?: string }) => item.code === 'php.argument.type-mismatch'
        && item.message?.includes('acceptLoopInt') && item.message.includes('string') && item.message.includes('int'))).toBe(true);
      expect(initialDiagnostics.params.diagnostics.some((item: { code?: string; message?: string }) => item.code === 'php.argument.type-mismatch'
        && item.message?.includes('acceptLoopState') && item.message.includes('App\\InheritedConstructedReadonlyState|App\\UnrelatedState')
        && item.message.includes('App\\ConstructedReadonlyState'))).toBe(true);
      expect(initialDiagnostics.params.diagnostics.some((item: { code?: string; message?: string }) => item.code === 'php.argument.type-mismatch'
        && item.message?.includes('acceptForeachInt') && item.message.includes('string') && item.message.includes('int'))).toBe(true);
      expect(initialDiagnostics.params.diagnostics.some((item: { code?: string; message?: string }) => item.code === 'php.argument.type-mismatch'
        && item.message?.includes('acceptForeachState') && item.message.includes('App\\InheritedConstructedReadonlyState|App\\UnrelatedState')
        && item.message.includes('App\\ConstructedReadonlyState'))).toBe(true);
      const enumStaticCompletion = source.indexOf('DeliveryState::Ready') + 'DeliveryState::'.length;
      server.stdin.write(encode({ jsonrpc: '2.0', id: 94, method: 'textDocument/completion', params: { textDocument: { uri }, position: lspPosition(source, enumStaticCompletion) } }));
      const enumStaticItems = (await output.waitFor((message) => message.id === 94)).result;
      expect(enumStaticItems.map((item: { label: string }) => item.label)).toEqual(expect.arrayContaining(['cases', 'from', 'tryFrom', 'Ready', 'ready']));
      expect(enumStaticItems.find((item: { label: string }) => item.label === 'Ready')).toMatchObject({ kind: 20 });
      const enumInstanceCompletion = source.lastIndexOf('->value') + 2;
      server.stdin.write(encode({ jsonrpc: '2.0', id: 95, method: 'textDocument/completion', params: { textDocument: { uri }, position: lspPosition(source, enumInstanceCompletion) } }));
      expect((await output.waitFor((message) => message.id === 95)).result.map((item: { label: string }) => item.label)).toEqual(expect.arrayContaining(['name', 'value']));
      const enumHoverPosition = source.indexOf('Ready->value') + 2;
      server.stdin.write(encode({ jsonrpc: '2.0', id: 96, method: 'textDocument/hover', params: { textDocument: { uri }, position: lspPosition(source, enumHoverPosition) } }));
      expect((await output.waitFor((message) => message.id === 96)).result.contents.value).toContain("case Ready = 'ready'");
      const enumSignaturePosition = source.indexOf("'ready'", source.indexOf("DeliveryState::from('ready')")) + 4;
      server.stdin.write(encode({ jsonrpc: '2.0', id: 97, method: 'textDocument/signatureHelp', params: { textDocument: { uri }, position: lspPosition(source, enumSignaturePosition) } }));
      expect((await output.waitFor((message) => message.id === 97)).result.signatures[0].label).toBe('from(string $value): static');
      const privateMethodPosition = lspPosition(source, source.indexOf('normalize') + 2);
      server.stdin.write(encode({ jsonrpc: '2.0', id: 29, method: 'textDocument/prepareRename', params: { textDocument: { uri }, position: privateMethodPosition } }));
      expect((await output.waitFor((message) => message.id === 29)).result).toMatchObject({ placeholder: 'normalize' });
      server.stdin.write(encode({ jsonrpc: '2.0', id: 30, method: 'textDocument/rename', params: { textDocument: { uri }, position: privateMethodPosition, newName: 'normalizeValue' } }));
      const edit = (await output.waitFor((message) => message.id === 30)).result;
      expect(edit.changes[uri]).toHaveLength(2);
      expect(edit.changes[uri].every((item: { newText?: string }) => item.newText === 'normalizeValue')).toBe(true);
      server.stdin.write(encode({ jsonrpc: '2.0', id: 31, method: 'textDocument/rename', params: { textDocument: { uri }, position: privateMethodPosition, newName: 'occupied' } }));
      expect((await output.waitFor((message) => message.id === 31)).result).toBeNull();
      const parameterPosition = lspPosition(source, source.indexOf('$value') + 2);
      server.stdin.write(encode({ jsonrpc: '2.0', id: 32, method: 'textDocument/prepareRename', params: { textDocument: { uri }, position: parameterPosition } }));
      expect((await output.waitFor((message) => message.id === 32)).result).toMatchObject({ placeholder: 'value' });
      server.stdin.write(encode({ jsonrpc: '2.0', id: 33, method: 'textDocument/rename', params: { textDocument: { uri }, position: parameterPosition, newName: 'input' } }));
      const localEdit = (await output.waitFor((message) => message.id === 33)).result;
      expect(localEdit.changes[uri]).toHaveLength(2);
      expect(localEdit.changes[uri].every((item: { newText?: string }) => item.newText === 'input')).toBe(true);
      const functionPosition = lspPosition(source, source.indexOf('formatValue', source.indexOf('function useFormat')) + 2);
      server.stdin.write(encode({ jsonrpc: '2.0', id: 34, method: 'textDocument/rename', params: { textDocument: { uri }, position: functionPosition, newName: 'normalizeValue' } }));
      const functionEdit = (await output.waitFor((message) => message.id === 34)).result;
      expect(functionEdit.changes[uri]).toHaveLength(2);
      const inheritedParameterPosition = lspPosition(source, source.indexOf('payload:', source.indexOf('function invoke')) + 2);
      server.stdin.write(encode({ jsonrpc: '2.0', id: 82, method: 'textDocument/rename', params: { textDocument: { uri }, position: inheritedParameterPosition, newName: 'content' } }));
      const inheritedEdit = (await output.waitFor((message) => message.id === 82)).result;
      expect(inheritedEdit.changes[uri]).toHaveLength(5);
      expect(inheritedEdit.changes[uri].every((item: { newText?: string }) => item.newText === 'content')).toBe(true);
      const inheritedMethodPosition = lspPosition(source, source.indexOf('->send', source.indexOf('function invoke')) + 3);
      server.stdin.write(encode({ jsonrpc: '2.0', id: 83, method: 'textDocument/prepareRename', params: { textDocument: { uri }, position: inheritedMethodPosition } }));
      expect((await output.waitFor((message) => message.id === 83)).result).toMatchObject({ placeholder: 'send' });
      server.stdin.write(encode({ jsonrpc: '2.0', id: 84, method: 'textDocument/rename', params: { textDocument: { uri }, position: inheritedMethodPosition, newName: 'dispatch' } }));
      const inheritedMethodEdit = (await output.waitFor((message) => message.id === 84)).result;
      expect(inheritedMethodEdit.changes[uri]).toHaveLength(4);
      expect(inheritedMethodEdit.changes[uri].every((item: { newText?: string }) => item.newText === 'dispatch')).toBe(true);
      const publicPropertyPosition = lspPosition(source, source.indexOf('state', source.indexOf('readState')) + 2);
      server.stdin.write(encode({ jsonrpc: '2.0', id: 85, method: 'textDocument/rename', params: { textDocument: { uri }, position: publicPropertyPosition, newName: 'status' } }));
      const publicPropertyEdit = (await output.waitFor((message) => message.id === 85)).result;
      expect(publicPropertyEdit.changes[uri]).toHaveLength(2);
      expect(publicPropertyEdit.changes[uri].every((item: { newText?: string }) => item.newText === 'status')).toBe(true);
      const promotedPropertyPosition = lspPosition(source, source.indexOf('label:', source.indexOf('function payloads')) + 2);
      server.stdin.write(encode({ jsonrpc: '2.0', id: 86, method: 'textDocument/rename', params: { textDocument: { uri }, position: promotedPropertyPosition, newName: 'title' } }));
      const promotedPropertyEdit = (await output.waitFor((message) => message.id === 86)).result;
      expect(promotedPropertyEdit.changes[uri]).toHaveLength(6);
      expect(promotedPropertyEdit.changes[uri].every((item: { newText?: string }) => item.newText === 'title')).toBe(true);
      const traitMethodPosition = lspPosition(source, source.indexOf('->act', source.indexOf('class ActionHost')) + 3);
      server.stdin.write(encode({ jsonrpc: '2.0', id: 87, method: 'textDocument/rename', params: { textDocument: { uri }, position: traitMethodPosition, newName: 'execute' } }));
      const traitMethodEdit = (await output.waitFor((message) => message.id === 87)).result;
      expect(traitMethodEdit.changes[uri]).toHaveLength(6);
      expect(traitMethodEdit.changes[uri].every((item: { newText?: string }) => item.newText === 'execute')).toBe(true);
      const traitPropertyPosition = lspPosition(source, source.indexOf('->state', source.indexOf('class ActionHost')) + 3);
      server.stdin.write(encode({ jsonrpc: '2.0', id: 88, method: 'textDocument/rename', params: { textDocument: { uri }, position: traitPropertyPosition, newName: 'status' } }));
      const traitPropertyEdit = (await output.waitFor((message) => message.id === 88)).result;
      expect(traitPropertyEdit.changes[uri]).toHaveLength(4);
      expect(traitPropertyEdit.changes[uri].every((item: { newText?: string }) => item.newText === 'status')).toBe(true);
      const globalConstantPosition = lspPosition(source, source.lastIndexOf('GLOBAL_STATE') + 2);
      server.stdin.write(encode({ jsonrpc: '2.0', id: 89, method: 'textDocument/rename', params: { textDocument: { uri }, position: globalConstantPosition, newName: 'APP_STATE' } }));
      const globalConstantEdit = (await output.waitFor((message) => message.id === 89)).result;
      expect(globalConstantEdit.changes[uri]).toHaveLength(2);
      const classConstantPosition = lspPosition(source, source.lastIndexOf('MODE') + 2);
      server.stdin.write(encode({ jsonrpc: '2.0', id: 90, method: 'textDocument/rename', params: { textDocument: { uri }, position: classConstantPosition, newName: 'FORMAT' } }));
      const classConstantEdit = (await output.waitFor((message) => message.id === 90)).result;
      expect(classConstantEdit.changes[uri]).toHaveLength(3);
      const traitAliasPosition = lspPosition(source, source.indexOf('->aliasAct') + 4);
      server.stdin.write(encode({ jsonrpc: '2.0', id: 91, method: 'textDocument/rename', params: { textDocument: { uri }, position: traitAliasPosition, newName: 'alternateAct' } }));
      const traitAliasEdit = (await output.waitFor((message) => message.id === 91)).result;
      expect(traitAliasEdit.changes[uri]).toHaveLength(2);
      const traitConstantPosition = lspPosition(source, source.lastIndexOf('ACTION_KIND') + 2);
      server.stdin.write(encode({ jsonrpc: '2.0', id: 92, method: 'textDocument/rename', params: { textDocument: { uri }, position: traitConstantPosition, newName: 'ACTION_TYPE' } }));
      const traitConstantEdit = (await output.waitFor((message) => message.id === 92)).result;
      expect(traitConstantEdit.changes[uri]).toHaveLength(4);
      const enumCasePosition = lspPosition(source, source.lastIndexOf('Ready') + 2);
      server.stdin.write(encode({ jsonrpc: '2.0', id: 93, method: 'textDocument/rename', params: { textDocument: { uri }, position: enumCasePosition, newName: 'Pending' } }));
      const enumCaseEdit = (await output.waitFor((message) => message.id === 93)).result;
      expect(enumCaseEdit.changes[uri]).toHaveLength(2);
      expect(enumCaseEdit.changes[uri].every((item: { newText?: string }) => item.newText === 'Pending')).toBe(true);
    } finally { await rm(root, { recursive: true, force: true }); }
  }, 15_000);

  it('routes nested Composer projects to the deepest project root', async () => {
    const root = await mkdtemp(join(tmpdir(), 'php-companion-nested-root-'));
    const nested = join(root, 'apps', 'api');
    try {
      await mkdir(join(root, 'src'), { recursive: true }); await mkdir(join(nested, 'src'), { recursive: true });
      await writeFile(join(root, 'composer.json'), JSON.stringify({ autoload: { 'psr-4': { 'App\\': 'src/' } } }));
      await writeFile(join(root, 'src', 'Service.php'), '<?php namespace App; class Service { public function parentOnly(): void {} }');
      await writeFile(join(nested, 'composer.json'), JSON.stringify({ autoload: { 'psr-4': { 'App\\': 'src/' } } }));
      await writeFile(join(nested, 'src', 'Service.php'), '<?php namespace App; class Service { public function nestedOnly(): void {} }');
      const uri = pathToFileURL(join(nested, 'src', 'Consumer.php')).toString();
      const source = '<?php namespace App; function run(Service $service): void { $service->nested }';
      server = spawn(process.execPath, [resolve('dist/server.js'), '--stdio'], { stdio: 'pipe' });
      const output = messagesFrom(server);
      server.stdin.write(encode({ jsonrpc: '2.0', id: 25, method: 'initialize', params: { processId: null, capabilities: {}, rootUri: pathToFileURL(root).toString() } }));
      await output.waitFor((message) => message.id === 25);
      server.stdin.write(encode({ jsonrpc: '2.0', method: 'initialized', params: {} }));
      await output.waitFor((message) => message.method === 'window/logMessage' && message.params?.message?.includes(nested));
      server.stdin.write(encode({ jsonrpc: '2.0', method: 'textDocument/didOpen', params: { textDocument: { uri, languageId: 'php', version: 1, text: source } } }));
      await output.waitFor((message) => message.method === 'textDocument/publishDiagnostics' && message.params.uri === uri);
      server.stdin.write(encode({ jsonrpc: '2.0', id: 26, method: 'textDocument/completion', params: { textDocument: { uri }, position: { line: 0, character: source.indexOf('nested') + 6 } } }));
      expect((await output.waitFor((message) => message.id === 26)).result.map((item: { label: string }) => item.label)).toEqual(['nestedOnly']);
    } finally { await rm(root, { recursive: true, force: true }); }
  });

  it('suppresses unresolved-symbol diagnostics when a project file exceeds the index budget', async () => {
    const root = await mkdtemp(join(tmpdir(), 'php-companion-incomplete-project-'));
    try {
      await mkdir(join(root, 'src'));
      await writeFile(join(root, 'composer.json'), JSON.stringify({ autoload: { 'psr-4': { 'App\\': 'src/' } } }));
      await writeFile(join(root, 'src', 'Large.php'), `<?php namespace App; class Large {} /*${'x'.repeat(512 * 1024)}*/`);
      const source = '<?php namespace App; function run(): void { new MissingService(); missingFunction(); echo MISSING_CONSTANT; }';
      const uri = pathToFileURL(join(root, 'src', 'Consumer.php')).toString(); await writeFile(join(root, 'src', 'Consumer.php'), source);
      server = spawn(process.execPath, [resolve('dist/server.js'), '--stdio'], { stdio: 'pipe' });
      const output = messagesFrom(server);
      server.stdin.write(encode({ jsonrpc: '2.0', id: 29, method: 'initialize', params: { processId: null, capabilities: {}, rootUri: pathToFileURL(root).toString() } }));
      await output.waitFor((message) => message.id === 29);
      server.stdin.write(encode({ jsonrpc: '2.0', method: 'initialized', params: {} }));
      await output.waitFor((message) => message.method === 'window/logMessage' && message.params?.message?.includes('complete=false'));
      await output.waitFor((message) => message.method === 'window/logMessage' && message.params?.message?.includes('per-file budget'));
      server.stdin.write(encode({ jsonrpc: '2.0', method: 'textDocument/didOpen', params: { textDocument: { uri, languageId: 'php', version: 1, text: source } } }));
      const diagnostics = await output.waitFor((message) => message.method === 'textDocument/publishDiagnostics' && message.params.uri === uri);
      expect(diagnostics.params.diagnostics.some((diagnostic: { code?: string }) => diagnostic.code === 'php.type.unresolved'
        || diagnostic.code === 'php.function.unresolved' || diagnostic.code === 'php.constant.unresolved')).toBe(false);
    } finally { await rm(root, { recursive: true, force: true }); }
  });

  it('publishes unresolved new-expression diagnostics after a complete project index', async () => {
    const root = await mkdtemp(join(tmpdir(), 'php-companion-unresolved-'));
    try {
      await mkdir(join(root, 'src'), { recursive: true });
      await writeFile(join(root, 'composer.json'), JSON.stringify({ autoload: { 'psr-4': { 'App\\': 'src/' } } }));
      const globalTypeUri = pathToFileURL(join(root, 'src', 'GlobalOnlyType.php')).toString();
      await writeFile(join(root, 'src', 'GlobalOnlyType.php'), '<?php class GlobalOnlyType {}');
      const qualifiedTypeUri = pathToFileURL(join(root, 'src', 'QualifiedGlobalType.php')).toString();
      await writeFile(join(root, 'src', 'QualifiedGlobalType.php'), '<?php namespace GlobalVendor; class QualifiedGlobalType { public function globalMember(): void {} }');
      const localSymbolsUri = pathToFileURL(join(root, 'src', 'LocalSymbols.php')).toString();
      await writeFile(join(root, 'src', 'LocalSymbols.php'), '<?php namespace App; function localHelper(): void {} const LOCAL_FLAG = 1;');
      const uri = pathToFileURL(join(root, 'src', 'Consumer.php')).toString();
      const source = '<?php namespace App; #[UnknownBuiltinLike] class Consumer { public function make(MissingInput $input): MissingOutput { echo $definitelyMissing; new GlobalOnlyT; new GlobalOnlyType(); new \\GlobalOnlyType(); $relative = new GlobalVendor\\QualifiedGlobalType(); $relative->globalM; $absolute = new \\GlobalVendor\\QualifiedGlobalType(); $absolute->globalM; namespace\\localHelper(); MissingVendor\\missingFunction(); possiblyExtensionFunction(); echo namespace\\LOCAL_FLAG, MissingVendor\\MISSING_CONSTANT, POSSIBLY_EXTENSION_CONSTANT; return new MissingService(); } }';
      await writeFile(join(root, 'src', 'Consumer.php'), source);
      server = spawn(process.execPath, [resolve('dist/server.js'), '--stdio'], { stdio: 'pipe' });
      const output = messagesFrom(server);
      server.stdin.write(encode({ jsonrpc: '2.0', id: 30, method: 'initialize', params: { processId: null, capabilities: {}, rootUri: pathToFileURL(root).toString() } }));
      await output.waitFor((message) => message.id === 30);
      server.stdin.write(encode({ jsonrpc: '2.0', method: 'textDocument/didOpen', params: { textDocument: { uri, languageId: 'php', version: 1, text: source } } }));
      const beforeIndex = await output.waitFor((message) => message.method === 'textDocument/publishDiagnostics' && message.params.uri === uri);
      expect(beforeIndex.params.diagnostics).toContainEqual(expect.objectContaining({
        code: 'php.variable.undefined', message: 'Variable $definitelyMissing is definitely undefined at this point.',
      }));
      expect(beforeIndex.params.diagnostics).not.toMatchObject([{ code: 'php.type.unresolved' }]);
      expect(beforeIndex.params.diagnostics).not.toMatchObject([{ code: 'php.function.unresolved' }]);
      expect(beforeIndex.params.diagnostics).not.toMatchObject([{ code: 'php.constant.unresolved' }]);
      server.stdin.write(encode({ jsonrpc: '2.0', method: 'initialized', params: {} }));
      const diagnostics = await output.waitFor((message) => message.method === 'textDocument/publishDiagnostics' && message.params.uri === uri
        && message.params.diagnostics.some((diagnostic: { code?: string }) => diagnostic.code === 'php.type.unresolved'));
      expect(diagnostics.params.diagnostics.filter((item: { code?: string }) => item.code === 'php.type.unresolved')
        .map((item: { message: string }) => item.message)).toEqual([
        'Cannot resolve type App\\GlobalOnlyT.',
        'Cannot resolve type App\\GlobalOnlyType.',
        'Cannot resolve type App\\GlobalVendor\\QualifiedGlobalType.',
        'Cannot resolve type App\\MissingService.',
        'Cannot resolve type App\\MissingInput.',
        'Cannot resolve type App\\MissingOutput.',
      ]);
      expect(diagnostics.params.diagnostics.filter((item: { code?: string }) => item.code === 'php.function.unresolved')
        .map((item: { message: string }) => item.message)).toEqual([
        'Cannot resolve function App\\MissingVendor\\missingFunction.',
      ]);
      expect(diagnostics.params.diagnostics.filter((item: { code?: string }) => item.code === 'php.constant.unresolved')
        .map((item: { message: string }) => item.message)).toEqual([
        'Cannot resolve constant App\\MissingVendor\\MISSING_CONSTANT.',
      ]);
      const completionOffset = source.indexOf('GlobalOnlyT;') + 'GlobalOnlyT'.length;
      server.stdin.write(encode({ jsonrpc: '2.0', id: 31, method: 'textDocument/completion', params: {
        textDocument: { uri }, position: lspPosition(source, completionOffset),
      } }));
      expect((await output.waitFor((message) => message.id === 31)).result).toMatchObject([
        { label: 'GlobalOnlyType', detail: 'GlobalOnlyType', additionalTextEdits: expect.any(Array) },
      ]);
      server.stdin.write(encode({ jsonrpc: '2.0', id: 32, method: 'textDocument/definition', params: {
        textDocument: { uri }, position: lspPosition(source, source.indexOf('GlobalOnlyType();') + 2),
      } }));
      expect((await output.waitFor((message) => message.id === 32)).result).toEqual([]);
      server.stdin.write(encode({ jsonrpc: '2.0', id: 33, method: 'textDocument/definition', params: {
        textDocument: { uri }, position: lspPosition(source, source.lastIndexOf('GlobalOnlyType();') + 2),
      } }));
      expect((await output.waitFor((message) => message.id === 33)).result).toMatchObject([{ uri: globalTypeUri }]);
      server.stdin.write(encode({ jsonrpc: '2.0', id: 34, method: 'textDocument/definition', params: {
        textDocument: { uri }, position: lspPosition(source, source.indexOf('GlobalVendor\\QualifiedGlobalType();') + 2),
      } }));
      expect((await output.waitFor((message) => message.id === 34)).result).toEqual([]);
      server.stdin.write(encode({ jsonrpc: '2.0', id: 35, method: 'textDocument/definition', params: {
        textDocument: { uri }, position: lspPosition(source, source.lastIndexOf('GlobalVendor\\QualifiedGlobalType();') + 2),
      } }));
      expect((await output.waitFor((message) => message.id === 35)).result).toMatchObject([{ uri: qualifiedTypeUri }]);
      for (const [id, marker, expected] of [[36, '$relative->globalM', []], [37, '$absolute->globalM', [{ label: 'globalMember' }]]] as const) {
        server.stdin.write(encode({ jsonrpc: '2.0', id, method: 'textDocument/completion', params: {
          textDocument: { uri }, position: lspPosition(source, source.indexOf(marker) + marker.length),
        } }));
        expect((await output.waitFor((message) => message.id === id)).result).toMatchObject(expected);
      }
      for (const [id, marker] of [[38, 'localHelper'], [39, 'LOCAL_FLAG']] as const) {
        server.stdin.write(encode({ jsonrpc: '2.0', id, method: 'textDocument/definition', params: {
          textDocument: { uri }, position: lspPosition(source, source.indexOf(marker) + 2),
        } }));
        expect((await output.waitFor((message) => message.id === id)).result).toMatchObject([{ uri: localSymbolsUri }]);
      }
    } finally { await rm(root, { recursive: true, force: true }); }
  });

  it('publishes exact proven PHPDoc/native conflicts and honors diagnostic configuration', async () => {
    const root = await mkdtemp(join(tmpdir(), 'php-companion-phpdoc-conflict-'));
    try {
      await writeFile(join(root, 'composer.json'), JSON.stringify({ autoload: { 'psr-4': { 'App\\': './' } } }));
      const uri = pathToFileURL(join(root, 'Types.php')).toString();
      const source = `<?php namespace App;
class ParentType {} class ChildType extends ParentType {}
class Example {
    /** @param ParentType $value */
    public function conflict(ChildType $value): void {}
    /** @param ChildType $value */
    public function legal(ParentType $value): void {}
}`;
      await writeFile(join(root, 'Types.php'), source);
      server = spawn(process.execPath, [resolve('dist/server.js'), '--stdio'], { stdio: 'pipe' });
      const output = messagesFrom(server);
      server.stdin.write(encode({ jsonrpc: '2.0', id: 31, method: 'initialize', params: { processId: null, capabilities: {}, rootUri: pathToFileURL(root).toString() } }));
      await output.waitFor((message) => message.id === 31);
      server.stdin.write(encode({ jsonrpc: '2.0', method: 'initialized', params: {} }));
      await output.waitFor((message) => message.method === 'window/logMessage' && message.params?.message?.includes('complete=true'));
      server.stdin.write(encode({ jsonrpc: '2.0', method: 'textDocument/didOpen', params: { textDocument: { uri, languageId: 'php', version: 1, text: source } } }));
      const published = await output.waitFor((message) => message.method === 'textDocument/publishDiagnostics' && message.params.uri === uri);
      const conflicts = published.params.diagnostics.filter((item: { code?: string }) => item.code === 'php.phpdoc.type-conflict');
      expect(conflicts).toEqual([expect.objectContaining({
        severity: 2,
        message: '$value documents ParentType, which is incompatible with native App\\ChildType.',
        range: { start: lspPosition(source, source.indexOf('ParentType $value')), end: lspPosition(source, source.indexOf('ParentType $value') + 'ParentType'.length) },
      })]);
      server.stdin.write(encode({ jsonrpc: '2.0', method: 'workspace/didChangeConfiguration',
        params: { settings: { phpCompanion: { diagnostics: { disabledCodes: ['php.phpdoc.type-conflict'] } } } } }));
      const disabled = await output.waitFor((message) => message.method === 'textDocument/publishDiagnostics' && message.params.uri === uri
        && !message.params.diagnostics.some((item: { code?: string }) => item.code === 'php.phpdoc.type-conflict'));
      expect(disabled.params.diagnostics.some((item: { code?: string }) => item.code === 'php.phpdoc.type-conflict')).toBe(false);
    } finally { await rm(root, { recursive: true, force: true }); }
  });

  it('publishes proven missing-member diagnostics after a complete project index', async () => {
    const root = await mkdtemp(join(tmpdir(), 'php-companion-unresolved-member-'));
    try {
      await mkdir(join(root, 'src'), { recursive: true });
      await writeFile(join(root, 'composer.json'), JSON.stringify({ autoload: { 'psr-4': { 'App\\': 'src/' } } }));
      await writeFile(join(root, 'src', 'Service.php'), '<?php namespace App; interface ServiceContract {} class PrivateTarget { private function __construct() {} } class StaticConfig { public private(set) static string $token = "ready"; } class Service { public function present(string $value): void {} private function hidden(): void {} } function transform(string $value): int { return strlen($value); } function takesInt(int $value): void {}');
      const uri = pathToFileURL(join(root, 'src', 'Consumer.php')).toString();
      const source = '<?php namespace App; class InvalidRelation extends ServiceContract {} class SelfCycle extends SelfCycle {} function run(Service $service, mixed $unknown): void { new ServiceContract(); new PrivateTarget(); $service->present(); $service->hidden(); Service::present("x"); $service->present(other: "x"); $service->present(value: "x", value: "y"); $service->present(value: "x", "y"); $service->present(value: "x", ...$values); $service->missing(); $unknown->missing(); StaticConfig::$token = "changed"; echo StaticConfig::$token; $callback = transform(...); takesInt(transform(...)); }';
      await writeFile(join(root, 'src', 'Consumer.php'), source);
      server = spawn(process.execPath, [resolve('dist/server.js'), '--stdio'], { stdio: 'pipe' });
      const output = messagesFrom(server);
      server.stdin.write(encode({ jsonrpc: '2.0', id: 35, method: 'initialize', params: { processId: null, capabilities: {}, rootUri: pathToFileURL(root).toString(), initializationOptions: { phpVersion: '8.5', disabledDiagnosticCodes: ['php.member.unresolved'] } } }));
      await output.waitFor((message) => message.id === 35);
      server.stdin.write(encode({ jsonrpc: '2.0', method: 'initialized', params: {} }));
      await output.waitFor((message) => message.method === 'window/logMessage' && message.params?.message?.includes('complete=true'));
      server.stdin.write(encode({ jsonrpc: '2.0', method: 'textDocument/didOpen', params: { textDocument: { uri, languageId: 'php', version: 1, text: source } } }));
      const disabled = await output.waitFor((message) => message.method === 'textDocument/publishDiagnostics' && message.params.uri === uri);
      expect(disabled.params.diagnostics).not.toMatchObject([{ code: 'php.member.unresolved' }]);
      expect(disabled.params.diagnostics).toContainEqual(expect.objectContaining({ code: 'php.argument.missing-required', message: 'App\\Service::present is missing required argument: $value.' }));
      expect(disabled.params.diagnostics).toContainEqual(expect.objectContaining({ code: 'php.argument.unknown-named', message: 'App\\Service::present has no parameter named $other.' }));
      expect(disabled.params.diagnostics).toContainEqual(expect.objectContaining({ code: 'php.argument.duplicate-named', message: 'Named argument $value is supplied more than once.' }));
      expect(disabled.params.diagnostics).toContainEqual(expect.objectContaining({ code: 'php.argument.positional-after-named', message: 'A positional argument cannot follow a named argument.' }));
      expect(disabled.params.diagnostics).toContainEqual(expect.objectContaining({ code: 'php.argument.unpack-after-named', message: 'Argument unpacking cannot follow a named argument.' }));
      expect(disabled.params.diagnostics).toContainEqual(expect.objectContaining({ code: 'php.member.non-static-access', message: 'Cannot access non-static method App\\Service::present statically.' }));
      expect(disabled.params.diagnostics).toContainEqual(expect.objectContaining({ code: 'php.member.inaccessible', message: 'Cannot access private method App\\Service::hidden.' }));
      expect(disabled.params.diagnostics).toContainEqual(expect.objectContaining({ code: 'php.member.inaccessible', message: 'Cannot write private static property App\\StaticConfig::$token.' }));
      expect(disabled.params.diagnostics.some((item: { code?: string; message?: string }) => item.code === 'php.argument.missing-required'
        && item.message?.includes('transform'))).toBe(false);
      expect(disabled.params.diagnostics).toContainEqual(expect.objectContaining({
        code: 'php.argument.type-mismatch',
        message: 'App\\takesInt expects $value to be int; proven argument type is Closure.',
      }));
      expect(disabled.params.diagnostics).toContainEqual(expect.objectContaining({
        code: 'php.inheritance.invalid-type-kind',
        message: 'App\\InvalidRelation cannot extend App\\ServiceContract: expected class, found interface.',
      }));
      expect(disabled.params.diagnostics).toContainEqual(expect.objectContaining({
        code: 'php.inheritance.cycle',
        message: 'App\\SelfCycle creates a circular inheritance relation through App\\SelfCycle.',
      }));
      expect(disabled.params.diagnostics).toContainEqual(expect.objectContaining({
        code: 'php.instantiation.invalid-target',
        message: 'Cannot instantiate interface App\\ServiceContract.',
      }));
      expect(disabled.params.diagnostics).toContainEqual(expect.objectContaining({
        code: 'php.instantiation.inaccessible-constructor',
        message: 'Cannot call private constructor App\\PrivateTarget::__construct while instantiating App\\PrivateTarget from this scope.',
      }));
      server.stdin.write(encode({
        jsonrpc: '2.0',
        method: 'workspace/didChangeConfiguration',
        params: { settings: { phpCompanion: { diagnostics: { disabledCodes: [], severity: { 'php.member.unresolved': 'warning' } } } } },
      }));
      const diagnostics = await output.waitFor((message) => message.method === 'textDocument/publishDiagnostics' && message.params.uri === uri
        && message.params.diagnostics.some((diagnostic: { code?: string }) => diagnostic.code === 'php.member.unresolved'));
      expect(diagnostics.params.diagnostics).toContainEqual(expect.objectContaining({ code: 'php.member.unresolved', severity: 2, message: 'Cannot resolve method App\\Service::missing.' }));
      expect(diagnostics.params.diagnostics.filter((item: { code?: string }) => item.code === 'php.member.unresolved')).toHaveLength(1);

      server.kill();
      server = spawn(process.execPath, [resolve('dist/server.js'), '--stdio'], { stdio: 'pipe' });
      const legacyOutput = messagesFrom(server);
      server.stdin.write(encode({ jsonrpc: '2.0', id: 36, method: 'initialize', params: { processId: null, capabilities: {}, rootUri: pathToFileURL(root).toString(), initializationOptions: { phpVersion: '7.4' } } }));
      await legacyOutput.waitFor((message) => message.id === 36);
      server.stdin.write(encode({ jsonrpc: '2.0', method: 'initialized', params: {} }));
      await legacyOutput.waitFor((message) => message.method === 'window/logMessage' && message.params?.message?.includes('complete=true'));
      server.stdin.write(encode({ jsonrpc: '2.0', method: 'textDocument/didOpen', params: { textDocument: { uri, languageId: 'php', version: 1, text: source } } }));
      const legacyDiagnostics = await legacyOutput.waitFor((message) => message.method === 'textDocument/publishDiagnostics' && message.params.uri === uri);
      expect(legacyDiagnostics.params.diagnostics).toContainEqual(expect.objectContaining({ code: 'php.version.unsupported' }));
      expect(legacyDiagnostics.params.diagnostics.some((item: { code?: string }) => item.code === 'php.argument.unknown-named')).toBe(false);
      expect(legacyDiagnostics.params.diagnostics.some((item: { code?: string }) => String(item.code).startsWith('php.argument.duplicate-') || String(item.code).endsWith('-after-named'))).toBe(false);
    } finally { await rm(root, { recursive: true, force: true }); }
  });

  it('enables implicit readonly-class property diagnostics only for PHP 8.2 and newer', async () => {
    const root = await mkdtemp(join(tmpdir(), 'php-companion-readonly-class-version-'));
    try {
      await writeFile(join(root, 'composer.json'), JSON.stringify({ autoload: { 'psr-4': { 'App\\': './' } } }));
      const uri = pathToFileURL(join(root, 'ReadonlyState.php')).toString();
      const source = `<?php namespace App;
        class ExplicitState { public readonly int $id; }
        readonly class ImplicitState { public int $revision; }
        function mutate(ExplicitState $explicit, ImplicitState $implicit): void { $explicit->id = 1; $implicit->revision = 2; }
      `;
      await writeFile(join(root, 'ReadonlyState.php'), source);
      for (const [phpVersion, expectedReadonlyDiagnostics] of [['8.1', 1], ['8.2', 2]] as const) {
        const running = spawn(process.execPath, [resolve('dist/server.js'), '--stdio'], { stdio: 'pipe' });
        server = running;
        const output = messagesFrom(running);
        running.stdin.write(encode({ jsonrpc: '2.0', id: 37, method: 'initialize', params: {
          processId: null, capabilities: {}, rootUri: pathToFileURL(root).toString(), initializationOptions: { phpVersion },
        } }));
        await output.waitFor((message) => message.id === 37);
        running.stdin.write(encode({ jsonrpc: '2.0', method: 'initialized', params: {} }));
        await output.waitFor((message) => message.method === 'window/logMessage' && message.params?.message?.includes('complete=true'));
        running.stdin.write(encode({ jsonrpc: '2.0', method: 'textDocument/didOpen', params: { textDocument: { uri, languageId: 'php', version: 1, text: source } } }));
        const diagnostics = await output.waitFor((message) => message.method === 'textDocument/publishDiagnostics' && message.params.uri === uri);
        expect(diagnostics.params.diagnostics.filter((item: { code?: string }) => item.code === 'php.assignment.readonly-property')).toHaveLength(expectedReadonlyDiagnostics);
        expect(diagnostics.params.diagnostics.some((item: { code?: string; message?: string }) => item.code === 'php.version.unsupported'
          && item.message?.includes('readonly class'))).toBe(phpVersion === '8.1');
        await new Promise<void>((resolveExit) => { running.once('exit', () => resolveExit()); running.kill(); });
        server = undefined;
      }
    } finally { await rm(root, { recursive: true, force: true }); }
  });

  it('publishes PHP 8.4 hooked-property operation, setter-type, and asymmetric write diagnostics', async () => {
    const root = await mkdtemp(join(tmpdir(), 'php-companion-property-hooks-'));
    try {
      await writeFile(join(root, 'composer.json'), JSON.stringify({ autoload: { 'psr-4': { 'App\\': './' } } }));
      const uri = pathToFileURL(join(root, 'Hooks.php')).toString();
      const source = `<?php declare(strict_types=1); namespace App;
        interface Label {}
        class Hooks {
          public string $display { get => 'display'; }
          public string $sink { set(string|Label $value) { echo $value; } }
          public private(set) string $input { set(string|Label $value) => (string) $value; }
          public array $items { get => $this->items; }
          public array $referenceItems { &get { return $this->referenceItems; } }
        }
        class Animal {} class Dog extends Animal {}
        interface Readable { public Animal $pet { get; } }
        interface Both { public Animal $both { get; set; } }
        class MissingProperty implements Readable {}
        class BadInvariantProperty implements Both { public Dog $both; }
        class FinalPropertyBase { final public string $closed; }
        class BadFinalProperty extends FinalPropertyBase { public string $closed; }
        class FinalPromotedPropertyBase { public function __construct(public final string $promotedClosed) {} }
        class BadFinalPromotedProperty extends FinalPromotedPropertyBase { public string $promotedClosed; }
        class ReferenceIteration {
          public array $plain { get => $this->plain; }
          public array $allowed { &get { return $this->allowed; } }
        }
        function mutate(array &$value): void {}
        function consume(Hooks $hooks, array $replacement, ReferenceIteration $iteration): void {
          $hooks->display = 'changed'; $hooks->sink; $hooks->sink = 1; $hooks->input = 'accepted';
          $hooks->items['key'] = 'changed'; $hooks->referenceItems['key'] = 'changed';
          $right =& $hooks->items; $allowed =& $hooks->referenceItems;
          $hooks->items =& $replacement; $hooks->referenceItems =& $replacement;
          mutate($hooks->items); mutate($hooks->referenceItems);
          foreach ($hooks->items as &$item) {} foreach ($hooks->referenceItems as &$allowedItem) {}
          foreach ($iteration as &$property) {}
        }`;
      await writeFile(join(root, 'Hooks.php'), source);
      for (const phpVersion of ['8.3', '8.4', '8.5'] as const) {
        const running = spawn(process.execPath, [resolve('dist/server.js'), '--stdio'], { stdio: 'pipe' });
        server = running;
        const output = messagesFrom(running);
        running.stdin.write(encode({ jsonrpc: '2.0', id: 137, method: 'initialize', params: {
          processId: null, capabilities: {}, rootUri: pathToFileURL(root).toString(), initializationOptions: { phpVersion },
        } }));
        await output.waitFor((message) => message.id === 137);
        running.stdin.write(encode({ jsonrpc: '2.0', method: 'initialized', params: {} }));
        await output.waitFor((message) => message.method === 'window/logMessage' && message.params?.message?.includes('complete=true'));
        running.stdin.write(encode({ jsonrpc: '2.0', method: 'textDocument/didOpen', params: { textDocument: { uri, languageId: 'php', version: 1, text: source } } }));
        const published = await output.waitFor((message) => message.method === 'textDocument/publishDiagnostics' && message.params.uri === uri);
        const diagnostics = published.params.diagnostics as Array<{ code?: string; message?: string }>;
        expect(diagnostics.filter((item) => item.code === 'php.property.unreadable' || item.code === 'php.property.unwritable')).toHaveLength(phpVersion === '8.3' ? 0 : 2);
        if (phpVersion !== '8.3') {
          expect(diagnostics).toEqual(expect.arrayContaining([
            expect.objectContaining({ code: 'php.property.unwritable', message: 'Cannot write read-only hooked property App\\Hooks::$display.' }),
            expect.objectContaining({ code: 'php.property.unreadable', message: 'Cannot read write-only hooked property App\\Hooks::$sink.' }),
            expect.objectContaining({ code: 'php.assignment.type-mismatch' }),
            expect.objectContaining({ code: 'php.member.inaccessible' }),
            expect.objectContaining({ code: 'php.property.indirect-modification', message: 'Indirect modification of hooked property App\\Hooks::$items requires a by-reference get hook.' }),
            expect.objectContaining({ code: 'php.property.reference-assignment', message: 'Cannot assign a reference to hooked property App\\Hooks::$items.' }),
            expect.objectContaining({ code: 'php.property.reference-assignment', message: 'Cannot assign a reference to hooked property App\\Hooks::$referenceItems.' }),
            expect.objectContaining({ code: 'php.property.reference-iteration', message: 'Cannot iterate App\\ReferenceIteration by reference because these hooked properties do not return by reference: $plain.' }),
            expect.objectContaining({ code: 'php.property.missing-implementation', message: 'App\\MissingProperty must implement App\\Readable::$pet: property $pet is not implemented.' }),
            expect.objectContaining({ code: 'php.property.incompatible-override', message: 'App\\BadInvariantProperty::$both is incompatible with App\\Both::$both: set type is not contravariant with the inherited property type.' }),
            expect.objectContaining({ code: 'php.property.incompatible-override', message: 'App\\BadFinalProperty::$closed is incompatible with App\\FinalPropertyBase::$closed: a final property cannot be overridden.' }),
          ]));
          const promotedOverride = diagnostics.filter((item) => item.code === 'php.property.incompatible-override'
            && item.message?.includes('BadFinalPromotedProperty::$promotedClosed'));
          expect(promotedOverride).toHaveLength(phpVersion === '8.5' ? 1 : 0);
          expect(diagnostics.some((item) => item.code === 'php.version.unsupported'
            && item.message?.includes('final promoted property'))).toBe(phpVersion === '8.4');
        } else {
          expect(diagnostics.some((item) => item.code === 'php.version.unsupported')).toBe(true);
          expect(diagnostics.some((item) => item.code === 'php.property.missing-implementation'
            || item.code === 'php.property.incompatible-override' || item.code === 'php.property.reference-assignment'
            || item.code === 'php.property.reference-iteration')).toBe(false);
        }
        await new Promise<void>((resolveExit) => { running.once('exit', () => resolveExit()); running.kill(); });
        server = undefined;
      }
    } finally { await rm(root, { recursive: true, force: true }); }
  });

  it('publishes readonly class inheritance and Trait contracts only for PHP 8.2 and newer', async () => {
    const root = await mkdtemp(join(tmpdir(), 'php-companion-readonly-class-contracts-'));
    try {
      await writeFile(join(root, 'composer.json'), JSON.stringify({ autoload: { 'psr-4': { 'App\\': './' } } }));
      const uri = pathToFileURL(join(root, 'ReadonlyContracts.php')).toString();
      const source = `<?php namespace App;
        class MutableBase {}
        readonly class ReadonlyBase {}
        readonly class InvalidReadonlyChild extends MutableBase {}
        class InvalidMutableChild extends ReadonlyBase {}
        readonly class ValidReadonlyChild extends ReadonlyBase {}
        class ValidMutableChild extends MutableBase {}
        trait MutableProperty { public int $value; }
        trait NestedMutableProperty { use MutableProperty; }
        trait ReadonlyProperty { public readonly int $id; }
        readonly class DirectInvalid { use MutableProperty; }
        readonly class NestedInvalid { use NestedMutableProperty; }
        readonly class TraitValid { use ReadonlyProperty; }
      `;
      await writeFile(join(root, 'ReadonlyContracts.php'), source);
      for (const phpVersion of ['8.1', '8.2'] as const) {
        const running = spawn(process.execPath, [resolve('dist/server.js'), '--stdio'], { stdio: 'pipe' }); server = running;
        const output = messagesFrom(running);
        running.stdin.write(encode({ jsonrpc: '2.0', id: 38, method: 'initialize', params: {
          processId: null, capabilities: {}, rootUri: pathToFileURL(root).toString(), initializationOptions: { phpVersion },
        } }));
        await output.waitFor((message) => message.id === 38);
        running.stdin.write(encode({ jsonrpc: '2.0', method: 'initialized', params: {} }));
        await output.waitFor((message) => message.method === 'window/logMessage' && message.params?.message?.includes('complete=true'));
        running.stdin.write(encode({ jsonrpc: '2.0', method: 'textDocument/didOpen', params: { textDocument: { uri, languageId: 'php', version: 1, text: source } } }));
        const diagnostics = (await output.waitFor((message) => message.method === 'textDocument/publishDiagnostics' && message.params.uri === uri)).params.diagnostics;
        expect(diagnostics.filter((item: { code?: string }) => item.code === 'php.inheritance.readonly-mismatch')).toHaveLength(phpVersion === '8.2' ? 2 : 0);
        expect(diagnostics.filter((item: { code?: string }) => item.code === 'php.readonly-class.invalid-trait')).toHaveLength(phpVersion === '8.2' ? 2 : 0);
        if (phpVersion === '8.2') {
          expect(diagnostics).toContainEqual(expect.objectContaining({ message: 'Readonly class App\\InvalidReadonlyChild cannot extend non-readonly class App\\MutableBase.' }));
          expect(diagnostics).toContainEqual(expect.objectContaining({ message: 'Non-readonly class App\\InvalidMutableChild cannot extend readonly class App\\ReadonlyBase.' }));
          expect(diagnostics).toContainEqual(expect.objectContaining({ message: 'Readonly class App\\NestedInvalid cannot use trait App\\NestedMutableProperty because App\\MutableProperty declares non-readonly property $value.' }));
        }
        await new Promise<void>((resolveExit) => { running.once('exit', () => resolveExit()); running.kill(); }); server = undefined;
      }
    } finally { await rm(root, { recursive: true, force: true }); }
  });

  it('publishes audited atomic type version diagnostics through stdio', async () => {
    const root = await mkdtemp(join(tmpdir(), 'php-companion-atomic-type-versions-'));
    try {
      await writeFile(join(root, 'composer.json'), JSON.stringify({}));
      const uri = pathToFileURL(join(root, 'AtomicTypes.php')).toString();
      const source = `<?php
        function mixedType(mixed $value): void {}
        class Factory { public function make(): static { return new static(); } }
        function unionFalse(int|false $value): void {}
        function standaloneFalse(): false { return false; }
        function falseOrNull(): false|null { return null; }
        function nullableFalse(): ?false { return null; }
        function trueType(): true { return true; }
        function nullType(): null { return null; }
      `;
      await writeFile(join(root, 'AtomicTypes.php'), source);
      for (const [phpVersion, expected] of [['7.4', 8], ['8.0', 5], ['8.1', 5], ['8.2', 0]] as const) {
        const running = spawn(process.execPath, [resolve('dist/server.js'), '--stdio'], { stdio: 'pipe' }); server = running;
        const output = messagesFrom(running);
        running.stdin.write(encode({ jsonrpc: '2.0', id: 39, method: 'initialize', params: {
          processId: null, capabilities: {}, rootUri: pathToFileURL(root).toString(), initializationOptions: { phpVersion },
        } }));
        await output.waitFor((message) => message.id === 39);
        running.stdin.write(encode({ jsonrpc: '2.0', method: 'initialized', params: {} }));
        await output.waitFor((message) => message.method === 'window/logMessage' && message.params?.message?.includes('complete=true'));
        running.stdin.write(encode({ jsonrpc: '2.0', method: 'textDocument/didOpen', params: { textDocument: { uri, languageId: 'php', version: 1, text: source } } }));
        const diagnostics = (await output.waitFor((message) => message.method === 'textDocument/publishDiagnostics' && message.params.uri === uri)).params.diagnostics
          .filter((item: { code?: string }) => item.code === 'php.version.unsupported');
        expect(diagnostics).toHaveLength(expected);
        if (phpVersion === '7.4') {
          expect(diagnostics).toContainEqual(expect.objectContaining({ message: 'mixed type requires PHP 8.0 or newer; the target is PHP 7.4.' }));
          expect(diagnostics).toContainEqual(expect.objectContaining({ message: 'static return type requires PHP 8.0 or newer; the target is PHP 7.4.' }));
        }
        if (phpVersion === '8.1') expect(diagnostics.map((item: { message: string }) => item.message)).toEqual(expect.arrayContaining([
          'standalone false type requires PHP 8.2 or newer; the target is PHP 8.1.',
          'standalone false and null types requires PHP 8.2 or newer; the target is PHP 8.1.',
          'true type requires PHP 8.2 or newer; the target is PHP 8.1.',
          'standalone null type requires PHP 8.2 or newer; the target is PHP 8.1.',
        ]));
        await new Promise<void>((resolveExit) => { running.once('exit', () => resolveExit()); running.kill(); }); server = undefined;
      }
    } finally { await rm(root, { recursive: true, force: true }); }
  });

  it('publishes proven dynamic property creation warnings only for PHP 8.2 and newer', async () => {
    const root = await mkdtemp(join(tmpdir(), 'php-companion-dynamic-properties-'));
    try {
      await writeFile(join(root, 'composer.json'), JSON.stringify({ autoload: { 'psr-4': { 'App\\': './' } } }));
      const uri = pathToFileURL(join(root, 'DynamicProperties.php')).toString();
      const source = `<?php namespace App;
        class Plain {}
        class Declared { public int $known; }
        class Magic { public function __set(string $name, mixed $value): void {} }
        #[\\AllowDynamicProperties] class Allowed {}
        function mutate(Plain $plain, Declared $declared, Magic $magic, Allowed $allowed): void {
          $plain->created = 1; $plain->readOnly; $declared->known = 1; $magic->created = 1; $allowed->created = 1;
          $plain->repeated = 1; $plain->repeated = 2; $plain->repeated = 3;
          $plain->reset = 1; unset($plain->reset); $plain->reset = 2;
          $nested = ($plain->nested = 1);
        }
      `;
      await writeFile(join(root, 'DynamicProperties.php'), source);
      for (const phpVersion of ['8.1', '8.2'] as const) {
        const running = spawn(process.execPath, [resolve('dist/server.js'), '--stdio'], { stdio: 'pipe' }); server = running;
        const output = messagesFrom(running);
        running.stdin.write(encode({ jsonrpc: '2.0', id: 40, method: 'initialize', params: {
          processId: null, capabilities: {}, rootUri: pathToFileURL(root).toString(), initializationOptions: { phpVersion },
        } }));
        await output.waitFor((message) => message.id === 40);
        running.stdin.write(encode({ jsonrpc: '2.0', method: 'initialized', params: {} }));
        await output.waitFor((message) => message.method === 'window/logMessage' && message.params?.message?.includes('complete=true'));
        running.stdin.write(encode({ jsonrpc: '2.0', method: 'textDocument/didOpen', params: { textDocument: { uri, languageId: 'php', version: 1, text: source } } }));
        const diagnostics = (await output.waitFor((message) => message.method === 'textDocument/publishDiagnostics' && message.params.uri === uri)).params.diagnostics
          .filter((item: { code?: string }) => item.code === 'php.property.dynamic-deprecated');
        expect(diagnostics).toHaveLength(phpVersion === '8.2' ? 4 : 0);
        if (phpVersion === '8.2') expect(diagnostics[0]).toMatchObject({
          severity: 2,
          message: 'Creation of dynamic property App\\Plain::$created is deprecated in PHP 8.2 and newer.',
          range: { start: lspPosition(source, source.indexOf('created')), end: lspPosition(source, source.indexOf('created') + 'created'.length) },
        });
        if (phpVersion === '8.2') expect(diagnostics.map((item: { range: { start: { line: number; character: number }; end: { line: number; character: number } } }) => {
          const start = source.split('\n').slice(0, item.range.start.line).reduce((sum, line) => sum + line.length + 1, 0) + item.range.start.character;
          const end = source.split('\n').slice(0, item.range.end.line).reduce((sum, line) => sum + line.length + 1, 0) + item.range.end.character;
          return source.slice(start, end);
        })).toEqual(['created', 'repeated', 'reset', 'reset']);
        await new Promise<void>((resolveExit) => { running.once('exit', () => resolveExit()); running.kill(); }); server = undefined;
      }
    } finally { await rm(root, { recursive: true, force: true }); }
  });

  it('rejects AllowDynamicProperties on readonly and non-class declarations for PHP 8.2+', async () => {
    const root = await mkdtemp(join(tmpdir(), 'php-companion-allow-dynamic-properties-'));
    try {
      await writeFile(join(root, 'composer.json'), JSON.stringify({}));
      const uri = pathToFileURL(join(root, 'Attributes.php')).toString();
      const source = `<?php namespace App;
        use \\AllowDynamicProperties as Dynamic;
        #[\\AllowDynamicProperties] class Legal {}
        #[Dynamic] readonly class ReadonlyTarget {}
        #[\\AllowDynamicProperties] interface InvalidInterface {}
        #[\\AllowDynamicProperties] trait InvalidTrait {}
        #[\\AllowDynamicProperties] enum InvalidEnum {}
        #[AllowDynamicProperties] readonly class CustomAttribute {}
      `;
      await writeFile(join(root, 'Attributes.php'), source);
      for (const phpVersion of ['8.1', '8.2'] as const) {
        const running = spawn(process.execPath, [resolve('dist/server.js'), '--stdio'], { stdio: 'pipe' }); server = running;
        const output = messagesFrom(running);
        running.stdin.write(encode({ jsonrpc: '2.0', id: 41, method: 'initialize', params: {
          processId: null, capabilities: {}, rootUri: pathToFileURL(root).toString(), initializationOptions: { phpVersion },
        } }));
        await output.waitFor((message) => message.id === 41);
        running.stdin.write(encode({ jsonrpc: '2.0', method: 'initialized', params: {} }));
        await output.waitFor((message) => message.method === 'window/logMessage' && message.params?.message?.includes('complete=true'));
        running.stdin.write(encode({ jsonrpc: '2.0', method: 'textDocument/didOpen', params: { textDocument: { uri, languageId: 'php', version: 1, text: source } } }));
        const diagnostics = (await output.waitFor((message) => message.method === 'textDocument/publishDiagnostics' && message.params.uri === uri)).params.diagnostics
          .filter((item: { code?: string }) => item.code === 'php.attribute.invalid-allow-dynamic-properties');
        expect(diagnostics).toHaveLength(phpVersion === '8.2' ? 4 : 0);
        if (phpVersion === '8.2') expect(diagnostics.map((item: { message: string }) => item.message)).toEqual([
          'Cannot apply #[AllowDynamicProperties] to readonly class App\\ReadonlyTarget.',
          'Cannot apply #[AllowDynamicProperties] to interface App\\InvalidInterface.',
          'Cannot apply #[AllowDynamicProperties] to trait App\\InvalidTrait.',
          'Cannot apply #[AllowDynamicProperties] to enum App\\InvalidEnum.',
        ]);
        await new Promise<void>((resolveExit) => { running.once('exit', () => resolveExit()); running.kill(); }); server = undefined;
      }
    } finally { await rm(root, { recursive: true, force: true }); }
  });

  it('enforces the PHP 8.5 Override property target and matching-parent contract', async () => {
    const root = await mkdtemp(join(tmpdir(), 'php-companion-override-properties-'));
    try {
      await writeFile(join(root, 'composer.json'), JSON.stringify({}));
      const uri = pathToFileURL(join(root, 'OverrideProperties.php')).toString();
      const source = `<?php namespace App;
        use \\Override as BuiltinOverride;
        class Base { protected string $name; private int $secret; }
        trait MissingTrait { #[\\Override] public int $fromTrait; }
        trait MatchingTrait { #[\\Override] protected string $name; }
        class Direct extends Base {
          #[\\Override] protected string $name;
          #[BuiltinOverride] public int $missing;
          #[\\Override] public int $secret;
          #[Override] public int $customAttribute;
        }
        class UsesTraits extends Base { use MissingTrait, MatchingTrait; }
      `;
      await writeFile(join(root, 'OverrideProperties.php'), source);
      for (const phpVersion of ['7.4', '8.4', '8.5'] as const) {
        const running = spawn(process.execPath, [resolve('dist/server.js'), '--stdio'], { stdio: 'pipe' }); server = running;
        const output = messagesFrom(running);
        running.stdin.write(encode({ jsonrpc: '2.0', id: 42, method: 'initialize', params: {
          processId: null, capabilities: {}, rootUri: pathToFileURL(root).toString(), initializationOptions: { phpVersion },
        } }));
        await output.waitFor((message) => message.id === 42);
        running.stdin.write(encode({ jsonrpc: '2.0', method: 'initialized', params: {} }));
        await output.waitFor((message) => message.method === 'window/logMessage' && message.params?.message?.includes('complete=true'));
        running.stdin.write(encode({ jsonrpc: '2.0', method: 'textDocument/didOpen', params: { textDocument: { uri, languageId: 'php', version: 1, text: source } } }));
        const diagnostics = (await output.waitFor((message) => message.method === 'textDocument/publishDiagnostics' && message.params.uri === uri)).params.diagnostics;
        const versionErrors = diagnostics.filter((item: { code?: string; message?: string }) => item.code === 'php.version.unsupported'
          && item.message?.includes('#[Override] on property'));
        const matchingErrors = diagnostics.filter((item: { code?: string }) => item.code === 'php.attribute.invalid-override-property');
        expect(versionErrors).toHaveLength(phpVersion === '8.4' ? 5 : 0);
        expect(matchingErrors).toHaveLength(phpVersion === '8.5' ? 3 : 0);
        if (phpVersion === '7.4') expect(diagnostics.some((item: { code?: string; message?: string }) => item.code === 'php.version.unsupported'
          && item.message?.includes('attribute requires PHP 8.0'))).toBe(true);
        if (phpVersion === '8.5') expect(matchingErrors.map((item: { message: string }) => item.message)).toEqual([
          'App\\Direct::$missing has #[Override], but no matching non-private parent property exists.',
          'App\\Direct::$secret has #[Override], but no matching non-private parent property exists.',
          'App\\UsesTraits::$fromTrait has #[Override], but no matching non-private parent property exists.',
        ]);
        expect(diagnostics.some((item: { message?: string }) => item.message?.includes('$customAttribute'))).toBe(false);
        await new Promise<void>((resolveExit) => { running.once('exit', () => resolveExit()); running.kill(); }); server = undefined;
      }
    } finally { await rm(root, { recursive: true, force: true }); }
  });

  it('reports PHP 8.5 NoDiscard calls, declaration constraints, native methods, and void-cast suppression', async () => {
    const root = await mkdtemp(join(tmpdir(), 'php-companion-no-discard-'));
    try {
      await writeFile(join(root, 'composer.json'), JSON.stringify({}));
      const uri = pathToFileURL(join(root, 'NoDiscard.php')).toString();
      const source = `<?php namespace App;
        use \\NoDiscard as Important;
        #[\\NoDiscard("because status matters")] function important(): int { return 1; }
        trait ImportantTrait { #[\\NoDiscard(message: "because the trait result matters")] public function traitValue(): int { return 1; } }
        class ParentService { #[\\NoDiscard] public function inherited(): int { return 1; } }
        class Service extends ParentService {
          use ImportantTrait;
          public function inherited(): int { return 2; }
          #[Important] public function value(): int { return 1; }
          #[Important] public function invalidVoid(): void {}
          #[Important] public function invalidNever(): never { throw new \\RuntimeException(); }
          #[Important] public function __clone() {}
          public string $name { #[Important] get => $this->name; }
        }
        #[\\NoDiscard] class InvalidClass {}
        #[\\NoDiscard] interface InvalidInterface {}
        #[\\NoDiscard] trait InvalidTrait {}
        #[\\NoDiscard] enum InvalidEnum { #[\\NoDiscard] case OLD; }
        class InvalidMembers {
          #[\\NoDiscard] public const OLD = 1;
          #[\\NoDiscard] public int $property;
          public function parameter(#[\\NoDiscard] int $value): int { return $value; }
          #[\\DelayedTargetValidation] #[\\NoDiscard] public string $delayed;
        }
        #[\\NoDiscard] const INVALID_GLOBAL = 1;
        $invalidAnonymous = new #[\\NoDiscard] class {};
        $invalidClosure = #[\\NoDiscard] function(): void {};
        $invalidArrow = #[\\NoDiscard] fn(): never => throw new \\RuntimeException();
        function run(): void {
          important();
          $used = important();
          (bool) important();
          (void) important();
          $service = new Service();
          $service->value();
          $service->traitValue();
          $service->inherited();
          $date = new \\DateTimeImmutable();
          $date->setDate(2026, 9, 14);
        }
        important();
      `;
      await writeFile(join(root, 'NoDiscard.php'), source);
      for (const phpVersion of ['8.4', '8.5'] as const) {
        const running = spawn(process.execPath, [resolve('dist/server.js'), '--stdio'], { stdio: 'pipe' }); server = running;
        const output = messagesFrom(running);
        running.stdin.write(encode({ jsonrpc: '2.0', id: 43, method: 'initialize', params: {
          processId: null, capabilities: {}, rootUri: pathToFileURL(root).toString(), initializationOptions: { phpVersion },
        } }));
        await output.waitFor((message) => message.id === 43);
        running.stdin.write(encode({ jsonrpc: '2.0', method: 'initialized', params: {} }));
        await output.waitFor((message) => message.method === 'window/logMessage' && message.params?.message?.includes('complete=true'));
        running.stdin.write(encode({ jsonrpc: '2.0', method: 'textDocument/didOpen', params: { textDocument: { uri, languageId: 'php', version: 1, text: source } } }));
        const diagnostics = (await output.waitFor((message) => message.method === 'textDocument/publishDiagnostics' && message.params.uri === uri)).params.diagnostics;
        const discarded = diagnostics.filter((item: { code?: string }) => item.code === 'php.return-value.discarded');
        const invalid = diagnostics.filter((item: { code?: string }) => item.code === 'php.attribute.invalid-no-discard');
        const invalidTargets = diagnostics.filter((item: { code?: string }) => item.code === 'php.attribute.invalid-no-discard-target');
        const voidCast = diagnostics.filter((item: { code?: string; message?: string }) => item.code === 'php.version.unsupported'
          && item.message?.startsWith('(void) cast'));
        expect(discarded).toHaveLength(phpVersion === '8.5' ? 5 : 0);
        expect(invalid).toHaveLength(phpVersion === '8.5' ? 5 : 0);
        expect(invalidTargets).toHaveLength(phpVersion === '8.5' ? 11 : 0);
        expect(voidCast).toHaveLength(phpVersion === '8.4' ? 1 : 0);
        if (phpVersion === '8.5') {
          expect(discarded.map((item: { message: string }) => item.message)).toEqual(expect.arrayContaining([
            expect.stringContaining('App\\important must be used, because status matters'),
            expect.stringContaining('App\\Service::traitValue must be used, because the trait result matters'),
            expect.stringContaining('DateTimeImmutable::setDate must be used, as DateTimeImmutable::setDate() does not modify the object itself'),
          ]));
          expect(invalid.map((item: { message: string }) => item.message)).toEqual(expect.arrayContaining([
            expect.stringContaining('App\\Service::invalidVoid'),
            expect.stringContaining('App\\Service::invalidNever'),
            expect.stringContaining('App\\Service::__clone'),
            expect.stringContaining('closure@'),
            expect.stringContaining('arrow function@'),
          ]));
          expect(invalidTargets.map((item: { message: string }) => item.message)).toEqual(expect.arrayContaining([
            'Cannot apply #[NoDiscard] to a property hook.',
            'Cannot apply #[NoDiscard] to a class.',
            'Cannot apply #[NoDiscard] to an interface.',
            'Cannot apply #[NoDiscard] to a trait.',
            'Cannot apply #[NoDiscard] to an enum.',
            'Cannot apply #[NoDiscard] to an enum case.',
            'Cannot apply #[NoDiscard] to a class constant.',
            'Cannot apply #[NoDiscard] to a property.',
            'Cannot apply #[NoDiscard] to a parameter.',
            'Cannot apply #[NoDiscard] to a global constant.',
            'Cannot apply #[NoDiscard] to an anonymous class.',
          ]));
        }
        await new Promise<void>((resolveExit) => { running.once('exit', () => resolveExit()); running.kill(); }); server = undefined;
      }
    } finally { await rm(root, { recursive: true, force: true }); }
  });

  it('reports versioned Deprecated attribute and PHPDoc uses with the LSP deprecated tag', async () => {
    const root = await mkdtemp(join(tmpdir(), 'php-companion-deprecated-symbols-'));
    try {
      await writeFile(join(root, 'composer.json'), JSON.stringify({}));
      const uri = pathToFileURL(join(root, 'Deprecated.php')).toString();
      const source = `<?php namespace App;
        #[\\Deprecated(message: "use replacement()", since: "1.2")] function oldFunction(): void {}
        /** @deprecated use documentedReplacement() */ function documentedFunction(): void {}
        class ParentService { #[\\Deprecated("old parent")] public function inherited(): void {} }
        class Service extends ParentService {
          #[\\Deprecated("use create()", since: "2.0")] public function __construct() {}
          #[\\Deprecated("use currentMethod()")] public function oldMethod(): void {}
          public function inherited(): void {}
          /** @deprecated use CURRENT_DOC */ public const OLD_DOC = 1;
          #[\\Deprecated("use CURRENT")] public const OLD = 1;
        }
        enum Status { #[\\Deprecated("use CURRENT case")] case OLD; case CURRENT; }
        class Hooked { public string $name { #[\\Deprecated("use readName()")] get => "name"; #[\\Deprecated("use writeName()")] set {} } }
        /** @deprecated use CurrentTrait */ trait DocumentedTrait {}
        #[\\Deprecated("use CurrentTrait", since: "3.0")] trait OldTrait {}
        class Consumer { use DocumentedTrait, OldTrait; }
        #[\\Deprecated("use CURRENT_GLOBAL", since: "4.0")] const OLD_GLOBAL = 1;
        function run(): void {
          oldFunction(...);
          oldFunction(); documentedFunction();
          $service = new Service(); $service->oldMethod(); $service->inherited();
          Service::OLD_DOC; Service::OLD; Status::OLD; OLD_GLOBAL;
          $hooked = new Hooked(); $read = $hooked->name; $hooked->name = "value";
          utf8_encode("legacy");
          $storage = new \\SplObjectStorage(); $storage->attach(new \\stdClass());
        }
      `;
      await writeFile(join(root, 'Deprecated.php'), source);
      for (const [phpVersion, expected] of [['8.3', 4], ['8.4', 11], ['8.5', 14]] as const) {
        const running = spawn(process.execPath, [resolve('dist/server.js'), '--stdio'], { stdio: 'pipe' }); server = running;
        const output = messagesFrom(running);
        running.stdin.write(encode({ jsonrpc: '2.0', id: 44, method: 'initialize', params: {
          processId: null, capabilities: {}, rootUri: pathToFileURL(root).toString(), initializationOptions: { phpVersion },
        } }));
        await output.waitFor((message) => message.id === 44);
        running.stdin.write(encode({ jsonrpc: '2.0', method: 'initialized', params: {} }));
        await output.waitFor((message) => message.method === 'window/logMessage' && message.params?.message?.includes('complete=true'));
        running.stdin.write(encode({ jsonrpc: '2.0', method: 'textDocument/didOpen', params: { textDocument: { uri, languageId: 'php', version: 1, text: source } } }));
        const diagnostics = (await output.waitFor((message) => message.method === 'textDocument/publishDiagnostics' && message.params.uri === uri)).params.diagnostics
          .filter((item: { code?: string }) => item.code === 'php.symbol.deprecated');
        expect(diagnostics).toHaveLength(expected);
        expect(diagnostics.every((item: { severity?: number; tags?: number[] }) => item.severity === 2 && item.tags?.includes(2))).toBe(true);
        expect(diagnostics.some((item: { message?: string }) => item.message === 'Function App\\oldFunction is deprecated since 1.2, use replacement().'))
          .toBe(phpVersion !== '8.3');
        expect(diagnostics.some((item: { message?: string }) => item.message === 'Function App\\documentedFunction is deprecated, use documentedReplacement().')).toBe(true);
        expect(diagnostics.some((item: { message?: string }) => item.message?.startsWith('Trait App\\OldTrait is deprecated since 3.0'))).toBe(phpVersion === '8.5');
        expect(diagnostics.some((item: { message?: string }) => item.message?.startsWith('Function utf8_encode is deprecated'))).toBe(true);
        expect(diagnostics.some((item: { message?: string }) => item.message?.startsWith('Method SplObjectStorage::attach is deprecated'))).toBe(phpVersion === '8.5');
        expect(diagnostics.some((item: { message?: string }) => item.message?.includes('inherited'))).toBe(false);
        await new Promise<void>((resolveExit) => { running.once('exit', () => resolveExit()); running.kill(); }); server = undefined;
      }
    } finally { await rm(root, { recursive: true, force: true }); }
  });

  it('validates Deprecated attribute targets across PHP 7.4, 8.3, 8.4, and 8.5', async () => {
    const root = await mkdtemp(join(tmpdir(), 'php-companion-deprecated-targets-'));
    try {
      await writeFile(join(root, 'composer.json'), JSON.stringify({}));
      const uri = pathToFileURL(join(root, 'DeprecatedTargets.php')).toString();
      const source = `<?php namespace App;
        #[\\Deprecated] function validFunction(): void {}
        class Container {
          #[\\Deprecated] public function validMethod(#[\\Deprecated] int $invalidParameter): void {}
          #[\\Deprecated] public const VALID_CONSTANT = 1;
          #[\\Deprecated] public string $invalidProperty;
          public string $hooked { #[\\Deprecated] get => "value"; }
        }
        enum ValidEnum { #[\\Deprecated] case OLD; }
        #[\\Deprecated] trait ValidTrait {}
        #[\\Deprecated] const VALID_GLOBAL = 1;
        #[\\Deprecated] class InvalidClass {}
        #[\\Deprecated] interface InvalidInterface {}
        #[\\Deprecated] enum InvalidEnum {}
        #[\\DelayedTargetValidation] #[\\Deprecated] class DelayedInvalidClass {}
        $closure = #[\\Deprecated] function(): void {};
        $arrow = #[\\Deprecated] fn(): int => 1;
        $anonymous = new #[\\Deprecated] class {};
        class Deprecated {}
        #[Deprecated] class CustomAttributeTarget {}
      `;
      await writeFile(join(root, 'DeprecatedTargets.php'), source);
      for (const [phpVersion, expectedVersion, expectedInvalid] of [
        ['7.4', 0, 0], ['8.3', 16, 0], ['8.4', 2, 7], ['8.5', 0, 6],
      ] as const) {
        const running = spawn(process.execPath, [resolve('dist/server.js'), '--stdio'], { stdio: 'pipe' }); server = running;
        const output = messagesFrom(running);
        running.stdin.write(encode({ jsonrpc: '2.0', id: 45, method: 'initialize', params: {
          processId: null, capabilities: {}, rootUri: pathToFileURL(root).toString(), initializationOptions: { phpVersion },
        } }));
        await output.waitFor((message) => message.id === 45);
        running.stdin.write(encode({ jsonrpc: '2.0', method: 'initialized', params: {} }));
        await output.waitFor((message) => message.method === 'window/logMessage' && message.params?.message?.includes('complete=true'));
        running.stdin.write(encode({ jsonrpc: '2.0', method: 'textDocument/didOpen', params: { textDocument: { uri, languageId: 'php', version: 1, text: source } } }));
        const diagnostics = (await output.waitFor((message) => message.method === 'textDocument/publishDiagnostics' && message.params.uri === uri)).params.diagnostics;
        const version = diagnostics.filter((item: { code?: string; message?: string }) => item.code === 'php.version.unsupported'
          && item.message?.includes('#[Deprecated]'));
        const invalid = diagnostics.filter((item: { code?: string }) => item.code === 'php.attribute.invalid-deprecated-target');
        expect(version).toHaveLength(expectedVersion);
        expect(invalid).toHaveLength(expectedInvalid);
        expect(diagnostics.some((item: { code?: string }) => item.code === 'php.syntax')).toBe(false);
        expect(version.some((item: { message?: string }) => item.message?.includes('trait requires PHP 8.5')))
          .toBe(phpVersion === '8.3' || phpVersion === '8.4');
        expect(diagnostics.some((item: { code?: string; message?: string }) => item.code === 'php.version.unsupported'
          && item.message?.startsWith('attribute requires PHP 8.0'))).toBe(phpVersion === '7.4');
        const expectedInvalidMessages = phpVersion === '8.4' || phpVersion === '8.5' ? [
          'Cannot apply #[Deprecated] to an anonymous class.',
          'Cannot apply #[Deprecated] to a class.',
          'Cannot apply #[Deprecated] to an enum.',
          'Cannot apply #[Deprecated] to an interface.',
          'Cannot apply #[Deprecated] to a parameter.',
          'Cannot apply #[Deprecated] to a property.',
        ] : [];
        if (phpVersion === '8.4') expectedInvalidMessages.push('Cannot apply #[Deprecated] to a class.');
        expect(invalid.map((item: { message?: string }) => item.message).sort()).toEqual(expectedInvalidMessages.sort());
        await new Promise<void>((resolveExit) => { running.once('exit', () => resolveExit()); running.kill(); }); server = undefined;
      }
    } finally { await rm(root, { recursive: true, force: true }); }
  });

  it('generates exact missing interface method stubs without duplicating inherited methods', async () => {
    const root = await mkdtemp(join(tmpdir(), 'php-companion-implement-methods-'));
    try {
      await mkdir(join(root, 'src'), { recursive: true });
      await writeFile(join(root, 'composer.json'), JSON.stringify({ autoload: { 'psr-4': { 'App\\': 'src/' } } }));
      await writeFile(join(root, 'src', 'Contract.php'), '<?php namespace App; interface Contract { public function run(int &$count, string ...$labels): void; }');
      await writeFile(join(root, 'src', 'Base.php'), "<?php namespace App; abstract class Base { abstract protected function reset(int $value = 0): int; public function label(string $prefix = ''): string { return $prefix; } final public function fixed(): void {} } final class Closed {}");
      await writeFile(join(root, 'src', 'User.php'), '<?php namespace App; class User { public function getName(): string {} private function hidden(): void {} }');
      await writeFile(join(root, 'src', 'PageController.php'), "<?php namespace App; class PageController { public function show(User $user): void { $this->render('site/page.html.twig', ['user' => $user]); } }");
      const uri = pathToFileURL(join(root, 'src', 'Worker.php')).toString();
      const source = '<?php namespace App; class Child extends Base {} class Bad implements Contract { public function run(string $count, string $label): string {} } class FinalOverride extends Base { public function reset(int $value = 0): int { return $value; } public function fixed(): void {} } class Impossible extends Closed {} class Worker implements Contract {\n    private string $name;\n    protected int $limit = 1;\n} function build(): void { $worker = new Worker(); }';
      await writeFile(join(root, 'src', 'Worker.php'), source);
      server = spawn(process.execPath, [resolve('dist/server.js'), '--stdio'], { stdio: 'pipe' });
      const output = messagesFrom(server);
      server.stdin.write(encode({ jsonrpc: '2.0', id: 40, method: 'initialize', params: { processId: null, capabilities: {}, rootUri: pathToFileURL(root).toString() } }));
      await output.waitFor((message) => message.id === 40);
      server.stdin.write(encode({ jsonrpc: '2.0', method: 'initialized', params: {} }));
      await output.waitFor((message) => message.method === 'window/logMessage' && message.params?.message?.includes('complete=true'));
      server.stdin.write(encode({ jsonrpc: '2.0', method: 'textDocument/didOpen', params: { textDocument: { uri, languageId: 'php', version: 1, text: source } } }));
      const diagnostics = await output.waitFor((message) => message.method === 'textDocument/publishDiagnostics' && message.params.uri === uri);
      expect(diagnostics.params.diagnostics).toContainEqual(expect.objectContaining({ code: 'php.interface.missing-method', message: 'App\\Worker must implement run.' }));
      expect(diagnostics.params.diagnostics).toContainEqual(expect.objectContaining({ code: 'php.class.missing-abstract-method', message: 'App\\Child must implement abstract reset.' }));
      expect(diagnostics.params.diagnostics).toContainEqual(expect.objectContaining({ code: 'php.method.incompatible-override', message: 'App\\Bad::run is incompatible with App\\Contract::run: it requires 2 parameter(s), inherited declaration requires 1.' }));
      expect(diagnostics.params.diagnostics).toContainEqual(expect.objectContaining({ code: 'php.method.incompatible-override', message: 'App\\FinalOverride::fixed is incompatible with App\\Base::fixed: a final method cannot be overridden.' }));
      expect(diagnostics.params.diagnostics).toContainEqual(expect.objectContaining({ code: 'php.inheritance.final-class', message: 'App\\Impossible cannot extend final class App\\Closed.' }));
      server.stdin.write(encode({ jsonrpc: '2.0', id: 47, method: 'phpCompanion/interop/contexts', params: { rootUri: pathToFileURL(root).toString() } }));
      const interop = (await output.waitFor((message) => message.id === 47)).result;
      expect(interop).toMatchObject({
        hello: { protocolVersion: 1, providerId: 'php-companion', capabilities: expect.arrayContaining(['controller-contexts', 'php-symbols', 'rename-prepare']) },
        contexts: [{ template: 'site/page.html.twig', complete: true, variables: [{ name: 'user', type: { kind: 'named', name: 'App\\User' }, sources: [expect.objectContaining({ uri: pathToFileURL(join(root, 'src', 'PageController.php')).toString(), start: expect.any(Number), end: expect.any(Number), line: expect.any(Number), character: expect.any(Number) })] }] }],
        types: { 'App\\User': { members: expect.arrayContaining([expect.objectContaining({ name: 'name', kind: 'property', type: { kind: 'primitive', name: 'string' } })]) } },
      });
      server.stdin.write(encode({ jsonrpc: '2.0', id: 41, method: 'textDocument/codeAction', params: { textDocument: { uri }, range: { start: { line: 0, character: source.indexOf('Worker') }, end: { line: 0, character: source.indexOf('Worker') + 6 } }, context: { diagnostics: [] } } }));
      const actions = (await output.waitFor((message) => message.id === 41)).result;
      const implementationAction = actions.find((action: { title?: string }) => action.title === 'Implement 1 interface method');
      expect(implementationAction).toMatchObject({ kind: 'refactor.rewrite' });
      expect(implementationAction.edit.changes[uri][0].newText).toContain("public function run(int &$count, string ...$labels): void\n    {\n        throw new \\LogicException('Not implemented.');");
      const constructorAction = actions.find((action: { title?: string }) => action.title === 'Generate constructor for 1 property');
      expect(constructorAction).toMatchObject({ kind: 'refactor.rewrite' });
      expect(constructorAction.edit.changes[uri][0].newText).toContain('public function __construct(string $name)\n    {\n        $this->name = $name;');
      const accessorAction = actions.find((action: { title?: string }) => action.title === 'Generate 2 property accessors');
      expect(accessorAction).toMatchObject({ kind: 'refactor.rewrite' });
      expect(accessorAction.edit.changes[uri][0].newText).toContain('public function getName(): string\n    {\n        return $this->name;');
      expect(accessorAction.edit.changes[uri][0].newText).toContain('public function setLimit(int $limit): void\n    {\n        $this->limit = $limit;');
      server.stdin.write(encode({ jsonrpc: '2.0', id: 46, method: 'textDocument/codeAction', params: { textDocument: { uri }, range: { start: { line: 0, character: source.indexOf('Child') }, end: { line: 0, character: source.indexOf('Child') + 5 } }, context: { diagnostics: [] } } }));
      const childActions = (await output.waitFor((message) => message.id === 46)).result;
      const abstractAction = childActions.find((action: { title?: string }) => action.title === 'Implement 1 abstract method');
      expect(abstractAction).toMatchObject({ kind: 'refactor.rewrite' });
      expect(abstractAction.edit.changes[uri][0].newText).toContain("protected function reset(int $value = 0): int\n    {\n        throw new \\LogicException('Not implemented.');");
      const overrideAction = childActions.find((action: { title?: string }) => action.title === 'Override App\\Base::label');
      expect(overrideAction).toMatchObject({ kind: 'refactor.rewrite' });
      expect(overrideAction.edit.changes[uri][0].newText).toContain("public function label(string $prefix = ''): string\n    {\n        return parent::label($prefix);");
      expect(childActions.some((action: { title?: string }) => action.title?.includes('fixed'))).toBe(false);
      server.stdin.write(encode({ jsonrpc: '2.0', id: 42, method: 'textDocument/prepareTypeHierarchy', params: { textDocument: { uri }, position: { line: 0, character: source.indexOf('Worker') + 2 } } }));
      const worker = (await output.waitFor((message) => message.id === 42)).result[0];
      expect(worker).toMatchObject({ name: 'Worker', detail: 'App\\Worker', data: { fqcn: 'App\\Worker' } });
      server.stdin.write(encode({ jsonrpc: '2.0', id: 43, method: 'typeHierarchy/supertypes', params: { item: worker } }));
      const contract = (await output.waitFor((message) => message.id === 43)).result[0];
      expect(contract).toMatchObject({ name: 'Contract', detail: 'App\\Contract' });
      server.stdin.write(encode({ jsonrpc: '2.0', id: 44, method: 'typeHierarchy/subtypes', params: { item: contract } }));
      expect((await output.waitFor((message) => message.id === 44)).result).toEqual(expect.arrayContaining([expect.objectContaining({ name: 'Worker', detail: 'App\\Worker' })]));
      server.stdin.write(encode({ jsonrpc: '2.0', id: 45, method: 'textDocument/inlayHint', params: { textDocument: { uri }, range: { start: { line: 0, character: 0 }, end: { line: 5, character: 100 } } } }));
      expect((await output.waitFor((message) => message.id === 45)).result).toMatchObject([{ label: ': Worker', kind: 1 }]);
    } finally { await rm(root, { recursive: true, force: true }); }
  });

  it('diagnoses and removes an independently unused import', async () => {
    const root = await mkdtemp(join(tmpdir(), 'php-companion-unused-import-'));
    try {
      await writeFile(join(root, 'composer.json'), JSON.stringify({ autoload: { 'psr-4': { 'App\\': './' } } }));
      const uri = pathToFileURL(join(root, 'Example.php')).toString();
      const source = "<?php\nnamespace App;\nuse Vendor\\Unused;\nfunction run(): void {}\n";
      await writeFile(join(root, 'Example.php'), source);
      server = spawn(process.execPath, [resolve('dist/server.js'), '--stdio'], { stdio: 'pipe' });
      const output = messagesFrom(server);
      server.stdin.write(encode({ jsonrpc: '2.0', id: 50, method: 'initialize', params: { processId: null, capabilities: {}, rootUri: pathToFileURL(root).toString() } }));
      await output.waitFor((message) => message.id === 50);
      server.stdin.write(encode({ jsonrpc: '2.0', method: 'initialized', params: {} }));
      server.stdin.write(encode({ jsonrpc: '2.0', method: 'textDocument/didOpen', params: { textDocument: { uri, languageId: 'php', version: 1, text: source } } }));
      const published = await output.waitFor((message) => message.method === 'textDocument/publishDiagnostics' && message.params.uri === uri
        && message.params.diagnostics.some((item: { code?: string }) => item.code === 'php.import.unused'));
      const diagnostic = published.params.diagnostics.find((item: { code?: string }) => item.code === 'php.import.unused');
      expect(diagnostic).toMatchObject({ message: 'Unused class import Unused.' });
      server.stdin.write(encode({ jsonrpc: '2.0', id: 51, method: 'textDocument/codeAction', params: { textDocument: { uri }, range: diagnostic.range, context: { diagnostics: [diagnostic] } } }));
      const actions = (await output.waitFor((message) => message.id === 51)).result;
      const removal = actions.find((action: { title?: string }) => action.title === 'Remove unused import');
      expect(removal).toMatchObject({ kind: 'quickfix', isPreferred: true });
      expect(removal.edit.changes[uri][0]).toMatchObject({ newText: '', range: { start: { line: 2, character: 0 }, end: { line: 3, character: 0 } } });
    } finally { await rm(root, { recursive: true, force: true }); }
  });

  it('offers a typed cross-file declaration only for proven dynamic-property values', async () => {
    const root = await mkdtemp(join(tmpdir(), 'php-companion-dynamic-property-fix-'));
    try {
      await mkdir(join(root, 'src'), { recursive: true });
      await writeFile(join(root, 'composer.json'), JSON.stringify({ autoload: { 'psr-4': { 'App\\': 'src/' } } }));
      const targetUri = pathToFileURL(join(root, 'src', 'Target.php')).toString();
      const targetSource = "<?php\nnamespace App;\nclass Target\n{\n}\nclass Result {}\n";
      await writeFile(join(root, 'src', 'Target.php'), targetSource);
      const uri = pathToFileURL(join(root, 'src', 'Consumer.php')).toString();
      const source = `<?php namespace App; function mutate(Target $target): void {
        $target->count = 1;
        $target->result = new Result();
        $target->unknown = build();
      }`;
      await writeFile(join(root, 'src', 'Consumer.php'), source);
      server = spawn(process.execPath, [resolve('dist/server.js'), '--stdio'], { stdio: 'pipe' });
      const output = messagesFrom(server);
      server.stdin.write(encode({ jsonrpc: '2.0', id: 52, method: 'initialize', params: { processId: null, capabilities: {}, rootUri: pathToFileURL(root).toString(), initializationOptions: { targetPhpVersion: '8.2' } } }));
      await output.waitFor((message) => message.id === 52);
      server.stdin.write(encode({ jsonrpc: '2.0', method: 'initialized', params: {} }));
      server.stdin.write(encode({ jsonrpc: '2.0', method: 'textDocument/didOpen', params: { textDocument: { uri, languageId: 'php', version: 1, text: source } } }));
      const published = await output.waitFor((message) => message.method === 'textDocument/publishDiagnostics' && message.params.uri === uri
        && message.params.diagnostics.filter((item: { code?: string }) => item.code === 'php.property.dynamic-deprecated').length === 3);
      const diagnostics = published.params.diagnostics.filter((item: { code?: string }) => item.code === 'php.property.dynamic-deprecated');
      const count = diagnostics.find((item: { range: { start: { line: number; character: number } } }) => source.slice(0, source.indexOf('count')).split('\n').length - 1 === item.range.start.line)!;
      server.stdin.write(encode({ jsonrpc: '2.0', id: 53, method: 'textDocument/codeAction', params: { textDocument: { uri }, range: count.range, context: { diagnostics: [count], only: ['quickfix'] } } }));
      const actions = (await output.waitFor((message) => message.id === 53)).result;
      const declaration = actions.find((action: { title?: string }) => action.title === 'Declare property $count in App\\Target');
      expect(declaration).toMatchObject({ kind: 'quickfix', isPreferred: true });
      expect(declaration.edit.changes[targetUri]).toEqual([expect.objectContaining({ newText: '    public int $count;\n' })]);

      const unknown = diagnostics.find((item: { range: { start: { line: number; character: number } } }) => item.range.start.line === source.slice(0, source.indexOf('unknown')).split('\n').length - 1)!;
      server.stdin.write(encode({ jsonrpc: '2.0', id: 54, method: 'textDocument/codeAction', params: { textDocument: { uri }, range: unknown.range, context: { diagnostics: [unknown], only: ['quickfix'] } } }));
      const unknownActions = (await output.waitFor((message) => message.id === 54)).result;
      expect(unknownActions.some((action: { title?: string }) => action.title?.startsWith('Declare property '))).toBe(false);
    } finally { await rm(root, { recursive: true, force: true }); }
  });

  it('makes PHP 8.4 parameter nullability explicit with one preferred edit', async () => {
    server = spawn(process.execPath, [resolve('dist/server.js'), '--stdio'], { stdio: 'pipe' });
    const output = messagesFrom(server);
    const uri = 'file:///ImplicitNullable.php';
    const source = '<?php function load(Service $service = null): void {}';
    server.stdin.write(encode({ jsonrpc: '2.0', id: 55, method: 'initialize', params: { processId: null, capabilities: {}, rootUri: null, initializationOptions: { targetPhpVersion: '8.4' } } }));
    await output.waitFor((message) => message.id === 55);
    server.stdin.write(encode({ jsonrpc: '2.0', method: 'initialized', params: {} }));
    server.stdin.write(encode({ jsonrpc: '2.0', method: 'textDocument/didOpen', params: { textDocument: { uri, languageId: 'php', version: 1, text: source } } }));
    const published = await output.waitFor((message) => message.method === 'textDocument/publishDiagnostics' && message.params.uri === uri
      && message.params.diagnostics.some((item: { code?: string }) => item.code === 'php.parameter.implicitly-nullable'));
    const diagnostic = published.params.diagnostics.find((item: { code?: string }) => item.code === 'php.parameter.implicitly-nullable');
    expect(diagnostic).toMatchObject({ severity: 2, message: 'Implicitly nullable parameter types are deprecated in PHP 8.4; declare null explicitly.' });
    server.stdin.write(encode({ jsonrpc: '2.0', id: 56, method: 'textDocument/codeAction', params: { textDocument: { uri }, range: diagnostic.range, context: { diagnostics: [diagnostic], only: ['quickfix'] } } }));
    const actions = (await output.waitFor((message) => message.id === 56)).result;
    const action = actions.find((item: { title?: string }) => item.title === 'Declare parameter type as explicitly nullable');
    expect(action).toMatchObject({ kind: 'quickfix', isPreferred: true });
    expect(action.edit.changes[uri]).toEqual([expect.objectContaining({ newText: '?Service' })]);
  });

  it('publishes unreachable diagnostics only after guaranteed native never calls', async () => {
    const root = await mkdtemp(join(tmpdir(), 'php-companion-never-flow-'));
    try {
      await writeFile(join(root, 'composer.json'), JSON.stringify({ autoload: { 'psr-4': { 'App\\\\': './' } } }));
      const uri = pathToFileURL(join(root, 'NeverFlow.php')).toString();
      const source = `<?php namespace App;
        class Allowed {} class Rejected {}
        function stop(Allowed $value): never { throw new \\Exception(); }
        /** @return never */ function documented(Allowed $value) { throw new \\Exception(); }
        function valid(Allowed $value): void { stop($value); unreachableAfterNever(); }
        function wrong(Rejected $value): void { stop($value); reachableAfterMismatch(); }
        function phpdoc(Allowed $value): void { documented($value); reachableAfterPhpDoc(); }
        function nested(Allowed $value): void { $result = stop($value); unreachableAfterNested(); }
        function argument(Allowed $value): void { consume(stop($value)); unreachableAfterArgument(); }
        function shortCircuit(Allowed $value): void { $value && stop($value); reachableAfterShortCircuit(); }
        function guaranteedLeft(Allowed $value): void { stop($value) && $value; unreachableAfterGuaranteedLeft(); }
        function condition(Allowed $value): void { if (stop($value)) {} unreachableAfterCondition(); }
        function conditionalCondition(Allowed $value): void { if ($value && stop($value)) {} reachableAfterConditionalCondition(); }`;
      await writeFile(join(root, 'NeverFlow.php'), source);
      server = spawn(process.execPath, [resolve('dist/server.js'), '--stdio'], { stdio: 'pipe' });
      const output = messagesFrom(server);
      server.stdin.write(encode({ jsonrpc: '2.0', id: 57, method: 'initialize', params: {
        processId: null, capabilities: {}, rootUri: pathToFileURL(root).toString(), initializationOptions: { targetPhpVersion: '8.1' },
      } }));
      await output.waitFor((message) => message.id === 57);
      server.stdin.write(encode({ jsonrpc: '2.0', method: 'initialized', params: {} }));
      server.stdin.write(encode({ jsonrpc: '2.0', method: 'textDocument/didOpen', params: { textDocument: { uri, languageId: 'php', version: 1, text: source } } }));
      const published = await output.waitFor((message) => message.method === 'textDocument/publishDiagnostics' && message.params.uri === uri
        && message.params.diagnostics.some((item: { code?: string }) => item.code === 'php.control-flow.unreachable'));
      const diagnostics = published.params.diagnostics.filter((item: { code?: string }) => item.code === 'php.control-flow.unreachable');
      expect(diagnostics.map((item: { range: any }) => source.slice(lspOffset(source, item.range.start), lspOffset(source, item.range.end))))
        .toEqual(['unreachableAfterNever();', 'unreachableAfterNested();', 'unreachableAfterArgument();', 'unreachableAfterGuaranteedLeft();',
          'unreachableAfterCondition();']);
    } finally { await rm(root, { recursive: true, force: true }); }
  });

  it('publishes native never fallthrough only for proven normal completion', async () => {
    server = spawn(process.execPath, [resolve('dist/server.js'), '--stdio'], { stdio: 'pipe' });
    const output = messagesFrom(server);
    const uri = 'file:///NeverDeclarations.php';
    const source = `<?php
      function emptyBody(): never {}
      function directThrow(): never { throw new Exception(); }
      function missingElse(bool $ready): never { if ($ready) { exit; } }
      function unknownCall(): never { work(); }
      function missingValue(): int {}
      function unknownValue(): int { work(); }
      abstract class Contract { abstract public function stop(): never; }
    `;
    server.stdin.write(encode({ jsonrpc: '2.0', id: 58, method: 'initialize', params: {
      processId: null, capabilities: {}, rootUri: null, initializationOptions: { phpVersion: '8.5' },
    } }));
    await output.waitFor((message) => message.id === 58);
    server.stdin.write(encode({ jsonrpc: '2.0', method: 'initialized', params: {} }));
    server.stdin.write(encode({ jsonrpc: '2.0', method: 'textDocument/didOpen', params: { textDocument: { uri, languageId: 'php', version: 1, text: source } } }));
    const published = await output.waitFor((message) => message.method === 'textDocument/publishDiagnostics' && message.params.uri === uri
      && message.params.diagnostics.some((item: { code?: string }) => item.code === 'php.never.fallthrough'));
    const diagnostics = published.params.diagnostics.filter((item: { code?: string }) => item.code === 'php.never.fallthrough');
    expect(diagnostics.map((item: { range: any }) => source.slice(lspOffset(source, item.range.start), lspOffset(source, item.range.end))))
      .toEqual(['emptyBody', 'missingElse']);
    const missingReturns = published.params.diagnostics.filter((item: { code?: string }) => item.code === 'php.return.missing');
    expect(missingReturns.map((item: { range: any }) => source.slice(lspOffset(source, item.range.start), lspOffset(source, item.range.end))))
      .toEqual(['missingValue']);
  });

  it('serves contextual closure parameter completion and definition from a unique PHPDoc callable', async () => {
    const root = await mkdtemp(join(tmpdir(), 'php-companion-contextual-callable-'));
    try {
      await mkdir(join(root, 'src'), { recursive: true });
      await writeFile(join(root, 'composer.json'), JSON.stringify({ autoload: { 'psr-4': { 'App\\': 'src/' } } }));
      const contractPath = join(root, 'src', 'Contract.php'); const consumerPath = join(root, 'src', 'Consumer.php');
      const contract = `<?php namespace App;
        class User { public function name(): string {} }
        class Other {}
        class View { public function title(): string {} }
        class ViewB { public function title(): string {} }
        function acceptOther(Other $other): void {}
        function fail(User $user): never { throw new \\RuntimeException(); }
        /** @return never */ function documentedFail(User $user) { throw new \\RuntimeException(); }
        /** @param callable(User): void $visit */ function visit(callable $visit): void {}`;
      const source = `<?php namespace App;
        visit(fn($user) => $user->name());
        visit(fn($user) => acceptOther($user));
        /** @param list<User> $users */
        function mapUsers(array $users): void {
          array_map(fn($user) => $user->na, $users);
          array_map(fn($user) => $user->name(), $users);
          array_map(fn($user) => acceptOther($user), $users);
          $views = array_map(fn($user) => new View(), $users);
          $views[0]->ti;
          $definedViews = array_map(fn($user) => new View(), $users);
          $definedViews[0]->title();
          $wrongViews = array_map(fn($user) => new View(), $users);
          acceptOther($wrongViews[0]);
          $closureViews = array_map(function($user) { return new View(); }, $users);
          $closureViews[0]->ti;
          $definedClosureViews = array_map(function($user) { return new View(); }, $users);
          $definedClosureViews[0]->title();
          $wrongClosureViews = array_map(function($user) { return new View(); }, $users);
          acceptOther($wrongClosureViews[0]);
          $conditionalViews = array_map(function($user) {
            if ($user->name()) { return new View(); }
            else { return new ViewB(); }
          }, $users);
          $conditionalViews[0]->ti;
          $definedConditionalViews = array_map(function($user) {
            if ($user->name()) { return new View(); }
            else { return new ViewB(); }
          }, $users);
          $definedConditionalViews[0]->title();
          $wrongConditionalViews = array_map(function($user) {
            if ($user->name()) { return new View(); }
            else { return new ViewB(); }
          }, $users);
          acceptOther($wrongConditionalViews[0]);
          $localViews = array_map(function($user) { $view = new View(); return $view; }, $users);
          $localViews[0]->ti;
          $definedLocalViews = array_map(function($user) { $view = new View(); return $view; }, $users);
          $definedLocalViews[0]->title();
          $wrongLocalViews = array_map(function($user) { $view = new View(); return $view; }, $users);
          acceptOther($wrongLocalViews[0]);
          $incompleteViews = array_map(function($user) { if ($user->name()) { return new View(); } }, $users);
          $incompleteViews[0]->ti;
          $earlyViews = array_map(function($user) { if ($user->name()) { return new ViewB(); } return new View(); }, $users);
          $earlyViews[0]->ti;
          $definedEarlyViews = array_map(function($user) { if ($user->name()) { return new ViewB(); } return new View(); }, $users);
          $definedEarlyViews[0]->title();
          $throwViews = array_map(function($user) { if ($user->name()) { return new ViewB(); } throw new \\RuntimeException(); }, $users);
          $throwViews[0]->ti;
          $definedThrowViews = array_map(function($user) { if ($user->name()) { return new ViewB(); } throw new \\RuntimeException(); }, $users);
          $definedThrowViews[0]->title();
          $exitViews = array_map(function($user) { if ($user->name()) { return new View(); } exit(1); }, $users);
          $exitViews[0]->ti;
          $neverViews = array_map(function($user) { if ($user->name()) { return new ViewB(); } fail($user); }, $users);
          $neverViews[0]->ti;
          $definedNeverViews = array_map(function($user) { if ($user->name()) { return new ViewB(); } fail($user); }, $users);
          $definedNeverViews[0]->title();
          $documentedNeverViews = array_map(function($user) { if ($user->name()) { return new View(); } documentedFail($user); }, $users);
          $documentedNeverViews[0]->ti;
        }`;
      await writeFile(contractPath, contract); await writeFile(consumerPath, source);
      const uri = pathToFileURL(consumerPath).toString();
      server = spawn(process.execPath, [resolve('dist/server.js'), '--stdio'], { stdio: 'pipe' });
      const output = messagesFrom(server);
      server.stdin.write(encode({ jsonrpc: '2.0', id: 59, method: 'initialize', params: {
        processId: null, capabilities: {}, rootUri: pathToFileURL(root).toString(),
      } }));
      await output.waitFor((message) => message.id === 59);
      server.stdin.write(encode({ jsonrpc: '2.0', method: 'initialized', params: {} }));
      await output.waitFor((message) => message.method === 'window/logMessage' && message.params?.message?.includes('complete=true'));
      server.stdin.write(encode({ jsonrpc: '2.0', method: 'textDocument/didOpen', params: {
        textDocument: { uri: pathToFileURL(contractPath).toString(), languageId: 'php', version: 1, text: contract },
      } }));
      server.stdin.write(encode({ jsonrpc: '2.0', method: 'textDocument/didOpen', params: {
        textDocument: { uri, languageId: 'php', version: 1, text: source },
      } }));
      const diagnostics = (await output.waitFor((message) => message.method === 'textDocument/publishDiagnostics' && message.params.uri === uri
        && message.params.diagnostics.some((item: { code?: string }) => item.code === 'php.argument.type-mismatch'), 10_000)).params.diagnostics;
      expect(diagnostics.filter((item: { code?: string }) => item.code === 'php.argument.type-mismatch')).toHaveLength(7);
      server.stdin.write(encode({ jsonrpc: '2.0', id: 62, method: 'textDocument/completion', params: {
        textDocument: { uri }, position: lspPosition(source, source.indexOf('name()') + 2),
      } }));
      expect((await output.waitFor((message) => message.id === 62)).result)
        .toContainEqual(expect.objectContaining({ label: 'name' }));
      server.stdin.write(encode({ jsonrpc: '2.0', id: 63, method: 'textDocument/definition', params: {
        textDocument: { uri }, position: lspPosition(source, source.indexOf('name()') + 2),
      } }));
      const definition = (await output.waitFor((message) => message.id === 63)).result;
      expect(definition).toMatchObject([{ uri: pathToFileURL(contractPath).toString() }]);
      const arrayMapCompletionOffset = source.indexOf('$user->na,') + '$user->na'.length;
      server.stdin.write(encode({ jsonrpc: '2.0', id: 64, method: 'textDocument/completion', params: {
        textDocument: { uri }, position: lspPosition(source, arrayMapCompletionOffset),
      } }));
      expect((await output.waitFor((message) => message.id === 64)).result)
        .toContainEqual(expect.objectContaining({ label: 'name' }));
      const arrayMapDefinitionOffset = source.lastIndexOf('name()') + 2;
      server.stdin.write(encode({ jsonrpc: '2.0', id: 65, method: 'textDocument/definition', params: {
        textDocument: { uri }, position: lspPosition(source, arrayMapDefinitionOffset),
      } }));
      expect((await output.waitFor((message) => message.id === 65)).result)
        .toMatchObject([{ uri: pathToFileURL(contractPath).toString() }]);
      const mappedCompletionOffset = source.indexOf('$views[0]->ti') + '$views[0]->ti'.length;
      server.stdin.write(encode({ jsonrpc: '2.0', id: 66, method: 'textDocument/completion', params: {
        textDocument: { uri }, position: lspPosition(source, mappedCompletionOffset),
      } }));
      expect((await output.waitFor((message) => message.id === 66)).result)
        .toContainEqual(expect.objectContaining({ label: 'title' }));
      const mappedDefinitionOffset = source.indexOf('title()') + 2;
      server.stdin.write(encode({ jsonrpc: '2.0', id: 67, method: 'textDocument/definition', params: {
        textDocument: { uri }, position: lspPosition(source, mappedDefinitionOffset),
      } }));
      expect((await output.waitFor((message) => message.id === 67)).result)
        .toMatchObject([{ uri: pathToFileURL(contractPath).toString() }]);
      const closureMappedCompletionOffset = source.indexOf('$closureViews[0]->ti') + '$closureViews[0]->ti'.length;
      server.stdin.write(encode({ jsonrpc: '2.0', id: 68, method: 'textDocument/completion', params: {
        textDocument: { uri }, position: lspPosition(source, closureMappedCompletionOffset),
      } }));
      expect((await output.waitFor((message) => message.id === 68)).result)
        .toContainEqual(expect.objectContaining({ label: 'title' }));
      const closureMappedDefinitionOffset = source.indexOf('$definedClosureViews[0]->title()')
        + '$definedClosureViews[0]->'.length + 2;
      server.stdin.write(encode({ jsonrpc: '2.0', id: 69, method: 'textDocument/definition', params: {
        textDocument: { uri }, position: lspPosition(source, closureMappedDefinitionOffset),
      } }));
      expect((await output.waitFor((message) => message.id === 69)).result)
        .toMatchObject([{ uri: pathToFileURL(contractPath).toString() }]);
      const conditionalCompletionOffset = source.indexOf('$conditionalViews[0]->ti') + '$conditionalViews[0]->ti'.length;
      server.stdin.write(encode({ jsonrpc: '2.0', id: 70, method: 'textDocument/completion', params: {
        textDocument: { uri }, position: lspPosition(source, conditionalCompletionOffset),
      } }));
      expect((await output.waitFor((message) => message.id === 70)).result)
        .toContainEqual(expect.objectContaining({ label: 'title' }));
      const conditionalDefinitionOffset = source.indexOf('$definedConditionalViews[0]->title()')
        + '$definedConditionalViews[0]->'.length + 2;
      server.stdin.write(encode({ jsonrpc: '2.0', id: 71, method: 'textDocument/definition', params: {
        textDocument: { uri }, position: lspPosition(source, conditionalDefinitionOffset),
      } }));
      const conditionalDefinitions = (await output.waitFor((message) => message.id === 71)).result;
      expect(conditionalDefinitions).toHaveLength(2);
      expect(conditionalDefinitions).toEqual(expect.arrayContaining([
        expect.objectContaining({ uri: pathToFileURL(contractPath).toString() }),
        expect.objectContaining({ uri: pathToFileURL(contractPath).toString() }),
      ]));
      const incompleteCompletionOffset = source.indexOf('$incompleteViews[0]->ti') + '$incompleteViews[0]->ti'.length;
      server.stdin.write(encode({ jsonrpc: '2.0', id: 72, method: 'textDocument/completion', params: {
        textDocument: { uri }, position: lspPosition(source, incompleteCompletionOffset),
      } }));
      expect((await output.waitFor((message) => message.id === 72)).result)
        .not.toContainEqual(expect.objectContaining({ label: 'title' }));
      const localCompletionOffset = source.indexOf('$localViews[0]->ti') + '$localViews[0]->ti'.length;
      server.stdin.write(encode({ jsonrpc: '2.0', id: 73, method: 'textDocument/completion', params: {
        textDocument: { uri }, position: lspPosition(source, localCompletionOffset),
      } }));
      expect((await output.waitFor((message) => message.id === 73)).result)
        .toContainEqual(expect.objectContaining({ label: 'title' }));
      const localDefinitionOffset = source.indexOf('$definedLocalViews[0]->title()')
        + '$definedLocalViews[0]->'.length + 2;
      server.stdin.write(encode({ jsonrpc: '2.0', id: 74, method: 'textDocument/definition', params: {
        textDocument: { uri }, position: lspPosition(source, localDefinitionOffset),
      } }));
      expect((await output.waitFor((message) => message.id === 74)).result)
        .toMatchObject([{ uri: pathToFileURL(contractPath).toString() }]);
      const earlyCompletionOffset = source.indexOf('$earlyViews[0]->ti') + '$earlyViews[0]->ti'.length;
      server.stdin.write(encode({ jsonrpc: '2.0', id: 75, method: 'textDocument/completion', params: {
        textDocument: { uri }, position: lspPosition(source, earlyCompletionOffset),
      } }));
      expect((await output.waitFor((message) => message.id === 75)).result)
        .toContainEqual(expect.objectContaining({ label: 'title' }));
      const earlyDefinitionOffset = source.indexOf('$definedEarlyViews[0]->title()')
        + '$definedEarlyViews[0]->'.length + 2;
      server.stdin.write(encode({ jsonrpc: '2.0', id: 76, method: 'textDocument/definition', params: {
        textDocument: { uri }, position: lspPosition(source, earlyDefinitionOffset),
      } }));
      expect((await output.waitFor((message) => message.id === 76)).result).toHaveLength(2);
      const throwCompletionOffset = source.indexOf('$throwViews[0]->ti') + '$throwViews[0]->ti'.length;
      server.stdin.write(encode({ jsonrpc: '2.0', id: 77, method: 'textDocument/completion', params: {
        textDocument: { uri }, position: lspPosition(source, throwCompletionOffset),
      } }));
      expect((await output.waitFor((message) => message.id === 77)).result)
        .toContainEqual(expect.objectContaining({ label: 'title' }));
      const throwDefinitionOffset = source.indexOf('$definedThrowViews[0]->title()')
        + '$definedThrowViews[0]->'.length + 2;
      server.stdin.write(encode({ jsonrpc: '2.0', id: 78, method: 'textDocument/definition', params: {
        textDocument: { uri }, position: lspPosition(source, throwDefinitionOffset),
      } }));
      expect((await output.waitFor((message) => message.id === 78)).result)
        .toMatchObject([{ uri: pathToFileURL(contractPath).toString() }]);
      const exitCompletionOffset = source.indexOf('$exitViews[0]->ti') + '$exitViews[0]->ti'.length;
      server.stdin.write(encode({ jsonrpc: '2.0', id: 79, method: 'textDocument/completion', params: {
        textDocument: { uri }, position: lspPosition(source, exitCompletionOffset),
      } }));
      expect((await output.waitFor((message) => message.id === 79)).result)
        .toContainEqual(expect.objectContaining({ label: 'title' }));
      const neverCompletionOffset = source.indexOf('$neverViews[0]->ti') + '$neverViews[0]->ti'.length;
      server.stdin.write(encode({ jsonrpc: '2.0', id: 80, method: 'textDocument/completion', params: {
        textDocument: { uri }, position: lspPosition(source, neverCompletionOffset),
      } }));
      expect((await output.waitFor((message) => message.id === 80)).result)
        .toContainEqual(expect.objectContaining({ label: 'title' }));
      const neverDefinitionOffset = source.indexOf('$definedNeverViews[0]->title()')
        + '$definedNeverViews[0]->'.length + 2;
      server.stdin.write(encode({ jsonrpc: '2.0', id: 81, method: 'textDocument/definition', params: {
        textDocument: { uri }, position: lspPosition(source, neverDefinitionOffset),
      } }));
      expect((await output.waitFor((message) => message.id === 81)).result)
        .toMatchObject([{ uri: pathToFileURL(contractPath).toString() }]);
      const documentedNeverOffset = source.indexOf('$documentedNeverViews[0]->ti') + '$documentedNeverViews[0]->ti'.length;
      server.stdin.write(encode({ jsonrpc: '2.0', id: 82, method: 'textDocument/completion', params: {
        textDocument: { uri }, position: lspPosition(source, documentedNeverOffset),
      } }));
      expect((await output.waitFor((message) => message.id === 82)).result)
        .not.toContainEqual(expect.objectContaining({ label: 'title' }));
    } finally { await rm(root, { recursive: true, force: true }); }
  }, 15_000);

  it('serves contextual closure returns across try catch and finally flow', async () => {
    const root = await mkdtemp(join(tmpdir(), 'php-companion-contextual-try-'));
    try {
      await mkdir(join(root, 'src'), { recursive: true });
      await writeFile(join(root, 'composer.json'), JSON.stringify({ autoload: { 'psr-4': { 'App\\': 'src/' } } }));
      const contractPath = join(root, 'src', 'Contract.php'); const consumerPath = join(root, 'src', 'Consumer.php');
      const contract = `<?php namespace App;
        class User {}
        class View { public function title(): string {} }
        class ViewB { public function title(): string {} }`;
      const source = `<?php namespace App;
        /** @param list<User> $users */
        function mapUsers(array $users): void {
          $tryViews = array_map(function($user) { try { return new View(); } catch (\\RuntimeException $error) { return new ViewB(); } }, $users);
          $tryViews[0]->ti;
          $definedTryViews = array_map(function($user) { try { return new View(); } catch (\\RuntimeException $error) { return new ViewB(); } }, $users);
          $definedTryViews[0]->title();
          $finallyViews = array_map(function($user) { try { return new View(); } finally { return new ViewB(); } }, $users);
          $finallyViews[0]->ti;
          $incompleteTryViews = array_map(function($user) { try { return new View(); } catch (\\RuntimeException $error) { consume($error); } }, $users);
          $incompleteTryViews[0]->ti;
        }`;
      await writeFile(contractPath, contract); await writeFile(consumerPath, source);
      const uri = pathToFileURL(consumerPath).toString();
      server = spawn(process.execPath, [resolve('dist/server.js'), '--stdio'], { stdio: 'pipe' });
      const output = messagesFrom(server);
      server.stdin.write(encode({ jsonrpc: '2.0', id: 83, method: 'initialize', params: {
        processId: null, capabilities: {}, rootUri: pathToFileURL(root).toString(),
      } }));
      await output.waitFor((message) => message.id === 83);
      server.stdin.write(encode({ jsonrpc: '2.0', method: 'initialized', params: {} }));
      await output.waitFor((message) => message.method === 'window/logMessage' && message.params?.message?.includes('complete=true'));
      server.stdin.write(encode({ jsonrpc: '2.0', method: 'textDocument/didOpen', params: {
        textDocument: { uri: pathToFileURL(contractPath).toString(), languageId: 'php', version: 1, text: contract },
      } }));
      server.stdin.write(encode({ jsonrpc: '2.0', method: 'textDocument/didOpen', params: {
        textDocument: { uri, languageId: 'php', version: 1, text: source },
      } }));
      const tryCompletionOffset = source.indexOf('$tryViews[0]->ti') + '$tryViews[0]->ti'.length;
      server.stdin.write(encode({ jsonrpc: '2.0', id: 84, method: 'textDocument/completion', params: {
        textDocument: { uri }, position: lspPosition(source, tryCompletionOffset),
      } }));
      expect((await output.waitFor((message) => message.id === 84)).result)
        .toContainEqual(expect.objectContaining({ label: 'title' }));
      const tryDefinitionOffset = source.indexOf('$definedTryViews[0]->title()')
        + '$definedTryViews[0]->'.length + 2;
      server.stdin.write(encode({ jsonrpc: '2.0', id: 85, method: 'textDocument/definition', params: {
        textDocument: { uri }, position: lspPosition(source, tryDefinitionOffset),
      } }));
      expect((await output.waitFor((message) => message.id === 85)).result).toHaveLength(2);
      const finallyCompletionOffset = source.indexOf('$finallyViews[0]->ti') + '$finallyViews[0]->ti'.length;
      server.stdin.write(encode({ jsonrpc: '2.0', id: 86, method: 'textDocument/completion', params: {
        textDocument: { uri }, position: lspPosition(source, finallyCompletionOffset),
      } }));
      expect((await output.waitFor((message) => message.id === 86)).result)
        .toContainEqual(expect.objectContaining({ label: 'title' }));
      const incompleteTryOffset = source.indexOf('$incompleteTryViews[0]->ti') + '$incompleteTryViews[0]->ti'.length;
      server.stdin.write(encode({ jsonrpc: '2.0', id: 87, method: 'textDocument/completion', params: {
        textDocument: { uri }, position: lspPosition(source, incompleteTryOffset),
      } }));
      expect((await output.waitFor((message) => message.id === 87)).result)
        .not.toContainEqual(expect.objectContaining({ label: 'title' }));
    } finally { await rm(root, { recursive: true, force: true }); }
  }, 15_000);

  it('serves contextual closure returns across complete switch flow', async () => {
    const root = await mkdtemp(join(tmpdir(), 'php-companion-contextual-switch-'));
    try {
      await mkdir(join(root, 'src'), { recursive: true });
      await writeFile(join(root, 'composer.json'), JSON.stringify({ autoload: { 'psr-4': { 'App\\': 'src/' } } }));
      const contractPath = join(root, 'src', 'Contract.php'); const consumerPath = join(root, 'src', 'Consumer.php');
      const contract = `<?php namespace App;
        class User { public function active(): bool {} }
        class View { public function title(): string {} }
        class ViewB { public function title(): string {} }`;
      const source = `<?php namespace App;
        /** @param list<User> $users */
        function mapUsers(array $users): void {
          $switchViews = array_map(function($user) {
            switch ($user->active()) { case true: return new View(); default: return new ViewB(); }
          }, $users);
          $switchViews[0]->ti;
          $definedSwitchViews = array_map(function($user) {
            switch ($user->active()) { case true: return new View(); default: return new ViewB(); }
          }, $users);
          $definedSwitchViews[0]->title();
          $breakThenFinalSwitchViews = array_map(function($user) {
            switch ($user->active()) { case true: return new View(); default: break; }
            return new ViewB();
          }, $users);
          $breakThenFinalSwitchViews[0]->ti;
          $breakSwitchViews = array_map(function($user) {
            switch ($user->active()) { case true: return new View(); default: break; }
          }, $users);
          $breakSwitchViews[0]->ti;
        }`;
      await writeFile(contractPath, contract); await writeFile(consumerPath, source);
      const uri = pathToFileURL(consumerPath).toString();
      server = spawn(process.execPath, [resolve('dist/server.js'), '--stdio'], { stdio: 'pipe' });
      const output = messagesFrom(server);
      server.stdin.write(encode({ jsonrpc: '2.0', id: 88, method: 'initialize', params: {
        processId: null, capabilities: {}, rootUri: pathToFileURL(root).toString(),
      } }));
      await output.waitFor((message) => message.id === 88);
      server.stdin.write(encode({ jsonrpc: '2.0', method: 'initialized', params: {} }));
      await output.waitFor((message) => message.method === 'window/logMessage' && message.params?.message?.includes('complete=true'));
      server.stdin.write(encode({ jsonrpc: '2.0', method: 'textDocument/didOpen', params: {
        textDocument: { uri: pathToFileURL(contractPath).toString(), languageId: 'php', version: 1, text: contract },
      } }));
      server.stdin.write(encode({ jsonrpc: '2.0', method: 'textDocument/didOpen', params: {
        textDocument: { uri, languageId: 'php', version: 1, text: source },
      } }));
      const completionOffset = source.indexOf('$switchViews[0]->ti') + '$switchViews[0]->ti'.length;
      server.stdin.write(encode({ jsonrpc: '2.0', id: 89, method: 'textDocument/completion', params: {
        textDocument: { uri }, position: lspPosition(source, completionOffset),
      } }));
      expect((await output.waitFor((message) => message.id === 89)).result)
        .toContainEqual(expect.objectContaining({ label: 'title' }));
      const definitionOffset = source.indexOf('$definedSwitchViews[0]->title()')
        + '$definedSwitchViews[0]->'.length + 2;
      server.stdin.write(encode({ jsonrpc: '2.0', id: 90, method: 'textDocument/definition', params: {
        textDocument: { uri }, position: lspPosition(source, definitionOffset),
      } }));
      expect((await output.waitFor((message) => message.id === 90)).result).toHaveLength(2);
      const breakThenFinalOffset = source.indexOf('$breakThenFinalSwitchViews[0]->ti')
        + '$breakThenFinalSwitchViews[0]->ti'.length;
      server.stdin.write(encode({ jsonrpc: '2.0', id: 92, method: 'textDocument/completion', params: {
        textDocument: { uri }, position: lspPosition(source, breakThenFinalOffset),
      } }));
      expect((await output.waitFor((message) => message.id === 92)).result)
        .toContainEqual(expect.objectContaining({ label: 'title' }));
      const breakOffset = source.indexOf('$breakSwitchViews[0]->ti') + '$breakSwitchViews[0]->ti'.length;
      server.stdin.write(encode({ jsonrpc: '2.0', id: 91, method: 'textDocument/completion', params: {
        textDocument: { uri }, position: lspPosition(source, breakOffset),
      } }));
      expect((await output.waitFor((message) => message.id === 91)).result)
        .not.toContainEqual(expect.objectContaining({ label: 'title' }));
    } finally { await rm(root, { recursive: true, force: true }); }
  });

  it('serves contextual closure returns across bounded loop flow', async () => {
    const root = await mkdtemp(join(tmpdir(), 'php-companion-contextual-loop-'));
    try {
      await mkdir(join(root, 'src'), { recursive: true });
      await writeFile(join(root, 'composer.json'), JSON.stringify({ autoload: { 'psr-4': { 'App\\': 'src/' } } }));
      const contractPath = join(root, 'src', 'Contract.php'); const consumerPath = join(root, 'src', 'Consumer.php');
      const contract = `<?php namespace App;
        class User { public function active(): bool {} }
        class View { public function title(): string {} }
        class ViewB { public function title(): string {} }`;
      const source = `<?php namespace App;
        /** @param list<User> $users */
        function mapUsers(array $users): void {
          $loopViews = array_map(function($user) {
            while ($user->active()) { return new View(); }
            return new ViewB();
          }, $users);
          $loopViews[0]->ti;
          $definedLoopViews = array_map(function($user) {
            while ($user->active()) { return new View(); }
            return new ViewB();
          }, $users);
          $definedLoopViews[0]->title();
          $foreachViews = array_map(function($user) {
            foreach ([new User()] as $item) { return new View(); }
          }, $users);
          $foreachViews[0]->ti;
          $breakLoopViews = array_map(function($user) {
            while ($user->active()) { break; }
            return new ViewB();
          }, $users);
          $breakLoopViews[0]->ti;
          $nestedBreakLoopViews = array_map(function($user) {
            while ($user->active()) {
              if ($user->active()) { break; }
              return new View();
            }
            return new ViewB();
          }, $users);
          $nestedBreakLoopViews[0]->ti;
        }`;
      await writeFile(contractPath, contract); await writeFile(consumerPath, source);
      const uri = pathToFileURL(consumerPath).toString();
      server = spawn(process.execPath, [resolve('dist/server.js'), '--stdio'], { stdio: 'pipe' });
      const output = messagesFrom(server);
      server.stdin.write(encode({ jsonrpc: '2.0', id: 93, method: 'initialize', params: {
        processId: null, capabilities: {}, rootUri: pathToFileURL(root).toString(),
      } }));
      await output.waitFor((message) => message.id === 93);
      server.stdin.write(encode({ jsonrpc: '2.0', method: 'initialized', params: {} }));
      await output.waitFor((message) => message.method === 'window/logMessage' && message.params?.message?.includes('complete=true'));
      server.stdin.write(encode({ jsonrpc: '2.0', method: 'textDocument/didOpen', params: {
        textDocument: { uri: pathToFileURL(contractPath).toString(), languageId: 'php', version: 1, text: contract },
      } }));
      server.stdin.write(encode({ jsonrpc: '2.0', method: 'textDocument/didOpen', params: {
        textDocument: { uri, languageId: 'php', version: 1, text: source },
      } }));
      const completionOffset = source.indexOf('$loopViews[0]->ti') + '$loopViews[0]->ti'.length;
      server.stdin.write(encode({ jsonrpc: '2.0', id: 94, method: 'textDocument/completion', params: {
        textDocument: { uri }, position: lspPosition(source, completionOffset),
      } }));
      expect((await output.waitFor((message) => message.id === 94)).result)
        .toContainEqual(expect.objectContaining({ label: 'title' }));
      const definitionOffset = source.indexOf('$definedLoopViews[0]->title()')
        + '$definedLoopViews[0]->'.length + 2;
      server.stdin.write(encode({ jsonrpc: '2.0', id: 95, method: 'textDocument/definition', params: {
        textDocument: { uri }, position: lspPosition(source, definitionOffset),
      } }));
      expect((await output.waitFor((message) => message.id === 95)).result).toHaveLength(2);
      const foreachOffset = source.indexOf('$foreachViews[0]->ti') + '$foreachViews[0]->ti'.length;
      server.stdin.write(encode({ jsonrpc: '2.0', id: 96, method: 'textDocument/completion', params: {
        textDocument: { uri }, position: lspPosition(source, foreachOffset),
      } }));
      expect((await output.waitFor((message) => message.id === 96)).result)
        .toContainEqual(expect.objectContaining({ label: 'title' }));
      const breakOffset = source.indexOf('$breakLoopViews[0]->ti') + '$breakLoopViews[0]->ti'.length;
      server.stdin.write(encode({ jsonrpc: '2.0', id: 97, method: 'textDocument/completion', params: {
        textDocument: { uri }, position: lspPosition(source, breakOffset),
      } }));
      expect((await output.waitFor((message) => message.id === 97)).result)
        .toContainEqual(expect.objectContaining({ label: 'title' }));
      const nestedBreakOffset = source.indexOf('$nestedBreakLoopViews[0]->ti') + '$nestedBreakLoopViews[0]->ti'.length;
      server.stdin.write(encode({ jsonrpc: '2.0', id: 98, method: 'textDocument/completion', params: {
        textDocument: { uri }, position: lspPosition(source, nestedBreakOffset),
      } }));
      expect((await output.waitFor((message) => message.id === 98)).result)
        .not.toContainEqual(expect.objectContaining({ label: 'title' }));
    } finally { await rm(root, { recursive: true, force: true }); }
  });

  it('serves conservative local type unions after optional loop iterations', async () => {
    const root = await mkdtemp(join(tmpdir(), 'php-companion-optional-loop-values-'));
    try {
      await mkdir(join(root, 'src'), { recursive: true });
      await writeFile(join(root, 'composer.json'), JSON.stringify({ autoload: { 'psr-4': { 'App\\': 'src/' } } }));
      const contractPath = join(root, 'src', 'Contract.php'); const consumerPath = join(root, 'src', 'Consumer.php');
      const contract = `<?php namespace App;
        class Before { public function title(): string {} }
        class Iterated { public function title(): string {} }
        class Other {}
        function reject(Other $value): void {}`;
      const source = `<?php namespace App;
        function consume(bool $again): void {
          $whileValue = new Before();
          while ($again) { $whileValue = new Iterated(); }
          $whileValue->ti;
          $definedWhile = new Before();
          while ($again) { $definedWhile = new Iterated(); }
          $definedWhile->title();
          $wrongWhile = new Before();
          while ($again) { $wrongWhile = new Iterated(); }
          reject($wrongWhile);
        }`;
      await writeFile(contractPath, contract); await writeFile(consumerPath, source);
      const uri = pathToFileURL(consumerPath).toString();
      server = spawn(process.execPath, [resolve('dist/server.js'), '--stdio'], { stdio: 'pipe' });
      const output = messagesFrom(server);
      server.stdin.write(encode({ jsonrpc: '2.0', id: 99, method: 'initialize', params: {
        processId: null, capabilities: {}, rootUri: pathToFileURL(root).toString(),
      } }));
      await output.waitFor((message) => message.id === 99);
      server.stdin.write(encode({ jsonrpc: '2.0', method: 'initialized', params: {} }));
      await output.waitFor((message) => message.method === 'window/logMessage' && message.params?.message?.includes('complete=true'));
      server.stdin.write(encode({ jsonrpc: '2.0', method: 'textDocument/didOpen', params: {
        textDocument: { uri: pathToFileURL(contractPath).toString(), languageId: 'php', version: 1, text: contract },
      } }));
      server.stdin.write(encode({ jsonrpc: '2.0', method: 'textDocument/didOpen', params: {
        textDocument: { uri, languageId: 'php', version: 1, text: source },
      } }));
      const diagnostics = await output.waitFor((message) => message.method === 'textDocument/publishDiagnostics'
        && message.params.uri === uri);
      expect(diagnostics.params.diagnostics.filter((item: { code?: string }) => item.code === 'php.argument.type-mismatch')).toHaveLength(1);
      const completionOffset = source.indexOf('$whileValue->ti') + '$whileValue->ti'.length;
      server.stdin.write(encode({ jsonrpc: '2.0', id: 100, method: 'textDocument/completion', params: {
        textDocument: { uri }, position: lspPosition(source, completionOffset),
      } }));
      expect((await output.waitFor((message) => message.id === 100)).result)
        .toContainEqual(expect.objectContaining({ label: 'title' }));
      const definitionOffset = source.indexOf('$definedWhile->title()') + '$definedWhile->'.length + 2;
      server.stdin.write(encode({ jsonrpc: '2.0', id: 103, method: 'textDocument/definition', params: {
        textDocument: { uri }, position: lspPosition(source, definitionOffset),
      } }));
      expect((await output.waitFor((message) => message.id === 103)).result).toHaveLength(2);
    } finally { await rm(root, { recursive: true, force: true }); }
  });

  it('serves optional for and foreach unions while rejecting self-dependent loops', async () => {
    const root = await mkdtemp(join(tmpdir(), 'php-companion-optional-for-foreach-'));
    try {
      await mkdir(join(root, 'src'), { recursive: true });
      await writeFile(join(root, 'composer.json'), JSON.stringify({ autoload: { 'psr-4': { 'App\\': 'src/' } } }));
      const contractPath = join(root, 'src', 'Contract.php'); const consumerPath = join(root, 'src', 'Consumer.php');
      const contract = `<?php namespace App;
        class Before { public function title(): string {} }
        class Iterated { public function title(): string {} }`;
      const source = `<?php namespace App;
        /** @param list<int> $items */
        function consume(bool $again, int $limit, array $items): void {
          $forValue = new Before();
          for ($index = 0; $index < $limit; $index++) { $forValue = new Iterated(); }
          $forValue->ti;
          $foreachValue = new Before();
          foreach ($items as $item) { $foreachValue = new Iterated(); }
          $foreachValue->ti;
          $unsafe = new Before();
          while ($again) { $unsafe = choose($unsafe); }
          $unsafe->ti;
        }`;
      await writeFile(contractPath, contract); await writeFile(consumerPath, source);
      const uri = pathToFileURL(consumerPath).toString();
      server = spawn(process.execPath, [resolve('dist/server.js'), '--stdio'], { stdio: 'pipe' });
      const output = messagesFrom(server);
      server.stdin.write(encode({ jsonrpc: '2.0', id: 105, method: 'initialize', params: {
        processId: null, capabilities: {}, rootUri: pathToFileURL(root).toString(),
      } }));
      await output.waitFor((message) => message.id === 105);
      server.stdin.write(encode({ jsonrpc: '2.0', method: 'initialized', params: {} }));
      await output.waitFor((message) => message.method === 'window/logMessage' && message.params?.message?.includes('complete=true'));
      server.stdin.write(encode({ jsonrpc: '2.0', method: 'textDocument/didOpen', params: {
        textDocument: { uri: pathToFileURL(contractPath).toString(), languageId: 'php', version: 1, text: contract },
      } }));
      server.stdin.write(encode({ jsonrpc: '2.0', method: 'textDocument/didOpen', params: {
        textDocument: { uri, languageId: 'php', version: 1, text: source },
      } }));
      for (const [id, marker] of [[106, '$forValue->ti'], [107, '$foreachValue->ti']] as const) {
        const offset = source.indexOf(marker) + marker.length;
        server.stdin.write(encode({ jsonrpc: '2.0', id, method: 'textDocument/completion', params: {
          textDocument: { uri }, position: lspPosition(source, offset),
        } }));
        expect((await output.waitFor((message) => message.id === id)).result)
          .toContainEqual(expect.objectContaining({ label: 'title' }));
      }
      const unsafeOffset = source.indexOf('$unsafe->ti') + '$unsafe->ti'.length;
      server.stdin.write(encode({ jsonrpc: '2.0', id: 108, method: 'textDocument/completion', params: {
        textDocument: { uri }, position: lspPosition(source, unsafeOffset),
      } }));
      expect((await output.waitFor((message) => message.id === 108)).result)
        .not.toContainEqual(expect.objectContaining({ label: 'title' }));
    } finally { await rm(root, { recursive: true, force: true }); }
  });

  it('serves deterministic namespace-aware type completion ordering', async () => {
    const root = await mkdtemp(join(tmpdir(), 'php-companion-ranked-types-'));
    try {
      await mkdir(join(root, 'src', 'Controller', 'Admin'), { recursive: true });
      await mkdir(join(root, 'src', 'Controller'), { recursive: true });
      await mkdir(join(root, 'vendor-src'), { recursive: true });
      await writeFile(join(root, 'composer.json'), JSON.stringify({ autoload: { 'psr-4': { 'App\\': 'src/', 'Vendor\\': 'vendor-src/' } } }));
      await writeFile(join(root, 'src', 'Controller', 'Admin', 'RankedLocal.php'), '<?php namespace App\\Controller\\Admin; class RankedLocal {}');
      await writeFile(join(root, 'src', 'Controller', 'RankedNear.php'), '<?php namespace App\\Controller; class RankedNear {}');
      await writeFile(join(root, 'src', 'RankedMid.php'), '<?php namespace App; class RankedMid {}');
      await writeFile(join(root, 'vendor-src', 'RankedFar.php'), '<?php namespace Vendor; class RankedFar {}');
      await writeFile(join(root, 'vendor-src', 'Imported.php'), '<?php namespace Vendor; class Imported {}');
      const consumerPath = join(root, 'src', 'Controller', 'Admin', 'Consumer.php');
      const source = '<?php namespace App\\Controller\\Admin; use Vendor\\Imported as RankedImported; function consume(): void { new Ranked; }';
      await writeFile(consumerPath, source); const uri = pathToFileURL(consumerPath).toString();
      server = spawn(process.execPath, [resolve('dist/server.js'), '--stdio'], { stdio: 'pipe' });
      const output = messagesFrom(server);
      server.stdin.write(encode({ jsonrpc: '2.0', id: 109, method: 'initialize', params: {
        processId: null, capabilities: {}, rootUri: pathToFileURL(root).toString(),
      } }));
      await output.waitFor((message) => message.id === 109);
      server.stdin.write(encode({ jsonrpc: '2.0', method: 'initialized', params: {} }));
      await output.waitFor((message) => message.method === 'window/logMessage' && message.params?.message?.includes('complete=true'));
      server.stdin.write(encode({ jsonrpc: '2.0', method: 'textDocument/didOpen', params: {
        textDocument: { uri, languageId: 'php', version: 1, text: source },
      } }));
      const offset = source.indexOf('Ranked;') + 'Ranked'.length;
      server.stdin.write(encode({ jsonrpc: '2.0', id: 110, method: 'textDocument/completion', params: {
        textDocument: { uri }, position: lspPosition(source, offset),
      } }));
      const result = (await output.waitFor((message) => message.id === 110)).result as Array<{ label: string; detail: string; sortText?: string; additionalTextEdits?: unknown[] }>;
      expect(result.map((item) => item.detail)).toEqual([
        'App\\Controller\\Admin\\RankedLocal',
        'Vendor\\Imported',
        'App\\Controller\\RankedNear',
        'App\\RankedMid',
        'Vendor\\RankedFar',
      ]);
      expect(result.map((item) => item.sortText)).toEqual(['2000000', '2000001', '2000002', '2000003', '2000004']);
      expect(result.map((item) => Boolean(item.additionalTextEdits))).toEqual([false, false, true, true, true]);
    } finally { await rm(root, { recursive: true, force: true }); }
  });

  it('preserves semantic function and constant completion ranking with stable sortText', async () => {
    const root = await mkdtemp(join(tmpdir(), 'php-companion-ranked-symbols-'));
    try {
      await mkdir(join(root, 'src', 'Controller', 'Admin'), { recursive: true });
      await mkdir(join(root, 'src', 'Controller'), { recursive: true });
      await mkdir(join(root, 'vendor-src'), { recursive: true });
      await writeFile(join(root, 'composer.json'), JSON.stringify({ autoload: { 'psr-4': { 'RankedLsp\\': 'src/', 'Vendor\\': 'vendor-src/' } } }));
      await writeFile(join(root, 'src', 'Controller', 'Admin', 'Local.php'), '<?php namespace RankedLsp\\Controller\\Admin; function ranked_lsp_function_local(): void {} const RANKED_LSP_CONSTANT_LOCAL = 1;');
      await writeFile(join(root, 'src', 'Controller', 'Near.php'), '<?php namespace RankedLsp\\Controller; function ranked_lsp_function_near(): void {} const RANKED_LSP_CONSTANT_NEAR = 1;');
      await writeFile(join(root, 'src', 'Mid.php'), '<?php namespace RankedLsp; function ranked_lsp_function_mid(): void {} const RANKED_LSP_CONSTANT_MID = 1;');
      await writeFile(join(root, 'src', 'Global.php'), '<?php function ranked_lsp_function_global(): void {} const RANKED_LSP_CONSTANT_GLOBAL = 1;');
      await writeFile(join(root, 'vendor-src', 'Far.php'), '<?php namespace Vendor\\Symbols; function ranked_lsp_function_far(): void {} function imported_function(): void {} const RANKED_LSP_CONSTANT_FAR = 1; const IMPORTED_CONSTANT = 1;');
      const consumerPath = join(root, 'src', 'Controller', 'Admin', 'Consumer.php');
      const source = `<?php namespace RankedLsp\\Controller\\Admin;
use function Vendor\\Symbols\\imported_function as ranked_lsp_function_imported;
use const Vendor\\Symbols\\IMPORTED_CONSTANT as RANKED_LSP_CONSTANT_IMPORTED;
ranked_lsp_function;
echo RANKED_LSP_CONSTANT;`;
      await writeFile(consumerPath, source); const uri = pathToFileURL(consumerPath).toString();
      server = spawn(process.execPath, [resolve('dist/server.js'), '--stdio'], { stdio: 'pipe' });
      const output = messagesFrom(server);
      server.stdin.write(encode({ jsonrpc: '2.0', id: 111, method: 'initialize', params: {
        processId: null, capabilities: {}, rootUri: pathToFileURL(root).toString(),
      } }));
      await output.waitFor((message) => message.id === 111);
      server.stdin.write(encode({ jsonrpc: '2.0', method: 'initialized', params: {} }));
      await output.waitFor((message) => message.method === 'window/logMessage' && message.params?.message?.includes('complete=true'));
      server.stdin.write(encode({ jsonrpc: '2.0', method: 'textDocument/didOpen', params: {
        textDocument: { uri, languageId: 'php', version: 1, text: source },
      } }));
      const functionOffset = source.indexOf('ranked_lsp_function;') + 'ranked_lsp_function'.length;
      server.stdin.write(encode({ jsonrpc: '2.0', id: 112, method: 'textDocument/completion', params: {
        textDocument: { uri }, position: lspPosition(source, functionOffset),
      } }));
      const functions = (await output.waitFor((message) => message.id === 112)).result as Array<{ label: string; detail: string; sortText?: string; additionalTextEdits?: unknown[] }>;
      expect(functions.map((item) => item.label)).toEqual([
        'ranked_lsp_function_local',
        'ranked_lsp_function_imported',
        'ranked_lsp_function_global',
        'ranked_lsp_function_near',
        'ranked_lsp_function_mid',
        'ranked_lsp_function_far',
      ]);
      expect(functions.map((item) => item.sortText)).toEqual(['0000000', '0000001', '0000002', '0000003', '0000004', '0000005']);
      expect(functions.map((item) => Boolean(item.additionalTextEdits))).toEqual([false, false, false, true, true, true]);
      const constantOffset = source.indexOf('RANKED_LSP_CONSTANT;') + 'RANKED_LSP_CONSTANT'.length;
      server.stdin.write(encode({ jsonrpc: '2.0', id: 113, method: 'textDocument/completion', params: {
        textDocument: { uri }, position: lspPosition(source, constantOffset),
      } }));
      const constants = (await output.waitFor((message) => message.id === 113)).result as Array<{ label: string; detail: string; sortText?: string; additionalTextEdits?: unknown[] }>;
      expect(constants.map((item) => item.label)).toEqual([
        'RANKED_LSP_CONSTANT_LOCAL',
        'RANKED_LSP_CONSTANT_IMPORTED',
        'RANKED_LSP_CONSTANT_GLOBAL',
        'RANKED_LSP_CONSTANT_NEAR',
        'RANKED_LSP_CONSTANT_MID',
        'RANKED_LSP_CONSTANT_FAR',
      ]);
      expect(constants.map((item) => item.sortText)).toEqual(['1000000', '1000001', '1000002', '1000003', '1000004', '1000005']);
      expect(constants.map((item) => Boolean(item.additionalTextEdits))).toEqual([false, false, false, true, true, true]);
    } finally { await rm(root, { recursive: true, force: true }); }
  });

  it('loads an explicitly configured semantic provider through the isolated process host', async () => {
    const root = await mkdtemp(join(tmpdir(), 'php-companion-provider-'));
    try {
      await writeFile(join(root, 'composer.json'), JSON.stringify({ autoload: { 'psr-4': { 'App\\': './' } } }));
      await writeFile(join(root, 'Service.php'), '<?php namespace App; class Service {}');
      const uri = pathToFileURL(join(root, 'Consumer.php')).toString();
      const source = '<?php namespace App; function consume(Service $service): void { $service->plug; }';
      await writeFile(join(root, 'Consumer.php'), source);
      const provider = join(root, 'provider.mjs');
      await writeFile(provider, `let input=''; for await (const part of process.stdin) input+=part; const request=JSON.parse(input); process.stdout.write(JSON.stringify({protocolVersion:1,id:request.id,result:{schema:1,providerId:'vendor.test',generation:request.params.generation,complete:true,methods:[{ownerFqcn:'App\\\\Service',name:'pluginMethod',returnType:'string',uri:request.params.rootUri,start:0,end:1}],properties:[],literalMethodReturns:[]}}));`);
      server = spawn(process.execPath, [resolve('dist/server.js'), '--stdio'], { stdio: 'pipe' });
      const output = messagesFrom(server);
      server.stdin.write(encode({ jsonrpc: '2.0', id: 60, method: 'initialize', params: {
        processId: null, capabilities: {}, rootUri: pathToFileURL(root).toString(),
        initializationOptions: { semanticProviders: [{ providerId: 'vendor.test', command: process.execPath, args: [provider], timeoutMs: 1000 }] },
      } }));
      await output.waitFor((message) => message.id === 60);
      server.stdin.write(encode({ jsonrpc: '2.0', method: 'initialized', params: {} }));
      await output.waitFor((message) => message.method === 'window/logMessage' && message.params?.message?.includes('vendor.test committed'));
      server.stdin.write(encode({ jsonrpc: '2.0', method: 'textDocument/didOpen', params: { textDocument: { uri, languageId: 'php', version: 1, text: source } } }));
      await output.waitFor((message) => message.method === 'textDocument/publishDiagnostics' && message.params.uri === uri);
      server.stdin.write(encode({ jsonrpc: '2.0', id: 61, method: 'textDocument/completion', params: { textDocument: { uri }, position: lspPosition(source, source.indexOf('plug') + 4) } }));
      expect((await output.waitFor((message) => message.id === 61)).result).toContainEqual(expect.objectContaining({ label: 'pluginMethod' }));
    } finally { await rm(root, { recursive: true, force: true }); }
  });

  it('serves PHP 8.5 pipe result completion and definition through stdio', async () => {
    const root = await mkdtemp(join(tmpdir(), 'php-companion-pipe-'));
    try {
      const source = `<?php namespace PipeLsp;
class Input {}
class Middle {}
class Output { public function outputOnly(): void {} }
function toMiddle(Input $value): Middle {}
function toOutput(Middle $value): Output {}
function wrong(string $value): Output {}
function run(Input $input): void {
  $result = $input |> toMiddle(...) |> toOutput(...);
  $result->outputOnly();
  $invalid = $input |> wrong(...);
  $invalid->outputOnly();
}`;
      const path = join(root, 'Pipe.php'); const uri = pathToFileURL(path).toString();
      await writeFile(join(root, 'composer.json'), JSON.stringify({ require: { php: '>=8.5' }, autoload: { classmap: ['./Pipe.php'] } }));
      await writeFile(path, source);
      server = spawn(process.execPath, [resolve('dist/server.js'), '--stdio'], { stdio: 'pipe' });
      const output = messagesFrom(server);
      server.stdin.write(encode({ jsonrpc: '2.0', id: 201, method: 'initialize', params: {
        processId: null, capabilities: {}, rootUri: pathToFileURL(root).toString(),
      } }));
      await output.waitFor((message) => message.id === 201);
      server.stdin.write(encode({ jsonrpc: '2.0', method: 'initialized', params: {} }));
      await output.waitFor((message) => message.method === 'window/logMessage' && message.params?.message?.includes('complete=true'));
      server.stdin.write(encode({ jsonrpc: '2.0', method: 'textDocument/didOpen', params: {
        textDocument: { uri, languageId: 'php', version: 1, text: source },
      } }));
      await output.waitFor((message) => message.method === 'textDocument/publishDiagnostics' && message.params?.uri === uri);
      const memberStart = source.indexOf('outputOnly();', source.indexOf('$result->'));
      const memberEnd = memberStart + 'outputOnly'.length;
      server.stdin.write(encode({ jsonrpc: '2.0', id: 202, method: 'textDocument/completion', params: {
        textDocument: { uri }, position: lspPosition(source, memberEnd),
      } }));
      expect((await output.waitFor((message) => message.id === 202)).result)
        .toContainEqual(expect.objectContaining({ label: 'outputOnly' }));
      server.stdin.write(encode({ jsonrpc: '2.0', id: 203, method: 'textDocument/definition', params: {
        textDocument: { uri }, position: lspPosition(source, memberStart + 2),
      } }));
      const definitions = (await output.waitFor((message) => message.id === 203)).result;
      expect(definitions).toHaveLength(1);
      expect(lspOffset(source, definitions[0].range.start)).toBe(source.indexOf('outputOnly():'));
      const invalidMember = source.indexOf('outputOnly();', source.indexOf('$invalid->'));
      server.stdin.write(encode({ jsonrpc: '2.0', id: 204, method: 'textDocument/definition', params: {
        textDocument: { uri }, position: lspPosition(source, invalidMember + 2),
      } }));
      expect((await output.waitFor((message) => message.id === 204)).result).toEqual([]);
    } finally { await rm(root, { recursive: true, force: true }); }
  });
  it('serves proven PHP 8.5 clone-with result completion and definition through stdio', async () => {
    const root = await mkdtemp(join(tmpdir(), 'php-companion-clone-with-'));
    try {
      const source = `<?php namespace CloneLsp;
class Value { public string $name; public function valueOnly(): void {} }
function run(Value $value, Value|null $nullable): void {
  $copy = clone($value, ['name' => 'next']);
  $copy->valueOnly();
  $unknown = clone($nullable, []);
  $unknown->valueOnly();
}`;
      const path = join(root, 'Clone.php'); const uri = pathToFileURL(path).toString();
      await writeFile(join(root, 'composer.json'), JSON.stringify({ require: { php: '>=8.5' }, autoload: { classmap: ['./Clone.php'] } }));
      await writeFile(path, source);
      server = spawn(process.execPath, [resolve('dist/server.js'), '--stdio'], { stdio: 'pipe' });
      const output = messagesFrom(server);
      server.stdin.write(encode({ jsonrpc: '2.0', id: 205, method: 'initialize', params: {
        processId: null, capabilities: {}, rootUri: pathToFileURL(root).toString(),
      } }));
      await output.waitFor((message) => message.id === 205);
      server.stdin.write(encode({ jsonrpc: '2.0', method: 'initialized', params: {} }));
      await output.waitFor((message) => message.method === 'window/logMessage' && message.params?.message?.includes('complete=true'));
      server.stdin.write(encode({ jsonrpc: '2.0', method: 'textDocument/didOpen', params: {
        textDocument: { uri, languageId: 'php', version: 1, text: source },
      } }));
      await output.waitFor((message) => message.method === 'textDocument/publishDiagnostics' && message.params?.uri === uri);
      const memberStart = source.indexOf('valueOnly();', source.indexOf('$copy->'));
      server.stdin.write(encode({ jsonrpc: '2.0', id: 206, method: 'textDocument/completion', params: {
        textDocument: { uri }, position: lspPosition(source, memberStart + 'valueOnly'.length),
      } }));
      expect((await output.waitFor((message) => message.id === 206)).result)
        .toContainEqual(expect.objectContaining({ label: 'valueOnly' }));
      server.stdin.write(encode({ jsonrpc: '2.0', id: 207, method: 'textDocument/definition', params: {
        textDocument: { uri }, position: lspPosition(source, memberStart + 2),
      } }));
      const definitions = (await output.waitFor((message) => message.id === 207)).result;
      expect(definitions).toHaveLength(1);
      expect(lspOffset(source, definitions[0].range.start)).toBe(source.indexOf('valueOnly():'));
      const unknownMember = source.indexOf('valueOnly();', source.indexOf('$unknown->'));
      server.stdin.write(encode({ jsonrpc: '2.0', id: 208, method: 'textDocument/definition', params: {
        textDocument: { uri }, position: lspPosition(source, unknownMember + 2),
      } }));
      expect((await output.waitFor((message) => message.id === 208)).result).toEqual([]);
    } finally { await rm(root, { recursive: true, force: true }); }
  });
  it('serves proven PHP 8.3 dynamic class constant definition and type diagnostics through stdio', async () => {
    const root = await mkdtemp(join(tmpdir(), 'php-companion-dynamic-class-constant-'));
    try {
      const source = `<?php declare(strict_types=1); namespace DynamicConstantLsp;
class Flags { public const OK = 1; public const LABEL = 'bad'; }
function acceptInt(int $value): void {}
function run(string $input): void {
  $name = 'OK'; acceptInt(Flags::{$name});
  $bad = 'LABEL'; acceptInt(Flags::{$bad});
  $changed = 'OK'; $changed = $input; acceptInt(Flags::{$changed});
}`;
      const path = join(root, 'DynamicConstant.php'); const uri = pathToFileURL(path).toString();
      await writeFile(join(root, 'composer.json'), JSON.stringify({ require: { php: '>=8.3' }, autoload: { classmap: ['./DynamicConstant.php'] } }));
      await writeFile(path, source);
      server = spawn(process.execPath, [resolve('dist/server.js'), '--stdio'], { stdio: 'pipe' });
      const output = messagesFrom(server);
      server.stdin.write(encode({ jsonrpc: '2.0', id: 209, method: 'initialize', params: {
        processId: null, capabilities: {}, rootUri: pathToFileURL(root).toString(),
      } }));
      await output.waitFor((message) => message.id === 209);
      server.stdin.write(encode({ jsonrpc: '2.0', method: 'initialized', params: {} }));
      await output.waitFor((message) => message.method === 'window/logMessage' && message.params?.message?.includes('complete=true'));
      server.stdin.write(encode({ jsonrpc: '2.0', method: 'textDocument/didOpen', params: {
        textDocument: { uri, languageId: 'php', version: 1, text: source },
      } }));
      const diagnostics = (await output.waitFor((message) => message.method === 'textDocument/publishDiagnostics'
        && message.params?.uri === uri && message.params.diagnostics.some((item: { code?: string }) => item.code === 'php.argument.type-mismatch'))).params.diagnostics;
      expect(diagnostics.filter((item: { code?: string }) => item.code === 'php.argument.type-mismatch')).toHaveLength(1);
      expect(diagnostics.find((item: { code?: string }) => item.code === 'php.argument.type-mismatch')?.message).toContain("'bad'");
      const proven = source.indexOf('$name}');
      server.stdin.write(encode({ jsonrpc: '2.0', id: 210, method: 'textDocument/definition', params: {
        textDocument: { uri }, position: lspPosition(source, proven + 2),
      } }));
      const definitions = (await output.waitFor((message) => message.id === 210)).result;
      expect(definitions).toHaveLength(1);
      expect(lspOffset(source, definitions[0].range.start)).toBe(source.indexOf('OK = 1'));
      const changed = source.indexOf('$changed}');
      server.stdin.write(encode({ jsonrpc: '2.0', id: 211, method: 'textDocument/definition', params: {
        textDocument: { uri }, position: lspPosition(source, changed + 2),
      } }));
      expect((await output.waitFor((message) => message.id === 211)).result).toEqual([]);
    } finally { await rm(root, { recursive: true, force: true }); }
  });
});
