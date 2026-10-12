import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { once } from 'node:events';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { expect, it } from 'vitest';
import { encodeLspMessage, LspMessageDecoder } from '../../testkit/src/index.js';

const runtime = resolve('../../dist');
function clientFor(server: ChildProcessWithoutNullStreams): {
  send: (message: object) => void; request: (method: string, params: unknown) => Promise<any>; messages: any[];
} {
  const messages: any[] = [], decoder = new LspMessageDecoder();
  const pending = new Map<number, { resolve: (value: any) => void; reject: (error: Error) => void; timer: ReturnType<typeof setTimeout> }>();
  let id = 0;
  const send = (message: object): void => { server.stdin.write(encodeLspMessage({ jsonrpc: '2.0', ...message })); };
  server.stdout.on('data', chunk => {
    for (const message of decoder.push(chunk) as any[]) {
      messages.push(message);
      if (message.method && message.id !== undefined) send({ id: message.id, result: null });
      const waiter = pending.get(message.id);
      if (waiter && !message.method) {
        clearTimeout(waiter.timer); pending.delete(message.id);
        if (message.error) waiter.reject(new Error(JSON.stringify(message.error))); else waiter.resolve(message.result);
      }
    }
  });
  server.on('exit', (code, signal) => {
    for (const waiter of pending.values()) { clearTimeout(waiter.timer); waiter.reject(new Error(`LSP exited ${code}/${signal}`)); }
    pending.clear();
  });
  return { send, messages, request: (method, params) => new Promise((resolveRequest, reject) => {
    const requestId = ++id;
    const timer = setTimeout(() => { pending.delete(requestId); reject(new Error(`${method} timed out`)); }, 15_000);
    pending.set(requestId, { resolve: resolveRequest, reject, timer }); send({ id: requestId, method, params });
  }) };
}

const position = (source: string, offset: number): { line: number; character: number } => {
  const lines = source.slice(0, offset).split('\n');
  return { line: lines.length - 1, character: lines.at(-1)!.length };
};
async function fixture(phpVersion: string, indexingMode: string): Promise<{
  root: string; server: ChildProcessWithoutNullStreams; client: ReturnType<typeof clientFor>; stop: () => Promise<void>;
}> {
  const root = await mkdtemp(join(tmpdir(), 'sophp-service-definition-'));
  await mkdir(join(root, 'src')); await mkdir(join(root, 'config'));
  await writeFile(join(root, 'composer.json'), JSON.stringify({ autoload: { 'psr-4': { 'App\\': 'src/' } } }));
  await writeFile(join(root, 'src', 'Mailer.php'), '<?php namespace App; class Mailer {}');
  await writeFile(join(root, 'src', 'Consumer.php'), '<?php namespace App; class Consumer { public function run(): void {} }');
  const config = 'parameters:\n  app.mode: test\nservices:\n  app.mailer: { class: App\\Mailer }\n  App\\Mailer: { alias: app.mailer }\n';
  await writeFile(join(root, 'config', 'services.yaml'), `imports:\n  - { resource: extra.php }\n${config}`);
  await writeFile(join(root, 'config', 'extra.php'), '<?php return [];');
  const server = spawn(process.execPath, [join(runtime, 'language-server.js'), '--stdio',
    '--parser-core-wasm', join(runtime, 'web-tree-sitter.wasm'), '--php-wasm', join(runtime, 'tree-sitter-php.wasm')], { stdio: 'pipe' });
  const exited = once(server, 'exit'), client = clientFor(server);
  let stderr = ''; server.stderr.on('data', chunk => { stderr += chunk.toString(); });
  const stop = async (): Promise<void> => {
    try {
      if (server.exitCode === null && server.signalCode === null) {
        await client.request('shutdown', null); client.send({ method: 'exit', params: {} });
        expect((await exited)[0], stderr).toBe(0);
      }
      expect(stderr).toBe('');
    } finally {
      if (server.exitCode === null && server.signalCode === null) { server.kill(); await exited; }
      await rm(root, { recursive: true, force: true });
    }
  };
  try {
    await client.request('initialize', { processId: null, rootUri: pathToFileURL(root).toString(), capabilities: {},
      initializationOptions: { phpVersion, indexingMode, bundledSemanticProviders: [{
        providerId: 'php-companion.symfony.services', command: process.execPath,
        args: [resolve('../provider-symfony-services/dist/cli.js'), '--parser-core-wasm', join(runtime, 'web-tree-sitter.wasm'), '--php-wasm', join(runtime, 'tree-sitter-php.wasm')],
        requiresProjectTypes: true, acceptsDocumentSnapshots: true, replacesContainerServices: true, timeoutMs: 10_000,
      }] } });
    client.send({ method: 'initialized', params: {} });
    return { root, server, client, stop };
  } catch (error) { await stop(); throw error; }
}

it.each(['7.2', '8.5'])('ordinary PHP definition positions keep onDemand lazy at PHP %s', async phpVersion => {
  const { root, client, stop } = await fixture(phpVersion, 'onDemand');
  try {
    const source = `<?php namespace App;
class Subject { public function work(): string { return 'work'; } }
function run(Subject $item): void { $item->work(); }`;
    const uri = pathToFileURL(join(root, 'src', 'Subject.php')).toString();
    await writeFile(join(root, 'src', 'Subject.php'), source);
    for (const offset of [source.indexOf('Subject') + 2, source.indexOf('run(') + 1, source.lastIndexOf('work()') + 2]) {
      expect(await client.request('phpCompanion/symfonyServiceDefinition', {
        textDocument: { uri, version: 1 }, source, position: position(source, offset),
      })).toEqual([]);
      expect(client.messages.filter(message => message.method === 'window/logMessage' && /\[index:\d+\] start /u.test(message.params.message))).toEqual([]);
    }
    client.send({ method: 'textDocument/didOpen', params: { textDocument: { uri, languageId: 'php', version: 1, text: source } } });
    const offset = source.lastIndexOf('work()') + 2;
    expect(await client.request('textDocument/definition', { textDocument: { uri }, position: position(source, offset) }))
      .toEqual([{ uri, range: { start: position(source, source.indexOf('work()')), end: position(source, source.indexOf('work()') + 4) } }]);
    expect(client.messages.filter(message => message.method === 'window/logMessage' && /\[index:\d+\] start /u.test(message.params.message))).toEqual([]);
  } finally { await stop(); }
});

it.each(['7.2', '8.5'].flatMap(phpVersion => ['onDemand', 'progressive'].map(indexingMode => ({ phpVersion, indexingMode }))))(
  'retains service strings, class IDs, parameters and new unsaved attributes at PHP $phpVersion in $indexingMode', async ({ phpVersion, indexingMode }) => {
    const { root, client, stop } = await fixture(phpVersion, indexingMode);
    try {
      const source = `<?php
use Symfony\\Component\\DependencyInjection\\Loader\\Configurator\\ContainerConfigurator;
use function Symfony\\Component\\DependencyInjection\\Loader\\Configurator\\service;
use function Symfony\\Component\\DependencyInjection\\Loader\\Configurator\\param;
use App\\Mailer;
return static function (ContainerConfigurator $container): void {
  $services = $container->services();
  $services->set('app.consumer', Mailer::class)->arg('$mailer', service('app.mailer'));
  $services->alias('app.alias', Mailer::class);
  $services->get('app.consumer')->arg('$mode', param('app.mode'));
};`;
      const path = join(root, 'config', 'extra.php'), uri = pathToFileURL(path).toString();
      await writeFile(path, source);
      client.send({ method: 'workspace/didChangeWatchedFiles', params: { changes: [{ uri, type: 2 }] } });
      const yamlPath = join(root, 'config', 'services.yaml'), yamlUri = pathToFileURL(yamlPath).toString(), yaml = await readFile(yamlPath, 'utf8');
      const target = (id: string): object[] => [{ uri: yamlUri, range: {
        start: position(yaml, yaml.indexOf(`${id}:`)), end: position(yaml, yaml.indexOf(`${id}:`) + id.length),
      } }];
      const definition = (documentUri: string, text: string, offset: number, version = 1): Promise<any> => client.request('phpCompanion/symfonyServiceDefinition', {
        textDocument: { uri: documentUri, version }, source: text, position: position(text, offset),
      });
      expect(await definition(uri, source, source.indexOf("service('app.mailer')") + 13), JSON.stringify(client.messages.filter(message => message.method === 'window/logMessage'))).toEqual(target('app.mailer'));
      const classStart = source.lastIndexOf('Mailer::class');
      expect(await definition(uri, source, classStart)).toEqual(target('App\\Mailer'));
      expect(await definition(uri, source, classStart + 'Mailer'.length)).toEqual(target('App\\Mailer'));
      expect(await definition(uri, source, source.indexOf("param('app.mode')") + 10)).toEqual(target('app.mode'));
      const initial = '<?php namespace App; class Consumer { public function run(): void {} }';
      const consumerUri = pathToFileURL(join(root, 'src', 'Consumer.php')).toString();
      await writeFile(join(root, 'src', 'Consumer.php'), initial);
      const published = async (version: number): Promise<void> => {
        const deadline = Date.now() + 15_000;
        while (!client.messages.some(message => message.method === 'textDocument/publishDiagnostics'
          && message.params.uri === consumerUri && message.params.version === version)) {
          if (Date.now() > deadline) throw new Error(`Consumer diagnostics version ${version} did not publish`);
          await new Promise(done => setTimeout(done, 10));
        }
      };
      const containerCommitted = async (after: number): Promise<void> => {
        const deadline = Date.now() + 15_000;
        while (!client.messages.slice(after).some(message => message.method === 'window/logMessage'
          && message.params.message.includes('committed authoritative container generation'))) {
          if (Date.now() > deadline) throw new Error('Edited container facts did not commit');
          await new Promise(done => setTimeout(done, 10));
        }
      };
      client.send({ method: 'textDocument/didOpen', params: { textDocument: { uri: consumerUri, languageId: 'php', version: 1, text: initial } } });
      await published(1);
      const edited = `<?php namespace App;
use Symfony\\Component\\DependencyInjection\\Attribute\\Autowire;
class Consumer { public function __construct(#[Autowire(service: "app.mailer")] object $mailer) {} }`;
      const beforeEdit = client.messages.length;
      client.send({ method: 'textDocument/didChange', params: { textDocument: { uri: consumerUri, version: 2 }, contentChanges: [{ text: edited }] } });
      await published(2);
      await containerCommitted(beforeEdit);
      expect(await definition(consumerUri, edited, edited.indexOf('app.mailer') + 4, 2), JSON.stringify(client.messages.filter(message => message.method === 'window/logMessage'))).toEqual(target('app.mailer'));
      const incomplete = edited + '\nfunction unfinished(';
      client.send({ method: 'textDocument/didChange', params: { textDocument: { uri: consumerUri, version: 3 }, contentChanges: [{ text: incomplete }] } });
      await published(3);
      expect(await definition(consumerUri, incomplete, incomplete.indexOf('app.mailer') + 4, 3)).toEqual(target('app.mailer'));
      expect(await readFile(join(root, 'src', 'Consumer.php'), 'utf8')).toBe(initial);
      expect(await readFile(path, 'utf8')).toBe(source);
    } finally { await stop(); }
  },
);
