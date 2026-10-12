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
        waiters.delete(waiter); fail(new Error('PHPDoc LSP response timed out'));
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
  'survives excessive PHPDoc and restores owners across unsaved files at PHP $phpVersion in $indexingMode',
  async ({ phpVersion, indexingMode }) => {
    const root = await mkdtemp(join(tmpdir(), 'sophp-complexity-phpdoc-'));
    let server: ChildProcessWithoutNullStreams | undefined;
    let client: ReturnType<typeof clientFor> | undefined;
    let exited: Promise<unknown[]> | undefined;
    try {
      await mkdir(join(root, 'src'));
      await writeFile(join(root, 'composer.json'), JSON.stringify({ autoload: { 'psr-4': { 'App\\': 'src/' }, files: ['src/functions.php'] } }));
      const row = '<?php namespace App; class Row { public function name(): string { return ""; } }';
      const other = '<?php namespace App; class Other { public function otherOnly(): string { return ""; } }';
      const functions = `<?php namespace App;
/**
 * @return array{
 *   owner: Row,
 *   labels?: list<string>
 * }
 */
function rows() {}`;
      const editorDisk = '<?php namespace App; // unchanged disk baseline\n';
      const originals = { 'Row.php': row, 'Other.php': other, 'functions.php': functions, 'Editing.php': editorDisk };
      for (const [name, text] of Object.entries(originals)) await writeFile(join(root, 'src', name), text);
      const uriFor = (name: string): string => pathToFileURL(join(root, 'src', name)).toString();
      const uri = uriFor('Editing.php');
      server = spawn(process.execPath, [resolve('../../dist/language-server.js'), '--stdio',
        '--parser-core-wasm', resolve('../../dist/web-tree-sitter.wasm'), '--php-wasm', resolve('../../dist/tree-sitter-php.wasm')], { stdio: 'pipe' });
      exited = once(server, 'exit'); client = clientFor(server);
      await client.request('initialize', { processId: null, rootUri: pathToFileURL(root).toString(), capabilities: {},
        initializationOptions: { phpVersion, indexingMode, cacheDirectory: join(root, '.cache') } });
      client.send({ method: 'initialized', params: {} });
      const open = (name: string, text: string): void => client!.send({ method: 'textDocument/didOpen', params: { textDocument: { uri: uriFor(name), languageId: 'php', version: 1, text } } });
      for (const [name, text] of Object.entries(originals)) if (name !== 'Editing.php') open(name, text);
      let editorVersion = 0, functionsVersion = 1;
      const sourceFor = (member: string): string => `<?php namespace App; function consume(){ $value=rows(); $value['owner']->${member}(); }`;
      const query = async (member: string, expected: string[], ownerFile?: string): Promise<void> => {
        const source = sourceFor(member); editorVersion++;
        client!.send({ method: editorVersion === 1 ? 'textDocument/didOpen' : 'textDocument/didChange', params: editorVersion === 1
          ? { textDocument: { uri, languageId: 'php', version: editorVersion, text: source } }
          : { textDocument: { uri, version: editorVersion }, contentChanges: [{ text: source }] } });
        const params = { textDocument: { uri }, position: { line: 0, character: source.indexOf('->') + 2 } };
        const completion = await client!.request('textDocument/completion', params);
        expect((Array.isArray(completion) ? completion : completion.items).map((item: any) => item.label)).toEqual(expected);
        const memberParams = { ...params, position: { ...params.position, character: params.position.character + 1 } };
        const definition = await client!.request('textDocument/definition', memberParams);
        if (ownerFile) {
          const target = originals[ownerFile as keyof typeof originals], start = target.indexOf(`${member}(`);
          expect(definition).toEqual([{ uri: uriFor(ownerFile), range: { start: { line: 0, character: start }, end: { line: 0, character: start + member.length } } }]);
          expect(JSON.stringify(await client!.request('textDocument/hover', memberParams))).toContain(`${member}(): string`);
        } else expect(definition).toEqual([]);
      };
      const replaceFunctions = (text: string): void => client!.send({ method: 'textDocument/didChange', params: { textDocument: { uri: uriFor('functions.php'), version: ++functionsVersion }, contentChanges: [{ text }] } });
      await query('name', ['name'], 'Row.php');
      replaceFunctions(functions.replace('owner: Row', 'owner: Other'));
      await query('name', ['otherOnly']);
      await query('otherOnly', ['otherOnly'], 'Other.php');
      replaceFunctions(functions.replace('owner: Row', 'owner: ' + '('.repeat(4096) + 'Row' + ')'.repeat(4096)));
      await query('name', []);
      replaceFunctions(functions.replace('owner: Row', 'owner: Row' + '[]'.repeat(10000)));
      await query('name', []);
      replaceFunctions(functions);
      await query('name', ['name'], 'Row.php');
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
