import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { once } from 'node:events';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { expect, it } from 'vitest';
import { encodeLspMessage, LspMessageDecoder } from '../../testkit/src/index.js';

function position(source: string, offset: number): { line: number; character: number } {
  const lines = source.slice(0, offset).split('\n');
  return { line: lines.length - 1, character: lines.at(-1)!.length };
}

function client(server: ChildProcessWithoutNullStreams): {
  notify: (method: string, params: unknown) => void;
  request: (method: string, params: unknown) => Promise<any>;
  wait: (predicate: (message: any) => boolean) => Promise<any>;
} {
  const decoder = new LspMessageDecoder(); const messages: any[] = [];
  const waiters: Array<{ predicate: (message: any) => boolean; resolve: (message: any) => void }> = [];
  let sequence = 0;
  server.stdout.on('data', (chunk: Buffer) => {
    for (const raw of decoder.push(chunk)) {
      const message = raw as any;
      if (message.method && message.id !== undefined) {
        server.stdin.write(encodeLspMessage({ jsonrpc: '2.0', id: message.id, result: null }));
        continue;
      }
      messages.push(message);
      for (const waiter of [...waiters]) if (waiter.predicate(message)) {
        waiters.splice(waiters.indexOf(waiter), 1); waiter.resolve(message);
      }
    }
  });
  const wait = (predicate: (message: any) => boolean): Promise<any> => {
    const found = messages.find(predicate); if (found) return Promise.resolve(found);
    return new Promise((resolveResponse, reject) => {
      const waiter = { predicate, resolve: (message: any): void => { clearTimeout(timer); resolveResponse(message); } };
      const timer = setTimeout(() => {
        waiters.splice(waiters.indexOf(waiter), 1);
        reject(new Error(`No LSP response; recent messages: ${JSON.stringify(messages.slice(-5))}`));
      }, 15_000);
      waiters.push(waiter);
    });
  };
  return {
    wait,
    notify: (method, params): void => { server.stdin.write(encodeLspMessage({ jsonrpc: '2.0', method, params })); },
    request: async (method, params): Promise<any> => {
      const id = ++sequence; const response = wait(message => message.id === id);
      server.stdin.write(encodeLspMessage({ jsonrpc: '2.0', id, method, params }));
      const message = await response; expect(message.error).toBeUndefined(); return message.result;
    },
  };
}

it.each([
  ['7.2', 'onDemand', 'hover'], ['7.2', 'progressive', 'hover'],
  ['8.5', 'onDemand', 'hover'], ['8.5', 'progressive', 'hover'],
  ['7.2', 'onDemand', 'memberHover'], ['7.2', 'progressive', 'memberHover'],
  ['8.5', 'onDemand', 'memberHover'], ['8.5', 'progressive', 'memberHover'],
  ['7.2', 'onDemand', 'signatureHelp'], ['7.2', 'progressive', 'signatureHelp'],
  ['8.5', 'onDemand', 'signatureHelp'], ['8.5', 'progressive', 'signatureHelp'],
  ['7.2', 'onDemand', 'typeDefinition'], ['7.2', 'progressive', 'typeDefinition'],
  ['8.5', 'onDemand', 'typeDefinition'], ['8.5', 'progressive', 'typeDefinition'],
  ['7.2', 'onDemand', 'implementation'], ['7.2', 'progressive', 'implementation'],
  ['8.5', 'onDemand', 'implementation'], ['8.5', 'progressive', 'implementation'],
  ['7.2', 'onDemand', 'definition'], ['7.2', 'progressive', 'definition'],
  ['8.5', 'onDemand', 'definition'], ['8.5', 'progressive', 'definition'],
] as const)('resolves cold function-result queries at PHP %s/%s with first %s', async (phpVersion, indexingMode, firstQuery) => {
  const root = await mkdtemp(join(tmpdir(), 'sophp-cold-function-query-')); let server: ChildProcessWithoutNullStreams | undefined;
  try {
    const sourceRoot = join(root, 'src'); await mkdir(sourceRoot);
    const row = '<?php namespace App; class Row { public function name(): string { return "row"; } }';
    const child = '<?php namespace App; class Child extends Row { public function name(): string { return "child"; } }';
    const other = '<?php namespace App; class Other { public function otherOnly(): void {} }';
    const api = (type: string): string => `<?php namespace App; class Api {
/**
 * @var ${type}
 * @phpstan-var-extra metadata
 */ public $row;
/**
 * @return ${type}
 * @psalm-return-extra metadata
 */ public function read() { return $this->row; }
}`;
    const rows = (type: string): string => `<?php namespace App;
/**
 * @return ${type}
 * @return-extra metadata
 */ function rows() { return new ${type}(); }`;
    const caller = '<?php namespace App; function run(Api $api): void {\n'
      + '$value = $api->row; $value->name();\n$item = rows(); $item->name();\n$result = $api->read(); $result->name();\n}';
    const originals = new Map([['Row.php', row], ['Child.php', child], ['Other.php', other], ['Api.php', api('Row')], ['rows.php', rows('Row')], ['Caller.php', caller]]);
    for (const [name, source] of originals) await writeFile(join(sourceRoot, name), source);
    await writeFile(join(root, 'composer.json'), JSON.stringify({ autoload: { 'psr-4': { 'App\\': 'src/' }, files: ['src/rows.php'] } }));
    const uri = pathToFileURL(join(sourceRoot, 'Caller.php')).toString();
    const rowUri = pathToFileURL(join(sourceRoot, 'Row.php')).toString();
    const otherUri = pathToFileURL(join(sourceRoot, 'Other.php')).toString();
    const apiUri = pathToFileURL(join(sourceRoot, 'Api.php')).toString();
    const rowsUri = pathToFileURL(join(sourceRoot, 'rows.php')).toString();
    const childUri = pathToFileURL(join(sourceRoot, 'Child.php')).toString();
    const typeStart = row.indexOf('Row');
    const expectedTypeDefinition = [{ uri: rowUri, range: { start: position(row, typeStart), end: position(row, typeStart + 3) } }];
    const childStart = child.indexOf('name():');
    const expectedImplementation = [{ uri: childUri, range: { start: position(child, childStart), end: position(child, childStart + 4) } }];
    const start = row.indexOf('name():');
    const expectedDefinition = [{ uri: rowUri, range: { start: position(row, start), end: position(row, start + 4) } }];
    for (const restart of [false, true]) {
      server = spawn(process.execPath, [resolve('../../dist/language-server.js'), '--stdio',
        '--parser-core-wasm', resolve('../../dist/web-tree-sitter.wasm'), '--php-wasm', resolve('../../dist/tree-sitter-php.wasm')], { stdio: 'pipe' });
      const { notify, request, wait } = client(server);
      await request('initialize', { processId: null, rootUri: pathToFileURL(root).toString(), capabilities: {},
        initializationOptions: { phpVersion, indexingMode, cacheDirectory: join(root, 'cache') } });
      notify('initialized', {});
      notify('textDocument/didOpen', { textDocument: { uri, languageId: 'php', version: 1, text: caller } });
      const check = async (type: string): Promise<void> => {
        for (const variable of ['$item', '$value', '$result']) {
          const offset = caller.indexOf(`${variable}->name`);
          const completion = await request('textDocument/completion', { textDocument: { uri }, position: position(caller, offset + variable.length + 4) });
          const items = Array.isArray(completion) ? completion : completion?.items ?? [];
          expect(items.map((item: any) => item.label), `${type}/${variable}/restart=${restart}`).toEqual(type === 'Row' ? ['name'] : []);
          if (type === 'Row') expect(items[0].detail).toBe('App\\Row::name(): string');
          const hover = await request('textDocument/hover', { textDocument: { uri }, position: position(caller, offset + 2) });
          expect(hover?.contents?.value).toContain(`${variable}: App\\${type}\n`);
          const definitions = await request('textDocument/definition', { textDocument: { uri }, position: position(caller, offset + variable.length + 4) });
          expect(definitions).toEqual(type === 'Row' ? expectedDefinition : []);
          const typeSource = type === 'Row' ? row : other, typeStart = typeSource.indexOf(type);
          const types = await request('textDocument/typeDefinition', { textDocument: { uri }, position: position(caller, offset + 2) });
          expect(types).toEqual([{ uri: type === 'Row' ? rowUri : otherUri,
            range: { start: position(typeSource, typeStart), end: position(typeSource, typeStart + type.length) } }]);
          const implementations = await request('textDocument/implementation', { textDocument: { uri }, position: position(caller, offset + variable.length + 4) });
          expect(implementations).toEqual(type === 'Row' ? expectedImplementation : []);
        }
      };
      // Each query family must work as the first semantic request.
      // No Completion, diagnostic/index-ready wait or query prewarm precedes it.
      const firstOffset = caller.indexOf('$item->name');
      const firstMethod = firstQuery === 'memberHover' ? 'hover' : firstQuery;
      const first = await request(`textDocument/${firstMethod}`, { textDocument: { uri },
        position: position(caller, firstOffset + (['hover', 'typeDefinition'].includes(firstQuery) ? 2 : firstQuery === 'signatureHelp' ? '$item->name('.length : '$item'.length + 4)) });
      if (firstQuery === 'hover') expect(first?.contents?.value).toContain('$item: App\\Row\n');
      else if (firstQuery === 'memberHover') expect(first?.contents?.value).toContain('name(): string');
      else if (firstQuery === 'signatureHelp') expect(first?.signatures?.[0]?.label).toBe('name(): string');
      else if (firstQuery === 'typeDefinition') expect(first).toEqual(expectedTypeDefinition);
      else if (firstQuery === 'implementation') expect(first).toEqual(expectedImplementation);
      else expect(first).toEqual(expectedDefinition);
      await check('Row');
      if (!restart) {
        for (const [documentUri, text] of [[apiUri, api('Row')], [rowsUri, rows('Row')]])
          notify('textDocument/didOpen', { textDocument: { uri: documentUri, languageId: 'php', version: 1, text } });
        for (const [version, type] of [[2, 'Other'], [3, 'Row']] as const) {
          for (const [documentUri, text] of [[apiUri, api(type)], [rowsUri, rows(type)]])
            notify('textDocument/didChange', { textDocument: { uri: documentUri, version }, contentChanges: [{ text }] });
          await wait(message => message.method === 'textDocument/publishDiagnostics' && message.params?.uri === apiUri && message.params?.version === version);
          await wait(message => message.method === 'textDocument/publishDiagnostics' && message.params?.uri === rowsUri && message.params?.version === version);
          await check(type);
        }
      }
      await request('shutdown', null); const exited = once(server, 'exit'); notify('exit', null); await exited; server = undefined;
    }
    for (const [name, source] of originals) expect(await readFile(join(sourceRoot, name), 'utf8')).toBe(source);
  } finally { server?.kill(); await rm(root, { recursive: true, force: true }); }
}, 45_000);
