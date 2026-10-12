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
        waiters.delete(waiter); fail(new Error('Mixed PHP/HTML LSP response timed out'));
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

function position(source: string, offset: number): { line: number; character: number } {
  const before = source.slice(0, offset), line = before.split('\n').length - 1;
  return { line, character: offset - (before.lastIndexOf('\n') + 1) };
}
function offsetAt(source: string, point: { line: number; character: number }): number {
  let start = 0;
  for (let line = 0; line < point.line; line++) start = source.indexOf('\n', start) + 1;
  return start + point.character;
}
function sourceFor(eol: string): string {
  return ['<?php namespace App; ?>', '<header>中文 😃 Real FLAG</header>', '<?php',
    'class Real { public function name(): string { return "😃"; } } const FLAG = 1;',
    '?>', '<p>Real FLAG new Missing consume()</p>',
    '<?php function consume(Real $value) { echo FLAG; $value->name(); return new Real(); }',
    '?>', '<footer>Real FLAG</footer>'].join(eol);
}

it.each(['7.2', '8.5'].flatMap(phpVersion => ['onDemand', 'progressive'].flatMap(indexingMode =>
  ['\n', '\r\n'].map(eol => ({ phpVersion, indexingMode, eol })))))(
  'keeps HTML outside PHP navigation and rename while incrementally editing at $phpVersion/$indexingMode eol=$eol',
  async ({ phpVersion, indexingMode, eol }) => {
    const root = await mkdtemp(join(tmpdir(), 'sophp-mixed-html-'));
    let server: ChildProcessWithoutNullStreams | undefined, client: ReturnType<typeof clientFor> | undefined;
    let exited: Promise<unknown[]> | undefined;
    try {
      await mkdir(join(root, 'src'));
      await writeFile(join(root, 'composer.json'), JSON.stringify({ autoload: { files: ['src/Mixed.php'] } }));
      const disk = sourceFor(eol), file = join(root, 'src/Mixed.php'), uri = pathToFileURL(file).toString();
      await writeFile(file, disk);
      server = spawn(process.execPath, [resolve('../../dist/language-server.js'), '--stdio',
        '--parser-core-wasm', resolve('../../dist/web-tree-sitter.wasm'), '--php-wasm', resolve('../../dist/tree-sitter-php.wasm')], { stdio: 'pipe' });
      exited = once(server, 'exit'); client = clientFor(server);
      await client.request('initialize', { processId: null, rootUri: pathToFileURL(root).toString(), capabilities: {},
        initializationOptions: { phpVersion, indexingMode, cacheDirectory: join(root, '.cache') } });
      client.send({ method: 'initialized', params: {} });
      client.send({ method: 'textDocument/didOpen', params: { textDocument: { uri, languageId: 'php', version: 1, text: disk } } });
      let source = disk, version = 1;
      const params = (offset: number): { textDocument: { uri: string }; position: { line: number; character: number } } =>
        ({ textDocument: { uri }, position: position(source, offset) });
      const check = async (complete = true, applyRename = false): Promise<void> => {
        const offsets = ['class Real', 'consume(Real', 'new Real'].map(needle => source.indexOf(needle) + needle.lastIndexOf('Real'));
        const locations = offsets.map(offset => ({ uri, range: { start: position(source, offset), end: position(source, offset + 4) } }));
        expect(await client!.request('textDocument/references', { ...params(offsets[0]! + 1), context: { includeDeclaration: true } })).toEqual(locations);
        expect(await client!.request('textDocument/definition', params(offsets[2]! + 1))).toEqual([locations[0]]);
        const memberOffset = source.indexOf('$value->') + '$value->'.length;
        const completion = await client!.request('textDocument/completion', params(memberOffset));
        expect((Array.isArray(completion) ? completion : completion.items).map((item: any) => item.label)).toEqual(['name']);
        if (complete) {
          const rename = await client!.request('textDocument/rename', { ...params(offsets[0]! + 1), newName: 'Renamed' });
          const edits = rename?.changes?.[uri] ?? rename?.documentChanges?.find((change: any) => change.textDocument?.uri === uri)?.edits;
          expect(edits).toHaveLength(3);
          const actual = edits.map((edit: any) => ({ uri, range: edit.range })).sort((left: any, right: any) =>
            left.range.start.line - right.range.start.line || left.range.start.character - right.range.start.character);
          expect(actual, JSON.stringify({ actual, locations })).toEqual(locations);
          expect(edits.every((edit: any) => edit.newText === 'Renamed')).toBe(true);
          if (applyRename) {
            const original = source;
            let applied = source, expected = source;
            for (const edit of [...edits].sort((left: any, right: any) => offsetAt(original, right.range.start) - offsetAt(original, left.range.start))) {
              applied = applied.slice(0, offsetAt(original, edit.range.start)) + edit.newText + applied.slice(offsetAt(original, edit.range.end));
            }
            for (const offset of [...offsets].reverse()) expected = expected.slice(0, offset) + 'Renamed' + expected.slice(offset + 4);
            expect(applied).toBe(expected);
            const replace = (text: string): void => {
              client!.send({ method: 'textDocument/didChange', params: { textDocument: { uri, version: ++version }, contentChanges: [{ text }] } });
              source = text;
            };
            replace(applied);
            const renamed = ['class Renamed', 'consume(Renamed', 'new Renamed'].map(needle => source.indexOf(needle) + needle.lastIndexOf('Renamed'));
            expect(await client!.request('textDocument/references', { ...params(renamed[0]! + 1), context: { includeDeclaration: true } }))
              .toEqual(renamed.map(offset => ({ uri, range: { start: position(source, offset), end: position(source, offset + 7) } })));
            replace(original);
            expect(await client!.request('textDocument/references', { ...params(offsets[0]! + 1), context: { includeDeclaration: true } })).toEqual(locations);
          }
        }
        for (const name of ['Real', 'FLAG', 'consume']) {
          const htmlOffset = source.indexOf(name, source.indexOf('<p>')) + 1;
          expect(await client!.request('textDocument/definition', params(htmlOffset))).toEqual([]);
          expect(await client!.request('textDocument/hover', params(htmlOffset))).toBeNull();
          expect(await client!.request('textDocument/references', { ...params(htmlOffset), context: { includeDeclaration: true } })).toEqual([]);
        }
        const htmlCall = source.indexOf('consume()') + 'consume('.length;
        expect(await client!.request('textDocument/signatureHelp', params(htmlCall))).toBeNull();
      };
      await check(true, true);
      const change = (needle: string, replacement: string): void => {
        const start = source.indexOf(needle); expect(start).toBeGreaterThanOrEqual(0);
        client!.send({ method: 'textDocument/didChange', params: { textDocument: { uri, version: ++version },
          contentChanges: [{ range: { start: position(source, start), end: position(source, start + needle.length) }, text: replacement }] } });
        source = source.slice(0, start) + replacement + source.slice(start + needle.length);
      };
      // The emoji replacement starts between a shared UTF-16 high surrogate.
      change('😃', '😄'); change('<p>', '<p>😃 Real FLAG '); await check();
      change('$value->name()', '$value->'); await check(false);
      change('$value->;', '$value->name();'); await check();
      expect(await readFile(file, 'utf8')).toBe(disk);
    } finally {
      if (server && client && server.exitCode === null && server.signalCode === null) {
        try { await client.request('shutdown', null); client.send({ method: 'exit', params: null }); }
        catch { server.kill(); }
      }
      if (exited) await exited;
      await rm(root, { recursive: true, force: true });
    }
  },
);
