import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { expect, it } from 'vitest';
import { encodeLspMessage, LspMessageDecoder } from '../../testkit/src/index.js';

it.each(['7.2', '8.5'].flatMap(phpVersion => ['onDemand', 'progressive'].map(indexingMode => ({ phpVersion, indexingMode }))))(
  'withdraws unset parameter hover and members at PHP $phpVersion ($indexingMode)', async ({ phpVersion, indexingMode }) => {
    const root = await mkdtemp(join(tmpdir(), 'sophp-unset-binding-'));
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
        clearTimeout(waiter.timer); waiter.reject(new Error(`Unset binding server closed: ${stderr}`));
      }
    });
    const waitFor = (matches: (message: any) => boolean): Promise<any> => {
      const existing = messages.find(matches); if (existing) return Promise.resolve(existing);
      return new Promise((done, reject) => {
        const waiter = { matches, done, reject, timer: setTimeout(() => {
          waiters.splice(waiters.indexOf(waiter), 1); reject(new Error(`Unset binding response timed out: ${stderr}`));
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
    const typeOf = (hover: any): string | null => hover?.contents?.value?.match(/\$value: ([^\n]*)/)?.[1] ?? null;
    const header = '<?php /* 中文 🧭 */ class Row { function keep(int $input): void {} } '
      + 'class Other { function changed(): void {} } ';
    const check = async (source: string, expected: 'int' | 'Row' | 'Other' | null,
      member: 'keep' | 'changed' | null, missing: boolean, reopen = false): Promise<void> => {
      version++;
      const after = messages.length;
      send({ method: version === 1 || reopen ? 'textDocument/didOpen' : 'textDocument/didChange', params: version === 1 || reopen
        ? { textDocument: { uri, languageId: 'php', version, text: source } }
        : { textDocument: { uri, version }, contentChanges: [{ text: source }] } });
      const variable = source.lastIndexOf('$value');
      const hover = await request('textDocument/hover', { textDocument: { uri }, position: position(source, variable + 2) });
      expect(typeOf(hover), source).toBe(expected);
      if (source.includes('->')) {
        const method = member === 'changed' ? 'changed' : 'keep';
        const name = source.lastIndexOf(`${method}(`);
        const definitions = await request('textDocument/definition', { textDocument: { uri }, position: position(source, name + 1) });
        expect(definitions, source).toHaveLength(member ? 1 : 0);
        if (member) {
          const declared = source.indexOf(`function ${member}`) + 'function '.length;
          expect(definitions[0]).toMatchObject({ uri, range: { start: position(source, declared), end: position(source, declared + member.length) } });
        }
        const signature = await request('textDocument/signatureHelp', { textDocument: { uri }, position: position(source, name + method.length + 1) });
        if (member) expect(signature?.signatures?.[0]?.label).toContain(member);
        else expect(signature).toBeNull();
      }
      const published = await waitFor(message => messages.indexOf(message) >= after
        && message.method === 'phpCompanion/versionedDiagnostics' && message.params.uri === uri && message.params.version === version);
      expect(published.params.diagnostics.some((item: any) => item.code === 'php.syntax')).toBe(false);
      const variables = published.params.diagnostics.filter((item: any) => item.code === 'php.variable.undefined');
      expect(variables, source).toHaveLength(missing ? 1 : 0);
      if (missing) expect(variables[0].range).toEqual({ start: position(source, variable), end: position(source, variable + 6) });
    };
    try {
      await request('initialize', { processId: null, rootUri: pathToFileURL(root).toString(), capabilities: {},
        initializationOptions: { phpVersion, indexingMode, versionedDiagnostics: true, cacheDirectory: join(root, '.cache') } });
      send({ method: 'initialized', params: {} });
      const object = (body: string): string => header + `function run(Row $value): void { ${body} }`;
      const bound = object('$value->keep(1);');
      const unset = object('unset($value); $value->keep(1);');
      await check(bound, 'Row', 'keep', false);
      await check(unset, null, null, true);
      await check(object('unset($value); /* keep the binding removed */ $value->keep(1);'), null, null, true);
      await check(object('UnSeT /* between tokens */ ($value); $value->keep(1);'), null, null, true);
      await check(object("echo 'unset($value)'; /* unset($value); */ $value->keep(1);"), 'Row', 'keep', false);
      await check(object('unset($value); $value = new Other; $value->changed();'), 'Other', 'changed', false);
      await check(unset, null, null, true);
      await check(bound, 'Row', 'keep', false);
      const scalar = (body: string): string => header + `function take(int $input): void {} function run(int $value): void { ${body} }`;
      await check(scalar('take($value);'), 'int', null, false);
      await check(scalar('unset($value); take($value);'), null, null, true);
      await check(scalar('unset($other); take($value);'), 'int', null, false);
      send({ method: 'textDocument/didClose', params: { textDocument: { uri } } });
      await check(unset, null, null, true, true);
      expect(await readFile(file, 'utf8')).toBe(disk);
      await request('shutdown', null); send({ method: 'exit', params: null }); await closed;
      expect(server.exitCode).toBe(0); expect(stderr).toBe('');
    } finally {
      if (server.exitCode === null && server.signalCode === null) server.kill();
      await closed;
      await rm(root, { recursive: true, force: true });
    }
  }, 60_000);
