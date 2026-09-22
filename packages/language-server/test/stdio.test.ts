import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { dirname, join, resolve, sep } from 'node:path';
import { copyFile, mkdtemp, mkdir, readFile, readdir, rename, rm, symlink, utimes, writeFile } from 'node:fs/promises';
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

const symfonyServiceProviderDescriptor = {
  providerId: 'php-companion.symfony.services',
  command: process.execPath,
  args: [
    resolve('../provider-symfony-services/dist/cli.js'),
    '--parser-core-wasm', resolve('../parser/node_modules/web-tree-sitter/web-tree-sitter.wasm'),
    '--php-wasm', resolve('../parser/node_modules/tree-sitter-php/tree-sitter-php.wasm'),
  ],
  timeoutMs: 10_000,
  requiresProjectTypes: true,
  acceptsDocumentSnapshots: true,
  replacesContainerServices: true,
} as const;

const symfonyEventProviderDescriptor = {
  providerId: 'php-companion.symfony.events',
  command: process.execPath,
  args: [
    resolve('../provider-symfony-events/dist/cli.js'),
    '--parser-core-wasm', resolve('../parser/node_modules/web-tree-sitter/web-tree-sitter.wasm'),
    '--php-wasm', resolve('../parser/node_modules/tree-sitter-php/tree-sitter-php.wasm'),
  ],
  timeoutMs: 10_000,
  requiresProjectTypes: true,
  requiresContainerServices: true,
  acceptsDocumentSnapshots: true,
  replacesEventRelations: true,
} as const;

const symfonyStaticRouteProviderDescriptor = {
  providerId: 'php-companion.symfony.static-routes',
  command: process.execPath,
  args: [
    resolve('../provider-symfony-routes/dist/cli.js'),
    '--parser-core-wasm', resolve('../parser/node_modules/web-tree-sitter/web-tree-sitter.wasm'),
    '--php-wasm', resolve('../parser/node_modules/tree-sitter-php/tree-sitter-php.wasm'),
  ],
  timeoutMs: 10_000,
  replacesStaticRoutes: true,
} as const;

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
        const timer = setTimeout(() => reject(new Error(`Timed out waiting for language server response; logs: ${JSON.stringify(messages.filter((message) => message.method === 'window/logMessage').slice(-12))}; recent messages: ${JSON.stringify(messages.slice(-5))}`)), timeoutMs);
        waiters.push({ predicate, resolve: (message) => { clearTimeout(timer); resolvePromise(message); } });
      });
    },
  };
}

describe('language server stdio', () => {
  let server: ChildProcessWithoutNullStreams | undefined;
  afterEach(() => server?.kill());

  it.skipIf(!process.env.PHP_COMPANION_TEST_REFERENCE_BUNDLE)('restores proven references across processes and rejects changed query inputs', async () => {
    const root = await mkdtemp(join(tmpdir(), 'php-companion-persistent-references-'));
    try {
      const bundle = resolve(process.env.PHP_COMPANION_TEST_REFERENCE_BUNDLE!);
      const src = join(root, 'src'); await mkdir(src);
      await writeFile(join(root, 'composer.json'), JSON.stringify({ autoload: { 'psr-4': { 'App\\': 'src/' } } }));
      const dependency = join(root, 'vendor', 'acme', 'lib', 'src'); await mkdir(dependency, { recursive: true });
      await mkdir(join(root, 'vendor', 'composer'));
      await writeFile(join(root, 'composer.lock'), JSON.stringify({ packages: [{ name: 'acme/lib', autoload: { 'psr-4': { 'Lib\\': ['missing/', 'src/'] } } }] }));
      await writeFile(join(root, 'vendor', 'composer', 'installed.json'), JSON.stringify({ packages: [{ name: 'acme/lib', install_path: '../acme/lib' }] }));
      const declaration = '<?php namespace Lib; class Target { public function get(): int { return 1; } }';
      const source = '<?php namespace App; use Lib\\Target; function run(Target $target): int { return $target->get(); }';
      const other = source.replace('function run(', 'function second(');
      await writeFile(join(dependency, 'Target.php'), declaration); await writeFile(join(src, 'Use.php'), source);
      await writeFile(join(src, 'Other.php'), other);
      const uri = pathToFileURL(join(src, 'Use.php')).toString();
      const location = (name: string, text: string): { uri: string; range: { start: ReturnType<typeof lspPosition>; end: ReturnType<typeof lspPosition> } } => ({ uri: pathToFileURL(join(src, name)).toString(),
        range: { start: lspPosition(text, text.lastIndexOf('get(')), end: lspPosition(text, text.lastIndexOf('get(') + 3) } });
      const expected = [location('Use.php', source), location('Other.php', other)];
      let runCount = 0;
      const run = async (expectedLocations: unknown[], restored: boolean, options: { text?: string; includeDeclaration?: boolean;
        provider?: boolean; repeat?: boolean; prewarmed?: boolean; selectionPrewarm?: boolean; semanticPrewarmed?: boolean } = {}): Promise<void> => {
        const currentRun = ++runCount;
        server = spawn(process.execPath, [bundle, '--stdio', '--parser-core-wasm', join(dirname(bundle), 'web-tree-sitter.wasm'),
          '--php-wasm', join(dirname(bundle), 'tree-sitter-php.wasm')], { stdio: 'pipe' });
        const output = messagesFrom(server); let id = 0;
        const request = async (method: string, params: unknown): Promise<any> => {
          const requestId = ++id; server!.stdin.write(encode({ jsonrpc: '2.0', id: requestId, method, params }));
          const response = await output.waitFor((message) => message.id === requestId, 10_000);
          expect(response.error).toBeUndefined(); return response.result;
        };
        await request('initialize', { processId: null, capabilities: {}, rootUri: pathToFileURL(root).toString(),
          initializationOptions: { indexingMode: 'onDemand', cacheDirectory: join(root, '.cache'), testMode: true,
            ...(options.provider ? { bundledSemanticProviders: [symfonyServiceProviderDescriptor] } : {}) } });
        server.stdin.write(encode({ jsonrpc: '2.0', method: 'initialized', params: {} }));
        const text = options.text ?? source;
        server.stdin.write(encode({ jsonrpc: '2.0', method: 'textDocument/didOpen', params: {
          textDocument: { uri, languageId: 'php', version: 1, text },
        } }));
        if (options.selectionPrewarm) server.stdin.write(encode({ jsonrpc: '2.0', method: 'phpCompanion/prewarmReferenceAt', params: {
          uri, version: 1, position: lspPosition(text, text.lastIndexOf('get(') + 1),
        } }));
        if (options.prewarmed) {
          try {
            await output.waitFor((message) => message.method === 'window/logMessage'
              && message.params?.message?.includes('[reference-prewarm] ready'), 10_000);
          } catch (error) { throw new Error(`Reference prewarm failed in run ${currentRun}: ${String(error)}`); }
        }
        if (options.semanticPrewarmed) await output.waitFor((message) => message.method === 'window/logMessage'
          && message.params?.message?.includes('[reference-prewarm] semantic count='), 10_000);
        const params = { textDocument: { uri }, position: lspPosition(text, text.lastIndexOf('get(') + 1),
          context: { includeDeclaration: options.includeDeclaration ?? false } };
        const sorted = (locations: any[]): any[] => locations.sort((a, b) => a.uri.localeCompare(b.uri));
        expect(sorted(await request('textDocument/references', params))).toEqual(sorted([...expectedLocations]));
        const logs = (): string => output.messages.filter((message: any) => message.method === 'window/logMessage').map((message: any) => message.params.message).join('\n');
        expect(logs().includes('[reference-cache] restored')).toBe(restored);
        expect(logs().includes('[named-candidates]')).toBe(!restored || Boolean(options.provider));
        if (options.prewarmed) expect(logs().match(/\[named-candidates\]/g)).toHaveLength(1);
        if (options.repeat) expect(sorted(await request('textDocument/references', params))).toEqual(sorted([...expectedLocations]));
        await request('phpCompanion/testWaitReferencePersistence', {});
        if (!restored) expect(logs()).toContain('[reference-cache] stored');
        await request('shutdown', null);
        const exited = new Promise<void>((done) => server!.once('exit', () => done()));
        server.stdin.write(encode({ jsonrpc: '2.0', method: 'exit', params: null })); await exited;
      };
      await run(expected, false, { prewarmed: true, selectionPrewarm: true });
      await run(expected, true, { repeat: true });
      await run([...expected, { ...location('Target.php', declaration), uri: pathToFileURL(join(dependency, 'Target.php')).toString() }], false, { includeDeclaration: true });
      await run([...expected, { ...location('Target.php', declaration), uri: pathToFileURL(join(dependency, 'Target.php')).toString() }], false,
        { includeDeclaration: true, prewarmed: true, selectionPrewarm: true, semanticPrewarmed: true });
      // Separate keys preserve the original no-declaration query.
      await run(expected, true);
      const added = source.replace('function run(', 'function added(');
      await writeFile(join(src, 'Added.php'), added);
      await run([...expected, location('Added.php', added)], false);
      await rename(join(src, 'Added.php'), join(src, 'Moved.php'));
      await run([...expected, location('Moved.php', added)], false);
      await rm(join(src, 'Moved.php')); await run(expected, false);
      const changed = other.replace('get();', 'other();'); await writeFile(join(src, 'Other.php'), changed);
      await run([location('Use.php', source)], false);
      await writeFile(join(src, 'Other.php'), other); await run(expected, false);
      const unsaved = `${source}\n// unsaved buffer`;
      await run(expected, false, { text: unsaved });
      await run(expected, false); await run(expected, true);
      await run(expected, false, { provider: true });
      await run(expected, true, { provider: true });
      await run(expected, true, { provider: true, prewarmed: true });
      await mkdir(join(root, 'config'));
      await writeFile(join(root, 'config', 'services.yaml'), 'services:\n  Lib\\Target:\n    public: true\n');
      await run(expected, false, { provider: true });
      await run(expected, true, { provider: true });
      await writeFile(join(dependency, 'Target.php'), `${declaration}\n// dependency changed`);
      await run(expected, false); await run(expected, true);
      const composerPath = join(root, 'composer.json'); await writeFile(composerPath, `${await readFile(composerPath, 'utf8')}\n`);
      await run(expected, false);
      const storeDirectory = join(root, '.cache', 'reference-results-v1');
      for (const file of await readdir(storeDirectory)) await writeFile(join(storeDirectory, file), '{truncated');
      await run(expected, false);
    } finally { await rm(root, { recursive: true, force: true }); }
  }, 60_000);

  it('resolves a method on an unloaded PSR-4 parameter subtype without a name hit in its file', async () => {
    const root = await mkdtemp(join(tmpdir(), 'php-companion-typed-receiver-references-'));
    try {
      const src = join(root, 'src'); await mkdir(src);
      const bag = '<?php namespace App; class Bag { public function get(): int { return 1; } }';
      const use = '<?php namespace App; function run(Consumer $receiver): int { return $receiver->get(); }';
      const bagUri = pathToFileURL(join(src, 'Bag.php')).toString();
      const useUri = pathToFileURL(join(src, 'Use.php')).toString();
      await writeFile(join(root, 'composer.json'), JSON.stringify({ autoload: { 'psr-4': { 'App\\': 'src/' } } }));
      await writeFile(join(src, 'Bag.php'), bag);
      await writeFile(join(src, 'Consumer.php'), '<?php namespace App; class Consumer extends Bag {}');
      await writeFile(join(src, 'Use.php'), use);
      for (let run = 0; run < 2; run += 1) {
        server = spawn(process.execPath, [resolve('dist/server.js'), '--stdio'], { stdio: 'pipe' });
        const output = messagesFrom(server);
        server.stdin.write(encode({ jsonrpc: '2.0', id: 270, method: 'initialize', params: {
          processId: null, capabilities: {}, rootUri: pathToFileURL(root).toString(),
          initializationOptions: { indexingMode: 'onDemand', cacheDirectory: join(root, '.cache'), testMode: true,
            testDisablePersistentReferences: true },
        } }));
        await output.waitFor((message) => message.id === 270);
        server.stdin.write(encode({ jsonrpc: '2.0', method: 'initialized', params: {} }));
        server.stdin.write(encode({ jsonrpc: '2.0', method: 'textDocument/didOpen', params: {
          textDocument: { uri: bagUri, languageId: 'php', version: 1, text: bag },
        } }));
        server.stdin.write(encode({ jsonrpc: '2.0', id: 271, method: 'textDocument/references', params: {
          textDocument: { uri: bagUri }, position: lspPosition(bag, bag.indexOf('get()') + 1),
          context: { includeDeclaration: false },
        } }));
        const response = await output.waitFor((message) => message.id === 271);
        expect(response.error).toBeUndefined();
        expect(response.result).toEqual([{ uri: useUri, range: { start: lspPosition(use, use.indexOf('get()')),
          end: lspPosition(use, use.indexOf('get()') + 3) } }]);
        server.stdin.write(encode({ jsonrpc: '2.0', id: 272, method: 'shutdown', params: null }));
        await output.waitFor((message) => message.id === 272);
        server.stdin.write(encode({ jsonrpc: '2.0', method: 'exit', params: null }));
        await new Promise<void>((resolveExit) => server!.once('exit', () => resolveExit()));
      }
    } finally { await rm(root, { recursive: true, force: true }); }
  });

  it.each(['attributes', 'getSession()'])('resolves first cold and reloaded references through unloaded vendor %s without Definition warm-up', async (receiver) => {
    const root = await mkdtemp(join(tmpdir(), 'php-companion-first-references-'));
    try {
      const bundle = process.env.PHP_COMPANION_TEST_REFERENCE_BUNDLE;
      const bundleDirectory = join(root, 'bundle');
      if (bundle) {
        await mkdir(bundleDirectory);
        await Promise.all(['language-server.js', 'candidateWorker.js', 'web-tree-sitter.wasm', 'tree-sitter-php.wasm']
          .map((name) => copyFile(join(dirname(resolve(bundle)), name), join(bundleDirectory, name))));
      }
      const sourceDirectory = join(root, 'src'); const dependencyDirectory = join(root, 'vendor', 'acme', 'lib', 'src');
      await mkdir(sourceDirectory); await mkdir(join(root, 'vendor', 'composer'), { recursive: true }); await mkdir(dependencyDirectory, { recursive: true });
      await writeFile(join(root, 'composer.json'), JSON.stringify({ autoload: { 'psr-4': { 'App\\': 'src/' }, 'exclude-from-classmap': ['/src/Generated/'] } }));
      await writeFile(join(root, 'composer.lock'), JSON.stringify({ packages: [{ name: 'acme/lib', autoload: { 'psr-4': { 'Acme\\': ['missing/', 'src/'] } } }] }));
      await writeFile(join(root, 'vendor', 'composer', 'installed.json'), JSON.stringify({ packages: [{ name: 'acme/lib', install_path: '../acme/lib' }] }));
      await writeFile(join(dependencyDirectory, 'Request.php'), '<?php namespace Acme; class Request { public ParameterBag $attributes; public function getSession(): SessionBag {} }');
      for (const bag of ['ParameterBag', 'SessionBag']) await writeFile(join(dependencyDirectory, `${bag}.php`), `<?php namespace Acme; class ${bag} { public function get(): int { return 1; } }`);
      const source = `<?php namespace App; use Acme\\Request; function run(Request $request): int { return $request->${receiver}->get(); }`;
      const other = source.replace('function run(', 'function second(');
      const uri = pathToFileURL(join(sourceDirectory, 'Use.php')).toString();
      const otherUri = pathToFileURL(join(sourceDirectory, 'Other.php')).toString();
      await writeFile(join(sourceDirectory, 'Use.php'), source); await writeFile(join(sourceDirectory, 'Other.php'), other);
      await writeFile(join(sourceDirectory, 'Noise.php'), '<?php namespace App; class Noise { public function get(): int { return 0; } public function run(): int { return $this->get(); } }');
      const skippedPath = join(sourceDirectory, 'Idle.php'); const skippedSource = '<?php namespace App; class Idle {}';
      await writeFile(skippedPath, skippedSource);
      await mkdir(join(sourceDirectory, 'Generated')); await writeFile(join(sourceDirectory, 'Generated', 'Excluded.php'), source);
      const expected = [{ uri, text: source }, { uri: otherUri, text: other }].map((item) => {
        const offset = item.text.lastIndexOf('get();');
        return { uri: item.uri, range: { start: lspPosition(item.text, offset), end: lspPosition(item.text, offset + 3) } };
      }).sort((a, b) => a.uri.localeCompare(b.uri));
      for (let run = 0; run < 2; run += 1) {
        server = spawn(process.execPath, bundle ? [join(bundleDirectory, 'language-server.js'), '--stdio',
          '--parser-core-wasm', join(bundleDirectory, 'web-tree-sitter.wasm'), '--php-wasm', join(bundleDirectory, 'tree-sitter-php.wasm')]
          : [resolve('dist/server.js'), '--stdio'], { stdio: 'pipe' });
        const output = messagesFrom(server);
        server.stdin.write(encode({ jsonrpc: '2.0', id: 280, method: 'initialize', params: {
          processId: null, capabilities: {}, rootUri: pathToFileURL(root).toString(),
          initializationOptions: { indexingMode: 'onDemand', cacheDirectory: join(root, '.cache'), testMode: true, testDisablePersistentReferences: true },
        } }));
        await output.waitFor((message) => message.id === 280);
        server.stdin.write(encode({ jsonrpc: '2.0', method: 'initialized', params: {} }));
        server.stdin.write(encode({ jsonrpc: '2.0', method: 'textDocument/didOpen', params: {
          textDocument: { uri, languageId: 'php', version: 1, text: source },
        } }));
        server.stdin.write(encode({ jsonrpc: '2.0', id: 281, method: 'textDocument/references', params: {
          textDocument: { uri }, position: lspPosition(source, source.lastIndexOf('get();') + 1), context: { includeDeclaration: false },
        } }));
        const response = await output.waitFor((message) => message.id === 281);
        expect(response.error).toBeUndefined();
        expect(response.result.sort((a: { uri: string }, b: { uri: string }) => a.uri.localeCompare(b.uri))).toEqual(expected);
        expect(output.messages.some((message: any) => message.method === 'window/logMessage' && message.params?.message?.includes('[named-candidates]'))).toBe(true);
        expect(output.messages.some((message: any) => message.method === 'window/logMessage' && message.params?.message?.includes('[index:'))).toBe(false);
        const audit = async (id: number): Promise<any> => {
          server!.stdin.write(encode({ jsonrpc: '2.0', id, method: 'phpCompanion/testReferenceInputs', params: { uri } }));
          const result = await output.waitFor((message) => message.id === id);
          expect(result.error).toBeUndefined(); return result.result;
        };
        const evidence = await audit(283);
        expect(evidence).toMatchObject({ captured: true, semanticCoverageVerified: false, engineVerified: Boolean(bundle), canonicalSources: 2, candidateSources: 4 });
        expect(evidence.missingLookups).toBeGreaterThanOrEqual(2);
        const newlyPresent = join(root, 'vendor', 'acme', 'lib', 'missing', 'Request.php');
        await mkdir(join(root, 'vendor', 'acme', 'lib', 'missing'), { recursive: true });
        await writeFile(newlyPresent, '<?php namespace Acme; class Request {}');
        expect(await audit(284)).toEqual({ captured: false, reason: 'consumed-source-mismatch' });
        await rm(newlyPresent);
        expect((await audit(285)).fingerprint).toBe(evidence.fingerprint);
        const composerPath = join(root, 'composer.json'); const composerSource = await readFile(composerPath, 'utf8');
        await writeFile(composerPath, `${composerSource}\n`);
        expect(await audit(286)).toEqual({ captured: false, reason: 'composer-snapshot-changed' });
        await writeFile(composerPath, composerSource);
        expect((await audit(287)).fingerprint).toBe(evidence.fingerprint);
        // No file notifications: the audit must inspect every consumed source,
        // including the file rejected by the original candidate name filter.
        await writeFile(skippedPath, source.replace('function run(', 'function added('));
        expect(await audit(288)).toEqual({ captured: false, reason: 'candidate-snapshot-changed' });
        await writeFile(skippedPath, skippedSource);
        expect((await audit(289)).fingerprint).toBe(evidence.fingerprint);
        const movedPath = join(sourceDirectory, 'Moved.php'); await rename(skippedPath, movedPath);
        expect(await audit(290)).toEqual({ captured: false, reason: 'candidate-snapshot-changed' });
        await rename(movedPath, skippedPath);
        await rm(skippedPath);
        expect(await audit(291)).toEqual({ captured: false, reason: 'candidate-snapshot-changed' });
        await writeFile(skippedPath, skippedSource);
        await writeFile(movedPath, other);
        expect(await audit(292)).toEqual({ captured: false, reason: 'candidate-snapshot-changed' });
        await rm(movedPath);
        expect((await audit(293)).fingerprint).toBe(evidence.fingerprint);
        if (bundle) {
          let id = 294;
          for (const name of ['candidateWorker.js', 'tree-sitter-php.wasm']) {
            const path = join(bundleDirectory, name); const original = await readFile(path);
            await writeFile(path, Buffer.concat([original, Buffer.from('changed-engine')]));
            expect(await audit(id++)).toEqual({ captured: false, reason: 'engine-inputs-changed-or-unreadable' });
            await writeFile(path, original);
            expect((await audit(id++)).fingerprint).toBe(evidence.fingerprint);
          }
        }
        server.stdin.write(encode({ jsonrpc: '2.0', id: 282, method: 'shutdown', params: null }));
        await output.waitFor((message) => message.id === 282);
        server.stdin.write(encode({ jsonrpc: '2.0', method: 'exit', params: null }));
        await new Promise<void>((resolveExit) => server!.once('exit', () => resolveExit()));
      }
    } finally { await rm(root, { recursive: true, force: true }); }
  });

  it('includes inherited vendor receiver assignments in first and reloaded References', async () => {
    const root = await mkdtemp(join(tmpdir(), 'php-companion-inherited-receiver-'));
    try {
      const src = join(root, 'src'); const dependency = join(root, 'vendor', 'acme', 'lib', 'src');
      await mkdir(src); await mkdir(dependency, { recursive: true }); await mkdir(join(root, 'vendor', 'composer'));
      await writeFile(join(root, 'composer.json'), JSON.stringify({ autoload: { 'psr-4': { 'App\\': 'src/' } } }));
      await writeFile(join(root, 'composer.lock'), JSON.stringify({ packages: [{ name: 'acme/lib', autoload: { 'psr-4': { 'Acme\\': 'src/' } } }] }));
      await writeFile(join(root, 'vendor', 'composer', 'installed.json'), JSON.stringify({ packages: [{ name: 'acme/lib', install_path: '../acme/lib' }] }));
      await writeFile(join(dependency, 'BaseEvent.php'), '<?php namespace Acme; class BaseEvent {}');
      await writeFile(join(dependency, 'KernelEvent.php'), '<?php namespace Acme; class KernelEvent extends BaseEvent { public function getRequest(): Request {} }');
      await writeFile(join(dependency, 'RequestEvent.php'), '<?php namespace Acme; class RequestEvent extends KernelEvent {}');
      await writeFile(join(dependency, 'Request.php'), '<?php namespace Acme; class Request { public Bag $attributes; }');
      await writeFile(join(dependency, 'Bag.php'), '<?php namespace Acme; class Bag { public function get(string $key): mixed {} }');
      const direct = `<?php namespace App; use Acme\\Request; function direct(Request $request) { return $request->attributes->get('route'); }`;
      const inherited = `<?php namespace App; use Acme\\RequestEvent; function inherited(RequestEvent $event) { $request = $event->getRequest(); return $request->attributes->get('route'); }`;
      const directUri = pathToFileURL(join(src, 'Direct.php')).toString(); const inheritedUri = pathToFileURL(join(src, 'Inherited.php')).toString();
      await writeFile(join(src, 'Direct.php'), direct); await writeFile(join(src, 'Inherited.php'), inherited);
      const expected = [{ uri: directUri, text: direct }, { uri: inheritedUri, text: inherited }].map(({ uri, text }) => {
        const start = text.lastIndexOf('get(');
        return { uri, range: { start: lspPosition(text, start), end: lspPosition(text, start + 3) } };
      });
      for (let run = 0; run < 2; run += 1) {
        server = spawn(process.execPath, [resolve('dist/server.js'), '--stdio'], { stdio: 'pipe' });
        const output = messagesFrom(server);
        server.stdin.write(encode({ jsonrpc: '2.0', id: 970, method: 'initialize', params: {
          processId: null, capabilities: {}, rootUri: pathToFileURL(root).toString(),
          initializationOptions: { indexingMode: 'onDemand', cacheDirectory: join(root, '.cache'), testMode: true,
            testDisablePersistentReferences: true },
        } }));
        await output.waitFor((message) => message.id === 970);
        server.stdin.write(encode({ jsonrpc: '2.0', method: 'initialized', params: {} }));
        server.stdin.write(encode({ jsonrpc: '2.0', method: 'textDocument/didOpen', params: {
          textDocument: { uri: directUri, languageId: 'php', version: 1, text: direct },
        } }));
        server.stdin.write(encode({ jsonrpc: '2.0', id: 971, method: 'textDocument/references', params: {
          textDocument: { uri: directUri }, position: lspPosition(direct, direct.lastIndexOf('get(') + 1),
          context: { includeDeclaration: false },
        } }));
        const response = await output.waitFor((message) => message.id === 971, 15_000);
        expect(response.error).toBeUndefined();
        expect(response.result.sort((a: { uri: string }, b: { uri: string }) => a.uri.localeCompare(b.uri))).toEqual(expected);
        server.stdin.write(encode({ jsonrpc: '2.0', id: 972, method: 'shutdown', params: null }));
        await output.waitFor((message) => message.id === 972);
        server.stdin.write(encode({ jsonrpc: '2.0', method: 'exit', params: null }));
        await new Promise<void>((done) => server!.once('exit', () => done()));
      }
    } finally { await rm(root, { recursive: true, force: true }); }
  }, 45_000);

  it('prepares cold class references in workers and honors unsaved consumers after reload', async () => {
    const root = await mkdtemp(join(tmpdir(), 'php-companion-class-reference-workers-'));
    try {
      await mkdir(join(root, 'src'));
      await writeFile(join(root, 'composer.json'), JSON.stringify({ autoload: { 'psr-4': { 'App\\': 'src/' } } }));
      const declaration = '<?php namespace App; final class Target {}';
      const consumer = '<?php namespace App; function run(Target $value): void { new Target(); }';
      const declarationUri = pathToFileURL(join(root, 'src', 'Target.php')).toString();
      const consumerUri = pathToFileURL(join(root, 'src', 'Consumer.php')).toString();
      await writeFile(join(root, 'src', 'Target.php'), declaration);
      await writeFile(join(root, 'src', 'Consumer.php'), consumer);
      for (let run = 0; run < 2; run += 1) {
        server = spawn(process.execPath, [resolve('dist/server.js'), '--stdio'], { stdio: 'pipe' });
        const output = messagesFrom(server);
        server.stdin.write(encode({ jsonrpc: '2.0', id: 240, method: 'initialize', params: {
          processId: null, capabilities: {}, rootUri: pathToFileURL(root).toString(),
          initializationOptions: { indexingMode: 'onDemand', cacheDirectory: join(root, '.cache') },
        } }));
        await output.waitFor((message) => message.id === 240);
        server.stdin.write(encode({ jsonrpc: '2.0', method: 'initialized', params: {} }));
        server.stdin.write(encode({ jsonrpc: '2.0', method: 'textDocument/didOpen', params: {
          textDocument: { uri: declarationUri, languageId: 'php', version: 1, text: declaration },
        } }));
        if (run === 1) server.stdin.write(encode({ jsonrpc: '2.0', method: 'textDocument/didOpen', params: {
          textDocument: { uri: consumerUri, languageId: 'php', version: 1, text: consumer.replace('new Target()', 'new \\stdClass()') },
        } }));
        server.stdin.write(encode({ jsonrpc: '2.0', id: 241, method: 'textDocument/references', params: {
          textDocument: { uri: declarationUri }, position: lspPosition(declaration, declaration.indexOf('Target') + 1),
          context: { includeDeclaration: false },
        } }));
        const expectedOffsets = run === 0 ? [consumer.indexOf('Target'), consumer.lastIndexOf('Target')] : [consumer.indexOf('Target')];
        expect((await output.waitFor((message) => message.id === 241)).result).toEqual(expectedOffsets.map((offset) => ({
          uri: consumerUri, range: { start: lspPosition(consumer, offset), end: lspPosition(consumer, offset + 6) },
        })));
        const scan = await output.waitFor((message) => message.method === 'window/logMessage'
          && message.params?.message?.includes('[named-candidates] files=2'));
        expect(scan.params.message).toContain(`prepared=${run === 0 ? 1 : 0}`);
        server.stdin.write(encode({ jsonrpc: '2.0', id: 242, method: 'shutdown', params: null }));
        await output.waitFor((message) => message.id === 242);
        const exited = new Promise<void>((done) => server!.once('exit', () => done()));
        server.stdin.write(encode({ jsonrpc: '2.0', method: 'exit', params: null })); await exited;
      }
    } finally { await rm(root, { recursive: true, force: true }); }
  });

  it('restores broad on-demand method candidates consistently across reload', async () => {
    const root = await mkdtemp(join(tmpdir(), 'php-companion-substring-candidates-'));
    try {
      const sourceDirectory = join(root, 'src'); await mkdir(sourceDirectory);
      const cacheDirectory = join(root, '.cache');
      const declaration = '<?php namespace App; final class Target { public function get(): int { return 1; } }';
      const consumer = '<?php namespace App; final class Consumer extends Getter { public function use(): int { return $this->target->get(); } }';
      const substring = '<?php namespace App; class Getter { protected Target $target; public function helper(): int { return 0; } }';
      const noise = '<?php namespace App; final class Noise {}';
      const declarationUri = pathToFileURL(join(sourceDirectory, 'Target.php')).toString();
      const consumerUri = pathToFileURL(join(sourceDirectory, 'Consumer.php')).toString();
      await writeFile(join(root, 'composer.json'), JSON.stringify({ autoload: { 'psr-4': { 'App\\': 'src/' } } }));
      await writeFile(join(sourceDirectory, 'Target.php'), declaration);
      await writeFile(join(sourceDirectory, 'Consumer.php'), consumer);
      await writeFile(join(sourceDirectory, 'Getter.php'), substring);
      await writeFile(join(sourceDirectory, 'Noise.php'), noise);
      for (let run = 0; run < 3; run += 1) {
        server = spawn(process.execPath, [resolve('dist/server.js'), '--stdio'], { stdio: 'pipe' });
        const output = messagesFrom(server);
        server.stdin.write(encode({ jsonrpc: '2.0', id: 240, method: 'initialize', params: {
          processId: null, capabilities: {}, rootUri: pathToFileURL(root).toString(),
          initializationOptions: { indexingMode: 'onDemand', cacheDirectory },
        } }));
        await output.waitFor((message) => message.id === 240);
        server.stdin.write(encode({ jsonrpc: '2.0', method: 'initialized', params: {} }));
        server.stdin.write(encode({ jsonrpc: '2.0', method: 'textDocument/didOpen', params: {
          textDocument: { uri: declarationUri, languageId: 'php', version: 1, text: declaration },
        } }));
        server.stdin.write(encode({ jsonrpc: '2.0', id: 241, method: 'textDocument/references', params: {
          textDocument: { uri: declarationUri }, position: lspPosition(declaration, declaration.indexOf('get()') + 1),
          context: { includeDeclaration: false },
        } }));
        const references = (await output.waitFor((message) => message.id === 241)).result;
        expect(references).toEqual(run === 2 ? [] : [expect.objectContaining({ uri: consumerUri })]);
        const scan = await output.waitFor((message) => message.method === 'window/logMessage'
          && message.params?.message?.includes('[named-candidates] files=4'));
        expect(scan.params.message).toContain(run === 0 ? 'parsed=3 restored=0' : run === 1 ? 'parsed=1 restored=2' : 'parsed=2 restored=1');
        expect(scan.params.message).toContain(run === 0 ? 'cached=0' : run === 1 ? 'cached=3' : 'cached=2');
        expect(scan.params.message).toContain(run === 1 ? 'declarations=0' : 'declarations=1');
        expect(scan.params.message).toContain(run === 0 ? 'restoredDeclarations=0' : 'restoredDeclarations=1');
        expect(scan.params.message).toContain(`prepared=${run === 0 ? 2 : run === 1 ? 0 : 1}`);
        server.stdin.write(encode({ jsonrpc: '2.0', id: 242, method: 'shutdown', params: null }));
        await output.waitFor((message) => message.id === 242);
        server.stdin.write(encode({ jsonrpc: '2.0', method: 'exit', params: null }));
        await new Promise<void>((resolveExit) => server!.once('exit', () => resolveExit()));
        if (run === 1) await writeFile(join(sourceDirectory, 'Consumer.php'), consumer.replace('->get()', '->run()'));
      }
    } finally { await rm(root, { recursive: true, force: true }); }
  });

  it('falls back when an exact reference candidate inherits from a non-PSR-4 declaration', async () => {
    const root = await mkdtemp(join(tmpdir(), 'php-companion-reference-closure-fallback-'));
    try {
      const sourceDirectory = join(root, 'src'); await mkdir(sourceDirectory);
      const target = '<?php namespace App; final class Bag { public function get(): int { return 1; } }';
      const consumer = '<?php namespace App; final class Consumer extends Base { public function run(): int { return $this->bag->get(); } }';
      const legacy = '<?php namespace App; class Base { protected Bag $bag; } // target';
      const targetUri = pathToFileURL(join(sourceDirectory, 'Bag.php')).toString();
      const consumerUri = pathToFileURL(join(sourceDirectory, 'Consumer.php')).toString();
      await writeFile(join(root, 'composer.json'), JSON.stringify({ autoload: { 'psr-4': { 'App\\': 'src/' } } }));
      await writeFile(join(sourceDirectory, 'Bag.php'), target);
      await writeFile(join(sourceDirectory, 'Consumer.php'), consumer);
      await writeFile(join(sourceDirectory, 'Legacy.php'), legacy);
      server = spawn(process.execPath, [resolve('dist/server.js'), '--stdio'], { stdio: 'pipe' });
      const output = messagesFrom(server);
      server.stdin.write(encode({ jsonrpc: '2.0', id: 240, method: 'initialize', params: {
        processId: null, capabilities: {}, rootUri: pathToFileURL(root).toString(),
        initializationOptions: { indexingMode: 'onDemand', cacheDirectory: join(root, '.cache'), testMode: true,
          experimentalReferenceClosure: true },
      } }));
      await output.waitFor((message) => message.id === 240);
      server.stdin.write(encode({ jsonrpc: '2.0', method: 'initialized', params: {} }));
      server.stdin.write(encode({ jsonrpc: '2.0', method: 'textDocument/didOpen', params: {
        textDocument: { uri: targetUri, languageId: 'php', version: 1, text: target },
      } }));
      server.stdin.write(encode({ jsonrpc: '2.0', id: 241, method: 'textDocument/references', params: {
        textDocument: { uri: targetUri }, position: lspPosition(target, target.indexOf('get()') + 1),
        context: { includeDeclaration: false },
      } }));
      expect((await output.waitFor((message) => message.id === 241)).result).toEqual([{
        uri: consumerUri, range: { start: lspPosition(consumer, consumer.indexOf('get()')),
          end: lspPosition(consumer, consumer.indexOf('get()') + 3) },
      }]);
      const fallback = await output.waitFor((message) => message.method === 'window/logMessage'
        && message.params?.message?.includes('[reference-closure] falling back'));
      expect(fallback.params.message).toContain('unresolved project declaration');
      server.stdin.write(encode({ jsonrpc: '2.0', id: 242, method: 'shutdown', params: null }));
      await output.waitFor((message) => message.id === 242);
      server.stdin.write(encode({ jsonrpc: '2.0', method: 'exit', params: null }));
      await new Promise<void>((resolveExit) => server!.once('exit', () => resolveExit()));
    } finally { await rm(root, { recursive: true, force: true }); }
  });

  it('preserves cold class references when external source prefiltering is requested', async () => {
    const root = await mkdtemp(join(tmpdir(), 'php-companion-reference-source-prefilter-'));
    try {
      const sourceDirectory = join(root, 'src'); await mkdir(sourceDirectory);
      const target = '<?php namespace App; final class TargetService {}';
      const consumer = '<?php namespace App; function run(TargetService $service): void { new TargetService(); }';
      const unsaved = '<?php namespace App; function unsaved(TargetService $service): void {}';
      const targetUri = pathToFileURL(join(sourceDirectory, 'TargetService.php')).toString();
      const consumerUri = pathToFileURL(join(sourceDirectory, 'Consumer.php')).toString();
      const unsavedUri = pathToFileURL(join(sourceDirectory, 'Unsaved.php')).toString();
      await writeFile(join(root, 'composer.json'), JSON.stringify({ autoload: { 'psr-4': { 'App\\': 'src/' } } }));
      await writeFile(join(sourceDirectory, 'TargetService.php'), target);
      await writeFile(join(sourceDirectory, 'Consumer.php'), consumer);
      await writeFile(join(sourceDirectory, 'Unsaved.php'), '<?php namespace App; function unsaved(): void {}');
      await writeFile(join(sourceDirectory, 'Noise.php'), '<?php namespace App; final class Noise {}');
      server = spawn(process.execPath, [resolve('dist/server.js'), '--stdio'], { stdio: 'pipe' });
      const output = messagesFrom(server);
      server.stdin.write(encode({ jsonrpc: '2.0', id: 240, method: 'initialize', params: {
        processId: null, capabilities: {}, rootUri: pathToFileURL(root).toString(),
        initializationOptions: { indexingMode: 'onDemand', cacheDirectory: join(root, '.cache'), testMode: true,
          experimentalRipgrepCandidates: true },
      } }));
      await output.waitFor((message) => message.id === 240);
      server.stdin.write(encode({ jsonrpc: '2.0', method: 'initialized', params: {} }));
      server.stdin.write(encode({ jsonrpc: '2.0', method: 'textDocument/didOpen', params: {
        textDocument: { uri: targetUri, languageId: 'php', version: 1, text: target },
      } }));
      server.stdin.write(encode({ jsonrpc: '2.0', method: 'textDocument/didOpen', params: {
        textDocument: { uri: unsavedUri, languageId: 'php', version: 1, text: unsaved },
      } }));
      server.stdin.write(encode({ jsonrpc: '2.0', id: 241, method: 'textDocument/references', params: {
        textDocument: { uri: targetUri }, position: lspPosition(target, target.indexOf('TargetService') + 1),
        context: { includeDeclaration: false },
      } }));
      const references = (await output.waitFor((message) => message.id === 241)).result;
      expect(references).toEqual([...([consumer.indexOf('TargetService'), consumer.lastIndexOf('TargetService')].map((offset) => ({
        uri: consumerUri, range: { start: lspPosition(consumer, offset), end: lspPosition(consumer, offset + 'TargetService'.length) },
      }))), { uri: unsavedUri, range: { start: lspPosition(unsaved, unsaved.indexOf('TargetService')),
        end: lspPosition(unsaved, unsaved.indexOf('TargetService') + 'TargetService'.length) } }]);
      server.stdin.write(encode({ jsonrpc: '2.0', id: 242, method: 'shutdown', params: null }));
      await output.waitFor((message) => message.id === 242);
      server.stdin.write(encode({ jsonrpc: '2.0', method: 'exit', params: null }));
      await new Promise<void>((resolveExit) => server!.once('exit', () => resolveExit()));
    } finally { await rm(root, { recursive: true, force: true }); }
  });

  it('keeps reload and closed promoted-property rename free of project indexing in on-demand mode', async () => {
    const root = await mkdtemp(join(tmpdir(), 'php-companion-on-demand-startup-'));
    try {
      const cacheDirectory = join(root, '.cache');
      const sourceDirectory = join(root, 'src'); await mkdir(sourceDirectory);
      const source = '<?php namespace App; final class Service { public function __construct(private object $dependency) {} public function dependency(): object { return $this->dependency; } }';
      const consumer = '<?php namespace App; final class Consumer { public function make(): Service { return new Service(dependency /* named */ : new \\stdClass()); } }';
      const sourcePath = join(sourceDirectory, 'Service.php'); const sourceUri = pathToFileURL(sourcePath).toString();
      const consumerPath = join(sourceDirectory, 'Consumer.php'); const consumerUri = pathToFileURL(consumerPath).toString();
      await writeFile(join(root, 'composer.json'), JSON.stringify({ autoload: { 'psr-4': { 'App\\': 'src/' } } }));
      await writeFile(sourcePath, source); await writeFile(consumerPath, consumer);
      server = spawn(process.execPath, [resolve('dist/server.js'), '--stdio'], { stdio: 'pipe' });
      const output = messagesFrom(server); const rootUri = pathToFileURL(root).toString();
      server.stdin.write(encode({ jsonrpc: '2.0', id: 230, method: 'initialize', params: {
        processId: null, capabilities: {}, rootUri, initializationOptions: { indexingMode: 'onDemand', cacheDirectory },
      } }));
      await output.waitFor((message) => message.id === 230);
      server.stdin.write(encode({ jsonrpc: '2.0', method: 'initialized', params: {} }));
      const provider = join(root, 'controller-provider.mjs');
      await writeFile(provider, "process.stdout.write(JSON.stringify({protocolVersion:1,id:'unused',result:{schema:1,providerId:'php-companion.symfony.controller-contexts',generation:'0',complete:true,methods:[],properties:[],literalMethodReturns:[],controllerContexts:[]}}));");
      server.stdin.write(encode({ jsonrpc: '2.0', method: 'phpCompanion/bundledSemanticProviders', params: { providers: [{
        providerId: 'php-companion.symfony.controller-contexts', command: process.execPath, args: [provider], timeoutMs: 5000,
        requiresProjectTypes: true, acceptsDocumentSnapshots: true, replacesControllerContexts: true,
      }] } }));
      await new Promise<void>((resolvePromise) => setTimeout(resolvePromise, 250));
      expect(output.messages.some((message: any) => message.method === 'window/logMessage' && message.params?.message?.includes('Indexed '))).toBe(false);
      expect(output.messages.some((message: any) => message.method === 'window/logMessage' && message.params?.message?.includes('[index:'))).toBe(false);
      server.stdin.write(encode({ jsonrpc: '2.0', method: 'textDocument/didOpen', params: {
        textDocument: { uri: sourceUri, languageId: 'php', version: 1, text: source },
      } }));
      server.stdin.write(encode({ jsonrpc: '2.0', id: 231, method: 'textDocument/prepareRename', params: {
        textDocument: { uri: sourceUri }, position: lspPosition(source, source.indexOf('$dependency') + 2),
      } }));
      expect((await output.waitFor((message) => message.id === 231)).result).toBeTruthy();
      server.stdin.write(encode({ jsonrpc: '2.0', id: 233, method: 'textDocument/rename', params: {
        textDocument: { uri: sourceUri }, position: lspPosition(source, source.indexOf('$dependency') + 2), newName: 'service',
      } }));
      const rename = (await output.waitFor((message) => message.id === 233)).result;
      expect(rename.changes[sourceUri]).toHaveLength(2);
      expect(rename.changes[consumerUri]).toHaveLength(1);
      await new Promise<void>((resolvePromise) => setTimeout(resolvePromise, 250));
      expect(output.messages.some((message: any) => message.method === 'window/logMessage'
        && message.params?.message?.includes('[named-candidates] files=2 cached=0 parsed=1'))).toBe(true);
      expect(output.messages.some((message: any) => message.method === 'window/logMessage' && message.params?.message?.includes('[index:'))).toBe(false);
      server.stdin.write(encode({ jsonrpc: '2.0', id: 232, method: 'shutdown', params: null })); await output.waitFor((message) => message.id === 232);
      server.stdin.write(encode({ jsonrpc: '2.0', method: 'exit', params: null }));
      await new Promise<void>((resolveExit) => server!.once('exit', () => resolveExit()));

      server = spawn(process.execPath, [resolve('dist/server.js'), '--stdio'], { stdio: 'pipe' });
      const reloaded = messagesFrom(server);
      server.stdin.write(encode({ jsonrpc: '2.0', id: 234, method: 'initialize', params: {
        processId: null, capabilities: {}, rootUri, initializationOptions: { indexingMode: 'onDemand', cacheDirectory },
      } }));
      await reloaded.waitFor((message) => message.id === 234);
      server.stdin.write(encode({ jsonrpc: '2.0', method: 'initialized', params: {} }));
      server.stdin.write(encode({ jsonrpc: '2.0', method: 'textDocument/didOpen', params: {
        textDocument: { uri: sourceUri, languageId: 'php', version: 1, text: source },
      } }));
      server.stdin.write(encode({ jsonrpc: '2.0', id: 235, method: 'textDocument/rename', params: {
        textDocument: { uri: sourceUri }, position: lspPosition(source, source.indexOf('$dependency') + 2), newName: 'service',
      } }));
      const reloadedRename = (await reloaded.waitFor((message) => message.id === 235)).result;
      expect(reloadedRename.changes[sourceUri]).toHaveLength(2);
      expect(reloadedRename.changes[consumerUri]).toHaveLength(1);
      expect((await reloaded.waitFor((message) => message.method === 'window/logMessage'
        && message.params?.message?.includes('[named-candidates] files=2 cached=2 parsed=0 restored=1'))).params.message).toContain('cached=2 parsed=0 restored=1');
      server.stdin.write(encode({ jsonrpc: '2.0', id: 236, method: 'shutdown', params: null })); await reloaded.waitFor((message) => message.id === 236);
      server.stdin.write(encode({ jsonrpc: '2.0', method: 'exit', params: null }));
      await new Promise<void>((resolveExit) => server!.once('exit', () => resolveExit()));
    } finally { await rm(root, { recursive: true, force: true }); }
  });

  it('consumes Symfony provider resource registrations for cold on-demand type references', async () => {
    const root = await mkdtemp(join(tmpdir(), 'php-companion-on-demand-symfony-references-'));
    try {
      const sourceDirectory = join(root, 'src'); const configDirectory = join(root, 'config');
      await mkdir(sourceDirectory); await mkdir(configDirectory);
      const source = `<?php
        namespace Symfony\\Component\\EventDispatcher { interface EventSubscriberInterface {} }
        namespace Symfony\\Contracts\\EventDispatcher { interface EventDispatcherInterface { public function dispatch(object $event, ?string $eventName = null): object; } }
        namespace Symfony\\Component\\Messenger { interface MessageBusInterface { public function dispatch(object $message): object; } }
        namespace App {
          use Symfony\\Component\\EventDispatcher\\EventSubscriberInterface;
          use Symfony\\Component\\EventDispatcher\\Attribute\\AsEventListener;
          use Symfony\\Contracts\\EventDispatcher\\EventDispatcherInterface;
          use Symfony\\Component\\Messenger\\MessageBusInterface;
          final class ReadyEvent {}
          final class RegisteredService implements EventSubscriberInterface {
            public static function getSubscribedEvents(): array {
              $events = ['app.ready' => ['onReady', 16]];
              $events['app.built'] = 'onReady';
              if ($feature) { $events['app.branch'] = 'onReady'; }
              else { $events['app.branch'] = 'onReady'; }
              if (defined('OPTIONAL_SUBSCRIPTION')) { $events['app.optional'] = 'onReady'; }
              return $events;
            }
            public function onReady(): void {}
            #[AsEventListener(ReadyEvent::class)]
            public function onAttribute(): void {}
          }
          class ListenerBase { public function onInherited(): void {} private function hiddenListener(): void {} }
          trait ListenerTrait { public function onTrait(): void {} public static function staticListener(): void {} }
          final class DerivedListener extends ListenerBase implements EventSubscriberInterface {
            use ListenerTrait;
            public static function getSubscribedEvents(): array { return [
              'app.inherited' => 'onInherited', 'app.trait' => 'onTrait',
              'app.hidden' => 'hiddenListener', 'app.static' => 'staticListener',
            ]; }
          }
          class ParentSubscriptionRoot { public const ROOT_EVENT = 'app.parent.root'; }
          #[AsEventListener('app.parent.class', method: 'onParentMap')]
          class ParentSubscriptions extends ParentSubscriptionRoot {
            public const SELF_EVENT = 'app.parent.self'; public const STATIC_EVENT = 'app.parent.static';
            public static function getSubscribedEvents(): array { return [
              'app.parent.map' => 'onParentMap', self::SELF_EVENT => 'onParentMap',
              static::STATIC_EVENT => 'onParentMap', parent::ROOT_EVENT => 'onParentMap',
            ]; }
            #[AsEventListener('app.parent.attribute')]
            public function onParentMap(): void {}
          }
          final class InheritedMapListener extends ParentSubscriptions implements EventSubscriberInterface {
            public const STATIC_EVENT = 'app.child.static';
          }
          #[AsEventListener('app.trait.class', method: 'onTraitMap')]
          trait TraitSubscriptions {
            public const SELF_EVENT = 'app.trait.self'; public const STATIC_EVENT = 'app.trait.static';
            private static function subscriptions(): array { return [
              'app.trait.map' => 'onTraitMap', self::SELF_EVENT => 'onTraitMap',
              static::STATIC_EVENT => 'onTraitMap', parent::ROOT_EVENT => 'onTraitMap',
            ]; }
            #[AsEventListener(ReadyEvent::class, priority: 7)]
            #[AsEventListener(self::class)]
            #[AsEventListener(parent::class)]
            public function onTraitMap(): void {}
          }
          class TraitMapBase { public const ROOT_EVENT = 'app.trait.root'; }
          final class TraitMapListener extends TraitMapBase implements EventSubscriberInterface {
            use TraitSubscriptions { subscriptions as public getSubscribedEvents; onTraitMap as onTraitAlias; }
          }
          final class AliasCaller {
            public function call(TraitMapListener $listener): void { $listener->onTraitAlias(); }
          }
          final class Publisher {
            public function publish(EventDispatcherInterface $dispatcher, MessageBusInterface $bus): void {
              $dispatcher->dispatch(new ReadyEvent());
              $event = new ReadyEvent();
              $dispatcher->dispatch($event);
              $original = new ReadyEvent();
              $alias = $original;
              $dispatcher->dispatch($alias);
              if ($enabled) { $branch = new ReadyEvent(); } else { $branch = new ReadyEvent(); }
              $dispatcher->dispatch($branch);
              $bus->dispatch(new ReadyEvent());
              $message = new ReadyEvent();
              $bus->dispatch($message);
            }
          }
        }`;
      const sourcePath = join(sourceDirectory, 'RegisteredService.php'); const sourceUri = pathToFileURL(sourcePath).toString();
      const servicesPath = join(configDirectory, 'services.yaml'); const servicesUri = pathToFileURL(servicesPath).toString();
      await writeFile(join(root, 'composer.json'), JSON.stringify({ autoload: { 'psr-4': { 'App\\': 'src/' } } }));
      await writeFile(join(root, 'composer.lock'), '{}');
      await writeFile(sourcePath, source);
      await writeFile(servicesPath, "services:\n  App\\:\n    resource: '../src/'\n    tags:\n      - { name: kernel.event_listener, event: 'app.yaml', method: onReady }\n      - { name: kernel.event_listener, event: 'app.invalid', method: missingMethod }\n  App\\DerivedListener:\n    tags:\n      - { name: kernel.event_listener, event: 'app.yaml.inherited', method: onInherited }\n      - { name: kernel.event_listener, event: 'app.yaml.trait', method: onTrait }\n      - { name: kernel.event_listener, event: 'app.yaml.hidden', method: hiddenListener }\n      - { name: kernel.event_listener, event: 'app.yaml.static', method: staticListener }\n");
      const cacheDirectory = join(root, 'var', 'cache', 'dev'); await mkdir(cacheDirectory, { recursive: true });
      const compiledPath = join(cacheDirectory, 'App_KernelDevDebugContainer.xml'); const compiledUri = pathToFileURL(compiledPath).toString();
      await writeFile(compiledPath, `<?xml version="1.0"?><container><services>
        <service id="app.registered" class="App\\RegisteredService">
          <tag name="kernel.event_listener" event="app.compiled" method="onReady" priority="4"/>
          <tag name="kernel.event_listener" event="app.invalid" method="missingMethod"/>
        </service>
        <service id="app.derived" class="App\\DerivedListener">
          <tag name="kernel.event_listener" event="app.compiled.inherited" method="onInherited"/>
          <tag name="kernel.event_listener" event="app.compiled.trait" method="onTrait"/>
          <tag name="kernel.event_listener" event="app.compiled.hidden" method="hiddenListener"/>
          <tag name="kernel.event_listener" event="app.compiled.static" method="staticListener"/>
        </service>
      </services></container>`);
      const future = new Date(Date.now() + 1_000); await utimes(compiledPath, future, future);
      server = spawn(process.execPath, [resolve('dist/server.js'), '--stdio'], { stdio: 'pipe' });
      const output = messagesFrom(server); const rootUri = pathToFileURL(root).toString();
      server.stdin.write(encode({ jsonrpc: '2.0', id: 233, method: 'initialize', params: {
        processId: null, capabilities: {}, rootUri, initializationOptions: {
          indexingMode: 'onDemand',
          bundledSemanticProviders: [
            { ...symfonyServiceProviderDescriptor, acceptsDocumentSnapshots: false },
            { ...symfonyEventProviderDescriptor, acceptsDocumentSnapshots: false },
          ],
        },
      } }));
      await output.waitFor((message) => message.id === 233);
      server.stdin.write(encode({ jsonrpc: '2.0', method: 'initialized', params: {} }));
      server.stdin.write(encode({ jsonrpc: '2.0', method: 'textDocument/didOpen', params: {
        textDocument: { uri: sourceUri, languageId: 'php', version: 1, text: source },
      } }));
      await output.waitFor((message) => message.method === 'textDocument/publishDiagnostics' && message.params.uri === sourceUri);
      server.stdin.write(encode({ jsonrpc: '2.0', id: 236, method: 'textDocument/references', params: {
        textDocument: { uri: sourceUri }, position: lspPosition(source, source.lastIndexOf('onReady') + 2), context: { includeDeclaration: false },
      } }));
      const methodReferences = (await output.waitFor((message) => message.id === 236)).result;
      expect(methodReferences.map((reference: { uri: string }) => reference.uri).sort())
        .toEqual([sourceUri, sourceUri, sourceUri, sourceUri, servicesUri, compiledUri].sort());
      server.stdin.write(encode({ jsonrpc: '2.0', id: 234, method: 'textDocument/references', params: {
        textDocument: { uri: sourceUri }, position: lspPosition(source, source.indexOf('RegisteredService') + 2), context: { includeDeclaration: false },
      } }));
      const classReferences = (await output.waitFor((message) => message.id === 234)).result;
      expect(classReferences).toHaveLength(13);
      expect(classReferences).toEqual(expect.arrayContaining([
        expect.objectContaining({ uri: servicesUri }), expect.objectContaining({ uri: compiledUri }), expect.objectContaining({ uri: sourceUri }),
      ]));
      expect(classReferences.some((reference: { uri: string; range: { start: { line: number; character: number }; end: { line: number; character: number } } }) =>
        reference.uri === sourceUri && source.slice(lspOffset(source, reference.range.start), lspOffset(source, reference.range.end)) === '$event')).toBe(true);
      expect(classReferences.some((reference: { uri: string; range: { start: { line: number; character: number }; end: { line: number; character: number } } }) =>
        reference.uri === sourceUri && source.slice(lspOffset(source, reference.range.start), lspOffset(source, reference.range.end)) === '$alias')).toBe(true);
      expect(classReferences.some((reference: { uri: string; range: { start: { line: number; character: number }; end: { line: number; character: number } } }) =>
        reference.uri === sourceUri && source.slice(lspOffset(source, reference.range.start), lspOffset(source, reference.range.end)) === '$branch')).toBe(true);
      expect(classReferences.some((reference: { uri: string; range: { start: { line: number; character: number }; end: { line: number; character: number } } }) =>
        reference.uri === sourceUri && source.slice(lspOffset(source, reference.range.start), lspOffset(source, reference.range.end)) === '$message')).toBe(false);
      expect(classReferences.filter((reference: { uri: string; range: { start: { line: number; character: number }; end: { line: number; character: number } } }) =>
        reference.uri === sourceUri && source.slice(lspOffset(source, reference.range.start), lspOffset(source, reference.range.end)) === 'app.branch')).toHaveLength(2);
      expect(classReferences.some((reference: { uri: string; range: { start: { line: number; character: number }; end: { line: number; character: number } } }) =>
        reference.uri === sourceUri && source.slice(lspOffset(source, reference.range.start), lspOffset(source, reference.range.end)) === 'app.optional')).toBe(false);
      server.stdin.write(encode({ jsonrpc: '2.0', id: 237, method: 'textDocument/references', params: {
        textDocument: { uri: sourceUri }, position: lspPosition(source, source.lastIndexOf('onAttribute') + 2), context: { includeDeclaration: false },
      } }));
      expect((await output.waitFor((message) => message.id === 237)).result).toEqual([
        expect.objectContaining({ uri: sourceUri }),
        expect.objectContaining({ uri: sourceUri }),
        expect.objectContaining({ uri: sourceUri }),
        expect.objectContaining({ uri: sourceUri }),
        expect.objectContaining({ uri: sourceUri }),
      ]);
      for (const [id, method] of [[238, 'onInherited'], [239, 'onTrait']] as const) {
        server.stdin.write(encode({ jsonrpc: '2.0', id, method: 'textDocument/references', params: {
          textDocument: { uri: sourceUri }, position: lspPosition(source, source.indexOf('function ' + method) + 10), context: { includeDeclaration: false },
        } }));
        const inherited = (await output.waitFor((message) => message.id === id)).result;
        expect(inherited.map((reference: { uri: string }) => reference.uri).sort()).toEqual([sourceUri, servicesUri, compiledUri].sort());
      }
      for (const [id, method] of [[240, 'hiddenListener'], [241, 'staticListener']] as const) {
        server.stdin.write(encode({ jsonrpc: '2.0', id, method: 'textDocument/references', params: {
          textDocument: { uri: sourceUri }, position: lspPosition(source, source.indexOf('function ' + method) + 10), context: { includeDeclaration: false },
        } }));
        expect((await output.waitFor((message) => message.id === id)).result).toEqual([]);
      }
      server.stdin.write(encode({ jsonrpc: '2.0', id: 242, method: 'textDocument/references', params: {
        textDocument: { uri: sourceUri }, position: lspPosition(source, source.indexOf('DerivedListener') + 2), context: { includeDeclaration: false },
      } }));
      const derivedReferences = (await output.waitFor((message) => message.id === 242)).result;
      const sourceByUri = new Map([[sourceUri, source], [servicesUri, await readFile(servicesPath, 'utf8')], [compiledUri, await readFile(compiledPath, 'utf8')]]);
      const referencedText = derivedReferences.flatMap((reference: { uri: string; range: { start: { line: number; character: number }; end: { line: number; character: number } } }) => {
        const text = sourceByUri.get(reference.uri); return text ? [text.slice(lspOffset(text, reference.range.start), lspOffset(text, reference.range.end))] : [];
      });
      expect(referencedText).toEqual(expect.arrayContaining([
        'app.inherited', 'app.trait', 'app.yaml.inherited', 'app.yaml.trait', 'app.compiled.inherited', 'app.compiled.trait',
      ]));
      for (const [id, method, event, attributeEvent] of [
        [243, 'onParentMap', 'app.parent.map', 'app.parent.attribute'],
        [244, 'onTraitMap', 'app.trait.map', 'ReadyEvent::class'],
      ] as const) {
        server.stdin.write(encode({ jsonrpc: '2.0', id, method: 'textDocument/references', params: {
          textDocument: { uri: sourceUri }, position: lspPosition(source, source.indexOf('function ' + method) + 10), context: { includeDeclaration: false },
        } }));
        const inheritedMap = (await output.waitFor((message) => message.id === id)).result;
        expect(inheritedMap).toHaveLength(method === 'onTraitMap' ? 11 : 6);
        expect(inheritedMap.map((reference: { range: { start: { line: number; character: number }; end: { line: number; character: number } } }) =>
          source.slice(lspOffset(source, reference.range.start), lspOffset(source, reference.range.end))))
          .toEqual(expect.arrayContaining([method, 'AsEventListener']));
        const listenerClass = method === 'onParentMap' ? 'InheritedMapListener' : 'TraitMapListener';
        server.stdin.write(encode({ jsonrpc: '2.0', id: id + 10, method: 'textDocument/references', params: {
          textDocument: { uri: sourceUri }, position: lspPosition(source, source.indexOf('class ' + listenerClass) + 8), context: { includeDeclaration: false },
        } }));
        const classReferencesForMap = (await output.waitFor((message) => message.id === id + 10)).result;
        expect(classReferencesForMap.some((reference: { uri: string; range: { start: { line: number; character: number }; end: { line: number; character: number } } }) =>
          reference.uri === sourceUri && source.slice(lspOffset(source, reference.range.start), lspOffset(source, reference.range.end)) === event)).toBe(true);
        expect(classReferencesForMap.some((reference: { uri: string; range: { start: { line: number; character: number }; end: { line: number; character: number } } }) =>
          reference.uri === sourceUri && source.slice(lspOffset(source, reference.range.start), lspOffset(source, reference.range.end)) === attributeEvent)).toBe(true);
        for (const relativeEvent of ['self::SELF_EVENT', 'static::STATIC_EVENT', 'parent::ROOT_EVENT']) {
          expect(classReferencesForMap.some((reference: { uri: string; range: { start: { line: number; character: number }; end: { line: number; character: number } } }) =>
            reference.uri === sourceUri && source.slice(lspOffset(source, reference.range.start), lspOffset(source, reference.range.end)) === relativeEvent)).toBe(true);
        }
        const nonInheritedClassEvent = method === 'onParentMap' ? 'app.parent.class' : 'app.trait.class';
        expect(classReferencesForMap.some((reference: { uri: string; range: { start: { line: number; character: number }; end: { line: number; character: number } } }) =>
          reference.uri === sourceUri && source.slice(lspOffset(source, reference.range.start), lspOffset(source, reference.range.end)) === nonInheritedClassEvent)).toBe(false);
      }
      server.stdin.write(encode({ jsonrpc: '2.0', id: 255, method: 'textDocument/references', params: {
        textDocument: { uri: sourceUri }, position: lspPosition(source, source.lastIndexOf('onTraitAlias') + 2), context: { includeDeclaration: false },
      } }));
      const aliasAttributeReferences = (await output.waitFor((message) => message.id === 255)).result;
      expect(aliasAttributeReferences.map((reference: { range: { start: { line: number; character: number }; end: { line: number; character: number } } }) =>
        source.slice(lspOffset(source, reference.range.start), lspOffset(source, reference.range.end))))
        .toEqual(expect.arrayContaining(['AsEventListener', 'new ReadyEvent()']));
      expect(output.messages.some((message: any) => message.method === 'window/logMessage' && message.params?.message?.includes('[index:'))).toBe(false);
      server.stdin.write(encode({ jsonrpc: '2.0', id: 235, method: 'shutdown', params: null })); await output.waitFor((message) => message.id === 235);
      server.stdin.write(encode({ jsonrpc: '2.0', method: 'exit', params: null }));
    } finally { await rm(root, { recursive: true, force: true }); }
  });

  it('returns references for a local variable without crossing function scopes', async () => {
    const root = await mkdtemp(join(tmpdir(), 'php-companion-local-references-'));
    try {
      const sourceDirectory = join(root, 'src'); const dependencyDirectory = join(root, 'vendor', 'dependency');
      await mkdir(sourceDirectory); await mkdir(join(root, 'vendor', 'composer'), { recursive: true }); await mkdir(dependencyDirectory, { recursive: true });
      const source = `<?php
        final class Service implements MissingContract {
          public function __construct(private object $dependency) {}
          public function dependency(): object { return $this->dependency; }
        }
        function first(object $event): void { $callable = $event; echo $callable; }
        function second(object $request): void { $callable = $request; echo $callable; }
      `;
      const sourcePath = join(sourceDirectory, 'Functions.php'); const sourceUri = pathToFileURL(sourcePath).toString();
      await writeFile(join(root, 'composer.json'), JSON.stringify({ autoload: { 'psr-4': { 'App\\': 'src/' } } }));
      await writeFile(join(root, 'composer.lock'), JSON.stringify({ packages: [{ name: 'vendor/dependency', autoload: { 'psr-4': { 'Dependency\\': '' } } }] }));
      await writeFile(join(root, 'vendor', 'composer', 'installed.json'), JSON.stringify({ packages: [{ name: 'vendor/dependency', install_path: '../dependency' }] }));
      await writeFile(join(dependencyDirectory, 'Extra.php'), '<?php namespace Dependency; final class Extra {}');
      await writeFile(sourcePath, source);
      server = spawn(process.execPath, [resolve('dist/server.js'), '--stdio'], { stdio: 'pipe' });
      const output = messagesFrom(server); const rootUri = pathToFileURL(root).toString();
      server.stdin.write(encode({ jsonrpc: '2.0', id: 256, method: 'initialize', params: {
        processId: null, capabilities: {}, rootUri,
        initializationOptions: { indexLimits: { maxFiles: 1, maxFileSizeBytes: 524_288, maxTotalBytes: 1_048_576 } },
      } }));
      await output.waitFor((message) => message.id === 256);
      server.stdin.write(encode({ jsonrpc: '2.0', method: 'initialized', params: {} }));
      server.stdin.write(encode({ jsonrpc: '2.0', method: 'textDocument/didOpen', params: {
        textDocument: { uri: sourceUri, languageId: 'php', version: 1, text: source },
      } }));
      await output.waitFor((message) => message.method === 'textDocument/publishDiagnostics' && message.params?.uri === sourceUri);
      server.stdin.write(encode({ jsonrpc: '2.0', id: 257, method: 'textDocument/references', params: {
        textDocument: { uri: sourceUri }, position: lspPosition(source, source.indexOf('$callable') + 2), context: { includeDeclaration: true },
      } }));
      const result = (await output.waitFor((message) => message.id === 257)).result;
      expect(result).toHaveLength(2);
      expect(result.every((item: any) => item.uri === sourceUri
        && lspOffset(source, item.range.start) < source.indexOf('function second'))).toBe(true);
      server.stdin.write(encode({ jsonrpc: '2.0', id: 258, method: 'textDocument/references', params: {
        textDocument: { uri: sourceUri }, position: lspPosition(source, source.indexOf('$dependency') + 2), context: { includeDeclaration: true },
      } }));
      expect((await output.waitFor((message) => message.id === 258)).result).toHaveLength(2);
      const promotedPosition = lspPosition(source, source.indexOf('$dependency') + 2);
      server.stdin.write(encode({ jsonrpc: '2.0', id: 259, method: 'textDocument/prepareRename', params: {
        textDocument: { uri: sourceUri }, position: promotedPosition,
      } }));
      expect((await output.waitFor((message) => message.id === 259)).result).toBeTruthy();
      server.stdin.write(encode({ jsonrpc: '2.0', id: 260, method: 'textDocument/rename', params: {
        textDocument: { uri: sourceUri }, position: promotedPosition, newName: 'service',
      } }));
      expect((await output.waitFor((message) => message.id === 260)).result.changes[sourceUri]).toHaveLength(2);
      server.stdin.write(encode({ jsonrpc: '2.0', id: 261, method: 'shutdown', params: null }));
      await output.waitFor((message) => message.id === 261);
      server.stdin.write(encode({ jsonrpc: '2.0', method: 'exit', params: null }));
    } finally { await rm(root, { recursive: true, force: true }); }
  });

  it('does not repeat a completed project scan when only the dependency index is partial', async () => {
    const root = await mkdtemp(join(tmpdir(), 'php-companion-partial-dependency-'));
    try {
      const sourceDirectory = join(root, 'src'); const dependencyDirectory = join(root, 'vendor', 'acme', 'lib', 'src');
      await mkdir(sourceDirectory); await mkdir(join(root, 'vendor', 'composer'), { recursive: true }); await mkdir(dependencyDirectory, { recursive: true });
      const source = '<?php namespace App; final class Consumer { public function consume(): void { new MissingType(); } }';
      const sourcePath = join(sourceDirectory, 'Consumer.php'); const sourceUri = pathToFileURL(sourcePath).toString();
      await writeFile(join(root, 'composer.json'), JSON.stringify({ autoload: { 'psr-4': { 'App\\': 'src/' } } }));
      await writeFile(join(root, 'composer.lock'), JSON.stringify({ packages: [{ name: 'acme/lib', autoload: { 'psr-4': { 'Acme\\': 'src/' } } }] }));
      await writeFile(join(root, 'vendor', 'composer', 'installed.json'), JSON.stringify({ packages: [{ name: 'acme/lib', install_path: '../acme/lib' }] }));
      await writeFile(sourcePath, source);
      await writeFile(join(dependencyDirectory, 'Oversized.php'), `<?php ${'x'.repeat(524_288)}`);

      server = spawn(process.execPath, [resolve('dist/server.js'), '--stdio'], { stdio: 'pipe' });
      const output = messagesFrom(server); const rootUri = pathToFileURL(root).toString();
      server.stdin.write(encode({ jsonrpc: '2.0', id: 240, method: 'initialize', params: { processId: null, capabilities: {}, rootUri } }));
      await output.waitFor((message) => message.id === 240);
      server.stdin.write(encode({ jsonrpc: '2.0', method: 'initialized', params: {} }));
      await output.waitFor((message) => message.method === 'window/logMessage'
        && message.params?.message?.includes('Indexed 1 PHP files') && message.params.message.includes('complete=false'));
      server.stdin.write(encode({ jsonrpc: '2.0', method: 'textDocument/didOpen', params: {
        textDocument: { uri: sourceUri, languageId: 'php', version: 1, text: source },
      } }));
      await output.waitFor((message) => message.method === 'textDocument/publishDiagnostics' && message.params?.uri === sourceUri);
      server.stdin.write(encode({ jsonrpc: '2.0', id: 241, method: 'phpCompanion/importCandidates', params: {
        textDocument: { uri: sourceUri }, position: lspPosition(source, source.indexOf('MissingType')), name: 'MissingType',
      } }));
      expect((await output.waitFor((message) => message.id === 241)).result).toEqual([]);
      expect(output.messages.filter((message: any) => message.method === 'window/logMessage'
        && message.params?.message?.includes('Indexed 1 PHP files'))).toHaveLength(1);
      const movedUri = pathToFileURL(join(root, 'src', 'Moved', 'Consumer.php')).toString(); await mkdir(join(root, 'src', 'Moved'));
      server.stdin.write(encode({ jsonrpc: '2.0', id: 2411, method: 'phpCompanion/planSafeMove', params: {
        moves: [{ oldUri: sourceUri, newUri: movedUri, source }], includeFileOperations: false,
      } }));
      const safeMove = (await output.waitFor((message) => message.id === 2411)).result;
      expect(safeMove.error).toBeUndefined();
      expect(safeMove.edit.changes[movedUri]).toEqual(expect.arrayContaining([expect.objectContaining({ newText: 'App\\Moved' })]));
      server.stdin.write(encode({ jsonrpc: '2.0', id: 242, method: 'shutdown', params: null }));
      await output.waitFor((message) => message.id === 242);
      server.stdin.write(encode({ jsonrpc: '2.0', method: 'exit', params: null }));
    } finally { await rm(root, { recursive: true, force: true }); }
  });

  it('shares initial indexing across concurrent completeness requests', async () => {
    const root = await mkdtemp(join(tmpdir(), 'php-companion-shared-indexing-'));
    try {
      const sourceDirectory = join(root, 'src'); await mkdir(sourceDirectory);
      const source = '<?php namespace App; final class Consumer { public function run(): void { new MissingType(); } }';
      const sourcePath = join(sourceDirectory, 'Consumer.php'); const sourceUri = pathToFileURL(sourcePath).toString();
      await writeFile(join(root, 'composer.json'), JSON.stringify({ autoload: { 'psr-4': { 'App\\': 'src/' } } }));
      await writeFile(sourcePath, source);
      await Promise.all(Array.from({ length: 1_000 }, (_, index) => writeFile(join(sourceDirectory, `Type${String(index).padStart(4, '0')}.php`),
        `<?php namespace App; final class Type${index} { public function value(): int { return ${index}; } }`)));

      server = spawn(process.execPath, [resolve('dist/server.js'), '--stdio'], { stdio: 'pipe' });
      const output = messagesFrom(server); const rootUri = pathToFileURL(root).toString();
      server.stdin.write(encode({ jsonrpc: '2.0', id: 246, method: 'initialize', params: { processId: null, capabilities: {}, rootUri } }));
      await output.waitFor((message) => message.id === 246);
      server.stdin.write(encode({ jsonrpc: '2.0', method: 'initialized', params: {} }));
      server.stdin.write(encode({ jsonrpc: '2.0', method: 'textDocument/didOpen', params: {
        textDocument: { uri: sourceUri, languageId: 'php', version: 1, text: source },
      } }));
      await output.waitFor((message) => message.method === 'textDocument/publishDiagnostics' && message.params?.uri === sourceUri);
      const position = lspPosition(source, source.indexOf('MissingType') + 2);
      server.stdin.write(encode({ jsonrpc: '2.0', id: 247, method: 'phpCompanion/importCandidates', params: {
        textDocument: { uri: sourceUri }, position, name: 'MissingType',
      } }) + encode({ jsonrpc: '2.0', id: 248, method: 'phpCompanion/unresolvedTypeNames', params: {
        textDocument: { uri: sourceUri },
      } }));
      await output.waitFor((message) => message.id === 247, 15_000);
      await output.waitFor((message) => message.id === 248, 15_000);
      await output.waitFor((message) => message.method === 'window/logMessage' && message.params?.message?.includes('Indexed 1001 PHP files'), 15_000);
      expect(output.messages.some((message: any) => message.method === 'window/logMessage'
        && message.params?.message === 'Project indexing was cancelled.')).toBe(false);
      server.stdin.write(encode({ jsonrpc: '2.0', id: 249, method: 'shutdown', params: null }));
      await output.waitFor((message) => message.id === 249);
      server.stdin.write(encode({ jsonrpc: '2.0', method: 'exit', params: null }));
    } finally { await rm(root, { recursive: true, force: true }); }
  });

  it('loads an exact Composer PSR-4 definition omitted by the initial dependency budget', async () => {
    const root = await mkdtemp(join(tmpdir(), 'php-companion-on-demand-definition-'));
    try {
      const sourceDirectory = join(root, 'src'); const dependencyDirectory = join(root, 'vendor', 'symfony', 'event-dispatcher');
      await mkdir(sourceDirectory); await mkdir(join(root, 'vendor', 'composer'), { recursive: true }); await mkdir(dependencyDirectory, { recursive: true });
      const source = '<?php namespace App; use Symfony\\Component\\EventDispatcher\\EventSubscriberInterface; final class Subscriber implements EventSubscriberInterface {}';
      const sourcePath = join(sourceDirectory, 'Subscriber.php'); const sourceUri = pathToFileURL(sourcePath).toString();
      const targetPath = join(dependencyDirectory, 'EventSubscriberInterface.php'); const targetUri = pathToFileURL(targetPath).toString();
      await writeFile(join(root, 'composer.json'), JSON.stringify({ autoload: { 'psr-4': { 'App\\': 'src/' } } }));
      await writeFile(join(root, 'composer.lock'), JSON.stringify({ packages: [{ name: 'symfony/event-dispatcher', autoload: { 'psr-4': { 'Symfony\\Component\\EventDispatcher\\': '' } } }] }));
      await writeFile(join(root, 'vendor', 'composer', 'installed.json'), JSON.stringify({ packages: [{ name: 'symfony/event-dispatcher', install_path: '../symfony/event-dispatcher' }] }));
      await writeFile(sourcePath, source);
      await writeFile(targetPath, '<?php namespace Symfony\\Component\\EventDispatcher; interface EventSubscriberInterface {}');

      server = spawn(process.execPath, [resolve('dist/server.js'), '--stdio'], { stdio: 'pipe' });
      const output = messagesFrom(server); const rootUri = pathToFileURL(root).toString();
      server.stdin.write(encode({ jsonrpc: '2.0', id: 243, method: 'initialize', params: {
        processId: null, capabilities: {}, rootUri,
        initializationOptions: { indexLimits: { maxFiles: 1, maxFileSizeBytes: 524_288, maxTotalBytes: 1_048_576 } },
      } }));
      await output.waitFor((message) => message.id === 243);
      server.stdin.write(encode({ jsonrpc: '2.0', method: 'initialized', params: {} }));
      await output.waitFor((message) => message.method === 'window/logMessage'
        && message.params?.message?.includes('Indexed 1 PHP files') && message.params.message.includes('complete=false'));
      server.stdin.write(encode({ jsonrpc: '2.0', method: 'textDocument/didOpen', params: {
        textDocument: { uri: sourceUri, languageId: 'php', version: 1, text: source },
      } }));
      await output.waitFor((message) => message.method === 'textDocument/publishDiagnostics' && message.params?.uri === sourceUri);
      const offset = source.lastIndexOf('EventSubscriberInterface') + 2;
      server.stdin.write(encode({ jsonrpc: '2.0', id: 244, method: 'textDocument/definition', params: {
        textDocument: { uri: sourceUri }, position: lspPosition(source, offset),
      } }));
      expect((await output.waitFor((message) => message.id === 244)).result).toMatchObject([{ uri: targetUri }]);
      expect(output.messages.filter((message: any) => message.method === 'window/logMessage'
        && message.params?.message?.includes('Indexed 1 PHP files'))).toHaveLength(1);
      server.stdin.write(encode({ jsonrpc: '2.0', id: 245, method: 'shutdown', params: null }));
      await output.waitFor((message) => message.id === 245);
      server.stdin.write(encode({ jsonrpc: '2.0', method: 'exit', params: null }));
    } finally { await rm(root, { recursive: true, force: true }); }
  });

  it('loads an omitted PSR-4 member owner before workspace indexing is complete', async () => {
    const root = await mkdtemp(join(tmpdir(), 'php-companion-on-demand-member-definition-'));
    try {
      const sourceDirectory = join(root, 'src'); await mkdir(sourceDirectory);
      const source = `<?php namespace App;
        final class Subscriber {
          public function __construct(private readonly PasswordChangeGuard $guard) {}
          public function run(): bool { return $this->guard->shouldRedirect(); }
        }`;
      const sourcePath = join(sourceDirectory, 'Subscriber.php'); const sourceUri = pathToFileURL(sourcePath).toString();
      const targetPath = join(sourceDirectory, 'PasswordChangeGuard.php'); const targetUri = pathToFileURL(targetPath).toString();
      await writeFile(join(root, 'composer.json'), JSON.stringify({ autoload: { 'psr-4': { 'App\\': 'src/' } } }));
      await writeFile(sourcePath, source);
      await writeFile(targetPath, '<?php namespace App; final class PasswordChangeGuard { public function shouldRedirect(): bool { return true; } }');

      server = spawn(process.execPath, [resolve('dist/server.js'), '--stdio'], { stdio: 'pipe' });
      const output = messagesFrom(server); const rootUri = pathToFileURL(root).toString();
      server.stdin.write(encode({ jsonrpc: '2.0', id: 250, method: 'initialize', params: {
        processId: null, capabilities: {}, rootUri,
        initializationOptions: { indexLimits: { maxFiles: 1, maxFileSizeBytes: 524_288, maxTotalBytes: 1_048_576 } },
      } }));
      await output.waitFor((message) => message.id === 250);
      server.stdin.write(encode({ jsonrpc: '2.0', method: 'initialized', params: {} }));
      await output.waitFor((message) => message.method === 'window/logMessage'
        && message.params?.message?.includes('Indexed 0 PHP files') && message.params.message.includes('complete=false'));
      server.stdin.write(encode({ jsonrpc: '2.0', method: 'textDocument/didOpen', params: {
        textDocument: { uri: sourceUri, languageId: 'php', version: 1, text: source },
      } }));
      await output.waitFor((message) => message.method === 'textDocument/publishDiagnostics' && message.params?.uri === sourceUri);
      server.stdin.write(encode({ jsonrpc: '2.0', id: 251, method: 'textDocument/definition', params: {
        textDocument: { uri: sourceUri }, position: lspPosition(source, source.indexOf('shouldRedirect') + 2),
      } }));
      expect((await output.waitFor((message) => message.id === 251)).result).toMatchObject([{ uri: targetUri }]);
      server.stdin.write(encode({ jsonrpc: '2.0', id: 252, method: 'shutdown', params: null }));
      await output.waitFor((message) => message.id === 252);
      server.stdin.write(encode({ jsonrpc: '2.0', method: 'exit', params: null }));
    } finally { await rm(root, { recursive: true, force: true }); }
  });

  it('progressively loads omitted owners in a chained member definition', async () => {
    const root = await mkdtemp(join(tmpdir(), 'php-companion-on-demand-member-chain-'));
    try {
      const sourceDirectory = join(root, 'src'); const frameworkDirectory = join(root, 'vendor', 'framework');
      await mkdir(sourceDirectory); await mkdir(frameworkDirectory, { recursive: true });
      const source = `<?php namespace App; use Framework\\Request;
        final class Guard { public function check(Request $request): mixed { return $request->getSession()->get('admin.login'); } }`;
      const sourcePath = join(sourceDirectory, 'Guard.php'); const sourceUri = pathToFileURL(sourcePath).toString();
      const requestPath = join(frameworkDirectory, 'Request.php');
      const sessionPath = join(frameworkDirectory, 'SessionInterface.php'); const sessionUri = pathToFileURL(sessionPath).toString();
      await writeFile(join(root, 'composer.json'), JSON.stringify({ autoload: { 'psr-4': { 'App\\': 'src/', 'Framework\\': 'vendor/framework/' } } }));
      await writeFile(sourcePath, source);
      await writeFile(requestPath, '<?php namespace Framework; final class Request { public function getSession(): SessionInterface {} }');
      await writeFile(sessionPath, '<?php namespace Framework; interface SessionInterface { public function get(string $name, mixed $default = null): mixed; }');

      server = spawn(process.execPath, [resolve('dist/server.js'), '--stdio'], { stdio: 'pipe' });
      const output = messagesFrom(server); const rootUri = pathToFileURL(root).toString();
      server.stdin.write(encode({ jsonrpc: '2.0', id: 253, method: 'initialize', params: {
        processId: null, capabilities: {}, rootUri,
        initializationOptions: { indexLimits: { maxFiles: 1, maxFileSizeBytes: 524_288, maxTotalBytes: 1_048_576 } },
      } }));
      await output.waitFor((message) => message.id === 253);
      server.stdin.write(encode({ jsonrpc: '2.0', method: 'initialized', params: {} }));
      await output.waitFor((message) => message.method === 'window/logMessage'
        && message.params?.message?.includes('Indexed 0 PHP files') && message.params.message.includes('complete=false'));
      server.stdin.write(encode({ jsonrpc: '2.0', method: 'textDocument/didOpen', params: {
        textDocument: { uri: sourceUri, languageId: 'php', version: 1, text: source },
      } }));
      await output.waitFor((message) => message.method === 'textDocument/publishDiagnostics' && message.params?.uri === sourceUri);
      server.stdin.write(encode({ jsonrpc: '2.0', id: 254, method: 'textDocument/definition', params: {
        textDocument: { uri: sourceUri }, position: lspPosition(source, source.lastIndexOf('->get(') + 3),
      } }));
      expect((await output.waitFor((message) => message.id === 254)).result).toMatchObject([{ uri: sessionUri }]);
      server.stdin.write(encode({ jsonrpc: '2.0', id: 255, method: 'shutdown', params: null }));
      await output.waitFor((message) => message.id === 255);
      server.stdin.write(encode({ jsonrpc: '2.0', method: 'exit', params: null }));
    } finally { await rm(root, { recursive: true, force: true }); }
  });

  it('progressively loads exact dependency owners for generic member completion', async () => {
    const root = await mkdtemp(join(tmpdir(), 'php-companion-on-demand-generic-completion-'));
    try {
      const sourceDirectory = join(root, 'src'); const doctrineDirectory = join(root, 'vendor', 'doctrine', 'orm', 'src');
      await mkdir(sourceDirectory); await mkdir(doctrineDirectory, { recursive: true }); await mkdir(join(root, 'vendor', 'composer'), { recursive: true });
      const source = `<?php namespace App;
        use Doctrine\\ORM\\EntityManagerInterface;
        final class Item { public function label(): string {} }
        function valid(EntityManagerInterface $manager): void {
          $repository = $manager->getRepository(Item::class); $repository->fi;
          $item = $repository->find(1); $item?->lab;
        }
        function dynamic(EntityManagerInterface $manager, string $class): void {
          $repository = $manager->getRepository($class); $item = $repository->find(1); $item?->lab;
        }`;
      const sourcePath = join(sourceDirectory, 'Consumer.php'); const sourceUri = pathToFileURL(sourcePath).toString();
      await writeFile(join(root, 'composer.json'), JSON.stringify({ autoload: { 'psr-4': { 'App\\': 'src/' } } }));
      await writeFile(join(root, 'composer.lock'), JSON.stringify({ packages: [{ name: 'doctrine/orm', autoload: { 'psr-4': { 'Doctrine\\ORM\\': 'src/' } } }] }));
      await writeFile(join(root, 'vendor', 'composer', 'installed.json'), JSON.stringify({ packages: [{ name: 'doctrine/orm', install_path: '../doctrine/orm' }] }));
      await writeFile(sourcePath, source);
      await writeFile(join(doctrineDirectory, 'EntityManagerInterface.php'), `<?php namespace Doctrine\\ORM;
        interface EntityManagerInterface {
          /** @template T of object
           * @param class-string<T> $className
           * @return EntityRepository<T> */
          public function getRepository(string $className): EntityRepository;
        }`);
      await writeFile(join(doctrineDirectory, 'EntityRepository.php'), `<?php namespace Doctrine\\ORM;
        /** @template TEntity of object */ class EntityRepository {
          /** @return object|null
           * @phpstan-return TEntity|null */
          public function find(mixed $id): object|null {}
        }`);

      server = spawn(process.execPath, [resolve('dist/server.js'), '--stdio'], { stdio: 'pipe' });
      const output = messagesFrom(server); const rootUri = pathToFileURL(root).toString();
      server.stdin.write(encode({ jsonrpc: '2.0', id: 256, method: 'initialize', params: {
        processId: null, capabilities: {}, rootUri, initializationOptions: { indexingMode: 'onDemand' },
      } }));
      await output.waitFor((message) => message.id === 256);
      server.stdin.write(encode({ jsonrpc: '2.0', method: 'initialized', params: {} }));
      server.stdin.write(encode({ jsonrpc: '2.0', method: 'textDocument/didOpen', params: {
        textDocument: { uri: sourceUri, languageId: 'php', version: 1, text: source },
      } }));
      await output.waitFor((message) => message.method === 'textDocument/publishDiagnostics' && message.params?.uri === sourceUri);
      server.stdin.write(encode({ jsonrpc: '2.0', id: 257, method: 'textDocument/completion', params: {
        textDocument: { uri: sourceUri }, position: lspPosition(source, source.indexOf('fi;') + 2),
      } }));
      const completion = await output.waitFor((message) => message.id === 257);
      expect(completion.result).toMatchObject([
        { label: 'find', detail: expect.stringContaining('App\\Item|null') },
      ]);
      server.stdin.write(encode({ jsonrpc: '2.0', id: 258, method: 'textDocument/completion', params: {
        textDocument: { uri: sourceUri }, position: lspPosition(source, source.indexOf('lab;') + 3),
      } }));
      expect((await output.waitFor((message) => message.id === 258)).result).toMatchObject([{ label: 'label' }]);
      server.stdin.write(encode({ jsonrpc: '2.0', id: 259, method: 'textDocument/completion', params: {
        textDocument: { uri: sourceUri }, position: lspPosition(source, source.lastIndexOf('lab;') + 3),
      } }));
      expect((await output.waitFor((message) => message.id === 259)).result).toEqual([]);
      server.stdin.write(encode({ jsonrpc: '2.0', id: 260, method: 'shutdown', params: null }));
      await output.waitFor((message) => message.id === 260);
      server.stdin.write(encode({ jsonrpc: '2.0', method: 'exit', params: null }));
    } finally { await rm(root, { recursive: true, force: true }); }
  });

  it('refreshes Symfony XML service facts through the authoritative provider', async () => {
    const root = await mkdtemp(join(tmpdir(), 'php-companion-symfony-hot-'));
    try {
      const sourceDirectory = join(root, 'src');
      const configDirectory = join(root, 'config'); const containerDirectory = join(root, 'var', 'cache', 'dev');
      const bundleDirectory = join(root, 'bundle'); const bundleConfigDirectory = join(bundleDirectory, 'Resources', 'config');
      await mkdir(sourceDirectory); await mkdir(configDirectory); await mkdir(containerDirectory, { recursive: true }); await mkdir(bundleConfigDirectory, { recursive: true });
      const source = `<?php namespace Psr\\Container { interface ContainerInterface { public function get(string $id): mixed; } }
        namespace App { class Mailer { public function send(): void {} }
        function run(\\Psr\\Container\\ContainerInterface $container): void { $container->get('app.mailer')->se; $container->get('app.bundled')->se; } }`;
      const sourcePath = join(sourceDirectory, 'App.php'); const sourceUri = pathToFileURL(sourcePath).toString();
      await writeFile(join(root, 'composer.json'), JSON.stringify({ autoload: { classmap: ['src/App.php', 'bundle/Bundles.php'] } }));
      await writeFile(join(root, 'composer.lock'), '{}');
      await writeFile(sourcePath, source);
      await writeFile(join(bundleDirectory, 'Bundles.php'), '<?php namespace Symfony\\Component\\HttpKernel\\Bundle { abstract class Bundle {} } namespace Vendor\\Shared { final class SharedBundle extends \\Symfony\\Component\\HttpKernel\\Bundle\\Bundle {} final class CustomBundle extends \\Symfony\\Component\\HttpKernel\\Bundle\\Bundle { public function getPath(): string { return __DIR__; } } final class ConstructedBundle extends \\Symfony\\Component\\HttpKernel\\Bundle\\Bundle { public function __construct() {} } }');
      await writeFile(join(configDirectory, 'bundles.php'), "<?php return [Vendor\\Shared\\SharedBundle::class => ['all' => true], Vendor\\Shared\\CustomBundle::class => ['all' => true], Vendor\\Shared\\ConstructedBundle::class => ['all' => true]];");
      const bundledPath = join(bundleConfigDirectory, 'bundled.php'); const bundledUri = pathToFileURL(bundledPath).toString();
      await writeFile(bundledPath, `<?php
        use App\\Mailer;
        use Symfony\\Component\\DependencyInjection\\Loader\\Configurator\\ContainerConfigurator;
        return static function (ContainerConfigurator $container): void { $container->services()->set('app.bundled', Mailer::class)->public(); };`);
      await writeFile(join(bundleConfigDirectory, 'ignored.php'), `<?php
        use App\\Mailer;
        use Symfony\\Component\\DependencyInjection\\Loader\\Configurator\\ContainerConfigurator;
        return static function (ContainerConfigurator $container): void { $container->services()->set('app.ignored', Mailer::class)->public(); };`);
      const serviceXmlPath = join(configDirectory, 'services.xml');
      const importedDirectory = join(configDirectory, 'services'); await mkdir(importedDirectory);
      const importedPath = join(importedDirectory, 'mailer.php'); const importedUri = pathToFileURL(importedPath).toString();
      const importedYamlPath = join(importedDirectory, 'imports.yaml');
      await writeFile(serviceXmlPath, '<container><imports><import resource="services/imports.yaml"/><import resource="@SharedBundle/Resources/config/bundled.php"/><import resource="@CustomBundle/Resources/config/ignored.php"/><import resource="@ConstructedBundle/Resources/config/ignored.php"/></imports></container>');
      await writeFile(importedYamlPath, 'imports:\n  - { resource: mailer.php }\n');
      await writeFile(importedPath, `<?php
        use App\\Mailer;
        use Symfony\\Component\\DependencyInjection\\Loader\\Configurator\\ContainerConfigurator;
        return static function (ContainerConfigurator $container): void {
          $container->services()->set('app.mailer', Mailer::class)->public();
          $container->import('../services.xml');
        };`);
      await writeFile(join(containerDirectory, 'App_KernelDevDebugContainer.xml'),
        '<?xml version="1.0"?><container><services><service id="app.compiled" class="App\\Mailer" public="true"/></services></container>');
      const rootUri = pathToFileURL(root).toString();
      const start = async (id: number): Promise<ReturnType<typeof messagesFrom>> => {
        server = spawn(process.execPath, [resolve('dist/server.js'), '--stdio'], { stdio: 'pipe' });
        const output = messagesFrom(server);
        server.stdin.write(encode({ jsonrpc: '2.0', id, method: 'initialize', params: {
          processId: null, capabilities: {}, rootUri, initializationOptions: {
            bundledSemanticProviders: [symfonyServiceProviderDescriptor],
          },
        } }));
        await output.waitFor((message) => message.id === id);
        server.stdin.write(encode({ jsonrpc: '2.0', method: 'initialized', params: {} }));
        await output.waitFor((message) => message.method === 'window/logMessage'
          && message.params?.message?.includes('committed authoritative container generation'), 10_000);
        return output;
      };
      const stop = async (output: ReturnType<typeof messagesFrom>, id: number): Promise<void> => {
        server!.stdin.write(encode({ jsonrpc: '2.0', id, method: 'shutdown', params: null }));
        await output.waitFor((message) => message.id === id);
        server!.stdin.write(encode({ jsonrpc: '2.0', method: 'exit', params: null }));
        await new Promise<void>((resolveExit) => server!.once('exit', () => resolveExit()));
      };

      const hot = await start(222);
      server.stdin.write(encode({ jsonrpc: '2.0', method: 'textDocument/didOpen', params: {
        textDocument: { uri: sourceUri, languageId: 'php', version: 1, text: source },
      } }));
      await hot.waitFor((message) => message.method === 'textDocument/publishDiagnostics' && message.params?.uri === sourceUri);
      const offset = source.indexOf('->se') + 4;
      server.stdin.write(encode({ jsonrpc: '2.0', id: 223, method: 'textDocument/completion', params: {
        textDocument: { uri: sourceUri }, position: lspPosition(source, offset),
      } }));
      expect((await hot.waitFor((message) => message.id === 223)).result).toContainEqual(expect.objectContaining({ label: 'send' }));
      const bundledOffset = source.lastIndexOf('->se') + 4;
      server.stdin.write(encode({ jsonrpc: '2.0', id: 227, method: 'textDocument/completion', params: {
        textDocument: { uri: sourceUri }, position: lspPosition(source, bundledOffset),
      } }));
      expect((await hot.waitFor((message) => message.id === 227)).result).toContainEqual(expect.objectContaining({ label: 'send' }));
      server.stdin.write(encode({ jsonrpc: '2.0', id: 225, method: 'textDocument/references', params: {
        textDocument: { uri: sourceUri }, position: lspPosition(source, source.indexOf('class Mailer') + 7), context: { includeDeclaration: false },
      } }));
      const references = (await hot.waitFor((message) => message.id === 225)).result;
      expect(references).toContainEqual(expect.objectContaining({ uri: importedUri }));
      expect(references).toContainEqual(expect.objectContaining({ uri: bundledUri }));
      await writeFile(importedPath, `<?php
        use Symfony\\Component\\DependencyInjection\\Loader\\Configurator\\ContainerConfigurator;
        return static function (ContainerConfigurator $container): void {};
      `);
      server.stdin.write(encode({ jsonrpc: '2.0', method: 'workspace/didChangeWatchedFiles', params: {
        changes: [{ uri: importedUri, type: 2 }],
      } }));
      await new Promise<void>((resolvePromise) => setTimeout(resolvePromise, 500));
      server.stdin.write(encode({ jsonrpc: '2.0', id: 226, method: 'textDocument/completion', params: {
        textDocument: { uri: sourceUri }, position: lspPosition(source, offset),
      } }));
      expect((await hot.waitFor((message) => message.id === 226)).result ?? []).not.toContainEqual(expect.objectContaining({ label: 'send' }));
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
      let completedDeltas = 1; // the first event changes the open consumer on disk
      const waitForNextDelta = async (): Promise<void> => {
        completedDeltas += 1;
        await output.waitFor((message) => message.method === 'window/logMessage' && message.params?.message?.includes('[index:delta] complete')
          && output.messages.filter((candidate: any) => candidate.method === 'window/logMessage' && candidate.params?.message?.includes('[index:delta] complete')).length >= completedDeltas);
      };
      await waitForNextIndex();
      expect(output.messages.filter((message: any) => message.method === 'window/logMessage'
        && message.params?.message?.includes('Loaded Composer project snapshot for'))).toHaveLength(1);
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
      await waitForNextDelta();
      expect(await completion(217, 'Add')).toEqual(expect.arrayContaining([expect.objectContaining({ label: 'Added' })]));

      await rm(addedPath);
      server.stdin.write(encode({ jsonrpc: '2.0', method: 'workspace/didChangeWatchedFiles', params: { changes: [{ uri: addedUri, type: 3 }] } }));
      await waitForNextDelta();
      expect((await completion(218, 'Add')).some((item) => item.label === 'Added')).toBe(false);

      await rename(servicePath, movedServicePath);
      server.stdin.write(encode({ jsonrpc: '2.0', method: 'workspace/didChangeWatchedFiles', params: { changes: [{ uri: serviceUri, type: 3 }, { uri: movedServiceUri, type: 1 }] } }));
      completedDeltas += 1; // delete plus create
      await waitForNextDelta();
      expect(output.messages.filter((message: any) => message.method === 'window/logMessage' && message.params?.message?.includes('start reason='))).toHaveLength(1);
      expect(output.messages.filter((message: any) => message.method === 'window/logMessage'
        && message.params?.message?.includes('Loaded Composer project snapshot for'))).toHaveLength(1);
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
      expect(output.messages.filter((message: any) => message.method === 'window/logMessage'
        && message.params?.message?.includes('Loaded Composer project snapshot for'))).toHaveLength(2);
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
      expect((await output.waitFor((message) => message.id === 110)).result.error).toBeUndefined();
      server.stdin.write(encode({ jsonrpc: '2.0', method: 'textDocument/didChange', params: {
        textDocument: { uri, version: 3 }, contentChanges: [{ text: source }],
      } }));
      server.stdin.write(encode({ jsonrpc: '2.0', method: 'textDocument/didOpen', params: {
        textDocument: { uri: declarationUri, languageId: 'php', version: 1, text: `${declaration}\n` },
      } }));
      server.stdin.write(encode({ jsonrpc: '2.0', id: 1101, method: 'phpCompanion/planSafeMove', params: {
        moves: [{ oldUri: declarationUri, newUri: movedDeclarationUri, source: `${declaration}\n` }], includeFileOperations: true,
      } }));
      expect((await output.waitFor((message) => message.id === 1101)).result.error).toBeUndefined();
      server.stdin.write(encode({ jsonrpc: '2.0', method: 'textDocument/didClose', params: { textDocument: { uri: declarationUri } } }));
      await rename(declarationPath, join(root, 'src', 'Moved', 'OldName.php'));
      server.stdin.write(encode({ jsonrpc: '2.0', id: 111, method: 'phpCompanion/reconcileSafeMove', params: { moves: move.reconciliation } }));
      const reconciliation = (await output.waitFor((message) => message.id === 111, 10_000)).result;
      expect(reconciliation.error).toBeUndefined();
      expect(reconciliation.sources[movedDeclarationUri]).toBe(declaration);
      expect(reconciliation.sources[uri]).toBe(source);
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
      await mkdir(join(root, 'config', 'symfony'), { recursive: true });
      await mkdir(join(root, 'bundle', 'Resources', 'config', 'routing'), { recursive: true });
      await mkdir(join(root, 'dev-bundle', 'Resources', 'config', 'routing'), { recursive: true });
      await mkdir(join(root, 'src'), { recursive: true });
      await writeFile(join(root, 'composer.json'), JSON.stringify({ autoload: {
        'psr-4': { 'Vendor\\Shared\\': 'bundle/', 'Vendor\\Dev\\': 'dev-bundle/' }, classmap: ['./Controller.php'],
      } }));
      const source = String.raw`<?php
namespace Symfony\Bundle\FrameworkBundle\Controller { abstract class AbstractController { public function generateUrl(string $route, array $parameters = []): string {} } }
namespace App {
#[\Symfony\Component\Routing\Attribute\Route('/base', name: 'class_')] class Controller extends \Symfony\Bundle\FrameworkBundle\Controller\AbstractController { #[\Symfony\Component\Routing\Attribute\Route('/attribute', name: 'attribute')] public function url(): string { return $this->GENERATEURL('admin.'); } #[\Symfony\Component\Routing\Attribute\Route('/dev', name: 'dev_only', env: ['dev', 'test'])] public function devOnly(): void {} #[\Symfony\Component\Routing\Attribute\Route(path: ['en' => '/english', 'fr' => '/francais'], name: 'localized')] public function localized(): string { return $this->generateUrl('admin.class_localized.'); } public function devAttributeUrl(): string { return $this->generateUrl('admin.class_dev_'); } public function exactUrl(): string { return $this->generateUrl('admin.home'); } public function exactNamedUrl(): string { return $this->generateUrl(parameters: [], route: 'admin.home'); } public function parameterUrl(): string { return $this->generateUrl('admin.home', ['i' => 1]); } public function namedParameterUrl(): string { return $this->generateUrl(parameters: ['s' => 1, 'id' => 2], route: 'admin.home'); } public function exactLocalUrl(): string { return $this->generateUrl('local_route'); } public function exactBundleUrl(): string { return $this->generateUrl('vendor_bundle'); } public function namedUrl(): string { return $this->generateUrl(parameters: [], route: 'admin.'); } public function wrongName(): string { return $this->generateUrl(name: 'admin.'); } public function doubleUrl(): string { return $this->generateUrl("admin."); } public function kernelUrl(): string { return $this->generateUrl('kernel.'); } public function localPhpUrl(): string { return $this->generateUrl('local_'); } public function bundleUrl(): string { return $this->generateUrl('vendor_'); } public function yamlLocalizedUrl(): string { return $this->generateUrl('localized.page.'); } public function importedLocalizedUrl(): string { return $this->generateUrl('localized_page.'); } public function matchedLocalizedUrl(): string { return $this->generateUrl('localized_child.'); } public function nestedStringUrl(): string { return $this->generateUrl('localized_nested_'); } public function nestedMapUrl(): string { return $this->generateUrl('localized_map_'); } public function wrappedLocalizedUrl(): string { return $this->generateUrl('wrapped_page.'); } public function devUrl(): string { return $this->generateUrl('dev.'); } public function conditionalUrl(): string { return $this->generateUrl('conditional.'); } public function devBundleUrl(): string { return $this->generateUrl('dev_vendor_'); } }
class Other { public function generateUrl(string $route, array $parameters = []): string {} public function url(): string { return $this->generateUrl('admin.'); } public function exactUrl(): string { return $this->generateUrl('admin.home'); } public function parameterUrl(): string { return $this->generateUrl('admin.home', ['i' => 1]); } }
}`;
      const uri = pathToFileURL(join(root, 'Controller.php')).toString();
      const routeUri = pathToFileURL(join(root, 'config', 'routes', 'admin.yaml')).toString();
      const adminRoutesSource = 'home: {path: "/admin/{id}/{slug}", controller: App\\Controller::exactUrl}\n';
      await writeFile(join(root, 'Controller.php'), source);
      await writeFile(join(root, 'config', 'routes.yaml'), 'admin:\n  resource: routes/admin.yaml\n  name_prefix: admin.\n');
      await writeFile(join(root, 'config', 'routes', 'admin.yaml'), adminRoutesSource);
      await writeFile(join(root, 'bundle', 'SharedBundle.php'), '<?php namespace Symfony\\Component\\HttpKernel\\Bundle { abstract class Bundle {} } namespace Vendor\\Shared { final class SharedBundle extends \\Symfony\\Component\\HttpKernel\\Bundle\\Bundle {} }');
      await writeFile(join(root, 'dev-bundle', 'DevBundle.php'), '<?php namespace Vendor\\Dev { final class DevBundle extends \\Symfony\\Component\\HttpKernel\\Bundle\\Bundle {} }');
      await writeFile(join(root, 'config', 'bundles.php'), "<?php return [Vendor\\Shared\\SharedBundle::class => ['all' => true], Vendor\\Dev\\DevBundle::class => ['dev' => true]];");
      await writeFile(join(root, 'src', 'Kernel.php'), `<?php namespace App;
        use Symfony\\Component\\HttpKernel\\Kernel as BaseKernel;
        use Symfony\\Component\\Routing\\Loader\\Configurator\\RoutingConfigurator;
        final class Kernel extends BaseKernel { protected function configureRoutes(RoutingConfigurator $routes): void {
          $routes->import(dirname(__DIR__) . '/config/routes.yaml');
          $routes->import(dirname(__DIR__) . '/config/symfony/routes.yaml');
          if ($this->environment === 'dev') { $routes->import(dirname(__DIR__) . '/config/symfony/dev.yaml'); }
        } }`);
      await writeFile(join(root, 'config', 'symfony', 'routes.yaml'), `kernel.home: {path: /kernel}
local_php: {resource: local.php, prefix: /local, name_prefix: local_}
bundle_php: {resource: '@SharedBundle/Resources/config/routing/routes.php', prefix: /vendor, name_prefix: vendor_}
localized.page: {path: {en: /english, fr: /francais}}
localized_import: {resource: localized.yaml, prefix: {en: /en, fr: /fr, de: /de}, name_prefix: localized_}
string_wrapper: {resource: wrapper.yaml, prefix: /outer}
when@dev:
  conditional.page: {path: /conditional}
`);
      await writeFile(join(root, 'config', 'symfony', 'localized.yaml'), `page: {path: /page}
child: {path: {en: /english-child, fr: /francais-child}}
nested_string: {resource: grand.yaml, prefix: /nested, name_prefix: nested_}
nested_map: {resource: grand.yaml, prefix: {en: /inner-en, fr: /inner-fr}, name_prefix: map_}
`);
      await writeFile(join(root, 'config', 'symfony', 'wrapper.yaml'), 'localized: {resource: grand.yaml, prefix: {en: /en, fr: /fr}, name_prefix: wrapped_}\n');
      await writeFile(join(root, 'config', 'symfony', 'grand.yaml'), 'page: {path: /page}\n');
      await writeFile(join(root, 'config', 'symfony', 'local.php'), `<?php use Symfony\\Component\\Routing\\Loader\\Configurator\\RoutingConfigurator;
        return static function (RoutingConfigurator $routes): void { $routes->add('route', '/route'); };`);
      await writeFile(join(root, 'config', 'symfony', 'dev.yaml'), `dev.page: {path: /dev}
dev_bundle: {resource: '@DevBundle/Resources/config/routing/routes.php', name_prefix: dev_vendor_}
`);
      await writeFile(join(root, 'bundle', 'Resources', 'config', 'routing', 'routes.php'), `<?php use Symfony\\Component\\Routing\\Loader\\Configurator\\RoutingConfigurator;
        return static function (RoutingConfigurator $routes): void { $routes->add('bundle', '/bundle')->controller('service'); };`);
      await writeFile(join(root, 'dev-bundle', 'Resources', 'config', 'routing', 'routes.php'), `<?php use Symfony\\Component\\Routing\\Loader\\Configurator\\RoutingConfigurator;
        return static function (RoutingConfigurator $routes): void { $routes->add('bundle', '/dev-bundle'); };`);
      server = spawn(process.execPath, [resolve('dist/server.js'), '--stdio'], { stdio: 'pipe' });
      const output = messagesFrom(server);
      server.stdin.write(encode({ jsonrpc: '2.0', id: 1, method: 'initialize', params: {
        processId: null, capabilities: {}, rootUri: pathToFileURL(root).toString(),
        initializationOptions: { bundledRouteProviders: [symfonyStaticRouteProviderDescriptor] },
      } }));
      await output.waitFor((message) => message.id === 1);
      server.stdin.write(encode({ jsonrpc: '2.0', method: 'initialized', params: {} }));
      await output.waitFor((message) => message.method === 'window/logMessage' && message.params?.message?.includes('complete=true'));
      server.stdin.write(encode({ jsonrpc: '2.0', method: 'textDocument/didOpen', params: { textDocument: { uri, languageId: 'php', version: 1, text: source } } }));
      const query = async (id: number, offset: number): Promise<any[]> => {
        server!.stdin.write(encode({ jsonrpc: '2.0', id, method: 'textDocument/completion', params: { textDocument: { uri }, position: lspPosition(source, offset) } }));
        return (await output.waitFor((message) => message.id === id)).result;
      };
      const definition = async (id: number, offset: number): Promise<any[]> => {
        server!.stdin.write(encode({ jsonrpc: '2.0', id, method: 'textDocument/definition', params: { textDocument: { uri }, position: lspPosition(source, offset) } }));
        return (await output.waitFor((message) => message.id === id)).result;
      };
      const references = async (id: number, offset: number, includeDeclaration: boolean): Promise<any[]> => {
        server!.stdin.write(encode({ jsonrpc: '2.0', id, method: 'textDocument/references', params: {
          textDocument: { uri }, position: lspPosition(source, offset), context: { includeDeclaration },
        } }));
        return (await output.waitFor((message) => message.id === id, 20_000)).result;
      };
      const offset = source.indexOf("'admin.'") + 7;
      // Unimported attributes do not leak into route candidates.

      const items = await query(2, offset);
      expect(items.map((item) => item.label)).toEqual(['admin.home']);
      expect(items[0].textEdit.newText).toBe('admin.home');
      const parameterOffset = source.indexOf("['i'") + 3;
      expect((await query(249, parameterOffset)).map((item) => item.label)).toEqual(['id']);
      const namedParameterOffset = source.indexOf("['s'") + 3;
      expect((await query(250, namedParameterOffset)).map((item) => item.label)).toEqual(['slug']);
      const businessParameterOffset = source.lastIndexOf("['i'") + 3;
      expect((await query(2501, businessParameterOffset)).some((item) => item.detail === 'admin.home path parameter')).toBe(false);
      const controllerMethodOffset = source.indexOf('exactUrl(): string') + 3;
      expect(await references(2502, controllerMethodOffset, false)).toEqual([{ uri: routeUri, range: {
        start: lspPosition(adminRoutesSource, adminRoutesSource.indexOf('exactUrl')),
        end: lspPosition(adminRoutesSource, adminRoutesSource.indexOf('exactUrl') + 'exactUrl'.length),
      } }]);
      const exactOffset = source.indexOf("'admin.home'") + 4;
      expect(await definition(251, exactOffset)).toEqual([{ uri: routeUri, range: {
        start: { line: 0, character: 0 }, end: { line: 0, character: 4 },
      } }]);
      const localRouteUri = pathToFileURL(join(root, 'config', 'symfony', 'local.php')).toString();
      expect(await definition(252, source.indexOf("'local_route'") + 4)).toEqual([expect.objectContaining({ uri: localRouteUri })]);
      const bundleRouteUri = pathToFileURL(join(root, 'bundle', 'Resources', 'config', 'routing', 'routes.php')).toString();
      expect(await definition(253, source.indexOf("'vendor_bundle'") + 4)).toEqual([expect.objectContaining({ uri: bundleRouteUri })]);
      expect(await definition(254, source.lastIndexOf("'admin.home'") + 4)).toEqual([]);
      const routeReferences = await references(255, exactOffset, true);
      expect(routeReferences.filter((item) => item.uri === uri)).toHaveLength(4);
      expect(routeReferences.filter((item) => item.uri === routeUri)).toEqual([{ uri: routeUri, range: {
        start: { line: 0, character: 0 }, end: { line: 0, character: 4 },
      } }]);
      expect(await references(256, exactOffset, false)).toHaveLength(4);
      const kernelOffset = source.indexOf("'kernel.'") + 8;
      expect((await query(23, kernelOffset)).map((item) => [item.label, item.detail]))
        .toEqual([['kernel.home', '/kernel (source declaration)']]);
      const localPhpOffset = source.indexOf("'local_'") + 7;
      expect((await query(24, localPhpOffset)).map((item) => [item.label, item.detail]))
        .toEqual([['local_route', '/local/route (source declaration)']]);
      const bundleOffset = source.indexOf("'vendor_'") + 8;
      expect((await query(25, bundleOffset)).map((item) => [item.label, item.detail]))
        .toEqual([['vendor_bundle', '/vendor/bundle (source declaration)']]);
      const localizedYamlOffset = source.indexOf("'localized.page.'") + "'localized.page.".length;
      expect((await query(2510, localizedYamlOffset)).map((item) => [item.label, item.detail])).toEqual([
        ['localized.page.en', '/english (source declaration)'],
        ['localized.page.fr', '/francais (source declaration)'],
      ]);
      const importedLocalizedOffset = source.indexOf("'localized_page.'") + "'localized_page.".length;
      expect((await query(2511, importedLocalizedOffset)).map((item) => [item.label, item.detail])).toEqual([
        ['localized_page.de', '/de/page (source declaration)'],
        ['localized_page.en', '/en/page (source declaration)'],
        ['localized_page.fr', '/fr/page (source declaration)'],
      ]);
      const matchedLocalizedOffset = source.indexOf("'localized_child.'") + "'localized_child.".length;
      expect((await query(2512, matchedLocalizedOffset)).map((item) => [item.label, item.detail])).toEqual([
        ['localized_child.en', '/en/english-child (source declaration)'],
        ['localized_child.fr', '/fr/francais-child (source declaration)'],
      ]);
      const nestedStringOffset = source.indexOf("'localized_nested_'") + "'localized_nested_".length;
      expect((await query(2513, nestedStringOffset)).map((item) => [item.label, item.detail])).toEqual([
        ['localized_nested_page.de', '/de/nested/page (source declaration)'],
        ['localized_nested_page.en', '/en/nested/page (source declaration)'],
        ['localized_nested_page.fr', '/fr/nested/page (source declaration)'],
      ]);
      const nestedMapOffset = source.indexOf("'localized_map_'") + "'localized_map_".length;
      expect((await query(2514, nestedMapOffset)).map((item) => [item.label, item.detail])).toEqual([
        ['localized_map_page.en', '/en/inner-en/page (source declaration)'],
        ['localized_map_page.fr', '/fr/inner-fr/page (source declaration)'],
      ]);
      const wrappedLocalizedOffset = source.indexOf("'wrapped_page.'") + "'wrapped_page.".length;
      expect((await query(2515, wrappedLocalizedOffset)).map((item) => [item.label, item.detail])).toEqual([
        ['wrapped_page.en', '/outer/en/page (source declaration)'],
        ['wrapped_page.fr', '/outer/fr/page (source declaration)'],
      ]);
      const devOffset = source.indexOf("'dev.'") + 5;
      const conditionalOffset = source.indexOf("'conditional.'") + 13;
      const devBundleOffset = source.indexOf("'dev_vendor_'") + 12;
      expect((await query(26, devOffset)).map((item) => item.label)).toEqual([]);
      expect((await query(261, conditionalOffset)).map((item) => item.label)).toEqual([]);
      expect((await query(27, devBundleOffset)).map((item) => item.label)).toEqual([]);
      const rootUri = pathToFileURL(root).toString();
      server.stdin.write(encode({ jsonrpc: '2.0', method: 'phpCompanion/symfonyRouteProviders', params: { providers: [{ uri: rootUri, external: false, environment: 'dev' }] } }));
      expect((await query(28, devOffset)).map((item) => item.label)).toEqual(['dev.page']);
      expect((await query(281, conditionalOffset)).map((item) => [item.label, item.detail]))
        .toEqual([['conditional.page', '/conditional (source declaration)']]);
      expect((await query(29, devBundleOffset)).map((item) => item.label)).toEqual(['dev_vendor_bundle']);
      server.stdin.write(encode({ jsonrpc: '2.0', method: 'phpCompanion/symfonyRouteProviders', params: { providers: [{ uri: rootUri, external: false, environment: '../dev' }] } }));
      expect((await query(291, devOffset)).map((item) => item.label)).toEqual(['dev.page']);
      server.stdin.write(encode({ jsonrpc: '2.0', method: 'phpCompanion/symfonyRouteProviders', params: { providers: [{ uri: rootUri, external: false, environment: 'prod' }] } }));
      expect((await query(292, devOffset)).map((item) => item.label)).toEqual([]);
      expect((await query(293, conditionalOffset)).map((item) => item.label)).toEqual([]);
      await writeFile(join(root, 'config', 'routes.yaml'), 'admin:\n  resource: routes/admin.yaml\n  name_prefix: admin.\ncontroller:\n  resource: ../Controller.php\n  type: attribute\n  name_prefix: admin.\n  prefix: /prefix\n');
      const imported = await query(30, offset);
      expect(imported.map((item) => item.label)).toEqual(['admin.class_attribute', 'admin.class_localized.en', 'admin.class_localized.fr', 'admin.home']);
      expect(imported[0].detail).toBe('/prefix/base/attribute (source declaration)');
      const localizedOffset = source.indexOf("'admin.class_localized.'") + "'admin.class_localized.".length;
      expect((await query(300, localizedOffset)).map((item) => [item.label, item.detail])).toEqual([
        ['admin.class_localized.en', '/prefix/base/english (source declaration)'],
        ['admin.class_localized.fr', '/prefix/base/francais (source declaration)'],
      ]);
      const devAttributeOffset = source.indexOf("'admin.class_dev_'") + "'admin.class_dev_".length;
      server.stdin.write(encode({ jsonrpc: '2.0', method: 'phpCompanion/symfonyRouteProviders', params: { providers: [{ uri: rootUri, external: false, environment: 'dev' }] } }));
      expect((await query(301, devAttributeOffset)).map((item) => [item.label, item.detail]))
        .toEqual([['admin.class_dev_only', '/prefix/base/dev (source declaration)']]);
      server.stdin.write(encode({ jsonrpc: '2.0', method: 'phpCompanion/symfonyRouteProviders', params: { providers: [{ uri: rootUri, external: false, environment: 'prod' }] } }));
      expect((await query(302, devAttributeOffset)).map((item) => item.label)).toEqual([]);
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
      await writeFile(join(root, 'composer.json'), JSON.stringify({ require: { 'symfony/framework-bundle': '^7.4' }, autoload: {
        'psr-4': { 'Vendor\\Shared\\': 'bundle/', 'Vendor\\Dev\\': 'dev-bundle/' }, classmap: ['./Controller.php'],
      } }));
      expect((await query(43, offset)).map((item) => item.label)).toEqual(['admin.app_nested_valid_index']);
      await writeFile(join(root, 'config', 'routes.yaml'), 'admin:\n  resource: routes/admin.yaml\n  name_prefix: admin.\n');

      server.stdin.write(encode({ jsonrpc: '2.0', method: 'phpCompanion/symfonyRouteProviders', params: { providers: [{ uri: rootUri, external: true }] } }));
      expect((await query(20, offset)).some((item) => item.label === 'admin.home')).toBe(false);
      expect(await definition(201, exactOffset)).toEqual([]);
      expect(await references(202, exactOffset, true)).toEqual([]);
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
      server.stdin.write(encode({ jsonrpc: '2.0', method: 'phpCompanion/frameworkDocumentSnapshots', params: {
        complete: true, documents: [{ uri: routeUri, languageId: 'yaml', source: 'edited: {path: /edited}\n', snapshotVersion: '1' }],
      } }));
      expect((await query(4, offset)).map((item) => item.label)).toEqual(['admin.edited']);
      const unusualName = String.raw`account.'"$id\end`;
      const unusualRouteSource = `${JSON.stringify(unusualName)}: {path: /escaped}\n`;
      server.stdin.write(encode({ jsonrpc: '2.0', method: 'textDocument/didChange', params: { textDocument: { uri: routeUri, version: 2 }, contentChanges: [{ text: unusualRouteSource }] } }));
      server.stdin.write(encode({ jsonrpc: '2.0', method: 'phpCompanion/frameworkDocumentSnapshots', params: {
        complete: true, documents: [{ uri: routeUri, languageId: 'yaml', source: unusualRouteSource, snapshotVersion: '2' }],
      } }));
      const singleQuoted = await query(5, offset);
      expect(singleQuoted.map((item) => item.label)).toEqual([`admin.${unusualName}`]);
      expect(singleQuoted[0].textEdit.newText).toBe(String.raw`admin.account.\'"$id\\end`);
      const doubleQuoted = await query(6, source.indexOf('"admin."') + 7);
      expect(doubleQuoted[0].textEdit.newText).toBe(String.raw`admin.account.'\"\$id\\end`);
      server.stdin.write(encode({ jsonrpc: '2.0', method: 'phpCompanion/bundledRouteProviders', params: { providers: [] } }));
      expect(await query(60, offset)).toEqual([]);

    } finally { await rm(root, { recursive: true, force: true }); }
  }, 60_000);

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
        namespace Doctrine\\ORM {
          class Query { public function getResult(int $hydrationMode = 1): mixed {} public function getOneOrNullResult(int $hydrationMode = 1): mixed {} public function getSingleResult(int $hydrationMode = 1): mixed {} public function toIterable(array $parameters = [], int $hydrationMode = 1): iterable {} public function getArrayResult(): array {} }
          class QueryBuilder { public function andWhere(string $where): static { return $this; } public function select(mixed ...$select): static { return $this; } public function from(string $from, string $alias): static { return $this; } public function delete(?string $delete = null): static { return $this; } public function update(?string $update = null): static { return $this; } public function getQuery(): Query {} }
          /** @template T of object */ class EntityRepository { public function createQueryBuilder(string $alias): QueryBuilder {} }
          interface EntityManagerInterface { /** @template T of object
            * @param class-string<T> $className
            * @return EntityRepository<T> */ public function getRepository(string $className): EntityRepository; }
        }
        namespace Doctrine\\Bundle\\DoctrineBundle\\Repository { class ServiceEntityRepository extends \\Doctrine\\ORM\\EntityRepository {} }
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
          #[\\Doctrine\\ORM\\Mapping\\Entity] class User { #[\\Doctrine\\ORM\\Mapping\\OneToMany(targetEntity: Order::class)] public Collection $orders; public function name(): string {} public function queryName(): string {} }
          class UserRepository extends ServiceEntityRepository { public function __construct($registry) { parent::__construct($registry, User::class); } }
          class Receipt { public function total(): int {} }
          /** @extends ServiceEntityRepository<Receipt> */ class ReceiptRepository extends ServiceEntityRepository {}
          #[\\Doctrine\\ORM\\Mapping\\Entity(repositoryClass: LanguageRepository::class)] class Language { public function code(): string {} }
          class LanguageRepository extends \\Doctrine\\ORM\\EntityRepository { public function published(): array {} }
          class Service { public function oldMethod(): void {} public function provider(): Provider {} }
          function choose(): Transport|Other {}
        }
        namespace Vendor\\Bundle { class Mailer { public function deliver(): void {} } }`);
      const servicesPath = join(root, 'config', 'services.yaml');
      await writeFile(servicesPath, 'services:\n  _defaults:\n    public: false\n    autowire: true\n    bind:\n      \'App\\Transport $bound\': \'@app.mailer\'\n  App\\:\n    resource: ../src/*\n  app.mailer:\n    class: App\\Mailer\n    public: true\n  \'App\\Transport $audit\': \'@app.mailer\'\n  \'(App\\Auditable&App\\Transport)|App\\Other\': \'@app.mailer\'\n  App\\PositionalConsumer:\n    autowire: false\n    arguments: [\'@app.mailer\', ~]\n  App\\ExplicitCallConsumer:\n    calls:\n      - setTransport: [\'@app.mailer\']\n  App\\ExplicitPropertyConsumer:\n    properties:\n      configuredProperty: \'@app.mailer\'\n');
      const compiledCallsPath = join(root, 'src', 'CompiledCalls.php');
      const compiledCalls = '<?php namespace App; final class CompiledCallConsumer { #[\\Symfony\\Contracts\\Service\\Attribute\\Required] public \\Vendor\\Bundle\\Mailer $propertyMailer; public function __construct(#[\\Symfony\\Component\\DependencyInjection\\Attribute\\Autowire(service: "bundle.mailer")] private \\Vendor\\Bundle\\Mailer $mailer) {} public function setMailer(\\Vendor\\Bundle\\Mailer $mailer): void {} }';
      await writeFile(compiledCallsPath, compiledCalls);
      await writeFile(join(root, 'src', 'Invoice.php'), '<?php namespace Domain\\Billing; class Invoice {}');
      const consumer = '<?php namespace App; final class WiredConsumer { public function __construct(private Transport $transport) {} } final class BoundConsumer { public function __construct(private Transport $bound) {} } final class PositionalConsumer { public function __construct(private Transport $first, private Transport $second) {} } final class TargetConsumer { public function __construct(#[\\Symfony\\Component\\DependencyInjection\\Attribute\\Target("audit")] private Transport $transport) {} } final class UnionConsumer { public function __construct(private Transport|Auditable $combined) {} } final class IntersectionConsumer { public function __construct(private Transport&Auditable $strict) {} } final class DnfConsumer { public function __construct(private (Transport&Auditable)|Other $dnf) {} } final class RequiredConsumer { #[\\Symfony\\Contracts\\Service\\Attribute\\Required] public Transport $requiredProperty; #[\\Symfony\\Contracts\\Service\\Attribute\\Required] public function setTransport(Transport $required): void {} } abstract class RequiredBase { #[\\Symfony\\Contracts\\Service\\Attribute\\Required] public function setInherited(Transport $inherited): void {} } final class RequiredChild extends RequiredBase { public function setInherited(Transport $prototype): void {} } final class ExplicitCallConsumer { #[\\Symfony\\Contracts\\Service\\Attribute\\Required] public function setTransport(Transport $configured): void {} } final class ExplicitPropertyConsumer { #[\\Symfony\\Contracts\\Service\\Attribute\\Required] public Transport $configuredProperty; } final class CompiledController { public function send(\\Vendor\\Bundle\\Mailer $bundleMailer): void {} } function composite((Transport&Auditable)|Other $dnf, (Transport&Auditable)|Other|null $nullable): void { $dnf->sha; $dnf->shared(); $dnf->route()->fi; $route = $dnf->route(); $route->fi; $dnf->audit(); $nullable->shared(); $copy = $dnf; $copy->sha; $copy->shared(); $choice = choose(); $choice->sha; $choice->shared(); } function catching(): void { try {} catch (Transport|Other $exception) { $exception->sha; $exception->shared(); } } function run(Service $service): void { $invoice = new Inv; $helper = localH; $service->newM; $nested = $service->provider()->holder->mailer; $nested->se; } function doctrine(UserRepository $repo): void { $user = $repo->find(1); $repo->fi; $user?->na; $user?->orders?->first()?->nu; } function doctrineQuery(UserRepository $repo): void { $queriedResults = $repo->createQueryBuilder("user")->andWhere("user.active = 1")->getQuery()->getResult(); foreach ($queriedResults as $queried) { $queried->queryN; } $queriedOne = $repo->createQueryBuilder("user")->getQuery()->getOneOrNullResult(); $queriedOne?->queryN; $queriedSingle = $repo->createQueryBuilder("user")->getQuery()->getSingleResult(); $queriedSingle->queryN; foreach ($repo->createQueryBuilder("user")->getQuery()->toIterable() as $iteratedQuery) { $iteratedQuery->queryN; } foreach ($repo->createQueryBuilder("user")->getQuery()->getResult() as $directQuery) { $directQuery->queryN; } } function doctrineManager(\\Doctrine\\ORM\\EntityManagerInterface $em): void { $em->getRepository(Language::class)->pub; foreach ($em->getRepository(User::class)->createQueryBuilder("user")->getQuery()->getResult() as $managedQuery) { $managedQuery->queryN; } } function doctrineManagerDynamic(\\Doctrine\\ORM\\EntityManagerInterface $em, string $class): void { $em->getRepository($class)->pub; } function doctrineQueryUnsafe(UserRepository $repo): void { foreach ($repo->createQueryBuilder("user")->getQuery()->getArrayResult() as $arrayRow) { $arrayRow->queryN; } $scalarResults = $repo->createQueryBuilder("user")->select("COUNT(user.id)")->getQuery()->getResult(); foreach ($scalarResults as $scalarRow) { $scalarRow->queryN; } $hydratedResults = $repo->createQueryBuilder("user")->getQuery()->getResult(2); foreach ($hydratedResults as $hydratedRow) { $hydratedRow->queryN; } $hydratedSingle = $repo->createQueryBuilder("user")->getQuery()->getSingleResult(2); $hydratedSingle->queryN; foreach ($repo->createQueryBuilder("user")->getQuery()->toIterable([], 2) as $hydratedIterator) { $hydratedIterator->queryN; } } function doctrineGeneric(ReceiptRepository $repo): void { $receipt = $repo->find(1); $receipt?->to; } function doctrineAttribute(LanguageRepository $repo): void { $language = $repo->find(1); $language?->co; foreach ($repo->findAll() as $item) { $item->co; } } function iterate(User $user): void { foreach ($user->orders as $order) { $order->nu; } } function iterateRepository(UserRepository $repo): void { foreach ($repo->findAll() as $user) { $user->na; } } function service(\\Psr\\Container\\ContainerInterface $container): void { $container->get("app.mailer")->se; $mailer = $container->get("app.mailer"); $mailer->se; $container->get("bundle.mailer")->del; } function property(Holder $holder): void { $mailer = $holder->mailer; $mailer->se; } function wired(#[\\Symfony\\Component\\DependencyInjection\\Attribute\\Autowire(service: "App\\Serv")] object $service): void {}';
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
      server.stdin.write(encode({ jsonrpc: '2.0', id: 10, method: 'initialize', params: {
        processId: null,
        capabilities: { window: { workDoneProgress: true }, workspace: { didChangeWatchedFiles: { dynamicRegistration: true } } },
        rootUri,
        initializationOptions: { bundledSemanticProviders: [symfonyServiceProviderDescriptor] },
      } }));
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
      for (const [id, match] of [...consumer.matchAll(/queryN;/g)].map((item, index) => [172 + index, item.index] as const)) {
        server.stdin.write(encode({ jsonrpc: '2.0', id, method: 'textDocument/completion', params: { textDocument: { uri: consumerUri }, position: lspPosition(consumer, match + 'queryN'.length) } }));
        const result = (await output.waitFor((message) => message.id === id)).result;
        if (id < 178) expect(result, `Doctrine query completion ${id}`).toMatchObject([{ label: 'queryName' }]);
        else expect(result).toEqual([]);
      }
      for (const [id, match] of [...consumer.matchAll(/->pub;/g)].map((item, index) => [190 + index, item.index] as const)) {
        server.stdin.write(encode({ jsonrpc: '2.0', id, method: 'textDocument/completion', params: { textDocument: { uri: consumerUri }, position: lspPosition(consumer, match + '->pub'.length) } }));
        const result = (await output.waitFor((message) => message.id === id)).result;
        if (id === 190) expect(result).toMatchObject([{ label: 'published' }]);
        else expect(result).toEqual([]);
      }
      server.stdin.write(encode({ jsonrpc: '2.0', id: 171, method: 'textDocument/completion', params: { textDocument: { uri: consumerUri }, position: { line: 0, character: consumer.indexOf('to;') + 2 } } }));
      expect((await output.waitFor((message) => message.id === 171)).result).toMatchObject([{ label: 'total' }]);
      server.stdin.write(encode({ jsonrpc: '2.0', id: 18, method: 'textDocument/completion', params: { textDocument: { uri: consumerUri }, position: { line: 0, character: consumer.indexOf('nu;') + 2 } } }));
      expect((await output.waitFor((message) => message.id === 18)).result).toMatchObject([{ label: 'number' }]);
      server.stdin.write(encode({ jsonrpc: '2.0', id: 19, method: 'textDocument/completion', params: { textDocument: { uri: consumerUri }, position: { line: 0, character: consumer.lastIndexOf('nu;') + 2 } } }));
      expect((await output.waitFor((message) => message.id === 19)).result).toMatchObject([{ label: 'number' }]);
      server.stdin.write(encode({ jsonrpc: '2.0', id: 31, method: 'textDocument/completion', params: { textDocument: { uri: consumerUri }, position: { line: 0, character: consumer.lastIndexOf('na;') + 2 } } }));
      expect((await output.waitFor((message) => message.id === 31)).result).toMatchObject([{ label: 'name' }]);
      for (const [id, match] of [...consumer.matchAll(/->co;/g)].map((item, index) => [117 + index, item.index] as const)) {
        server.stdin.write(encode({ jsonrpc: '2.0', id, method: 'textDocument/completion', params: { textDocument: { uri: consumerUri }, position: lspPosition(consumer, match + 4) } }));
        expect((await output.waitFor((message) => message.id === id)).result).toMatchObject([{ label: 'code' }]);
      }
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
      const serviceTypeOffset = definitionSource.indexOf('Service $service') + 3;
      server.stdin.write(encode({ jsonrpc: '2.0', id: 83, method: 'textDocument/references', params: {
        textDocument: { uri: consumerUri }, position: lspPosition(definitionSource, serviceTypeOffset), context: { includeDeclaration: true },
      } }));
      const serviceReferences = (await output.waitFor((message) => message.id === 83)).result;
      expect(serviceReferences).toEqual(expect.arrayContaining([
        expect.objectContaining({ uri: pathToFileURL(servicesPath).toString() }),
        expect.objectContaining({ uri: pathToFileURL(servicePath).toString() }),
      ]));
      const transportOffset = definitionSource.indexOf('Transport $transport') + 3;
      server.stdin.write(encode({ jsonrpc: '2.0', id: 48, method: 'textDocument/hover', params: { textDocument: { uri: consumerUri }, position: lspPosition(definitionSource, transportOffset) } }));
      expect((await output.waitFor((message) => message.id === 48)).result).toMatchObject({ contents: { value: expect.stringContaining('(inferred)') } });
      server.stdin.write(encode({ jsonrpc: '2.0', id: 49, method: 'textDocument/definition', params: { textDocument: { uri: consumerUri }, position: lspPosition(definitionSource, transportOffset) } }));
      expect((await output.waitFor((message) => message.id === 49)).result).toMatchObject([{ uri: pathToFileURL(servicePath).toString() }]);
      const boundOffset = definitionSource.indexOf('Transport $bound') + 3;
      server.stdin.write(encode({ jsonrpc: '2.0', id: 52, method: 'textDocument/hover', params: { textDocument: { uri: consumerUri }, position: lspPosition(definitionSource, boundOffset) } }));
      expect((await output.waitFor((message) => message.id === 52)).result).toMatchObject({ contents: { value: expect.stringContaining('(binding)') } });
      for (const [id, needle, expected] of [[84, 'Transport $first', true], [85, 'Transport $second', false]] as const) {
        const positionalOffset = definitionSource.indexOf(needle) + 3;
        server.stdin.write(encode({ jsonrpc: '2.0', id, method: 'textDocument/hover', params: { textDocument: { uri: consumerUri }, position: lspPosition(definitionSource, positionalOffset) } }));
        const value = (await output.waitFor((message) => message.id === id)).result?.contents?.value as string;
        expect(value.includes('Symfony autowiring')).toBe(expected);
      }
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
      await new Promise((resolvePromise) => setTimeout(resolvePromise, 500));
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
        contexts: [],
        types: {},
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

  it('navigates exact YAML controller segments to PHP without taking over YAML documents', async () => {
    const root = await mkdtemp(join(tmpdir(), 'php-companion-yaml-controller-definition-'));
    try {
      await mkdir(join(root, 'src', 'Controller'), { recursive: true });
      const rootUri = pathToFileURL(root).toString();
      const controllerPath = join(root, 'src', 'Controller', 'DemoController.php'); const controllerUri = pathToFileURL(controllerPath).toString();
      const controller = '<?php namespace App\\Controller; final class DemoController { public function show(): void {} }';
      const yamlPath = join(root, 'config', 'routes.yaml'); const yamlUri = pathToFileURL(yamlPath).toString();
      const yaml = `standard: {path: /standard, controller: App\\Controller\\DemoController::show}\nmodule:\n  - name: module.route\n    path: /module\n    defaults: {_controller: 'App\\Controller\\DemoController::show'}\n`;
      await mkdir(join(root, 'config'), { recursive: true });
      await writeFile(join(root, 'composer.json'), JSON.stringify({ autoload: { 'psr-4': { 'App\\': 'src/' } } }));
      await writeFile(controllerPath, controller); await writeFile(yamlPath, yaml);
      server = spawn(process.execPath, [resolve('dist/server.js'), '--stdio'], { stdio: 'pipe' }); const output = messagesFrom(server);
      server.stdin.write(encode({ jsonrpc: '2.0', id: 1131, method: 'initialize', params: {
        processId: null, capabilities: {}, rootUri, initializationOptions: { indexingMode: 'onDemand', symfonyRouteProviders: [{ uri: rootUri, external: false }] },
      } }));
      await output.waitFor((message) => message.id === 1131); server.stdin.write(encode({ jsonrpc: '2.0', method: 'initialized', params: {} }));
      server.stdin.write(encode({ jsonrpc: '2.0', id: 1135, method: 'phpCompanion/interop/contexts', params: { rootUri } }));
      expect((await output.waitFor((message) => message.id === 1135)).result).toMatchObject({
        hello: { providerId: 'php-companion' }, contexts: [],
      });
      const query = async (id: number, marker: string, expectedStart: number, expectedEnd: number): Promise<void> => {
        server!.stdin.write(encode({ jsonrpc: '2.0', id, method: 'phpCompanion/symfonyControllerDefinition', params: {
          textDocument: { uri: yamlUri, version: 1 }, source: yaml, position: lspPosition(yaml, yaml.indexOf(marker) + 2),
        } }));
        expect((await output.waitFor((message) => message.id === id)).result).toEqual([{ uri: controllerUri, range: {
          start: lspPosition(controller, expectedStart), end: lspPosition(controller, expectedEnd),
        } }]);
      };
      const classStart = controller.indexOf('DemoController'); const methodStart = controller.indexOf('show');
      await query(1132, 'DemoController', classStart, classStart + 'DemoController'.length);
      await query(1133, 'show', methodStart, methodStart + 'show'.length);
      server.stdin.write(encode({ jsonrpc: '2.0', method: 'phpCompanion/symfonyRouteProviders', params: { providers: [{ uri: rootUri, external: true }] } }));
      server.stdin.write(encode({ jsonrpc: '2.0', id: 1134, method: 'phpCompanion/symfonyControllerDefinition', params: {
        textDocument: { uri: yamlUri, version: 1 }, source: yaml, position: lspPosition(yaml, yaml.lastIndexOf('DemoController') + 2),
      } }));
      expect((await output.waitFor((message) => message.id === 1134)).result).toEqual([]);
    } finally { await rm(root, { recursive: true, force: true }); }
  });

  it('overlaps independent container and route providers while keeping watched route references current', async () => {
    const root = await mkdtemp(join(tmpdir(), 'php-companion-parallel-reference-providers-'));
    try {
      await mkdir(join(root, 'src')); await mkdir(join(root, 'config'));
      await writeFile(join(root, 'composer.json'), JSON.stringify({ autoload: { 'psr-4': { 'App\\': 'src/' } } }));
      const source = '<?php namespace App; final class TargetController { public function index(): void {} }';
      const uri = pathToFileURL(join(root, 'src', 'TargetController.php')).toString();
      const routePath = join(root, 'config', 'routes.yaml'); const routeUri = pathToFileURL(routePath).toString();
      const routeSource = 'demo: {path: /demo, controller: App\\TargetController::index}\n';
      await writeFile(join(root, 'src', 'TargetController.php'), source); await writeFile(routePath, routeSource);
      const servicePath = join(root, 'services.mjs'); const providerPath = join(root, 'routes.mjs');
      const timelinePath = join(root, 'provider-timeline.jsonl');
      const serviceSource = `import{appendFileSync}from'node:fs';let input='';for await(const part of process.stdin)input+=part;const request=JSON.parse(input);appendFileSync(${JSON.stringify(timelinePath)},JSON.stringify({provider:'service',phase:'start',time:Date.now()})+'\\n');await new Promise((done)=>setTimeout(done,250));appendFileSync(${JSON.stringify(timelinePath)},JSON.stringify({provider:'service',phase:'end',time:Date.now()})+'\\n');process.stdout.write(JSON.stringify({protocolVersion:1,id:request.id,result:{schema:1,providerId:'test.services',generation:request.params.generation,complete:true,methods:[],properties:[],literalMethodReturns:[],containerServices:[],containerMethodArguments:[],containerPropertyArguments:[],containerConfigurationUris:[]}}));`;
      const routeProviderSource = `import{appendFileSync,readFileSync}from'node:fs';let input='';for await(const part of process.stdin)input+=part;const request=JSON.parse(input);appendFileSync(${JSON.stringify(timelinePath)},JSON.stringify({provider:'route',phase:'start',time:Date.now()})+'\\n');await new Promise((done)=>setTimeout(done,250));const source=readFileSync(${JSON.stringify(routePath)},'utf8');const name=source.startsWith('changed:')?'changed':'demo';const classStart=source.indexOf(${JSON.stringify('App\\TargetController')});const methodStart=source.indexOf('index');appendFileSync(${JSON.stringify(timelinePath)},JSON.stringify({provider:'route',phase:'end',time:Date.now()})+'\\n');process.stdout.write(JSON.stringify({protocolVersion:1,id:request.id,result:{schema:1,providerId:'test.routes',generation:request.params.generation,complete:true,routes:[{name,path:'/demo',uri:${JSON.stringify(routeUri)},start:0,end:name.length,controller:{className:${JSON.stringify('App\\TargetController')},method:'index',uri:${JSON.stringify(routeUri)},classStart,classEnd:classStart+${'App\\TargetController'.length},methodStart,methodEnd:methodStart+5}}]}}));`;
      await writeFile(servicePath, serviceSource); await writeFile(providerPath, routeProviderSource);
      server = spawn(process.execPath, [resolve('dist/server.js'), '--stdio'], { stdio: 'pipe' }); const output = messagesFrom(server);
      server.stdin.write(encode({ jsonrpc: '2.0', id: 1200, method: 'initialize', params: {
        processId: null, capabilities: {}, rootUri: pathToFileURL(root).toString(), initializationOptions: {
          indexingMode: 'onDemand', bundledSemanticProviders: [{ providerId: 'test.services', command: process.execPath,
            args: [servicePath], timeoutMs: 5000, replacesContainerServices: true, requiresProjectTypes: true }],
          routeProviders: [{ providerId: 'test.routes', command: process.execPath, args: [providerPath], timeoutMs: 5000,
            replacesStaticRoutes: true, cacheUntilInvalidated: true }],
        },
      } }));
      await output.waitFor((message) => message.id === 1200);
      server.stdin.write(encode({ jsonrpc: '2.0', method: 'initialized', params: {} }));
      server.stdin.write(encode({ jsonrpc: '2.0', method: 'textDocument/didOpen', params: {
        textDocument: { uri, languageId: 'php', version: 1, text: source },
      } }));
      const query = async (id: number, expected: string): Promise<void> => {
        const currentRouteSource = await readFile(routePath, 'utf8');
        const currentClassStart = currentRouteSource.indexOf('App\\TargetController');
        server!.stdin.write(encode({ jsonrpc: '2.0', id, method: 'textDocument/references', params: {
          textDocument: { uri }, position: lspPosition(source, source.indexOf('TargetController') + 1),
          context: { includeDeclaration: false },
        } }));
        expect((await output.waitFor((message) => message.id === id, 10_000)).result).toEqual([{ uri: routeUri, range: {
          start: lspPosition(currentRouteSource, currentClassStart),
          end: lspPosition(currentRouteSource, currentClassStart + 'App\\TargetController'.length),
        } }]);
        expect((await readFile(routePath, 'utf8')).startsWith(expected)).toBe(true);
      };
      await query(1201, 'demo:');
      const timeline = (await readFile(timelinePath, 'utf8')).trim().split('\n').map((line) => JSON.parse(line)) as Array<{
        provider: string; phase: string; time: number;
      }>;
      const interval = (provider: string): { start: number; end: number } => ({
        start: timeline.filter((entry) => entry.provider === provider && entry.phase === 'start').at(-1)!.time,
        end: timeline.filter((entry) => entry.provider === provider && entry.phase === 'end').at(-1)!.time,
      });
      const service = interval('service'); const route = interval('route');
      expect(Math.max(service.start, route.start)).toBeLessThan(Math.min(service.end, route.end));
      await writeFile(routePath, routeSource.replace('demo:', 'changed:'));
      server.stdin.write(encode({ jsonrpc: '2.0', method: 'workspace/didChangeWatchedFiles', params: {
        changes: [{ uri: routeUri, type: 2 }],
      } }));
      await query(1202, 'changed:');
      expect((await readFile(timelinePath, 'utf8')).match(/"provider":"route","phase":"start"/g)).toHaveLength(2);
    } finally { await rm(root, { recursive: true, force: true }); }
  });

  it('loads fresh complete route-provider snapshots for Symfony route navigation', async () => {
    const root = await mkdtemp(join(tmpdir(), 'php-companion-route-provider-'));
    try {
      const source = `<?php
namespace Symfony\\Component\\Routing { interface RouterInterface { public function generate(string $name): string; } }
namespace App { use Symfony\\Component\\Routing\\RouterInterface; function run(RouterInterface $router): void {
  $router->generate('dynamic.');
  $router->generate('dynamic.home');
} final class DynamicController { public function home(): void {} } }`;
      const consumerPath = join(root, 'Consumer.php'); const uri = pathToFileURL(consumerPath).toString();
      const declarationPath = join(root, 'config', 'runtime-routes.yaml'); const declarationUri = pathToFileURL(declarationPath).toString();
      const statePath = join(root, 'route-state.json'); const provider = join(root, 'route-provider.mjs'); const staticProvider = join(root, 'static-route-provider.mjs');
      await mkdir(join(root, 'config'), { recursive: true });
      await writeFile(join(root, 'composer.json'), JSON.stringify({ autoload: { classmap: ['./Consumer.php'] } }));
      await writeFile(join(root, 'config', 'routes.yaml'), 'dynamic.static: {path: /static}\n');
      const declaration = 'dynamic.home\nApp\\DynamicController::home\n';
      const controllerStart = declaration.indexOf('App\\DynamicController'); const methodStart = declaration.indexOf('home', controllerStart);
      await writeFile(consumerPath, source); await writeFile(declarationPath, declaration);
      await writeFile(statePath, JSON.stringify({ name: 'dynamic.home', path: '/dynamic', controller: {
        className: 'App\\DynamicController', method: 'home', classStart: controllerStart,
        classEnd: controllerStart + 'App\\DynamicController'.length, methodStart, methodEnd: methodStart + 4,
      } }));
      await writeFile(provider, `import {readFile} from 'node:fs/promises'; let input=''; for await (const part of process.stdin) input+=part; const request=JSON.parse(input); const route=JSON.parse(await readFile(${JSON.stringify(statePath)},'utf8')); process.stdout.write(JSON.stringify({protocolVersion:1,id:request.id,result:{schema:1,providerId:'winstar.routes',generation:request.params.generation,complete:route.complete!==false,routes:[{name:route.name,path:route.path}]}}));`);
      await writeFile(staticProvider, `import {pathToFileURL} from 'node:url'; let input=''; for await (const part of process.stdin) input+=part; const request=JSON.parse(input); const uri=pathToFileURL(${JSON.stringify(declarationPath)}).toString(); process.stdout.write(JSON.stringify({protocolVersion:1,id:request.id,result:{schema:1,providerId:'static.routes',generation:request.params.generation,complete:false,routes:[{name:'dynamic.home',path:'/dynamic',uri,start:0,end:12,controller:{className:'App\\\\DynamicController',method:'home',uri,classStart:${controllerStart},classEnd:${controllerStart + 'App\\DynamicController'.length},methodStart:${methodStart},methodEnd:${methodStart + 4}}}]}}));`);
      server = spawn(process.execPath, [resolve('dist/server.js'), '--stdio'], { stdio: 'pipe' }); const output = messagesFrom(server);
      server.stdin.write(encode({ jsonrpc: '2.0', id: 114, method: 'initialize', params: {
        processId: null, capabilities: {}, rootUri: pathToFileURL(root).toString(),
        initializationOptions: { routeProviders: [
          { providerId: 'winstar.routes', command: process.execPath, args: [provider], timeoutMs: 1000, replacesStaticRoutes: true },
          { providerId: 'static.routes', command: process.execPath, args: [staticProvider], timeoutMs: 1000 },
        ] },
      } }));
      await output.waitFor((message) => message.id === 114); server.stdin.write(encode({ jsonrpc: '2.0', method: 'initialized', params: {} }));
      await output.waitFor((message) => message.method === 'window/logMessage' && message.params?.message?.includes('complete=true'));
      server.stdin.write(encode({ jsonrpc: '2.0', method: 'textDocument/didOpen', params: { textDocument: { uri, languageId: 'php', version: 1, text: source } } }));
      const completionOffset = source.indexOf("'dynamic.'") + "'dynamic.".length;
      server.stdin.write(encode({ jsonrpc: '2.0', id: 115, method: 'textDocument/completion', params: { textDocument: { uri }, position: lspPosition(source, completionOffset) } }));
      expect((await output.waitFor((message) => message.id === 115)).result).toContainEqual(expect.objectContaining({ label: 'dynamic.home', detail: '/dynamic (source declaration)' }));
      const definitionOffset = source.indexOf("'dynamic.home'") + 4;
      server.stdin.write(encode({ jsonrpc: '2.0', id: 116, method: 'textDocument/definition', params: { textDocument: { uri }, position: lspPosition(source, definitionOffset) } }));
      expect((await output.waitFor((message) => message.id === 116)).result).toEqual([{ uri: declarationUri, range: { start: { line: 0, character: 0 }, end: { line: 0, character: 12 } } }]);
      server.stdin.write(encode({ jsonrpc: '2.0', id: 11601, method: 'textDocument/prepareRename', params: {
        textDocument: { uri }, position: lspPosition(source, definitionOffset),
      } }));
      expect((await output.waitFor((message) => message.id === 11601)).result).toEqual({
        range: { start: lspPosition(source, source.indexOf('dynamic.home')), end: lspPosition(source, source.indexOf('dynamic.home') + 12) },
        placeholder: 'dynamic.home',
      });
      server.stdin.write(encode({ jsonrpc: '2.0', id: 11602, method: 'textDocument/rename', params: {
        textDocument: { uri }, position: lspPosition(source, definitionOffset), newName: 'dynamic.renamed',
      } }));
      const routeRename = (await output.waitFor((message) => message.id === 11602, 10_000)).result.changes;
      expect(routeRename[uri]).toEqual([{ range: {
        start: lspPosition(source, source.indexOf('dynamic.home')), end: lspPosition(source, source.indexOf('dynamic.home') + 12),
      }, newText: 'dynamic.renamed' }]);
      expect(routeRename[declarationUri]).toEqual([{ range: {
        start: { line: 0, character: 0 }, end: { line: 0, character: 12 },
      }, newText: 'dynamic.renamed' }]);
      server.stdin.write(encode({ jsonrpc: '2.0', id: 11603, method: 'phpCompanion/symfonyRoutePrepareRename', params: {
        textDocument: { uri: declarationUri, version: 1 }, source: declaration,
        position: { line: 0, character: 3 },
      } }));
      expect((await output.waitFor((message) => message.id === 11603)).result).toEqual({
        range: { start: { line: 0, character: 0 }, end: { line: 0, character: 12 } }, placeholder: 'dynamic.home',
      });
      const twigDirectory = join(root, 'templates'); await mkdir(twigDirectory);
      const twig = "{{ path('dynamic.home') }}"; const twigPath = join(twigDirectory, 'home.html.twig'); const twigUri = pathToFileURL(twigPath).toString();
      await writeFile(twigPath, twig);
      server.stdin.write(encode({ jsonrpc: '2.0', id: 11604, method: 'textDocument/rename', params: {
        textDocument: { uri }, position: lspPosition(source, definitionOffset), newName: 'dynamic.with_twig',
      } }));
      const bridgeRequest = await output.waitFor((message) => message.method === 'phpCompanion/resolveSymfonyRouteRename');
      expect(bridgeRequest.params).toEqual({ rootUri: pathToFileURL(root).toString(), oldName: 'dynamic.home', newName: 'dynamic.with_twig' });
      const twigStart = twig.indexOf('dynamic.home');
      server.stdin.write(encode({ jsonrpc: '2.0', id: bridgeRequest.id, result: {
        complete: true, edits: [{ uri: twigUri, start: twigStart, end: twigStart + 12 }],
      } }));
      const bridgedRename = (await output.waitFor((message) => message.id === 11604)).result.changes;
      expect(bridgedRename[twigUri]).toEqual([{ range: {
        start: lspPosition(twig, twigStart), end: lspPosition(twig, twigStart + 12),
      }, newText: 'dynamic.with_twig' }]);
      server.stdin.write(encode({ jsonrpc: '2.0', id: 11605, method: 'textDocument/rename', params: {
        textDocument: { uri }, position: lspPosition(source, definitionOffset), newName: 'dynamic.incomplete',
      } }));
      const incompleteBridge = await output.waitFor((message) => message.method === 'phpCompanion/resolveSymfonyRouteRename' && message.id !== bridgeRequest.id);
      server.stdin.write(encode({ jsonrpc: '2.0', id: incompleteBridge.id, result: { complete: false, edits: [] } }));
      expect((await output.waitFor((message) => message.id === 11605)).result).toBeNull();
      server.stdin.write(encode({ jsonrpc: '2.0', id: 11606, method: 'textDocument/rename', params: {
        textDocument: { uri }, position: lspPosition(source, definitionOffset), newName: 'invalid route',
      } }));
      expect((await output.waitFor((message) => message.id === 11606)).result).toBeNull();
      for (const [id, symbol, expectedStart, expectedEnd] of [
        [1161, 'DynamicController', controllerStart, controllerStart + 'App\\DynamicController'.length],
        [1162, 'home(): void', methodStart, methodStart + 4],
      ] as const) {
        server.stdin.write(encode({ jsonrpc: '2.0', id, method: 'textDocument/references', params: {
          textDocument: { uri }, position: lspPosition(source, source.indexOf(symbol) + 2), context: { includeDeclaration: false },
        } }));
        expect((await output.waitFor((message) => message.id === id)).result).toEqual([{ uri: declarationUri, range: {
          start: lspPosition(declaration, expectedStart), end: lspPosition(declaration, expectedEnd),
        } }]);
      }
      await writeFile(statePath, JSON.stringify({ name: 'dynamic.changed', path: '/changed' })); await writeFile(declarationPath, 'dynamic.changed\n');
      server.stdin.write(encode({ jsonrpc: '2.0', id: 117, method: 'textDocument/completion', params: { textDocument: { uri }, position: lspPosition(source, completionOffset) } }));
      const refreshed = (await output.waitFor((message) => message.id === 117)).result as Array<{ label: string; detail: string }>;
      expect(refreshed.map((item) => [item.label, item.detail])).toEqual([['dynamic.changed', '/changed (runtime route)']]);
      await writeFile(statePath, JSON.stringify({ name: 'dynamic.partial', path: '/partial', complete: false }));
      server.stdin.write(encode({ jsonrpc: '2.0', id: 1171, method: 'textDocument/completion', params: { textDocument: { uri }, position: lspPosition(source, completionOffset) } }));
      expect((await output.waitFor((message) => message.id === 1171)).result).toEqual([]);
      await output.waitFor((message) => message.method === 'window/logMessage'
        && message.params?.message?.includes('returned an incomplete snapshot'));
      await writeFile(statePath, '{broken');
      server.stdin.write(encode({ jsonrpc: '2.0', id: 118, method: 'textDocument/completion', params: { textDocument: { uri }, position: lspPosition(source, completionOffset) } }));
      const unavailable = (await output.waitFor((message) => message.id === 118)).result as Array<{ label: string }>;
      expect(unavailable).toEqual([]);
      await writeFile(statePath, JSON.stringify({ name: 'dynamic.restored', path: '/restored' }));
      server.stdin.write(encode({ jsonrpc: '2.0', method: 'phpCompanion/bundledRouteProviders', params: { providers: [{
        providerId: 'other.static', command: process.execPath, args: [provider], timeoutMs: 1000, replacesStaticRoutes: true,
      }] } }));
      server.stdin.write(encode({ jsonrpc: '2.0', id: 119, method: 'textDocument/completion', params: { textDocument: { uri }, position: lspPosition(source, completionOffset) } }));
      expect((await output.waitFor((message) => message.id === 119)).result).toEqual([]);
      await output.waitFor((message) => message.method === 'window/logMessage'
        && message.params?.message?.includes('multiple authoritative route providers'));
    } finally { await rm(root, { recursive: true, force: true }); }
  });

  it('reuses an opted-in route snapshot until a watched source invalidates it', async () => {
    const root = await mkdtemp(join(tmpdir(), 'php-companion-route-provider-cache-'));
    try {
      const source = `<?php
namespace Symfony\\Component\\Routing { interface RouterInterface { public function generate(string $name): string; } }
namespace App { use Symfony\\Component\\Routing\\RouterInterface; function run(RouterInterface $router): void { $router->generate('cached.'); } }`;
      const sourcePath = join(root, 'Consumer.php'); const uri = pathToFileURL(sourcePath).toString();
      const configPath = join(root, 'config', 'routes.yaml'); const configUri = pathToFileURL(configPath).toString();
      const statePath = join(root, 'route-state.json'); const countPath = join(root, 'provider-count.txt'); const provider = join(root, 'route-provider.mjs');
      await mkdir(join(root, 'config'), { recursive: true });
      await writeFile(join(root, 'composer.json'), JSON.stringify({ autoload: { classmap: ['./Consumer.php'] } }));
      await writeFile(sourcePath, source); await writeFile(configPath, 'cache_probe: {path: /probe}\n');
      await writeFile(statePath, JSON.stringify({ name: 'cached.one', path: '/one' })); await writeFile(countPath, '0');
      await writeFile(provider, `import {readFile,writeFile} from 'node:fs/promises'; import {pathToFileURL} from 'node:url'; let input=''; for await (const part of process.stdin) input+=part; const request=JSON.parse(input); const count=Number(await readFile(${JSON.stringify(countPath)},'utf8'))+1; await writeFile(${JSON.stringify(countPath)},String(count)); const route=JSON.parse(await readFile(${JSON.stringify(statePath)},'utf8')); process.stdout.write(JSON.stringify({protocolVersion:1,id:request.id,result:{schema:1,providerId:'cache.routes',generation:request.params.generation,complete:true,routes:[{...route,uri:pathToFileURL(${JSON.stringify(configPath)}).toString(),start:0,end:route.name.length}]}}));`);
      server = spawn(process.execPath, [resolve('dist/server.js'), '--stdio'], { stdio: 'pipe' }); const output = messagesFrom(server);
      server.stdin.write(encode({ jsonrpc: '2.0', id: 1190, method: 'initialize', params: {
        processId: null, capabilities: {}, rootUri: pathToFileURL(root).toString(), initializationOptions: { bundledRouteProviders: [{
          providerId: 'cache.routes', command: process.execPath, args: [provider], timeoutMs: 1000,
          replacesStaticRoutes: true, cacheUntilInvalidated: true,
        }] },
      } }));
      await output.waitFor((message) => message.id === 1190); server.stdin.write(encode({ jsonrpc: '2.0', method: 'initialized', params: {} }));
      await output.waitFor((message) => message.method === 'window/logMessage' && message.params?.message?.includes('complete=true'));
      server.stdin.write(encode({ jsonrpc: '2.0', method: 'textDocument/didOpen', params: { textDocument: { uri, languageId: 'php', version: 1, text: source } } }));
      const position = lspPosition(source, source.indexOf("'cached.'") + "'cached.".length);
      const query = async (id: number): Promise<Array<{ label: string }>> => {
        server!.stdin.write(encode({ jsonrpc: '2.0', id, method: 'textDocument/completion', params: { textDocument: { uri }, position } }));
        return (await output.waitFor((message) => message.id === id)).result;
      };
      expect((await query(1191)).map((item) => item.label)).toEqual(['cached.one']);
      expect((await query(1192)).map((item) => item.label)).toEqual(['cached.one']);
      expect(await readFile(countPath, 'utf8')).toBe('1');
      await writeFile(statePath, JSON.stringify({ name: 'cached.two', path: '/two' }));
      const changedSource = source.replace('cached.', 'cached.t');
      server.stdin.write(encode({ jsonrpc: '2.0', method: 'textDocument/didChange', params: {
        textDocument: { uri, version: 2 }, contentChanges: [{ text: changedSource }],
      } }));
      await output.waitFor((message) => message.method === 'textDocument/publishDiagnostics' && message.params.uri === uri && message.params.version === 2);
      expect((await query(1193)).map((item) => item.label)).toEqual(['cached.one']);
      expect(await readFile(countPath, 'utf8')).toBe('1');
      server.stdin.write(encode({ jsonrpc: '2.0', method: 'workspace/didChangeWatchedFiles', params: { changes: [{ uri: configUri, type: 2 }] } }));
      expect((await query(1194)).map((item) => item.label)).toEqual(['cached.two']);
      expect(await readFile(countPath, 'utf8')).toBe('2');
      await writeFile(statePath, JSON.stringify({ name: 'cached.three', path: '/three' }));
      const controllerUri = pathToFileURL(join(root, 'Controller.php')).toString();
      const controllerSource = "<?php #[Route('/three', name: 'cached.three')] final class Controller {}";
      server.stdin.write(encode({ jsonrpc: '2.0', method: 'textDocument/didOpen', params: {
        textDocument: { uri: controllerUri, languageId: 'php', version: 1, text: controllerSource },
      } }));
      await output.waitFor((message) => message.method === 'textDocument/publishDiagnostics' && message.params.uri === controllerUri);
      expect((await query(1195)).map((item) => item.label)).toEqual(['cached.three']);
      expect(await readFile(countPath, 'utf8')).toBe('3');
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

  it('keeps the newest generic semantic-provider facts when an older request finishes last', async () => {
    const root = await mkdtemp(join(tmpdir(), 'php-companion-provider-order-'));
    try {
      await mkdir(join(root, 'config'));
      await writeFile(join(root, 'composer.json'), JSON.stringify({ autoload: { 'psr-4': { 'App\\': './' } } }));
      await writeFile(join(root, 'Service.php'), '<?php namespace App; class Service {}');
      const uri = pathToFileURL(join(root, 'Consumer.php')).toString();
      const source = '<?php namespace App; function consume(Service $service): void { $service->met; }';
      await writeFile(join(root, 'Consumer.php'), source);
      const configurationUri = pathToFileURL(join(root, 'config', 'services.yaml')).toString();
      const started = join(root, 'provider-started.txt'); const provider = join(root, 'provider.mjs');
      await writeFile(provider, `import{appendFileSync}from'node:fs';let input='';for await(const part of process.stdin)input+=part;const request=JSON.parse(input);const document=request.params.documents?.find((item)=>item.languageId==='yaml');const state=document?.source??'initial';appendFileSync(${JSON.stringify(started)},state+'\\n');await new Promise((resolve)=>setTimeout(resolve,state==='slow'?300:10));const name=state==='slow'?'methodSlow':state==='fast'?'methodFast':'methodInitial';process.stdout.write(JSON.stringify({protocolVersion:1,id:request.id,result:{schema:1,providerId:'vendor.ordered',generation:request.params.generation,complete:true,methods:[{ownerFqcn:'App\\\\Service',name,returnType:'string',uri:request.params.rootUri,start:0,end:1}],properties:[],literalMethodReturns:[]}}));`);
      server = spawn(process.execPath, [resolve('dist/server.js'), '--stdio'], { stdio: 'pipe' }); const output = messagesFrom(server);
      server.stdin.write(encode({ jsonrpc: '2.0', id: 671, method: 'initialize', params: {
        processId: null, capabilities: {}, rootUri: pathToFileURL(root).toString(), initializationOptions: { semanticProviders: [
          { providerId: 'vendor.ordered', command: process.execPath, args: [provider], timeoutMs: 5000, acceptsDocumentSnapshots: true },
        ] },
      } }));
      await output.waitFor((message) => message.id === 671); server.stdin.write(encode({ jsonrpc: '2.0', method: 'initialized', params: {} }));
      await output.waitFor((message) => message.method === 'window/logMessage' && message.params?.message?.includes('vendor.ordered committed'), 10_000);
      server.stdin.write(encode({ jsonrpc: '2.0', method: 'textDocument/didOpen', params: {
        textDocument: { uri, languageId: 'php', version: 1, text: source },
      } }));
      await output.waitFor((message) => message.method === 'textDocument/publishDiagnostics' && message.params.uri === uri);
      const sendSnapshot = (state: string, snapshotVersion: string): void => server!.stdin.write(encode({
        jsonrpc: '2.0', method: 'phpCompanion/frameworkDocumentSnapshots', params: { complete: true, documents: [
          { uri: configurationUri, languageId: 'yaml', source: state, snapshotVersion },
        ] },
      }));
      sendSnapshot('slow', '1');
      for (let attempt = 0; attempt < 100; attempt += 1) {
        const contents = await readFile(started, 'utf8').catch(() => '');
        if (contents.includes('slow')) break;
        await new Promise<void>((resolvePromise) => setTimeout(resolvePromise, 10));
      }
      expect(await readFile(started, 'utf8')).toContain('slow');
      sendSnapshot('fast', '2');
      await new Promise<void>((resolvePromise) => setTimeout(resolvePromise, 450));
      server.stdin.write(encode({ jsonrpc: '2.0', id: 672, method: 'textDocument/completion', params: {
        textDocument: { uri }, position: lspPosition(source, source.indexOf('met') + 3),
      } }));
      const labels = (await output.waitFor((message) => message.id === 672)).result.map((item: { label: string }) => item.label);
      expect(labels).toContain('methodFast'); expect(labels).not.toContain('methodSlow'); expect(labels).not.toContain('methodInitial');
    } finally { await rm(root, { recursive: true, force: true }); }
  });

  it('registers and withdraws a bundled semantic provider without restarting', async () => {
    const root = await mkdtemp(join(tmpdir(), 'php-companion-plugin-provider-'));
    try {
      await writeFile(join(root, 'composer.json'), JSON.stringify({ autoload: { 'psr-4': { 'App\\\\': './' } } }));
      await writeFile(join(root, 'Service.php'), '<?php namespace App; class Service {}');
      const uri = pathToFileURL(join(root, 'Consumer.php')).toString();
      const source = '<?php namespace App; function consume(Service $service): void { $service->plug; }';
      await writeFile(join(root, 'Consumer.php'), source);
      const provider = join(root, 'provider.mjs');
      await writeFile(provider, `let input=''; for await (const part of process.stdin) input+=part; const request=JSON.parse(input); process.stdout.write(JSON.stringify({protocolVersion:1,id:request.id,result:{schema:1,providerId:'vendor.symfony.services',generation:request.params.generation,complete:true,methods:[{ownerFqcn:'App\\\\Service',name:'pluginMethod',returnType:'string',uri:request.params.rootUri,start:0,end:1}],properties:[],literalMethodReturns:[]}}));`);
      server = spawn(process.execPath, [resolve('dist/server.js'), '--stdio'], { stdio: 'pipe' });
      const output = messagesFrom(server);
      server.stdin.write(encode({ jsonrpc: '2.0', id: 62, method: 'initialize', params: {
        processId: null, capabilities: {}, rootUri: pathToFileURL(root).toString(), initializationOptions: { indexingMode: 'experimental' },
      } }));
      await output.waitFor((message) => message.id === 62);
      server.stdin.write(encode({ jsonrpc: '2.0', method: 'initialized', params: {} }));
      await output.waitFor((message) => message.method === 'window/logMessage' && message.params?.message?.includes('complete=true'), 20_000);
      server.stdin.write(encode({ jsonrpc: '2.0', method: 'textDocument/didOpen', params: { textDocument: { uri, languageId: 'php', version: 1, text: source } } }));
      await output.waitFor((message) => message.method === 'textDocument/publishDiagnostics' && message.params.uri === uri);
      server.stdin.write(encode({ jsonrpc: '2.0', method: 'phpCompanion/bundledSemanticProviders', params: { providers: [
        { providerId: 'vendor.symfony.services', command: process.execPath, args: [provider], timeoutMs: 1000 },
      ] } }));
      await output.waitFor((message) => message.method === 'window/logMessage' && message.params?.message?.includes('vendor.symfony.services committed'), 20_000);
      const position = lspPosition(source, source.indexOf('plug') + 4);
      server.stdin.write(encode({ jsonrpc: '2.0', id: 63, method: 'textDocument/completion', params: { textDocument: { uri }, position } }));
      expect((await output.waitFor((message) => message.id === 63, 20_000)).result).toContainEqual(expect.objectContaining({ label: 'pluginMethod' }));
      server.stdin.write(encode({ jsonrpc: '2.0', method: 'phpCompanion/bundledSemanticProviders', params: { providers: [] } }));
      await output.waitFor((message) => message.method === 'textDocument/publishDiagnostics' && message.params.uri === uri);
      server.stdin.write(encode({ jsonrpc: '2.0', id: 64, method: 'textDocument/completion', params: { textDocument: { uri }, position } }));
      expect((await output.waitFor((message) => message.id === 64)).result).not.toContainEqual(expect.objectContaining({ label: 'pluginMethod' }));
    } finally { await rm(root, { recursive: true, force: true }); }
  });

  it('uses a bundled authoritative container provider for Symfony service references', async () => {
    const root = await mkdtemp(join(tmpdir(), 'php-companion-container-provider-'));
    try {
      const rootUri = pathToFileURL(root).toString();
      await writeFile(join(root, 'composer.json'), JSON.stringify({ autoload: { 'psr-4': { 'App\\': 'src/' } } }));
      await mkdir(join(root, 'src')); await mkdir(join(root, 'config'));
      const servicePath = join(root, 'src', 'Service.php'); const serviceUri = pathToFileURL(servicePath).toString();
      const source = '<?php namespace App; final class Service {}'; await writeFile(servicePath, source);
      const configPath = join(root, 'config', 'services.yaml'); const configUri = pathToFileURL(configPath).toString();
      const configSource = "services:\n  app.service: { class: App\\Service }\n  app.consumer:\n    arguments:\n      $service: '@app.service'\n      $transport: '%app.transport%'\nparameters:\n  app.transport: smtp\nwhen@prod:\n  services:\n    app.prod_consumer: { class: App\\ProdConsumer, arguments: ['@app.service', '%app.transport%'] }\n"; await writeFile(configPath, configSource);
      const parameterRegistrationStart = configSource.indexOf('app.transport:');
      const xmlPath = join(root, 'config', 'services.xml'); const xmlUri = pathToFileURL(xmlPath).toString();
      const xmlSource = `<?xml version="1.0"?>
<container><parameters><parameter key="app.xml_transport">private</parameter></parameters><services><service id="app.xml.consumer" class="App\\XmlConsumer">
  <argument type="service" id="app.service"/>
  <argument>%app.transport%</argument>
  <argument value="%app.xml_transport%"/>
</service></services><when env="prod"><parameters><parameter key="app.prod_xml">private</parameter></parameters><services>
  <service id="app.prod_xml_consumer" class="App\\ProdXmlConsumer"><argument type="service" id="app.service"/><argument value="%app.prod_xml%"/></service>
</services></when></container>`; await writeFile(xmlPath, xmlSource);
      const xmlParameterRegistrationStart = xmlSource.indexOf('app.xml_transport');
      const phpPath = join(root, 'config', 'services.php'); const phpUri = pathToFileURL(phpPath).toString();
      const phpSource = `<?php
use function Symfony\\Component\\DependencyInjection\\Loader\\Configurator\\service;
use function Symfony\\Component\\DependencyInjection\\Loader\\Configurator\\param;
return [
    'parameters' => ['app.php_transport' => 'private'],
    'services' => [
        'app.php.consumer' => ['class' => App\\Consumer::class,
            'arguments' => [service('app.service'), param('app.transport'), param('app.php_transport')]],
    ],
    'when@prod' => [
        'parameters' => ['app.prod_php' => 'private'],
        'services' => [
            'app.prod.consumer' => ['class' => App\\ProdConsumer::class,
                'arguments' => [service('app.service'), param('app.prod_php')]],
        ],
    ],
];`; await writeFile(phpPath, phpSource);
      const phpParameterRegistrationStart = phpSource.indexOf('app.php_transport');
      const attributePath = join(root, 'src', 'Consumer.php'); const attributeUri = pathToFileURL(attributePath).toString();
      const attributeSource = `<?php
namespace App;
use Symfony\\Component\\DependencyInjection\\Attribute\\Autowire;
final class Consumer { public function __construct(#[Autowire(service: 'app.service')] private object $service) {} }`;
      await writeFile(attributePath, attributeSource);
      const containerConsumerPath = join(root, 'src', 'ContainerConsumer.php');
      const containerConsumerUri = pathToFileURL(containerConsumerPath).toString();
      const containerConsumerSource = `<?php
namespace Psr\\Container { interface ContainerInterface { public function get(string $id): mixed; } }
namespace App {
    final class BusinessLookup { public function get(string $id): mixed {} }
    function consume(\\Psr\\Container\\ContainerInterface $container, BusinessLookup $business): void {
        $container->get('app.service');
        $business->get('app.service');
    }
}`;
      await writeFile(containerConsumerPath, containerConsumerSource);
      const provider = join(root, 'provider.mjs');
      await writeFile(provider, `let input=''; for await (const part of process.stdin) input+=part; const request=JSON.parse(input); const uri=request.params.rootUri+'/config/services.yaml'; const xmlUri=request.params.rootUri+'/config/services.xml'; const phpUri=request.params.rootUri+'/config/services.php'; const className=request.params.environment==='prod'?'App\\\\ProdService':'App\\\\Service'; const service={id:'app.service',className,public:false,autowire:true,autowireComplete:true,bindings:[],configuredCalls:[],callsComplete:true,configuredProperties:[],propertiesComplete:true,eventListeners:[],origin:'explicit',uri,start:12,end:23,registrationUri:uri,registrationStart:12,registrationEnd:23}; process.stdout.write(JSON.stringify({protocolVersion:1,id:request.id,result:{schema:1,providerId:'php-companion.symfony.services',generation:request.params.generation,complete:['dev','prod'].includes(request.params.environment),methods:[],properties:[],literalMethodReturns:[{ownerFqcn:'Psr\\\\Container\\\\ContainerInterface',name:'get',argument:'app.service',returnType:className,uri,start:12,end:23}],containerServices:[service],containerParameters:[{id:'app.transport',uri,start:${parameterRegistrationStart},end:${parameterRegistrationStart + 'app.transport'.length}},{id:'app.xml_transport',uri:xmlUri,start:${xmlParameterRegistrationStart},end:${xmlParameterRegistrationStart + 'app.xml_transport'.length}},{id:'app.php_transport',uri:phpUri,start:${phpParameterRegistrationStart},end:${phpParameterRegistrationStart + 'app.php_transport'.length}}],containerMethodArguments:[],containerPropertyArguments:[],containerConfigurationUris:[uri,xmlUri,phpUri]}}));`);
      server = spawn(process.execPath, [resolve('dist/server.js'), '--stdio'], { stdio: 'pipe' }); const output = messagesFrom(server);
      server.stdin.write(encode({ jsonrpc: '2.0', id: 65, method: 'initialize', params: {
        processId: null, capabilities: {}, rootUri, initializationOptions: {
          symfonyRouteProviders: [{ uri: rootUri, external: false, environment: 'dev' }],
          bundledSemanticProviders: [{ providerId: 'php-companion.symfony.services', command: process.execPath, args: [provider], timeoutMs: 1000,
            requiresProjectTypes: true, acceptsDocumentSnapshots: true, replacesContainerServices: true }],
          frameworkDocumentSnapshots: { complete: true, documents: [
            { uri: configUri, languageId: 'yaml', source: configSource, snapshotVersion: '1' },
            { uri: xmlUri, languageId: 'xml', source: xmlSource, snapshotVersion: '1' },
            { uri: phpUri, languageId: 'php', source: phpSource, snapshotVersion: '1' },
          ] },
        } } }));
      await output.waitFor((message) => message.id === 65); server.stdin.write(encode({ jsonrpc: '2.0', method: 'initialized', params: {} }));
      await output.waitFor((message) => message.method === 'window/logMessage' && message.params?.message?.includes('complete=true'), 10_000);
      const providerLog = output.messages.find((message: any) => message.method === 'window/logMessage'
        && message.params?.message?.includes('php-companion.symfony.services')) as any;
      expect(providerLog?.params.message).toContain('authoritative container');
      server.stdin.write(encode({ jsonrpc: '2.0', method: 'textDocument/didOpen', params: { textDocument: { uri: serviceUri, languageId: 'php', version: 1, text: source } } }));
      await output.waitFor((message) => message.method === 'textDocument/publishDiagnostics' && message.params.uri === serviceUri);
      server.stdin.write(encode({ jsonrpc: '2.0', method: 'textDocument/didOpen', params: {
        textDocument: { uri: containerConsumerUri, languageId: 'php', version: 1, text: containerConsumerSource },
      } }));
      await output.waitFor((message) => message.method === 'textDocument/publishDiagnostics' && message.params.uri === containerConsumerUri);
      server.stdin.write(encode({ jsonrpc: '2.0', id: 66, method: 'textDocument/references', params: {
        textDocument: { uri: serviceUri }, position: lspPosition(source, source.indexOf('Service') + 2), context: { includeDeclaration: false },
      } }));
      const classServiceReferences = (await output.waitFor((message) => message.id === 66)).result;
      expect(classServiceReferences).toContainEqual({ uri: configUri,
        range: { start: lspPosition(configSource, 12), end: lspPosition(configSource, 23) } });
      for (const [referenceUri, referenceSource] of [[configUri, configSource], [xmlUri, xmlSource], [phpUri, phpSource]] as const) {
        const start = referenceUri === configUri ? referenceSource.indexOf('@app.service') + 1 : referenceSource.indexOf('app.service');
        expect(classServiceReferences).toContainEqual({ uri: referenceUri,
          range: { start: lspPosition(referenceSource, start), end: lspPosition(referenceSource, start + 'app.service'.length) } });
      }
      const inactiveServiceStart = configSource.lastIndexOf('@app.service') + 1;
      expect(classServiceReferences).not.toContainEqual({ uri: configUri,
        range: { start: lspPosition(configSource, inactiveServiceStart),
          end: lspPosition(configSource, inactiveServiceStart + 'app.service'.length) } });
      server.stdin.write(encode({ jsonrpc: '2.0', id: 68, method: 'phpCompanion/symfonyControllerDefinition', params: {
        textDocument: { uri: configUri, version: 1 }, source: configSource,
        position: lspPosition(configSource, configSource.indexOf('@app.service') + 5),
      } }));
      expect((await output.waitFor((message) => message.id === 68)).result).toEqual([{ uri: configUri,
        range: { start: lspPosition(configSource, 12), end: lspPosition(configSource, 23) } }]);
      server.stdin.write(encode({ jsonrpc: '2.0', id: 69, method: 'phpCompanion/symfonyControllerDefinition', params: {
        textDocument: { uri: configUri, version: 1 }, source: configSource,
        position: lspPosition(configSource, configSource.indexOf('app.service') + 3),
      } }));
      expect((await output.waitFor((message) => message.id === 69)).result).toEqual([]);
      const parameterReferenceStart = configSource.indexOf('%app.transport%') + 1;
      server.stdin.write(encode({ jsonrpc: '2.0', id: 6901, method: 'phpCompanion/symfonyControllerDefinition', params: {
        textDocument: { uri: configUri, version: 1 }, source: configSource,
        position: lspPosition(configSource, parameterReferenceStart + 4),
      } }));
      expect((await output.waitFor((message) => message.id === 6901)).result).toEqual([{ uri: configUri,
        range: { start: lspPosition(configSource, parameterRegistrationStart),
          end: lspPosition(configSource, parameterRegistrationStart + 'app.transport'.length) } }]);
      server.stdin.write(encode({ jsonrpc: '2.0', id: 6902, method: 'phpCompanion/symfonyServiceReferences', params: {
        textDocument: { uri: configUri, version: 1 }, source: configSource,
        position: lspPosition(configSource, parameterRegistrationStart + 4), context: { includeDeclaration: true },
      } }));
      expect((await output.waitFor((message) => message.id === 6902)).result).toEqual(expect.arrayContaining([
        { uri: configUri, range: { start: lspPosition(configSource, parameterReferenceStart),
          end: lspPosition(configSource, parameterReferenceStart + 'app.transport'.length) } },
        { uri: configUri, range: { start: lspPosition(configSource, parameterRegistrationStart),
          end: lspPosition(configSource, parameterRegistrationStart + 'app.transport'.length) } },
        { uri: xmlUri, range: { start: lspPosition(xmlSource, xmlSource.indexOf('%app.transport%') + 1),
          end: lspPosition(xmlSource, xmlSource.indexOf('%app.transport%') + 1 + 'app.transport'.length) } },
      ]));
      server.stdin.write(encode({ jsonrpc: '2.0', id: 6903, method: 'phpCompanion/symfonyServiceCompletions', params: {
        textDocument: { uri: configUri, version: 1 }, source: configSource,
        position: lspPosition(configSource, parameterReferenceStart + 'app.tra'.length),
      } }));
      expect((await output.waitFor((message) => message.id === 6903)).result).toEqual({ isIncomplete: false, items: [{
        label: 'app.transport', detail: 'Symfony parameter', range: {
          start: lspPosition(configSource, parameterReferenceStart),
          end: lspPosition(configSource, parameterReferenceStart + 'app.transport'.length),
        },
      }] });
      server.stdin.write(encode({ jsonrpc: '2.0', id: 6904, method: 'phpCompanion/symfonyParameterRename', params: {
        textDocument: { uri: configUri, version: 1 }, source: configSource,
        position: lspPosition(configSource, parameterReferenceStart + 4), newName: 'app.renamed-transport',
      } }));
      expect(Object.values((await output.waitFor((message) => message.id === 6904)).result.changes).flat()).toHaveLength(4);
      const xmlParameterReferenceStart = xmlSource.indexOf('%app.xml_transport%') + 1;
      server.stdin.write(encode({ jsonrpc: '2.0', id: 6905, method: 'phpCompanion/symfonyServiceDefinition', params: {
        textDocument: { uri: xmlUri, version: 1 }, source: xmlSource,
        position: lspPosition(xmlSource, xmlParameterReferenceStart + 4),
      } }));
      expect((await output.waitFor((message) => message.id === 6905)).result).toEqual([{ uri: xmlUri,
        range: { start: lspPosition(xmlSource, xmlParameterRegistrationStart),
          end: lspPosition(xmlSource, xmlParameterRegistrationStart + 'app.xml_transport'.length) } }]);
      server.stdin.write(encode({ jsonrpc: '2.0', id: 6906, method: 'phpCompanion/symfonyServiceCompletions', params: {
        textDocument: { uri: xmlUri, version: 1 }, source: xmlSource,
        position: lspPosition(xmlSource, xmlParameterReferenceStart + 'app.xml'.length),
      } }));
      expect((await output.waitFor((message) => message.id === 6906)).result).toEqual({ isIncomplete: false, items: [{
        label: 'app.xml_transport', detail: 'Symfony parameter', range: {
          start: lspPosition(xmlSource, xmlParameterReferenceStart),
          end: lspPosition(xmlSource, xmlParameterReferenceStart + 'app.xml_transport'.length),
        },
      }] });
      server.stdin.write(encode({ jsonrpc: '2.0', id: 6907, method: 'phpCompanion/symfonyParameterRename', params: {
        textDocument: { uri: xmlUri, version: 1 }, source: xmlSource,
        position: lspPosition(xmlSource, xmlParameterRegistrationStart + 4), newName: 'app.renamed_xml_transport',
      } }));
      expect(Object.values((await output.waitFor((message) => message.id === 6907)).result.changes).flat()).toHaveLength(2);
      const phpParameterReferenceStart = phpSource.lastIndexOf('app.php_transport');
      server.stdin.write(encode({ jsonrpc: '2.0', id: 6908, method: 'phpCompanion/symfonyServiceDefinition', params: {
        textDocument: { uri: phpUri, version: 1 }, source: phpSource,
        position: lspPosition(phpSource, phpParameterReferenceStart + 4),
      } }));
      expect((await output.waitFor((message) => message.id === 6908)).result).toEqual([{ uri: phpUri,
        range: { start: lspPosition(phpSource, phpParameterRegistrationStart),
          end: lspPosition(phpSource, phpParameterRegistrationStart + 'app.php_transport'.length) } }]);
      server.stdin.write(encode({ jsonrpc: '2.0', id: 6909, method: 'phpCompanion/symfonyServiceCompletions', params: {
        textDocument: { uri: phpUri, version: 1 }, source: phpSource,
        position: lspPosition(phpSource, phpParameterReferenceStart + 'app.php'.length),
      } }));
      expect((await output.waitFor((message) => message.id === 6909)).result).toEqual({ isIncomplete: false, items: [{
        label: 'app.php_transport', detail: 'Symfony parameter', range: {
          start: lspPosition(phpSource, phpParameterReferenceStart),
          end: lspPosition(phpSource, phpParameterReferenceStart + 'app.php_transport'.length),
        },
      }] });
      server.stdin.write(encode({ jsonrpc: '2.0', id: 6910, method: 'phpCompanion/symfonyParameterRename', params: {
        textDocument: { uri: phpUri, version: 1 }, source: phpSource,
        position: lspPosition(phpSource, phpParameterRegistrationStart + 4), newName: 'app.renamed_php_transport',
      } }));
      expect(Object.values((await output.waitFor((message) => message.id === 6910)).result.changes).flat()).toHaveLength(2);
      server.stdin.write(encode({ jsonrpc: '2.0', method: 'textDocument/didOpen', params: {
        textDocument: { uri: phpUri, languageId: 'php', version: 1, text: phpSource },
      } }));
      await output.waitFor((message) => message.method === 'textDocument/publishDiagnostics' && message.params.uri === phpUri);
      server.stdin.write(encode({ jsonrpc: '2.0', id: 6911, method: 'textDocument/prepareRename', params: {
        textDocument: { uri: phpUri }, position: lspPosition(phpSource, phpParameterRegistrationStart + 4),
      } }));
      expect((await output.waitFor((message) => message.id === 6911)).result.placeholder).toBe('app.php_transport');
      server.stdin.write(encode({ jsonrpc: '2.0', id: 6912, method: 'textDocument/rename', params: {
        textDocument: { uri: phpUri }, position: lspPosition(phpSource, phpParameterRegistrationStart + 4),
        newName: 'app.standard_php_transport',
      } }));
      expect(Object.values((await output.waitFor((message) => message.id === 6912)).result.changes).flat()).toHaveLength(2);
      server.stdin.write(encode({ jsonrpc: '2.0', id: 70, method: 'phpCompanion/symfonyServiceReferences', params: {
        textDocument: { uri: configUri, version: 1 }, source: configSource,
        position: lspPosition(configSource, configSource.indexOf('@app.service') + 5), context: { includeDeclaration: false },
      } }));
      const crossFormatReferences = (await output.waitFor((message) => message.id === 70)).result;
      expect(crossFormatReferences).toHaveLength(5);
      expect(crossFormatReferences).toContainEqual({ uri: configUri,
        range: { start: lspPosition(configSource, configSource.indexOf('@app.service') + 1),
          end: lspPosition(configSource, configSource.indexOf('@app.service') + '@app.service'.length) } });
      expect(crossFormatReferences).toContainEqual({ uri: xmlUri,
        range: { start: lspPosition(xmlSource, xmlSource.indexOf('app.service')),
          end: lspPosition(xmlSource, xmlSource.indexOf('app.service') + 'app.service'.length) } });
      expect(crossFormatReferences).toContainEqual({ uri: phpUri,
        range: { start: lspPosition(phpSource, phpSource.indexOf('app.service')),
          end: lspPosition(phpSource, phpSource.indexOf('app.service') + 'app.service'.length) } });
      expect(crossFormatReferences).toContainEqual({ uri: attributeUri,
        range: { start: lspPosition(attributeSource, attributeSource.indexOf('app.service')),
          end: lspPosition(attributeSource, attributeSource.indexOf('app.service') + 'app.service'.length) } });
      const containerServiceStart = containerConsumerSource.indexOf('app.service');
      const businessServiceStart = containerConsumerSource.lastIndexOf('app.service');
      expect(crossFormatReferences).toContainEqual({ uri: containerConsumerUri,
        range: { start: lspPosition(containerConsumerSource, containerServiceStart),
          end: lspPosition(containerConsumerSource, containerServiceStart + 'app.service'.length) } });
      expect(crossFormatReferences).not.toContainEqual({ uri: containerConsumerUri,
        range: { start: lspPosition(containerConsumerSource, businessServiceStart),
          end: lspPosition(containerConsumerSource, businessServiceStart + 'app.service'.length) } });
      server.stdin.write(encode({ jsonrpc: '2.0', id: 71, method: 'phpCompanion/symfonyServiceReferences', params: {
        textDocument: { uri: configUri, version: 1 }, source: configSource,
        position: lspPosition(configSource, configSource.indexOf('app.service') + 3), context: { includeDeclaration: true },
      } }));
      const referencesWithDeclaration = (await output.waitFor((message) => message.id === 71)).result;
      expect(referencesWithDeclaration).toHaveLength(6);
      expect(referencesWithDeclaration).toContainEqual({ uri: configUri,
        range: { start: lspPosition(configSource, 12), end: lspPosition(configSource, 23) } });
      server.stdin.write(encode({ jsonrpc: '2.0', id: 74, method: 'phpCompanion/symfonyServiceDefinition', params: {
        textDocument: { uri: xmlUri, version: 1 }, source: xmlSource,
        position: lspPosition(xmlSource, xmlSource.indexOf('app.service') + 4),
      } }));
      expect((await output.waitFor((message) => message.id === 74)).result).toEqual([{ uri: configUri,
        range: { start: lspPosition(configSource, 12), end: lspPosition(configSource, 23) } }]);
      server.stdin.write(encode({ jsonrpc: '2.0', id: 75, method: 'phpCompanion/symfonyServiceReferences', params: {
        textDocument: { uri: xmlUri, version: 1 }, source: xmlSource,
        position: lspPosition(xmlSource, xmlSource.indexOf('app.service') + 4), context: { includeDeclaration: false },
      } }));
      expect((await output.waitFor((message) => message.id === 75)).result).toEqual(crossFormatReferences);
      server.stdin.write(encode({ jsonrpc: '2.0', id: 78, method: 'phpCompanion/symfonyServiceDefinition', params: {
        textDocument: { uri: phpUri, version: 1 }, source: phpSource,
        position: lspPosition(phpSource, phpSource.indexOf('app.service') + 4),
      } }));
      expect((await output.waitFor((message) => message.id === 78)).result).toEqual([{ uri: configUri,
        range: { start: lspPosition(configSource, 12), end: lspPosition(configSource, 23) } }]);
      server.stdin.write(encode({ jsonrpc: '2.0', id: 79, method: 'phpCompanion/symfonyServiceReferences', params: {
        textDocument: { uri: phpUri, version: 1 }, source: phpSource,
        position: lspPosition(phpSource, phpSource.indexOf('app.service') + 4), context: { includeDeclaration: false },
      } }));
      expect((await output.waitFor((message) => message.id === 79)).result).toEqual(crossFormatReferences);
      const attributeServiceStart = attributeSource.indexOf('app.service');
      server.stdin.write(encode({ jsonrpc: '2.0', id: 7901, method: 'phpCompanion/symfonyServiceDefinition', params: {
        textDocument: { uri: attributeUri, version: 1 }, source: attributeSource,
        position: lspPosition(attributeSource, attributeServiceStart + 4),
      } }));
      expect((await output.waitFor((message) => message.id === 7901)).result).toEqual([{ uri: configUri,
        range: { start: lspPosition(configSource, 12), end: lspPosition(configSource, 23) } }]);
      server.stdin.write(encode({ jsonrpc: '2.0', id: 7902, method: 'phpCompanion/symfonyServiceReferences', params: {
        textDocument: { uri: attributeUri, version: 1 }, source: attributeSource,
        position: lspPosition(attributeSource, attributeServiceStart + 4), context: { includeDeclaration: false },
      } }));
      expect((await output.waitFor((message) => message.id === 7902)).result).toEqual(crossFormatReferences);
      server.stdin.write(encode({ jsonrpc: '2.0', id: 7904, method: 'phpCompanion/symfonyServiceDefinition', params: {
        textDocument: { uri: containerConsumerUri, version: 1 }, source: containerConsumerSource,
        position: lspPosition(containerConsumerSource, containerServiceStart + 4),
      } }));
      expect((await output.waitFor((message) => message.id === 7904)).result).toEqual([{ uri: configUri,
        range: { start: lspPosition(configSource, 12), end: lspPosition(configSource, 23) } }]);
      server.stdin.write(encode({ jsonrpc: '2.0', id: 7905, method: 'phpCompanion/symfonyServiceDefinition', params: {
        textDocument: { uri: containerConsumerUri, version: 1 }, source: containerConsumerSource,
        position: lspPosition(containerConsumerSource, businessServiceStart + 4),
      } }));
      expect((await output.waitFor((message) => message.id === 7905)).result).toEqual([]);
      server.stdin.write(encode({ jsonrpc: '2.0', id: 7906, method: 'phpCompanion/symfonyServiceCompletions', params: {
        textDocument: { uri: containerConsumerUri, version: 1 }, source: containerConsumerSource,
        position: lspPosition(containerConsumerSource, containerServiceStart + 'app.se'.length),
      } }));
      expect((await output.waitFor((message) => message.id === 7906)).result).toEqual({ isIncomplete: false, items: [{
        label: 'app.service', detail: 'App\\Service (explicit, private)',
        range: { start: lspPosition(containerConsumerSource, containerServiceStart),
          end: lspPosition(containerConsumerSource, containerServiceStart + 'app.service'.length) },
      }] });
      server.stdin.write(encode({ jsonrpc: '2.0', id: 7903, method: 'phpCompanion/symfonyServiceCompletions', params: {
        textDocument: { uri: attributeUri, version: 1 }, source: attributeSource,
        position: lspPosition(attributeSource, attributeServiceStart + 'app.se'.length),
      } }));
      expect((await output.waitFor((message) => message.id === 7903)).result).toEqual({ isIncomplete: false, items: [{
        label: 'app.service', detail: 'App\\Service (explicit, private)',
        range: { start: lspPosition(attributeSource, attributeServiceStart), end: lspPosition(attributeSource, attributeServiceStart + 'app.service'.length) },
      }] });
      const phpServiceValueStart = phpSource.indexOf('app.service');
      const xmlServiceValueStart = xmlSource.indexOf('app.service');
      server.stdin.write(encode({ jsonrpc: '2.0', id: 80, method: 'phpCompanion/symfonyServiceCompletions', params: {
        textDocument: { uri: phpUri, version: 1 }, source: phpSource,
        position: lspPosition(phpSource, phpServiceValueStart + 'app.se'.length),
      } }));
      expect((await output.waitFor((message) => message.id === 80)).result).toEqual({ isIncomplete: false, items: [{
        label: 'app.service', detail: 'App\\Service (explicit, private)',
        range: { start: lspPosition(phpSource, phpServiceValueStart), end: lspPosition(phpSource, phpServiceValueStart + 'app.service'.length) },
      }] });
      server.stdin.write(encode({ jsonrpc: '2.0', id: 81, method: 'phpCompanion/symfonyServicePrepareRename', params: {
        textDocument: { uri: xmlUri, version: 1 }, source: xmlSource,
        position: lspPosition(xmlSource, xmlServiceValueStart + 4),
      } }));
      expect((await output.waitFor((message) => message.id === 81)).result).toEqual({ placeholder: 'app.service', range: {
        start: lspPosition(xmlSource, xmlServiceValueStart), end: lspPosition(xmlSource, xmlServiceValueStart + 'app.service'.length),
      } });
      server.stdin.write(encode({ jsonrpc: '2.0', id: 82, method: 'phpCompanion/symfonyServiceRename', params: {
        textDocument: { uri: xmlUri, version: 1 }, source: xmlSource,
        position: lspPosition(xmlSource, xmlServiceValueStart + 4), newName: 'app.renamed-service',
      } }));
      const serviceRename = (await output.waitFor((message) => message.id === 82)).result.changes;
      expect(Object.values(serviceRename).flat()).toHaveLength(6);
      expect(serviceRename[configUri]).toHaveLength(2);
      expect(serviceRename[xmlUri]).toHaveLength(1);
      expect(serviceRename[phpUri]).toHaveLength(1);
      expect(serviceRename[attributeUri]).toHaveLength(1);
      expect(serviceRename[containerConsumerUri]).toHaveLength(1);
      expect(Object.values(serviceRename).flat()).toEqual(expect.arrayContaining([
        expect.objectContaining({ newText: 'app.renamed-service' }),
      ]));
      server.stdin.write(encode({ jsonrpc: '2.0', id: 83, method: 'phpCompanion/symfonyServiceRename', params: {
        textDocument: { uri: xmlUri, version: 1 }, source: xmlSource,
        position: lspPosition(xmlSource, xmlServiceValueStart + 4), newName: 'invalid service',
      } }));
      expect((await output.waitFor((message) => message.id === 83)).result).toBeNull();
      server.stdin.write(encode({ jsonrpc: '2.0', method: 'textDocument/didOpen', params: {
        textDocument: { uri: phpUri, languageId: 'php', version: 1, text: phpSource },
      } }));
      await output.waitFor((message) => message.method === 'textDocument/publishDiagnostics' && message.params.uri === phpUri);
      server.stdin.write(encode({ jsonrpc: '2.0', id: 84, method: 'textDocument/prepareRename', params: {
        textDocument: { uri: phpUri }, position: lspPosition(phpSource, phpServiceValueStart + 4),
      } }));
      expect((await output.waitFor((message) => message.id === 84)).result).toEqual({ placeholder: 'app.service', range: {
        start: lspPosition(phpSource, phpServiceValueStart), end: lspPosition(phpSource, phpServiceValueStart + 'app.service'.length),
      } });
      server.stdin.write(encode({ jsonrpc: '2.0', id: 85, method: 'textDocument/rename', params: {
        textDocument: { uri: phpUri }, position: lspPosition(phpSource, phpServiceValueStart + 4), newName: 'app.renamed',
      } }));
      expect(Object.values((await output.waitFor((message) => message.id === 85)).result.changes).flat()).toHaveLength(6);
      server.stdin.write(encode({ jsonrpc: '2.0', method: 'textDocument/didOpen', params: {
        textDocument: { uri: attributeUri, languageId: 'php', version: 1, text: attributeSource },
      } }));
      await output.waitFor((message) => message.method === 'textDocument/publishDiagnostics' && message.params.uri === attributeUri);
      server.stdin.write(encode({ jsonrpc: '2.0', id: 8501, method: 'textDocument/prepareRename', params: {
        textDocument: { uri: attributeUri }, position: lspPosition(attributeSource, attributeServiceStart + 4),
      } }));
      expect((await output.waitFor((message) => message.id === 8501)).result).toEqual({ placeholder: 'app.service', range: {
        start: lspPosition(attributeSource, attributeServiceStart), end: lspPosition(attributeSource, attributeServiceStart + 'app.service'.length),
      } });
      server.stdin.write(encode({ jsonrpc: '2.0', id: 8502, method: 'textDocument/rename', params: {
        textDocument: { uri: attributeUri }, position: lspPosition(attributeSource, attributeServiceStart + 4), newName: 'app.attribute-renamed',
      } }));
      expect(Object.values((await output.waitFor((message) => message.id === 8502)).result.changes).flat()).toHaveLength(6);
      server.stdin.write(encode({ jsonrpc: '2.0', id: 76, method: 'phpCompanion/symfonyServiceCompletions', params: {
        textDocument: { uri: xmlUri, version: 1 }, source: xmlSource,
        position: lspPosition(xmlSource, xmlServiceValueStart + 'app.se'.length),
      } }));
      expect((await output.waitFor((message) => message.id === 76)).result).toEqual({ isIncomplete: false, items: [{
        label: 'app.service', detail: 'App\\Service (explicit, private)',
        range: { start: lspPosition(xmlSource, xmlServiceValueStart), end: lspPosition(xmlSource, xmlServiceValueStart + 'app.service'.length) },
      }] });
      server.stdin.write(encode({ jsonrpc: '2.0', id: 77, method: 'phpCompanion/symfonyServiceCompletions', params: {
        textDocument: { uri: xmlUri, version: 1 }, source: xmlSource,
        position: lspPosition(xmlSource, xmlSource.indexOf('app.xml.consumer') + 4),
      } }));
      expect((await output.waitFor((message) => message.id === 77)).result).toEqual({ isIncomplete: false, items: [] });
      const serviceValueStart = configSource.indexOf('@app.service');
      server.stdin.write(encode({ jsonrpc: '2.0', id: 72, method: 'phpCompanion/symfonyServiceCompletions', params: {
        textDocument: { uri: configUri, version: 1 }, source: configSource,
        position: lspPosition(configSource, serviceValueStart + '@app.se'.length),
      } }));
      expect((await output.waitFor((message) => message.id === 72)).result).toEqual({ isIncomplete: false, items: [{
        label: 'app.service', detail: 'App\\Service (explicit, private)',
        range: { start: lspPosition(configSource, serviceValueStart + 1), end: lspPosition(configSource, serviceValueStart + '@app.service'.length) },
      }] });
      server.stdin.write(encode({ jsonrpc: '2.0', id: 73, method: 'phpCompanion/symfonyServiceCompletions', params: {
        textDocument: { uri: configUri, version: 1 }, source: configSource,
        position: lspPosition(configSource, configSource.indexOf('app.service') + 3),
      } }));
      expect((await output.waitFor((message) => message.id === 73)).result).toEqual({ isIncomplete: false, items: [] });
      const inactiveXmlServiceStart = xmlSource.lastIndexOf('app.service');
      server.stdin.write(encode({ jsonrpc: '2.0', id: 7300, method: 'phpCompanion/symfonyServiceDefinition', params: {
        textDocument: { uri: xmlUri, version: 1 }, source: xmlSource,
        position: lspPosition(xmlSource, inactiveXmlServiceStart + 4),
      } }));
      expect((await output.waitFor((message) => message.id === 7300)).result).toEqual([]);
      const inactivePhpServiceStart = phpSource.lastIndexOf('app.service');
      server.stdin.write(encode({ jsonrpc: '2.0', id: 7304, method: 'phpCompanion/symfonyServiceDefinition', params: {
        textDocument: { uri: phpUri, version: 1 }, source: phpSource,
        position: lspPosition(phpSource, inactivePhpServiceStart + 4),
      } }));
      expect((await output.waitFor((message) => message.id === 7304)).result).toEqual([]);
      const commitCount = (): number => output.messages.filter((message: any) => message.method === 'window/logMessage'
        && message.params?.message?.includes('committed authoritative container')).length;
      const switchEnvironment = async (environment: string): Promise<void> => {
        const before = commitCount();
        server!.stdin.write(encode({ jsonrpc: '2.0', method: 'phpCompanion/symfonyRouteProviders', params: {
          providers: [{ uri: rootUri, external: false, environment }],
        } }));
        for (let attempt = 0; attempt < 100 && commitCount() === before; attempt += 1) {
          await new Promise<void>((resolvePromise) => setTimeout(resolvePromise, 20));
        }
        expect(commitCount()).toBeGreaterThan(before);
      };
      await switchEnvironment('prod');
      server.stdin.write(encode({ jsonrpc: '2.0', id: 7303, method: 'phpCompanion/symfonyServiceDefinition', params: {
        textDocument: { uri: xmlUri, version: 1 }, source: xmlSource,
        position: lspPosition(xmlSource, inactiveXmlServiceStart + 4),
      } }));
      expect((await output.waitFor((message) => message.id === 7303)).result).toEqual([{ uri: configUri,
        range: { start: lspPosition(configSource, 12), end: lspPosition(configSource, 23) } }]);
      server.stdin.write(encode({ jsonrpc: '2.0', id: 7305, method: 'phpCompanion/symfonyServiceDefinition', params: {
        textDocument: { uri: phpUri, version: 1 }, source: phpSource,
        position: lspPosition(phpSource, inactivePhpServiceStart + 4),
      } }));
      expect((await output.waitFor((message) => message.id === 7305)).result).toEqual([{ uri: configUri,
        range: { start: lspPosition(configSource, 12), end: lspPosition(configSource, 23) } }]);
      server.stdin.write(encode({ jsonrpc: '2.0', id: 7301, method: 'phpCompanion/symfonyServiceCompletions', params: {
        textDocument: { uri: configUri, version: 1 }, source: configSource,
        position: lspPosition(configSource, serviceValueStart + '@app.se'.length),
      } }));
      expect((await output.waitFor((message) => message.id === 7301)).result.items[0]?.detail).toBe('App\\ProdService (explicit, private)');
      await switchEnvironment('dev');
      server.stdin.write(encode({ jsonrpc: '2.0', id: 7302, method: 'phpCompanion/symfonyServiceCompletions', params: {
        textDocument: { uri: configUri, version: 1 }, source: configSource,
        position: lspPosition(configSource, serviceValueStart + '@app.se'.length),
      } }));
      expect((await output.waitFor((message) => message.id === 7302)).result.items[0]?.detail).toBe('App\\Service (explicit, private)');
      server.stdin.write(encode({ jsonrpc: '2.0', method: 'phpCompanion/bundledSemanticProviders', params: { providers: [] } }));
      await new Promise<void>((resolvePromise) => setTimeout(resolvePromise, 250));
      server.stdin.write(encode({ jsonrpc: '2.0', id: 67, method: 'textDocument/references', params: {
        textDocument: { uri: serviceUri }, position: lspPosition(source, source.indexOf('Service') + 2), context: { includeDeclaration: false },
      } }));
      expect((await output.waitFor((message) => message.id === 67)).result)
        .not.toContainEqual(expect.objectContaining({ uri: configUri }));
    } finally { await rm(root, { recursive: true, force: true }); }
  });

  it('refreshes resource-expanded Symfony services after watched PHP declaration changes', async () => {
    const root = await mkdtemp(join(tmpdir(), 'php-companion-container-provider-watch-'));
    try {
      const sourceDirectory = join(root, 'src'); await mkdir(sourceDirectory);
      await writeFile(join(root, 'composer.json'), JSON.stringify({ autoload: { 'psr-4': { 'App\\': 'src/' } } }));
      const servicePath = join(sourceDirectory, 'Service.php'); const serviceUri = pathToFileURL(servicePath).toString();
      await writeFile(servicePath, '<?php namespace App; final class Service {}');
      const consumerPath = join(sourceDirectory, 'Consumer.php'); const consumerUri = pathToFileURL(consumerPath).toString();
      const consumer = '<?php namespace App; final class Consumer { public function __construct(#[\\Symfony\\Component\\DependencyInjection\\Attribute\\Autowire(service: "App")] object $service) {} }';
      await writeFile(consumerPath, consumer);
      const counter = join(root, 'provider-count.txt'); const provider = join(root, 'services.mjs');
      await writeFile(provider, `import{appendFileSync}from'node:fs';let input='';for await(const part of process.stdin)input+=part;const request=JSON.parse(input);appendFileSync(${JSON.stringify(counter)},'1\\n');const services=(request.params.projectTypes??[]).filter((type)=>type.fqcn.endsWith('Service')).map((type)=>({id:type.fqcn,className:type.fqcn,public:false,autowire:true,autowireComplete:true,bindings:[],configuredCalls:[],callsComplete:true,configuredProperties:[],propertiesComplete:true,eventListeners:[],origin:'resource',uri:type.uri,start:type.start,end:type.end,registrationUri:type.uri,registrationStart:type.start,registrationEnd:type.end}));process.stdout.write(JSON.stringify({protocolVersion:1,id:request.id,result:{schema:1,providerId:'php-companion.symfony.services',generation:request.params.generation,complete:true,methods:[],properties:[],literalMethodReturns:[],containerServices:services,containerMethodArguments:[],containerPropertyArguments:[],containerConfigurationUris:[]}}));`);
      server = spawn(process.execPath, [resolve('dist/server.js'), '--stdio'], { stdio: 'pipe' }); const output = messagesFrom(server);
      server.stdin.write(encode({ jsonrpc: '2.0', id: 669, method: 'initialize', params: {
        processId: null, capabilities: {}, rootUri: pathToFileURL(root).toString(), initializationOptions: { bundledSemanticProviders: [
          { providerId: 'php-companion.symfony.services', command: process.execPath, args: [provider], timeoutMs: 5000,
            requiresProjectTypes: true, replacesContainerServices: true },
        ] },
      } }));
      await output.waitFor((message) => message.id === 669); server.stdin.write(encode({ jsonrpc: '2.0', method: 'initialized', params: {} }));
      await output.waitFor((message) => message.method === 'window/logMessage' && message.params?.message?.includes('complete=true'), 10_000);
      server.stdin.write(encode({ jsonrpc: '2.0', method: 'textDocument/didOpen', params: {
        textDocument: { uri: consumerUri, languageId: 'php', version: 1, text: consumer },
      } }));
      await output.waitFor((message) => message.method === 'textDocument/publishDiagnostics' && message.params.uri === consumerUri);
      const completionOffset = consumer.indexOf('service: "App') + 'service: "App'.length;
      const complete = async (id: number): Promise<any[]> => {
        server!.stdin.write(encode({ jsonrpc: '2.0', id, method: 'textDocument/completion', params: {
          textDocument: { uri: consumerUri }, position: lspPosition(consumer, completionOffset),
        } }));
        return (await output.waitFor((message) => message.id === id)).result;
      };
      expect(await complete(670)).toContainEqual(expect.objectContaining({ label: 'App\\Service' }));
      const before = (await readFile(counter, 'utf8')).trim().split('\n').length;
      await writeFile(servicePath, '<?php namespace App; final class RenamedService {}');
      server.stdin.write(encode({ jsonrpc: '2.0', method: 'workspace/didChangeWatchedFiles', params: { changes: [{ uri: serviceUri, type: 2 }] } }));
      await output.waitFor((message) => message.method === 'window/logMessage' && message.params?.message?.includes(`[index:delta] complete uri=${serviceUri}`));
      expect((await readFile(counter, 'utf8')).trim().split('\n')).toHaveLength(before + 1);
      const refreshed = await complete(671);
      expect(refreshed).toContainEqual(expect.objectContaining({ label: 'App\\RenamedService' }));
      expect(refreshed).not.toContainEqual(expect.objectContaining({ label: 'App\\Service' }));
    } finally { await rm(root, { recursive: true, force: true }); }
  });

  it('skips event facts for a method outside registered services but retains subscriber references', async () => {
    const root = await mkdtemp(join(tmpdir(), 'php-companion-event-reference-gate-'));
    try {
      await mkdir(join(root, 'src'));
      await writeFile(join(root, 'composer.json'), JSON.stringify({ autoload: { classmap: ['src/'] } }));
      const source = '<?php namespace App; final class Subscriber { public function onReady(): void {} } final class Other { public function get(): void {} public function run(): void { $this->get(); } }';
      const uri = pathToFileURL(join(root, 'src', 'Classes.php')).toString();
      await writeFile(join(root, 'src', 'Classes.php'), source);
      const servicePath = join(root, 'services.mjs'); const eventPath = join(root, 'events.mjs');
      const eventCalls = join(root, 'event-calls.txt'); const serviceCalls = join(root, 'service-calls.txt');
      await writeFile(servicePath, `import{appendFileSync}from'node:fs';let input='';for await(const part of process.stdin)input+=part;const request=JSON.parse(input);appendFileSync(${JSON.stringify(serviceCalls)},'called\\n');const type=request.params.projectTypes?.find((item)=>item.fqcn==='App\\\\Subscriber');const service={id:'App\\\\Subscriber',className:'App\\\\Subscriber',public:false,autowire:true,autowireComplete:true,bindings:[],configuredCalls:[],callsComplete:true,configuredProperties:[],propertiesComplete:true,eventListeners:[],origin:'resource',uri:type.uri,start:type.start,end:type.end,registrationUri:type.uri,registrationStart:type.start,registrationEnd:type.end};process.stdout.write(JSON.stringify({protocolVersion:1,id:request.id,result:{schema:1,providerId:'test.services',generation:request.params.generation,complete:Boolean(type),methods:[],properties:[],literalMethodReturns:[],containerServices:[service],containerMethodArguments:[],containerPropertyArguments:[],containerConfigurationUris:[]}}));`);
      const listenerStart = source.indexOf('onReady');
      await writeFile(eventPath, `import{appendFileSync}from'node:fs';let input='';for await(const part of process.stdin)input+=part;const request=JSON.parse(input);appendFileSync(${JSON.stringify(eventCalls)},'called\\n');process.stdout.write(JSON.stringify({protocolVersion:1,id:request.id,result:{schema:1,providerId:'test.events',generation:request.params.generation,complete:true,methods:[],properties:[],literalMethodReturns:[],eventSubscriptions:[{subscriberFqcn:'App\\\\Subscriber',event:'app.ready',listener:'onReady',uri:${JSON.stringify(uri)},eventStart:${listenerStart},eventEnd:${listenerStart + 7},listenerStart:${listenerStart},listenerEnd:${listenerStart + 7}}],eventDispatches:[]}}));`);
      server = spawn(process.execPath, [resolve('dist/server.js'), '--stdio'], { stdio: 'pipe' }); const output = messagesFrom(server);
      server.stdin.write(encode({ jsonrpc: '2.0', id: 671, method: 'initialize', params: {
        processId: null, capabilities: {}, rootUri: pathToFileURL(root).toString(), initializationOptions: {
          indexingMode: 'onDemand', bundledSemanticProviders: [
            { providerId: 'test.services', command: process.execPath, args: [servicePath], timeoutMs: 5000,
              requiresProjectTypes: true, replacesContainerServices: true },
            { providerId: 'test.events', command: process.execPath, args: [eventPath], timeoutMs: 5000,
              requiresProjectTypes: true, requiresContainerServices: true, replacesEventRelations: true },
          ],
        },
      } }));
      await output.waitFor((message) => message.id === 671);
      server.stdin.write(encode({ jsonrpc: '2.0', method: 'initialized', params: {} }));
      server.stdin.write(encode({ jsonrpc: '2.0', method: 'textDocument/didOpen', params: {
        textDocument: { uri, languageId: 'php', version: 1, text: source },
      } }));
      const references = async (id: number, name: string): Promise<any[]> => {
        server!.stdin.write(encode({ jsonrpc: '2.0', id, method: 'textDocument/references', params: {
          textDocument: { uri }, position: lspPosition(source, source.indexOf(name) + 2),
          context: { includeDeclaration: false },
        } }));
        return (await output.waitFor((message) => message.id === id, 10_000)).result;
      };
      const other = await references(672, 'get():');
      expect(other).toEqual([{ uri, range: {
        start: lspPosition(source, source.indexOf('->get') + 2),
        end: lspPosition(source, source.indexOf('->get') + 5),
      } }]);
      expect((await readFile(serviceCalls, 'utf8')).trim().split('\n')).toHaveLength(1);
      expect(await references(674, 'get():')).toEqual(other);
      expect((await readFile(serviceCalls, 'utf8')).trim().split('\n')).toHaveLength(1);
      server.stdin.write(encode({ jsonrpc: '2.0', method: 'textDocument/didChange', params: {
        textDocument: { uri, version: 2 }, contentChanges: [{ text: `${source}\n// changed` }],
      } }));
      expect(await references(675, 'get():')).toEqual(other);
      expect((await readFile(serviceCalls, 'utf8')).trim().split('\n')).toHaveLength(2);
      await expect(readFile(eventCalls, 'utf8')).rejects.toMatchObject({ code: 'ENOENT' });
      await references(673, 'onReady');
      expect((await readFile(eventCalls, 'utf8')).trim()).toBe('called');
    } finally { await rm(root, { recursive: true, force: true }); }
  });

  it('uses a bundled authoritative event provider for listener and dispatch references', async () => {
    const root = await mkdtemp(join(tmpdir(), 'php-companion-event-provider-'));
    try {
      await mkdir(join(root, 'src')); await writeFile(join(root, 'composer.json'), JSON.stringify({ autoload: { classmap: ['src/'] } }));
      const path = join(root, 'src', 'Events.php'); const uri = pathToFileURL(path).toString();
      const source = `<?php
namespace Symfony\\Contracts\\EventDispatcher { interface EventDispatcherInterface { public function dispatch(object $event, ?string $eventName = null): object; } }
namespace App {
 final class Subscriber { public function onReady(): void {} }
 final class ReadyEvent {}
 final class OtherEvent {}
}`;
      await writeFile(path, source);
      const dispatchPath = join(root, 'src', 'Dispatching.php'); const dispatchUri = pathToFileURL(dispatchPath).toString();
      const dispatchSource = (event: 'ReadyEvent' | 'OtherEvent'): string => `<?php namespace App;
use Symfony\\Contracts\\EventDispatcher\\EventDispatcherInterface;
final class Dispatching { public function __construct(private EventDispatcherInterface $dispatcher) {} public function run(): void { $this->dispatcher->dispatch(new ${event}()); } }`;
      await writeFile(dispatchPath, dispatchSource('ReadyEvent'));
      const listenerStart = source.indexOf('onReady'); const initialDispatchSource = dispatchSource('ReadyEvent');
      const dispatchedStart = initialDispatchSource.indexOf('new ReadyEvent()');
      const serviceProvider = join(root, 'services.mjs'); const eventProvider = join(root, 'events.mjs');
      await writeFile(serviceProvider, `let input=''; for await(const part of process.stdin)input+=part;const request=JSON.parse(input);const type=request.params.projectTypes?.find((item)=>item.fqcn==='App\\\\Subscriber');const service={id:'App\\\\Subscriber',className:'App\\\\Subscriber',public:false,autowire:true,autowireComplete:true,bindings:[],configuredCalls:[],callsComplete:true,configuredProperties:[],propertiesComplete:true,eventListeners:[],origin:'resource',uri:type.uri,start:type.start,end:type.end,registrationUri:type.uri,registrationStart:type.start,registrationEnd:type.end};process.stdout.write(JSON.stringify({protocolVersion:1,id:request.id,result:{schema:1,providerId:'php-companion.symfony.services',generation:request.params.generation,complete:Boolean(type),methods:[],properties:[],literalMethodReturns:[],containerServices:[service],containerMethodArguments:[],containerPropertyArguments:[],containerConfigurationUris:[]}}));`);
      await writeFile(eventProvider, `import{readFileSync}from'node:fs';let input='';for await(const part of process.stdin)input+=part;const request=JSON.parse(input);const type=request.params.projectTypes?.find((item)=>item.fqcn==='App\\\\Subscriber');const service=request.params.containerServices?.find((item)=>item.className==='App\\\\Subscriber');const dispatchSource=readFileSync(${JSON.stringify(dispatchPath)},'utf8');const ready=dispatchSource.includes('ReadyEvent');const eventStart=dispatchSource.indexOf(ready?'new ReadyEvent()':'new OtherEvent()');const dispatchStart=dispatchSource.indexOf('dispatch(new');process.stdout.write(JSON.stringify({protocolVersion:1,id:request.id,result:{schema:1,providerId:'php-companion.symfony.events',generation:request.params.generation,complete:Boolean(type&&service),methods:[],properties:[],literalMethodReturns:[],eventSubscriptions:[{subscriberFqcn:'App\\\\Subscriber',event:'provider.event',listener:'onReady',uri:type.uri,eventStart:${listenerStart},eventEnd:${listenerStart + 7},listenerStart:${listenerStart},listenerEnd:${listenerStart + 7}}],eventDispatches:[{event:ready?'provider.event':'updated.event',uri:${JSON.stringify(dispatchUri)},eventStart,eventEnd:eventStart+16,dispatchStart,dispatchEnd:dispatchStart+8}]}}));`);
      server = spawn(process.execPath, [resolve('dist/server.js'), '--stdio'], { stdio: 'pipe' }); const output = messagesFrom(server);
      server.stdin.write(encode({ jsonrpc: '2.0', id: 661, method: 'initialize', params: {
        processId: null, capabilities: {}, rootUri: pathToFileURL(root).toString(), initializationOptions: { bundledSemanticProviders: [
          { providerId: 'php-companion.symfony.services', command: process.execPath, args: [serviceProvider], timeoutMs: 5000,
            requiresProjectTypes: true, replacesContainerServices: true },
          { providerId: 'php-companion.symfony.events', command: process.execPath, args: [eventProvider], timeoutMs: 5000,
            requiresProjectTypes: true, requiresContainerServices: true, replacesEventRelations: true },
        ] },
      } }));
      await output.waitFor((message) => message.id === 661); server.stdin.write(encode({ jsonrpc: '2.0', method: 'initialized', params: {} }));
      await output.waitFor((message) => message.method === 'window/logMessage'
        && message.params?.message?.includes('authoritative event generation'), 10_000);
      server.stdin.write(encode({ jsonrpc: '2.0', method: 'textDocument/didOpen', params: { textDocument: { uri, languageId: 'php', version: 1, text: source } } }));
      await output.waitFor((message) => message.method === 'textDocument/publishDiagnostics' && message.params.uri === uri);
      server.stdin.write(encode({ jsonrpc: '2.0', id: 662, method: 'textDocument/references', params: {
        textDocument: { uri }, position: lspPosition(source, listenerStart + 2), context: { includeDeclaration: false },
      } }));
      const result = (await output.waitFor((message) => message.id === 662)).result;
      expect(result).toContainEqual({ uri, range: { start: lspPosition(source, listenerStart), end: lspPosition(source, listenerStart + 7) } });
      expect(result).toContainEqual({ uri: dispatchUri,
        range: { start: lspPosition(initialDispatchSource, dispatchedStart), end: lspPosition(initialDispatchSource, dispatchedStart + 16) } });
      server.stdin.write(encode({ jsonrpc: '2.0', id: 665, method: 'textDocument/references', params: {
        textDocument: { uri }, position: lspPosition(source, listenerStart + 2), context: { includeDeclaration: false },
      } }));
      expect((await output.waitFor((message) => message.id === 665)).result).toEqual(result);
      await writeFile(dispatchPath, dispatchSource('OtherEvent'));
      server.stdin.write(encode({ jsonrpc: '2.0', method: 'workspace/didChangeWatchedFiles', params: { changes: [{ uri: dispatchUri, type: 2 }] } }));
      await output.waitFor((message) => message.method === 'window/logMessage' && message.params?.message?.includes(`[index:delta] complete uri=${dispatchUri}`));
      server.stdin.write(encode({ jsonrpc: '2.0', id: 664, method: 'textDocument/references', params: {
        textDocument: { uri }, position: lspPosition(source, listenerStart + 2), context: { includeDeclaration: false },
      } }));
      expect((await output.waitFor((message) => message.id === 664)).result)
        .not.toContainEqual(expect.objectContaining({ uri: dispatchUri }));
      server.stdin.write(encode({ jsonrpc: '2.0', method: 'phpCompanion/bundledSemanticProviders', params: { providers: [
        { providerId: 'php-companion.symfony.services', command: process.execPath, args: [serviceProvider], timeoutMs: 5000,
          requiresProjectTypes: true, replacesContainerServices: true },
      ] } }));
      await new Promise<void>((resolvePromise) => setTimeout(resolvePromise, 250));
      server.stdin.write(encode({ jsonrpc: '2.0', id: 663, method: 'textDocument/references', params: {
        textDocument: { uri }, position: lspPosition(source, listenerStart + 2), context: { includeDeclaration: false },
      } }));
      expect((await output.waitFor((message) => message.id === 663)).result).toEqual([]);
    } finally { await rm(root, { recursive: true, force: true }); }
  });

  it('uses a bundled authoritative Symfony controller-context provider for Twig interop', async () => {
    const root = await mkdtemp(join(tmpdir(), 'php-companion-controller-context-provider-'));
    try {
      await mkdir(join(root, 'src')); await writeFile(join(root, 'composer.json'), JSON.stringify({ autoload: { 'psr-4': { 'App\\': 'src/' } } }));
      const path = join(root, 'src', 'PageController.php'); const uri = pathToFileURL(path).toString();
      const source = "<?php namespace App; final class PageController { public function show(User $user): void { $this->render('core.html.twig', ['user' => $user]); } }";
      await writeFile(path, source);
      await writeFile(join(root, 'src', 'User.php'), '<?php namespace App; final class User { public function getName(): string { return \'name\'; } }');
      await writeFile(join(root, 'src', 'Unrelated.php'), '<?php namespace App; final class Unrelated { public function surrender(): void {} }');
      const provider = join(root, 'controllers.mjs');
      await writeFile(provider, `let input='';for await(const part of process.stdin)input+=part;const request=JSON.parse(input);const type=request.params.projectTypes?.find((item)=>item.fqcn==='App\\\\PageController');const document=request.params.documents?.find((item)=>item.languageId==='php');const target=type??(document?{uri:document.uri,start:document.source.indexOf('class ')+6,end:document.source.indexOf(' {',document.source.indexOf('class '))}:undefined);const edited=document?.source.includes('edited.html.twig');const created=document?.source.includes('new-core.html.twig');const location=target?{uri:target.uri,start:target.start,end:target.end,snapshotVersion:request.params.generation}:undefined;process.stdout.write(JSON.stringify({protocolVersion:1,id:request.id,result:{schema:1,providerId:'php-companion.symfony.controller-contexts',generation:request.params.generation,complete:Boolean(target),methods:[],properties:[],literalMethodReturns:[],controllerContexts:target?[{template:created?'new-provider.html.twig':edited?'edited-provider.html.twig':'provider.html.twig',complete:true,variables:[{name:'user',type:{kind:'named',name:'App\\\\User'},optional:false}],sources:[{symbol:'App\\\\PageController::show',location}]}]:[]}}));`);
      server = spawn(process.execPath, [resolve('dist/server.js'), '--stdio'], { stdio: 'pipe' }); const output = messagesFrom(server);
      server.stdin.write(encode({ jsonrpc: '2.0', id: 663, method: 'initialize', params: {
        processId: null, capabilities: {}, rootUri: pathToFileURL(root).toString(), initializationOptions: { bundledSemanticProviders: [
          { providerId: 'php-companion.symfony.controller-contexts', command: process.execPath, args: [provider], timeoutMs: 5000,
            requiresProjectTypes: true, acceptsDocumentSnapshots: true, replacesControllerContexts: true },
        ], indexingMode: 'onDemand' },
      } }));
      await output.waitFor((message) => message.id === 663); server.stdin.write(encode({ jsonrpc: '2.0', method: 'initialized', params: {} }));
      server.stdin.write(encode({ jsonrpc: '2.0', id: 664, method: 'phpCompanion/interop/contexts', params: { rootUri: pathToFileURL(root).toString() } }));
      expect((await output.waitFor((message) => message.id === 664)).result).toMatchObject({ contexts: [{ template: 'provider.html.twig',
        variables: [{ name: 'user', type: { kind: 'named', name: 'App\\User' } }], sources: [{ symbol: 'App\\PageController::show' }] }],
      types: { 'App\\User': { members: [expect.objectContaining({ name: 'name', kind: 'property' })] } } });
      expect(output.messages.some((message: any) => message.method === 'window/logMessage'
        && message.params?.message?.includes('[controller-context-candidates] files=3 cached=0 parsed=1'))).toBe(true);
      expect(output.messages.some((message: any) => message.method === 'window/logMessage' && message.params?.message?.includes('[index:'))).toBe(false);
      const edited = source.replace('core.html.twig', 'edited.html.twig');
      server.stdin.write(encode({ jsonrpc: '2.0', method: 'textDocument/didOpen', params: { textDocument: { uri, languageId: 'php', version: 2, text: edited } } }));
      await output.waitFor((message) => message.method === 'phpCompanion/interop/invalidated' && message.params.changedUris.includes(uri));
      server.stdin.write(encode({ jsonrpc: '2.0', id: 665, method: 'phpCompanion/interop/contexts', params: { rootUri: pathToFileURL(root).toString() } }));
      expect((await output.waitFor((message) => message.id === 665)).result).toMatchObject({ contexts: [{ template: 'edited-provider.html.twig' }] });
      const newUri = pathToFileURL(join(root, 'src', 'NewController.php')).toString();
      const newSource = "<?php namespace App; final class NewController { public function show(User $user): void { $this->render('new-core.html.twig', ['user' => $user]); } }";
      server.stdin.write(encode({ jsonrpc: '2.0', method: 'textDocument/didOpen', params: {
        textDocument: { uri: newUri, languageId: 'php', version: 1, text: newSource },
      } }));
      await output.waitFor((message) => message.method === 'phpCompanion/interop/invalidated' && message.params.changedUris.includes(newUri));
      server.stdin.write(encode({ jsonrpc: '2.0', id: 666, method: 'phpCompanion/interop/contexts', params: { rootUri: pathToFileURL(root).toString() } }));
      expect((await output.waitFor((message) => message.id === 666)).result).toMatchObject({ contexts: expect.arrayContaining([
        expect.objectContaining({ template: 'new-provider.html.twig' }),
      ]) });
    } finally { await rm(root, { recursive: true, force: true }); }
  });

  it('clears removed controller contexts without spawning the provider for an ineligible PHP edit', async () => {
    const root = await mkdtemp(join(tmpdir(), 'php-companion-controller-context-prefilter-'));
    try {
      const sourceDirectory = join(root, 'src'); await mkdir(sourceDirectory);
      await writeFile(join(root, 'composer.json'), JSON.stringify({ autoload: { 'psr-4': { 'App\\': 'src/' } } }));
      const path = join(sourceDirectory, 'PageController.php'); const uri = pathToFileURL(path).toString();
      const source = "<?php namespace App; final class PageController { public function show(): void { $this->render('page.html.twig'); } }";
      await writeFile(path, source);
      const counter = join(root, 'provider-count.txt'); const provider = join(root, 'controllers.mjs');
      await writeFile(provider, `import{appendFileSync}from'node:fs';let input='';for await(const part of process.stdin)input+=part;const request=JSON.parse(input);appendFileSync(${JSON.stringify(counter)},'1\\n');const type=request.params.projectTypes?.find((item)=>item.fqcn==='App\\\\PageController');const location={uri:type.uri,start:type.start,end:type.end,snapshotVersion:request.params.generation};process.stdout.write(JSON.stringify({protocolVersion:1,id:request.id,result:{schema:1,providerId:'php-companion.symfony.controller-contexts',generation:request.params.generation,complete:true,methods:[],properties:[],literalMethodReturns:[],controllerContexts:[{template:'page.html.twig',complete:true,variables:[],sources:[{symbol:'App\\\\PageController::show',location}]}]}}));`);
      server = spawn(process.execPath, [resolve('dist/server.js'), '--stdio'], { stdio: 'pipe' }); const output = messagesFrom(server);
      server.stdin.write(encode({ jsonrpc: '2.0', id: 675, method: 'initialize', params: {
        processId: null, capabilities: {}, rootUri: pathToFileURL(root).toString(), initializationOptions: { bundledSemanticProviders: [
          { providerId: 'php-companion.symfony.controller-contexts', command: process.execPath, args: [provider], timeoutMs: 5000,
            requiresProjectTypes: true, acceptsDocumentSnapshots: true, replacesControllerContexts: true },
        ] },
      } }));
      await output.waitFor((message) => message.id === 675); server.stdin.write(encode({ jsonrpc: '2.0', method: 'initialized', params: {} }));
      await output.waitFor((message) => message.method === 'window/logMessage'
        && message.params?.message?.includes('authoritative controller contexts'), 10_000);
      const before = (await readFile(counter, 'utf8')).trim().split('\n').length;
      const edited = "<?php namespace App; final class PageController { public function show(): void {} }";
      server.stdin.write(encode({ jsonrpc: '2.0', method: 'textDocument/didOpen', params: {
        textDocument: { uri, languageId: 'php', version: 2, text: edited },
      } }));
      await output.waitFor((message) => message.method === 'phpCompanion/interop/invalidated' && message.params.changedUris.includes(uri));
      server.stdin.write(encode({ jsonrpc: '2.0', id: 676, method: 'phpCompanion/interop/contexts', params: { rootUri: pathToFileURL(root).toString() } }));
      expect((await output.waitFor((message) => message.id === 676)).result.contexts).toEqual([]);
      await new Promise<void>((resolvePromise) => setTimeout(resolvePromise, 100));
      expect((await readFile(counter, 'utf8')).trim().split('\n')).toHaveLength(before);
    } finally { await rm(root, { recursive: true, force: true }); }
  });

  it('keeps the newest controller context when an older provider request finishes last', async () => {
    const root = await mkdtemp(join(tmpdir(), 'php-companion-controller-context-order-'));
    try {
      const sourceDirectory = join(root, 'src'); await mkdir(sourceDirectory);
      await writeFile(join(root, 'composer.json'), JSON.stringify({ autoload: { 'psr-4': { 'App\\': 'src/' } } }));
      const path = join(sourceDirectory, 'PageController.php'); const uri = pathToFileURL(path).toString();
      const source = (template: string): string => `<?php namespace App; final class PageController { public function show(): void { $this->render('${template}'); } }`;
      await writeFile(path, source('initial.html.twig'));
      const started = join(root, 'provider-started.txt'); const provider = join(root, 'controllers.mjs');
      await writeFile(provider, `import{appendFileSync}from'node:fs';let input='';for await(const part of process.stdin)input+=part;const request=JSON.parse(input);const document=request.params.documents?.find((item)=>item.languageId==='php');const template=/render\\('([^']+)'/.exec(document?.source??'')?.[1]??'initial.html.twig';appendFileSync(${JSON.stringify(started)},template+'\\n');await new Promise((resolve)=>setTimeout(resolve,template==='slow.html.twig'?300:10));const type=request.params.projectTypes?.find((item)=>item.fqcn==='App\\\\PageController');const target=type??{uri:document.uri,start:document.source.indexOf('class ')+6,end:document.source.indexOf(' {',document.source.indexOf('class '))};const location={uri:target.uri,start:target.start,end:target.end,snapshotVersion:request.params.generation};process.stdout.write(JSON.stringify({protocolVersion:1,id:request.id,result:{schema:1,providerId:'php-companion.symfony.controller-contexts',generation:request.params.generation,complete:true,methods:[],properties:[],literalMethodReturns:[],controllerContexts:[{template,complete:true,variables:[],sources:[{symbol:'App\\\\PageController::show',location}]}]}}));`);
      server = spawn(process.execPath, [resolve('dist/server.js'), '--stdio'], { stdio: 'pipe' }); const output = messagesFrom(server);
      server.stdin.write(encode({ jsonrpc: '2.0', id: 669, method: 'initialize', params: {
        processId: null, capabilities: {}, rootUri: pathToFileURL(root).toString(), initializationOptions: { bundledSemanticProviders: [
          { providerId: 'php-companion.symfony.controller-contexts', command: process.execPath, args: [provider], timeoutMs: 5000,
            requiresProjectTypes: true, acceptsDocumentSnapshots: true, replacesControllerContexts: true },
        ] },
      } }));
      await output.waitFor((message) => message.id === 669); server.stdin.write(encode({ jsonrpc: '2.0', method: 'initialized', params: {} }));
      await output.waitFor((message) => message.method === 'window/logMessage'
        && message.params?.message?.includes('authoritative controller contexts'), 10_000);
      server.stdin.write(encode({ jsonrpc: '2.0', method: 'textDocument/didOpen', params: {
        textDocument: { uri, languageId: 'php', version: 2, text: source('slow.html.twig') },
      } }));
      for (let attempt = 0; attempt < 100; attempt += 1) {
        const contents = await readFile(started, 'utf8').catch(() => '');
        if (contents.includes('slow.html.twig')) break;
        await new Promise<void>((resolvePromise) => setTimeout(resolvePromise, 10));
      }
      expect(await readFile(started, 'utf8')).toContain('slow.html.twig');
      server.stdin.write(encode({ jsonrpc: '2.0', method: 'textDocument/didChange', params: {
        textDocument: { uri, version: 3 }, contentChanges: [{ text: source('fast.html.twig') }],
      } }));
      await new Promise<void>((resolvePromise) => setTimeout(resolvePromise, 450));
      server.stdin.write(encode({ jsonrpc: '2.0', id: 670, method: 'phpCompanion/interop/contexts', params: { rootUri: pathToFileURL(root).toString() } }));
      expect((await output.waitFor((message) => message.id === 670)).result.contexts.map((context: { template: string }) => context.template))
        .toEqual(['fast.html.twig']);
    } finally { await rm(root, { recursive: true, force: true }); }
  });

  it('merges unchanged files from a full controller refresh with a newer scoped result', async () => {
    const root = await mkdtemp(join(tmpdir(), 'php-companion-controller-context-partial-full-'));
    try {
      const sourceDirectory = join(root, 'src'); await mkdir(sourceDirectory); await mkdir(join(root, 'config'));
      await writeFile(join(root, 'composer.json'), JSON.stringify({ autoload: { 'psr-4': { 'App\\': 'src/' } } }));
      const source = (className: string, template: string): string => `<?php namespace App; final class ${className} { public function show(): void { $this->render('${template}'); } }`;
      const firstPath = join(sourceDirectory, 'FirstController.php'); const secondPath = join(sourceDirectory, 'SecondController.php');
      const firstUri = pathToFileURL(firstPath).toString();
      await writeFile(firstPath, source('FirstController', 'first-initial.html.twig'));
      await writeFile(secondPath, source('SecondController', 'second-initial.html.twig'));
      const configurationUri = pathToFileURL(join(root, 'config', 'services.yaml')).toString();
      const started = join(root, 'provider-started.txt'); const provider = join(root, 'controllers.mjs');
      await writeFile(provider, `import{appendFileSync}from'node:fs';let input='';for await(const part of process.stdin)input+=part;const request=JSON.parse(input);const documents=new Map((request.params.documents??[]).map((item)=>[item.uri,item]));const yaml=(request.params.documents??[]).find((item)=>item.languageId==='yaml');const php=(request.params.documents??[]).find((item)=>item.languageId==='php');const state=yaml?.source??(php?.source.includes('first-fast.html.twig')?'fast':'initial');appendFileSync(${JSON.stringify(started)},state+'\\n');await new Promise((resolve)=>setTimeout(resolve,state==='full'?300:10));const contexts=(request.params.projectTypes??[]).map((type)=>{const short=type.fqcn.split('\\\\').at(-1).replace('Controller','').toLowerCase();const template=state==='fast'?'fast-first.html.twig':state+'-'+short+'.html.twig';return{template,complete:true,variables:[],sources:[{symbol:type.fqcn+'::show',location:{uri:type.uri,start:type.start,end:type.end,snapshotVersion:request.params.generation}}]}});process.stdout.write(JSON.stringify({protocolVersion:1,id:request.id,result:{schema:1,providerId:'php-companion.symfony.controller-contexts',generation:request.params.generation,complete:true,methods:[],properties:[],literalMethodReturns:[],controllerContexts:contexts}}));`);
      server = spawn(process.execPath, [resolve('dist/server.js'), '--stdio'], { stdio: 'pipe' }); const output = messagesFrom(server);
      server.stdin.write(encode({ jsonrpc: '2.0', id: 673, method: 'initialize', params: {
        processId: null, capabilities: {}, rootUri: pathToFileURL(root).toString(), initializationOptions: { bundledSemanticProviders: [
          { providerId: 'php-companion.symfony.controller-contexts', command: process.execPath, args: [provider], timeoutMs: 5000,
            requiresProjectTypes: true, acceptsDocumentSnapshots: true, replacesControllerContexts: true },
        ] },
      } }));
      await output.waitFor((message) => message.id === 673); server.stdin.write(encode({ jsonrpc: '2.0', method: 'initialized', params: {} }));
      await output.waitFor((message) => message.method === 'window/logMessage'
        && message.params?.message?.includes('authoritative controller contexts'), 10_000);
      server.stdin.write(encode({ jsonrpc: '2.0', method: 'phpCompanion/frameworkDocumentSnapshots', params: {
        complete: true, documents: [{ uri: configurationUri, languageId: 'yaml', source: 'full', snapshotVersion: '1' }],
      } }));
      for (let attempt = 0; attempt < 100; attempt += 1) {
        const contents = await readFile(started, 'utf8').catch(() => '');
        if (contents.includes('full')) break;
        await new Promise<void>((resolvePromise) => setTimeout(resolvePromise, 10));
      }
      expect(await readFile(started, 'utf8')).toContain('full');
      server.stdin.write(encode({ jsonrpc: '2.0', method: 'textDocument/didOpen', params: {
        textDocument: { uri: firstUri, languageId: 'php', version: 2, text: source('FirstController', 'first-fast.html.twig') },
      } }));
      await output.waitFor((message) => message.method === 'phpCompanion/interop/invalidated' && message.params.changedUris.includes(firstUri));
      await new Promise<void>((resolvePromise) => setTimeout(resolvePromise, 350));
      server.stdin.write(encode({ jsonrpc: '2.0', id: 674, method: 'phpCompanion/interop/contexts', params: { rootUri: pathToFileURL(root).toString() } }));
      expect((await output.waitFor((message) => message.id === 674)).result.contexts.map((context: { template: string }) => context.template).sort())
        .toEqual(['fast-first.html.twig', 'full-second.html.twig']);
    } finally { await rm(root, { recursive: true, force: true }); }
  });

  it('refreshes changed Symfony controller contexts once per watched-file batch', async () => {
    const root = await mkdtemp(join(tmpdir(), 'php-companion-controller-context-watch-batch-'));
    try {
      const sourceDirectory = join(root, 'src'); await mkdir(sourceDirectory);
      await writeFile(join(root, 'composer.json'), JSON.stringify({ autoload: { 'psr-4': { 'App\\': 'src/' } } }));
      const firstPath = join(sourceDirectory, 'FirstController.php'); const secondPath = join(sourceDirectory, 'SecondController.php');
      const firstUri = pathToFileURL(firstPath).toString(); const secondUri = pathToFileURL(secondPath).toString();
      const source = (className: string, template: string): string => `<?php namespace App; final class ${className} { public function show(): void { $this->render('${template}'); } }`;
      await writeFile(firstPath, source('FirstController', 'first.html.twig'));
      await writeFile(secondPath, source('SecondController', 'second.html.twig'));
      const counter = join(root, 'provider-count.txt'); const provider = join(root, 'controllers.mjs');
      await writeFile(provider, `import{appendFileSync,readFileSync}from'node:fs';let input='';for await(const part of process.stdin)input+=part;const request=JSON.parse(input);appendFileSync(${JSON.stringify(counter)},'1\\n');const documents=new Map((request.params.documents??[]).map((item)=>[item.uri,item.source]));const contexts=(request.params.projectTypes??[]).flatMap((type)=>{const source=documents.get(type.uri)??readFileSync(type.path,'utf8');const template=/render\\('([^']+)'/.exec(source)?.[1];return template?[{template,complete:true,variables:[],sources:[{symbol:type.fqcn+'::show',location:{uri:type.uri,start:type.start,end:type.end,snapshotVersion:request.params.generation}}]}]:[]});process.stdout.write(JSON.stringify({protocolVersion:1,id:request.id,result:{schema:1,providerId:'php-companion.symfony.controller-contexts',generation:request.params.generation,complete:true,methods:[],properties:[],literalMethodReturns:[],controllerContexts:contexts}}));`);
      server = spawn(process.execPath, [resolve('dist/server.js'), '--stdio'], { stdio: 'pipe' }); const output = messagesFrom(server);
      server.stdin.write(encode({ jsonrpc: '2.0', id: 667, method: 'initialize', params: {
        processId: null, capabilities: {}, rootUri: pathToFileURL(root).toString(), initializationOptions: { bundledSemanticProviders: [
          { providerId: 'php-companion.symfony.controller-contexts', command: process.execPath, args: [provider], timeoutMs: 5000,
            requiresProjectTypes: true, acceptsDocumentSnapshots: true, replacesControllerContexts: true },
        ] },
      } }));
      await output.waitFor((message) => message.id === 667); server.stdin.write(encode({ jsonrpc: '2.0', method: 'initialized', params: {} }));
      await output.waitFor((message) => message.method === 'window/logMessage'
        && message.params?.message?.includes('authoritative controller contexts'), 10_000);
      const before = (await readFile(counter, 'utf8')).trim().split('\n').length;
      await writeFile(firstPath, source('FirstController', 'first-edited.html.twig'));
      await writeFile(secondPath, source('SecondController', 'second-edited.html.twig'));
      server.stdin.write(encode({ jsonrpc: '2.0', method: 'workspace/didChangeWatchedFiles', params: { changes: [
        { uri: firstUri, type: 2 }, { uri: secondUri, type: 2 },
      ] } }));
      await output.waitFor((message) => message.method === 'window/logMessage' && message.params?.message?.includes(`[index:delta] complete uri=${secondUri}`));
      expect((await readFile(counter, 'utf8')).trim().split('\n')).toHaveLength(before + 1);
      server.stdin.write(encode({ jsonrpc: '2.0', id: 668, method: 'phpCompanion/interop/contexts', params: { rootUri: pathToFileURL(root).toString() } }));
      expect((await output.waitFor((message) => message.id === 668)).result.contexts.map((context: { template: string }) => context.template).sort())
        .toEqual(['first-edited.html.twig', 'second-edited.html.twig']);
    } finally { await rm(root, { recursive: true, force: true }); }
  });

  it('serves first-class callable invocation signatures, diagnostics, and return completion through stdio', async () => {
    const root = await mkdtemp(join(tmpdir(), 'php-companion-first-class-callable-'));
    try {
      const source = `<?php declare(strict_types=1); namespace CallableLsp;
class Input {}
class Result { public function done(): void {} }
function build(Input $value): Result { return new Result(); }
function run(Input $input): void {
  $callback = build(...);
  $result = $callback($input);
  $result->do;
  $callback();
  $callback('invalid');
}`;
      const path = join(root, 'Callable.php'); const uri = pathToFileURL(path).toString();
      await writeFile(join(root, 'composer.json'), JSON.stringify({ require: { php: '>=8.1' }, autoload: { classmap: ['./Callable.php'] } }));
      await writeFile(path, source);
      server = spawn(process.execPath, [resolve('dist/server.js'), '--stdio'], { stdio: 'pipe' });
      const output = messagesFrom(server);
      server.stdin.write(encode({ jsonrpc: '2.0', id: 225, method: 'initialize', params: {
        processId: null, capabilities: {}, rootUri: pathToFileURL(root).toString(),
      } }));
      await output.waitFor((message) => message.id === 225);
      server.stdin.write(encode({ jsonrpc: '2.0', method: 'initialized', params: {} }));
      await output.waitFor((message) => message.method === 'window/logMessage' && message.params?.message?.includes('complete=true'));
      server.stdin.write(encode({ jsonrpc: '2.0', method: 'textDocument/didOpen', params: {
        textDocument: { uri, languageId: 'php', version: 1, text: source },
      } }));
      const diagnostics = (await output.waitFor((message) => message.method === 'textDocument/publishDiagnostics'
        && message.params?.uri === uri && message.params.diagnostics.some((item: { code?: string }) => item.code === 'php.argument.missing-required')
        && message.params.diagnostics.some((item: { code?: string }) => item.code === 'php.argument.type-mismatch'))).params.diagnostics;
      expect(diagnostics.filter((item: { code?: string }) => item.code === 'php.argument.missing-required')).toHaveLength(1);
      expect(diagnostics.filter((item: { code?: string }) => item.code === 'php.argument.type-mismatch')).toHaveLength(1);
      const completionOffset = source.indexOf('$result->do') + '$result->do'.length;
      server.stdin.write(encode({ jsonrpc: '2.0', id: 226, method: 'textDocument/completion', params: {
        textDocument: { uri }, position: lspPosition(source, completionOffset),
      } }));
      expect((await output.waitFor((message) => message.id === 226)).result)
        .toContainEqual(expect.objectContaining({ label: 'done' }));
      const signatureOffset = source.indexOf('$callback($input)') + '$callback('.length;
      server.stdin.write(encode({ jsonrpc: '2.0', id: 227, method: 'textDocument/signatureHelp', params: {
        textDocument: { uri }, position: lspPosition(source, signatureOffset),
      } }));
      expect((await output.waitFor((message) => message.id === 227)).result)
        .toMatchObject({ signatures: [{ label: 'build(Input $value): Result' }] });
    } finally { await rm(root, { recursive: true, force: true }); }
  });

  it('serves PHPDoc Callable parameter signatures and direct invocation diagnostics through stdio', async () => {
    const root = await mkdtemp(join(tmpdir(), 'php-companion-phpdoc-callable-'));
    try {
      const source = `<?php declare(strict_types=1); namespace PhpDocCallableLsp;
class Input {}
class Result { public function done(): void {} }
/**
 * @param callable(Input $value, string $label=): Result $callback
 * @param callable(Input $value): Result $missing
 * @param callable(Input $value): Result $wrong
 */
function run(callable $callback, callable $missing, callable $wrong, Input $input): void {
  $result = $callback(value: $input);
  $result->do;
  $missing();
  $wrong('invalid');
  /** @var callable(Input $value, string $label=): Result $local */
  $local = $callback;
  $localResult = $local(value: $input);
  $localResult->do;
  /** @var callable(Input $value): Result $localMissing */
  $localMissing = $callback;
  $localMissing();
  /** @var callable(Input $value): Result $localWrong */
  $localWrong = $callback;
  $localWrong('invalid');
}`;
      const path = join(root, 'Callable.php'); const uri = pathToFileURL(path).toString();
      await writeFile(join(root, 'composer.json'), JSON.stringify({ require: { php: '>=8.1' }, autoload: { classmap: ['./Callable.php'] } }));
      await writeFile(path, source);
      server = spawn(process.execPath, [resolve('dist/server.js'), '--stdio'], { stdio: 'pipe' });
      const output = messagesFrom(server);
      server.stdin.write(encode({ jsonrpc: '2.0', id: 228, method: 'initialize', params: {
        processId: null, capabilities: {}, rootUri: pathToFileURL(root).toString(),
      } }));
      await output.waitFor((message) => message.id === 228);
      server.stdin.write(encode({ jsonrpc: '2.0', method: 'initialized', params: {} }));
      await output.waitFor((message) => message.method === 'window/logMessage' && message.params?.message?.includes('complete=true'));
      server.stdin.write(encode({ jsonrpc: '2.0', method: 'textDocument/didOpen', params: {
        textDocument: { uri, languageId: 'php', version: 1, text: source },
      } }));
      const diagnostics = (await output.waitFor((message) => message.method === 'textDocument/publishDiagnostics'
        && message.params?.uri === uri && message.params.diagnostics.some((item: { code?: string }) => item.code === 'php.argument.missing-required')
        && message.params.diagnostics.some((item: { code?: string }) => item.code === 'php.argument.type-mismatch'))).params.diagnostics;
      expect(diagnostics.filter((item: { code?: string }) => item.code === 'php.argument.missing-required')).toHaveLength(2);
      expect(diagnostics.filter((item: { code?: string }) => item.code === 'php.argument.type-mismatch')).toHaveLength(2);
      const completionOffset = source.indexOf('$result->do') + '$result->do'.length;
      server.stdin.write(encode({ jsonrpc: '2.0', id: 229, method: 'textDocument/completion', params: {
        textDocument: { uri }, position: lspPosition(source, completionOffset),
      } }));
      expect((await output.waitFor((message) => message.id === 229)).result)
        .toContainEqual(expect.objectContaining({ label: 'done' }));
      const signatureOffset = source.indexOf('$callback(value:') + '$callback('.length;
      server.stdin.write(encode({ jsonrpc: '2.0', id: 230, method: 'textDocument/signatureHelp', params: {
        textDocument: { uri }, position: lspPosition(source, signatureOffset),
      } }));
      expect((await output.waitFor((message) => message.id === 230)).result).toMatchObject({ signatures: [{
        label: '$callback(Input $value, string $label = default): Result',
      }] });
      const localCompletionOffset = source.indexOf('$localResult->do') + '$localResult->do'.length;
      server.stdin.write(encode({ jsonrpc: '2.0', id: 231, method: 'textDocument/completion', params: {
        textDocument: { uri }, position: lspPosition(source, localCompletionOffset),
      } }));
      expect((await output.waitFor((message) => message.id === 231)).result)
        .toContainEqual(expect.objectContaining({ label: 'done' }));
      const localSignatureOffset = source.indexOf('$local(value:') + '$local('.length;
      server.stdin.write(encode({ jsonrpc: '2.0', id: 232, method: 'textDocument/signatureHelp', params: {
        textDocument: { uri }, position: lspPosition(source, localSignatureOffset),
      } }));
      expect((await output.waitFor((message) => message.id === 232)).result).toMatchObject({ signatures: [{
        label: '$local(Input $value, string $label = default): Result',
      }] });
    } finally { await rm(root, { recursive: true, force: true }); }
  });

  it('serves standalone local PHPDoc Callable assertions and immutable aliases through stdio', async () => {
    const root = await mkdtemp(join(tmpdir(), 'php-companion-standalone-callable-'));
    try {
      const source = `<?php declare(strict_types=1); namespace StandaloneCallableLsp;
class Input {}
class Result { public function done(): void {} }
function createCallable(): callable {}
function run(Input $input): void {
  $callback = createCallable();
  /** @var callable(Input $value, string $label=): Result $callback */
  $result = $callback(value: $input);
  $result->do;
  $missing = createCallable();
  /** @var callable(Input $value): Result $missing */
  $missing();
  $wrong = createCallable();
  /** @var callable(Input $value): Result $wrong */
  $wrong('invalid');
  /** @var callable(Input $value, string $label=): Result $aliasSource */
  $aliasSource = createCallable();
  $alias = $aliasSource;
  $aliasResult = $alias(value: $input);
  $aliasResult->do;
  /** @var callable(Input $value): Result $aliasMissingSource */
  $aliasMissingSource = createCallable();
  $aliasMissing = $aliasMissingSource;
  $aliasMissing();
  $aliasWrongSource = createCallable();
  /** @var callable(Input $value): Result $aliasWrongSource */
  $aliasWrong = $aliasWrongSource;
  $aliasWrong('invalid');
}`;
      const path = join(root, 'Callable.php'); const uri = pathToFileURL(path).toString();
      await writeFile(join(root, 'composer.json'), JSON.stringify({ require: { php: '>=8.1' }, autoload: { classmap: ['./Callable.php'] } }));
      await writeFile(path, source);
      server = spawn(process.execPath, [resolve('dist/server.js'), '--stdio'], { stdio: 'pipe' });
      const output = messagesFrom(server);
      server.stdin.write(encode({ jsonrpc: '2.0', id: 233, method: 'initialize', params: {
        processId: null, capabilities: {}, rootUri: pathToFileURL(root).toString(),
      } }));
      await output.waitFor((message) => message.id === 233);
      server.stdin.write(encode({ jsonrpc: '2.0', method: 'initialized', params: {} }));
      await output.waitFor((message) => message.method === 'window/logMessage' && message.params?.message?.includes('complete=true'));
      server.stdin.write(encode({ jsonrpc: '2.0', method: 'textDocument/didOpen', params: {
        textDocument: { uri, languageId: 'php', version: 1, text: source },
      } }));
      const diagnostics = (await output.waitFor((message) => message.method === 'textDocument/publishDiagnostics'
        && message.params?.uri === uri && message.params.diagnostics.some((item: { code?: string }) => item.code === 'php.argument.missing-required')
        && message.params.diagnostics.some((item: { code?: string }) => item.code === 'php.argument.type-mismatch'))).params.diagnostics;
      expect(diagnostics.filter((item: { code?: string }) => item.code === 'php.argument.missing-required')).toHaveLength(2);
      expect(diagnostics.filter((item: { code?: string }) => item.code === 'php.argument.type-mismatch')).toHaveLength(2);
      const completionOffset = source.indexOf('$result->do') + '$result->do'.length;
      server.stdin.write(encode({ jsonrpc: '2.0', id: 234, method: 'textDocument/completion', params: {
        textDocument: { uri }, position: lspPosition(source, completionOffset),
      } }));
      expect((await output.waitFor((message) => message.id === 234)).result)
        .toContainEqual(expect.objectContaining({ label: 'done' }));
      const signatureOffset = source.indexOf('$callback(value:') + '$callback('.length;
      server.stdin.write(encode({ jsonrpc: '2.0', id: 235, method: 'textDocument/signatureHelp', params: {
        textDocument: { uri }, position: lspPosition(source, signatureOffset),
      } }));
      expect((await output.waitFor((message) => message.id === 235)).result).toMatchObject({ signatures: [{
        label: '$callback(Input $value, string $label = default): Result',
      }] });
      const aliasCompletionOffset = source.indexOf('$aliasResult->do') + '$aliasResult->do'.length;
      server.stdin.write(encode({ jsonrpc: '2.0', id: 236, method: 'textDocument/completion', params: {
        textDocument: { uri }, position: lspPosition(source, aliasCompletionOffset),
      } }));
      expect((await output.waitFor((message) => message.id === 236)).result)
        .toContainEqual(expect.objectContaining({ label: 'done' }));
      const aliasSignatureOffset = source.indexOf('$alias(value:') + '$alias('.length;
      server.stdin.write(encode({ jsonrpc: '2.0', id: 237, method: 'textDocument/signatureHelp', params: {
        textDocument: { uri }, position: lspPosition(source, aliasSignatureOffset),
      } }));
      expect((await output.waitFor((message) => message.id === 237)).result).toMatchObject({ signatures: [{
        label: '$alias(Input $value, string $label = default): Result',
      }] });
    } finally { await rm(root, { recursive: true, force: true }); }
  });

  it('serves native closure and arrow variable invocation contracts through stdio', async () => {
    const root = await mkdtemp(join(tmpdir(), 'php-companion-closure-literal-'));
    try {
      const source = `<?php declare(strict_types=1); namespace ClosureLiteralLsp;
class Input {}
class Result { public function done(): void {} }
function run(Input $input): void {
  $callback = function (Input $value, string $label = 'ready'): Result { return new Result(); };
  $result = $callback(value: $input);
  $result->done();
  $missing = fn(Input $value): Result => new Result();
  $missing();
  $wrong = fn(Input $value): Result => new Result();
  $wrong('invalid');
  $source = fn(Input $value): Result => new Result();
  $alias = $source;
  $aliasResult = $alias($input);
  $aliasResult->do;
}`;
      const path = join(root, 'ClosureLiteral.php'); const uri = pathToFileURL(path).toString();
      await writeFile(join(root, 'composer.json'), JSON.stringify({ require: { php: '>=8.1' }, autoload: { classmap: ['./ClosureLiteral.php'] } }));
      await writeFile(path, source);
      server = spawn(process.execPath, [resolve('dist/server.js'), '--stdio'], { stdio: 'pipe' });
      const output = messagesFrom(server);
      server.stdin.write(encode({ jsonrpc: '2.0', id: 238, method: 'initialize', params: {
        processId: null, capabilities: {}, rootUri: pathToFileURL(root).toString(),
      } }));
      await output.waitFor((message) => message.id === 238);
      server.stdin.write(encode({ jsonrpc: '2.0', method: 'initialized', params: {} }));
      await output.waitFor((message) => message.method === 'window/logMessage' && message.params?.message?.includes('complete=true'));
      server.stdin.write(encode({ jsonrpc: '2.0', method: 'textDocument/didOpen', params: {
        textDocument: { uri, languageId: 'php', version: 1, text: source },
      } }));
      const diagnostics = (await output.waitFor((message) => message.method === 'textDocument/publishDiagnostics'
        && message.params?.uri === uri && message.params.diagnostics.some((item: { code?: string }) => item.code === 'php.argument.missing-required')
        && message.params.diagnostics.some((item: { code?: string }) => item.code === 'php.argument.type-mismatch'))).params.diagnostics;
      expect(diagnostics.filter((item: { code?: string }) => item.code === 'php.argument.missing-required')).toHaveLength(1);
      expect(diagnostics.filter((item: { code?: string }) => item.code === 'php.argument.type-mismatch')).toHaveLength(1);
      const signatureOffset = source.indexOf('$callback(value:') + '$callback('.length;
      server.stdin.write(encode({ jsonrpc: '2.0', id: 239, method: 'textDocument/signatureHelp', params: {
        textDocument: { uri }, position: lspPosition(source, signatureOffset),
      } }));
      expect((await output.waitFor((message) => message.id === 239)).result).toMatchObject({ signatures: [{
        label: "$callback(Input $value, string $label = 'ready'): Result",
      }] });
      const completionOffset = source.indexOf('$result->do') + '$result->do'.length;
      server.stdin.write(encode({ jsonrpc: '2.0', id: 240, method: 'textDocument/completion', params: {
        textDocument: { uri }, position: lspPosition(source, completionOffset),
      } }));
      expect((await output.waitFor((message) => message.id === 240)).result)
        .toContainEqual(expect.objectContaining({ label: 'done' }));
      const memberStart = source.indexOf('done();', source.indexOf('$result->'));
      server.stdin.write(encode({ jsonrpc: '2.0', id: 242, method: 'textDocument/definition', params: {
        textDocument: { uri }, position: lspPosition(source, memberStart + 1),
      } }));
      const definitions = (await output.waitFor((message) => message.id === 242)).result;
      expect(definitions).toHaveLength(1);
      expect(lspOffset(source, definitions[0].range.start)).toBe(source.indexOf('done():'));
      const aliasSignatureOffset = source.indexOf('$alias($input)') + '$alias('.length;
      server.stdin.write(encode({ jsonrpc: '2.0', id: 241, method: 'textDocument/signatureHelp', params: {
        textDocument: { uri }, position: lspPosition(source, aliasSignatureOffset),
      } }));
      expect((await output.waitFor((message) => message.id === 241)).result).toMatchObject({ signatures: [{
        label: '$alias(Input $value): Result',
      }] });
    } finally { await rm(root, { recursive: true, force: true }); }
  });

  it('serves unique invokable object contracts through stdio', async () => {
    const root = await mkdtemp(join(tmpdir(), 'php-companion-invokable-object-'));
    try {
      const source = `<?php declare(strict_types=1); namespace InvokableObjectLsp;
class Input {}
class Result { public function done(): void {} }
class Handler {
  public function __invoke(Input $value, string $label = 'ready'): Result { return new Result(); }
}
function run(Handler $handler, Input $input): void {
  $result = $handler(value: $input);
  $result->do;
  $handler();
  $handler('invalid');
}`;
      const path = join(root, 'InvokableObject.php'); const uri = pathToFileURL(path).toString();
      await writeFile(join(root, 'composer.json'), JSON.stringify({ require: { php: '>=8.0' }, autoload: { classmap: ['./InvokableObject.php'] } }));
      await writeFile(path, source);
      server = spawn(process.execPath, [resolve('dist/server.js'), '--stdio'], { stdio: 'pipe' });
      const output = messagesFrom(server);
      server.stdin.write(encode({ jsonrpc: '2.0', id: 243, method: 'initialize', params: {
        processId: null, capabilities: {}, rootUri: pathToFileURL(root).toString(),
      } }));
      await output.waitFor((message) => message.id === 243);
      server.stdin.write(encode({ jsonrpc: '2.0', method: 'initialized', params: {} }));
      await output.waitFor((message) => message.method === 'window/logMessage' && message.params?.message?.includes('complete=true'));
      server.stdin.write(encode({ jsonrpc: '2.0', method: 'textDocument/didOpen', params: {
        textDocument: { uri, languageId: 'php', version: 1, text: source },
      } }));
      const diagnostics = (await output.waitFor((message) => message.method === 'textDocument/publishDiagnostics'
        && message.params?.uri === uri && message.params.diagnostics.some((item: { code?: string }) => item.code === 'php.argument.missing-required')
        && message.params.diagnostics.some((item: { code?: string }) => item.code === 'php.argument.type-mismatch'))).params.diagnostics;
      expect(diagnostics.filter((item: { code?: string }) => item.code === 'php.argument.missing-required')).toHaveLength(1);
      expect(diagnostics.filter((item: { code?: string }) => item.code === 'php.argument.type-mismatch')).toHaveLength(1);
      const signatureOffset = source.indexOf('$handler(value:') + '$handler('.length;
      server.stdin.write(encode({ jsonrpc: '2.0', id: 244, method: 'textDocument/signatureHelp', params: {
        textDocument: { uri }, position: lspPosition(source, signatureOffset),
      } }));
      expect((await output.waitFor((message) => message.id === 244)).result).toMatchObject({ signatures: [{
        label: "$handler(Input $value, string $label = 'ready'): Result",
      }] });
      const completionOffset = source.indexOf('$result->do') + '$result->do'.length;
      server.stdin.write(encode({ jsonrpc: '2.0', id: 245, method: 'textDocument/completion', params: {
        textDocument: { uri }, position: lspPosition(source, completionOffset),
      } }));
      expect((await output.waitFor((message) => message.id === 245)).result)
        .toContainEqual(expect.objectContaining({ label: 'done' }));
    } finally { await rm(root, { recursive: true, force: true }); }
  });

  it('serves precise callable-array contracts through stdio', async () => {
    const root = await mkdtemp(join(tmpdir(), 'php-companion-callable-array-'));
    try {
      const source = `<?php declare(strict_types=1); namespace CallableArrayLsp;
class Input {}
class Result { public function done(): void {} }
class Handler { public function handle(Input $value, string $label = 'ready'): Result { return new Result(); } }
function run(Handler $handler, Input $input): void {
  $callback = [$handler, 'handle'];
  $result = $callback(value: $input);
  $result->do;
  $callback();
  $callback('invalid');
}`;
      const path = join(root, 'CallableArray.php'); const uri = pathToFileURL(path).toString();
      await writeFile(join(root, 'composer.json'), JSON.stringify({ require: { php: '>=8.0' }, autoload: { classmap: ['./CallableArray.php'] } }));
      await writeFile(path, source);
      server = spawn(process.execPath, [resolve('dist/server.js'), '--stdio'], { stdio: 'pipe' });
      const output = messagesFrom(server);
      server.stdin.write(encode({ jsonrpc: '2.0', id: 246, method: 'initialize', params: {
        processId: null, capabilities: {}, rootUri: pathToFileURL(root).toString(),
      } }));
      await output.waitFor((message) => message.id === 246);
      server.stdin.write(encode({ jsonrpc: '2.0', method: 'initialized', params: {} }));
      await output.waitFor((message) => message.method === 'window/logMessage' && message.params?.message?.includes('complete=true'));
      server.stdin.write(encode({ jsonrpc: '2.0', method: 'textDocument/didOpen', params: {
        textDocument: { uri, languageId: 'php', version: 1, text: source },
      } }));
      const diagnostics = (await output.waitFor((message) => message.method === 'textDocument/publishDiagnostics'
        && message.params?.uri === uri && message.params.diagnostics.some((item: { code?: string }) => item.code === 'php.argument.missing-required')
        && message.params.diagnostics.some((item: { code?: string }) => item.code === 'php.argument.type-mismatch'))).params.diagnostics;
      expect(diagnostics.filter((item: { code?: string }) => item.code === 'php.argument.missing-required')).toHaveLength(1);
      expect(diagnostics.filter((item: { code?: string }) => item.code === 'php.argument.type-mismatch')).toHaveLength(1);
      const signatureOffset = source.indexOf('$callback(value:') + '$callback('.length;
      server.stdin.write(encode({ jsonrpc: '2.0', id: 247, method: 'textDocument/signatureHelp', params: {
        textDocument: { uri }, position: lspPosition(source, signatureOffset),
      } }));
      expect((await output.waitFor((message) => message.id === 247)).result).toMatchObject({ signatures: [{
        label: "$callback(Input $value, string $label = 'ready'): Result",
      }] });
      const completionOffset = source.indexOf('$result->do') + '$result->do'.length;
      server.stdin.write(encode({ jsonrpc: '2.0', id: 248, method: 'textDocument/completion', params: {
        textDocument: { uri }, position: lspPosition(source, completionOffset),
      } }));
      expect((await output.waitFor((message) => message.id === 248)).result)
        .toContainEqual(expect.objectContaining({ label: 'done' }));
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
