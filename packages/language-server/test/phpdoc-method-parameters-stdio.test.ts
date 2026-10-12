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
        waiters.delete(waiter); fail(new Error('Magic method LSP response timed out'));
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

it.each(['7.2', '8.5'].flatMap(phpVersion => ['onDemand', 'progressive'].map(indexingMode => ({ phpVersion, indexingMode }))))(
  'preserves magic method defaults and withdraws malformed signatures at PHP $phpVersion in $indexingMode',
  async ({ phpVersion, indexingMode }) => {
    const root = await mkdtemp(join(tmpdir(), 'sophp-magic-method-defaults-'));
    let server: ChildProcessWithoutNullStreams | undefined;
    let client: ReturnType<typeof clientFor> | undefined;
    let exited: Promise<unknown[]> | undefined;
    try {
      await mkdir(join(root, 'src'));
      await writeFile(join(root, 'composer.json'), JSON.stringify({ autoload: { 'psr-4': { 'App\\': 'src/' } } }));
      const row = '<?php namespace App; class Row { public function name(): string { return ""; } }';
      const magic = `<?php namespace App;
/**
 * @method Row run(string $label = 'x,y', Row $row = null, int $count = 2)
 * @property string $title
 */
class Magic {}`;
      const source = '<?php namespace App; function consume(Magic $magic) { $magic->run(); $magic->run()->name(); }';
      const originals = { 'Row.php': row, 'Magic.php': magic, 'Editing.php': source };
      for (const [name, text] of Object.entries(originals)) await writeFile(join(root, 'src', name), text);
      const uriFor = (name: string): string => pathToFileURL(join(root, 'src', name)).toString();
      const uri = uriFor('Editing.php');
      server = spawn(process.execPath, [resolve('../../dist/language-server.js'), '--stdio',
        '--parser-core-wasm', resolve('../../dist/web-tree-sitter.wasm'), '--php-wasm', resolve('../../dist/tree-sitter-php.wasm')], { stdio: 'pipe' });
      exited = once(server, 'exit'); client = clientFor(server);
      await client.request('initialize', { processId: null, rootUri: pathToFileURL(root).toString(), capabilities: {},
        initializationOptions: { phpVersion, indexingMode, cacheDirectory: join(root, '.cache') } });
      client.send({ method: 'initialized', params: {} });
      for (const [name, text] of Object.entries(originals)) client.send({ method: 'textDocument/didOpen', params: { textDocument: { uri: uriFor(name), languageId: 'php', version: 1, text } } });
      const signatureParams = { textDocument: { uri }, position: { line: 0, character: source.indexOf('->run()') + '->run('.length } };
      const memberParams = { textDocument: { uri }, position: { line: 0, character: source.indexOf('->name()') + 3 } };
      const check = async (valid: boolean, labels: string[] = []): Promise<void> => {
        const signature = await client!.request('textDocument/signatureHelp', signatureParams);
        if (valid) expect(signature?.signatures[0]?.parameters.map((parameter: any) => parameter.label)).toEqual(labels);
        else expect(signature).toBeNull();
        const completion = await client!.request('textDocument/completion', memberParams);
        expect((Array.isArray(completion) ? completion : completion.items).map((item: any) => item.label)).toEqual(valid ? ['name'] : []);
        const definition = await client!.request('textDocument/definition', memberParams);
        const start = row.indexOf('name(');
        expect(definition).toEqual(valid ? [{ uri: uriFor('Row.php'), range: { start: { line: 0, character: start }, end: { line: 0, character: start + 4 } } }] : []);
      };
      let version = 1;
      const replace = (text: string): void => client!.send({ method: 'textDocument/didChange', params: { textDocument: { uri: uriFor('Magic.php'), version: ++version }, contentChanges: [{ text }] } });
      const initialLabels = ["string $label = 'x,y'", 'Row $row = null', 'int $count = 2'];
      await check(true, initialLabels);
      replace(magic.replace("'x,y'", "'changed'").replace('int $count = 2', 'int $count = 3'));
      await check(true, ["string $label = 'changed'", 'Row $row = null', 'int $count = 3']);
      for (const broken of ['array{owner: Row $label', "array $label = ['key' =>]"]) {
        replace(magic.replace("string $label = 'x,y', Row $row = null, int $count = 2", broken));
        await check(false);
      }
      replace(magic); await check(true, initialLabels);
      for (const [name, text] of Object.entries(originals)) expect(await readFile(join(root, 'src', name), 'utf8')).toBe(text);
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
