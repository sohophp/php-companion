import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { expect, it } from 'vitest';
import { encodeLspMessage, LspMessageDecoder } from '../../testkit/src/index.js';

it.each(['7.2', '8.5'].flatMap(phpVersion => ['onDemand', 'progressive'].map(indexingMode => ({ phpVersion, indexingMode }))))(
  'keeps closure diagnostics inside their scope at PHP $phpVersion ($indexingMode)', async ({ phpVersion, indexingMode }) => {
    const root = await mkdtemp(join(tmpdir(), 'sophp-variable-scope-'));
    const file = join(root, 'Editing.php'), uri = pathToFileURL(file).toString(), disk = '<?php // disk stays unchanged\n';
    await writeFile(file, disk);
    await writeFile(join(root, 'composer.json'), JSON.stringify({ autoload: { files: ['Editing.php'] } }));
    const server = spawn(process.execPath, [resolve('../../dist/language-server.js'), '--stdio',
      '--parser-core-wasm', resolve('../../dist/web-tree-sitter.wasm'), '--php-wasm', resolve('../../dist/tree-sitter-php.wasm')], { stdio: 'pipe' });
    const closed = once(server, 'close'), decoder = new LspMessageDecoder(), messages: any[] = [];
    const waiters: Array<{ matches: (message: any) => boolean; done: (message: any) => void; reject: (error: Error) => void; timer: ReturnType<typeof setTimeout> }> = [];
    let stderr = '', id = 0, version = 0;
    server.stderr.on('data', chunk => { stderr += chunk.toString(); });
    server.stdout.on('data', chunk => {
      for (const message of decoder.push(chunk) as any[]) {
        messages.push(message);
        for (const waiter of [...waiters]) if (waiter.matches(message)) {
          clearTimeout(waiter.timer); waiters.splice(waiters.indexOf(waiter), 1); waiter.done(message);
        }
      }
    });
    server.on('close', () => {
      for (const waiter of waiters.splice(0)) {
        clearTimeout(waiter.timer); waiter.reject(new Error(`Scope diagnostic server closed: ${stderr}`));
      }
    });
    const waitFor = (matches: (message: any) => boolean): Promise<any> => {
      const existing = messages.find(matches); if (existing) return Promise.resolve(existing);
      return new Promise((done, reject) => {
        const waiter = { matches, done, reject, timer: setTimeout(() => {
          waiters.splice(waiters.indexOf(waiter), 1); reject(new Error(`Scope diagnostic response timed out: ${stderr}`));
        }, 15_000) };
        waiters.push(waiter);
      });
    };
    const send = (message: object): void => { server.stdin.write(encodeLspMessage({ jsonrpc: '2.0', ...message })); };
    const request = async (method: string, params: object | null): Promise<any> => {
      const own = ++id, response = waitFor(message => message.id === own && !message.method);
      send({ id: own, method, params }); const result = await response;
      expect(result.error).toBeUndefined(); return result.result;
    };
    const position = (source: string, offset: number): { line: number; character: number } => {
      const lines = source.slice(0, offset).split('\n'); return { line: lines.length - 1, character: lines.at(-1)!.length };
    };
    const check = async (source: string, missing: boolean, reopen = false): Promise<void> => {
      version++;
      send({ method: version === 1 || reopen ? 'textDocument/didOpen' : 'textDocument/didChange', params: version === 1 || reopen
        ? { textDocument: { uri, languageId: 'php', version, text: source } }
        : { textDocument: { uri, version }, contentChanges: [{ text: source }] } });
      const published = await waitFor(message => message.method === 'phpCompanion/versionedDiagnostics'
        && message.params.uri === uri && message.params.version === version);
      expect(published.params.diagnostics.some((item: any) => item.code === 'php.syntax')).toBe(false);
      const variables = published.params.diagnostics.filter((item: any) => item.code === 'php.variable.undefined');
      expect(variables, source).toHaveLength(missing ? 1 : 0);
      if (missing) {
        const offset = source.indexOf('$missing');
        expect(variables[0].range).toEqual({ start: position(source, offset), end: position(source, offset + '$missing'.length) });
      }
    };
    try {
      await request('initialize', { processId: null, rootUri: pathToFileURL(root).toString(), capabilities: {},
        initializationOptions: { phpVersion, indexingMode, versionedDiagnostics: true, cacheDirectory: join(root, '.cache') } });
      send({ method: 'initialized', params: {} });
      const kinds = phpVersion === '7.2' ? ['closure'] : ['closure', 'arrow'];
      for (const kind of kinds) for (const context of ['coalesce', 'empty']) {
        const value = kind === 'closure' ? 'function () { echo $missing; }' : 'fn() => $missing';
        const expression = context === 'coalesce' ? `(${value}) ?? null` : `empty(${value})`;
        const source = `<?php /* 中文 🧭 */ function run(): void { $callback = ${expression}; }`;
        await check(source, true);
        const fixed = source.replace('$missing', '$known').replace('run()', 'run($known)');
        await check(kind === 'closure' ? fixed.replace('function ()', 'function () use ($known)') : fixed, false);
        await check(source, true);
      }
      await check('<?php function run(): void { $callback = (function () { echo $missing ?? null; echo empty($other); echo isset($third); }) ?? null; }', false);
      send({ method: 'textDocument/didClose', params: { textDocument: { uri } } });
      await check('<?php function run(): void { $callback = (function () { echo $missing; }) ?? null; }', true, true);
      expect(await readFile(file, 'utf8')).toBe(disk);
      await request('shutdown', null); send({ method: 'exit', params: null }); await closed;
      expect(server.exitCode).toBe(0); expect(stderr).toBe('');
    } finally {
      if (server.exitCode === null && server.signalCode === null) server.kill();
      await closed;
      await rm(root, { recursive: true, force: true });
    }
  }, 60_000);
