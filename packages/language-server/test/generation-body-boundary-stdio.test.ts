import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { it } from 'vitest';
import { PhpSyntaxParser } from '../../parser/src/index.js';
import { encodeLspMessage, LspMessageDecoder } from '../../testkit/src/index.js';

const variants = [
  { name: 'complete class', body: 'private string $value;', suffix: '}', expected: true },
  { name: 'nested method braces', body: 'private string $value; public function keep(): void { if (true) {} }', suffix: '}', expected: true },
  { name: 'brace in comment', body: 'private string $value; /* } */', suffix: '}', expected: true },
  { name: 'unrelated unfinished function', body: 'private string $value;', suffix: '} function unrelated(', expected: true },
  { name: 'missing class brace', body: 'private string $value; public function keep(): void {}', suffix: '', expected: false },
  { name: 'line-comment brace', body: 'private string $value; public function keep(): void {} // }', suffix: '', expected: false },
  { name: 'block-comment brace', body: 'private string $value; public function keep(): void {} /* } */', suffix: '', expected: false },
  { name: 'unfinished method', body: 'private string $value; public function keep(): void {} public function unfinished(', suffix: '', expected: false },
] as const;
const titles = { constructor: 'Generate constructor for 1 property', accessor: 'Generate 1 property accessor',
  interface: 'Implement 1 interface method', abstract: 'Implement 1 abstract method', override: 'Override GenerationBoundary\\Base::label' };
const position = (source: string, offset: number): { line: number; character: number } => {
  const parts = source.slice(0, offset).split('\n'); return { line: parts.length - 1, character: parts.at(-1)!.length };
};
const offsetAt = (source: string, value: { line: number; character: number }): number =>
  source.split('\n').slice(0, value.line).reduce((sum, line) => sum + line.length + 1, 0) + value.character;

it.each(['onDemand', 'progressive'])('generates only inside the selected complete class body in %s', async indexingMode => {
  const root = await mkdtemp(join(tmpdir(), 'sophp-generation-body-'));
  await mkdir(join(root, 'src'));
  await writeFile(join(root, 'composer.json'), JSON.stringify({ autoload: { 'psr-4': { 'GenerationBoundary\\': 'src/' } } }));
  const initial = '<?php namespace GenerationBoundary; class Target {}';
  const path = join(root, 'src', 'Target.php'), uri = pathToFileURL(path).toString();
  await writeFile(path, initial);
  const dependencies = {
    Base: '<?php namespace GenerationBoundary; class Base { public function label(): string { return "label"; } }',
    Contract: '<?php namespace GenerationBoundary; interface Contract { public function label(): string; }',
    AbstractBase: '<?php namespace GenerationBoundary; abstract class AbstractBase { abstract public function label(): string; }',
  };
  for (const [name, text] of Object.entries(dependencies)) await writeFile(join(root, 'src', `${name}.php`), text);
  const parser = await PhpSyntaxParser.createDefault();
  const server = spawn(process.execPath, [resolve('../../dist/language-server.js'), '--stdio',
    '--parser-core-wasm', resolve('../../dist/web-tree-sitter.wasm'), '--php-wasm', resolve('../../dist/tree-sitter-php.wasm')], { stdio: 'pipe' });
  const exited = once(server, 'exit'), decoder = new LspMessageDecoder();
  const pending = new Map<number, (message: any) => void>(), messages: any[] = [];
  const waiters = new Set<{ predicate: (message: any) => boolean; done: (message: any) => void }>();
  let id = 0, version = 0, stderr = '';
  const send = (message: object): void => { server.stdin.write(encodeLspMessage({ jsonrpc: '2.0', ...message })); };
  server.stderr.on('data', chunk => { stderr += chunk.toString(); });
  server.stdout.on('data', chunk => {
    for (const message of decoder.push(chunk) as any[]) {
      messages.push(message); pending.get(message.id)?.(message);
      for (const waiter of [...waiters]) if (waiter.predicate(message)) waiter.done(message);
    }
  });
  const waitFor = (predicate: (message: any) => boolean): Promise<any> => {
    const found = messages.find(predicate); if (found) return Promise.resolve(found);
    return new Promise((done, reject) => {
      const timer = setTimeout(() => { waiters.delete(waiter); reject(new Error(`Notification timeout: ${stderr}`)); }, 15000);
      const waiter = { predicate, done: (message: any): void => { clearTimeout(timer); waiters.delete(waiter); done(message); } };
      waiters.add(waiter);
    });
  };
  const request = (method: string, params: object | null): Promise<any> => new Promise((done, reject) => {
    const requestId = ++id;
    const timer = setTimeout(() => { pending.delete(requestId); reject(new Error(`${method} timeout: ${stderr}`)); }, 15000);
    pending.set(requestId, message => {
      clearTimeout(timer); pending.delete(requestId);
      if (message.error) reject(new Error(JSON.stringify(message.error))); else done(message.result);
    });
    send({ id: requestId, method, params });
  });
  let checked = 0;
  try {
    await request('initialize', { processId: null, capabilities: {}, rootUri: pathToFileURL(root).toString(),
      initializationOptions: { phpVersion: '8.5', indexingMode } });
    send({ method: 'initialized', params: {} });
    if (indexingMode === 'progressive') await waitFor(message => message.method === 'window/logMessage'
      && message.params?.message === `Reference source facts ready in ${root}.`);
    for (const [name, text] of Object.entries(dependencies)) send({ method: 'textDocument/didOpen', params: {
      textDocument: { uri: pathToFileURL(join(root, 'src', `${name}.php`)).toString(), languageId: 'php', version: 1, text },
    } });
    for (const operation of ['constructor', 'accessor', 'interface', 'abstract', 'override'] as const) for (const variant of variants) {
      const source = `<?php namespace GenerationBoundary; class Target${operation === 'override' ? ' extends Base' : operation === 'interface' ? ' implements Contract' : operation === 'abstract' ? ' extends AbstractBase' : ''} { ${variant.body} ${variant.suffix}`;
      version++;
      send({ method: version === 1 ? 'textDocument/didOpen' : 'textDocument/didChange', params: version === 1
        ? { textDocument: { uri, languageId: 'php', version, text: source } }
        : { textDocument: { uri, version }, contentChanges: [{ text: source }] } });
      const cursor = position(source, source.indexOf('Target') + 2);
      const actions = await request('textDocument/codeAction', { textDocument: { uri }, range: { start: cursor, end: cursor },
        context: { diagnostics: [], only: ['refactor.rewrite'] } });
      const selected = actions.filter((action: any) => action.title === titles[operation]);
      assert.equal(selected.length, variant.expected ? 1 : 0, `${operation}/${variant.name}`);
      if (selected.length) {
        const action = selected[0]; assert.equal(action.kind, 'refactor.rewrite');
        assert.deepEqual(Object.keys(action.edit.changes), [uri]);
        const edits = action.edit.changes[uri].map((edit: any) => ({ ...edit, start: offsetAt(source, edit.range.start), end: offsetAt(source, edit.range.end) }))
          .sort((a: any, b: any) => b.start - a.start);
        assert.equal(edits.length, 1); assert.equal(edits[0].start, edits[0].end); assert.equal(source[edits[0].start], '}');
        const applied: string = edits.reduce((text: string, edit: any) => text.slice(0, edit.start) + edit.newText + text.slice(edit.end), source);
        const before = parser.parse(source), after = parser.parse(applied);
        try {
          assert.deepEqual(after.errors.map(error => applied.slice(error.start, error.end)), before.errors.map(error => source.slice(error.start, error.end)));
          const names = operation === 'constructor' ? ['__construct'] : operation === 'accessor' ? ['getValue', 'setValue'] : ['label'];
          assert.deepEqual(after.callables.filter(callable => names.includes(callable.name)).map(callable => ({ name: callable.name, owner: callable.containerFqcn })),
            names.map(name => ({ name, owner: 'GenerationBoundary\\Target' })));
        } finally { before.tree.delete(); after.tree.delete(); }
      }
      assert.equal(await readFile(path, 'utf8'), initial); checked++;
    }
    assert.equal(checked, 40);
    await request('shutdown', null); send({ method: 'exit', params: {} }); assert.deepEqual(await exited, [0, null]); assert.equal(stderr, '');
  } finally {
    if (server.exitCode === null && server.signalCode === null) { server.kill(); await exited; }
    parser.dispose(); await rm(root, { recursive: true, force: true });
  }
});
