import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { expect, it } from 'vitest';
import { parsePhpDocType, type PhpDocType } from '../../phpdoc/src/index.js';
import { encodeLspMessage, LspMessageDecoder } from '../../testkit/src/index.js';
import { generatorSendMismatchMarkers, generatorSendSource, generatorSendType,
  type GeneratorSendState } from '../../../test/extension/suite/generatorSendFixture.js';

const cases = ['7.2', '8.5'].flatMap(phpVersion => ['onDemand', 'progressive'].map(indexingMode => ({ phpVersion, indexingMode })));
const normalizeType = (type: PhpDocType): string => {
  if (type.kind === 'name') return `name:${type.name}`;
  if (type.kind === 'generic') return `generic:${normalizeType(type.base)}<${type.arguments.map(normalizeType).join(',')}>`;
  if (type.kind === 'union' || type.kind === 'intersection') return `${type.kind}:${type.types.map(normalizeType).sort().join('|')}`;
  throw new Error(`Unexpected delegated type: ${type.kind}`);
};
const contract = (value: string): string => {
  const parsed = parsePhpDocType(value);
  expect(parsed.errors).toEqual([]); expect(parsed.consumed).toBe(value.length); expect(parsed.type).toBeDefined();
  return normalizeType(parsed.type!);
};

it.each(cases)('refreshes Generator send contracts and nullable results at PHP $phpVersion in $indexingMode', async ({ phpVersion, indexingMode }) => {
  const root = await mkdtemp(join(tmpdir(), 'sophp-generator-send-'));
  await mkdir(join(root, 'src'));
  await writeFile(join(root, 'composer.json'), JSON.stringify({ autoload: { 'psr-4': { 'App\\': 'src/' } } }));
  const path = join(root, 'src', 'Example.php'), uri = pathToFileURL(path).toString();
  const initial = generatorSendSource('App', 'command'); await writeFile(path, initial);
  const server = spawn(process.execPath, [resolve('../../dist/language-server.js'), '--stdio',
    '--parser-core-wasm', resolve('../../dist/web-tree-sitter.wasm'), '--php-wasm', resolve('../../dist/tree-sitter-php.wasm')], { stdio: 'pipe' });
  const exited = once(server, 'exit'), decoder = new LspMessageDecoder();
  const pending = new Map<number, { done: (message: any) => void }>();
  const messages: any[] = [];
  const notifications: Array<{ predicate: (message: any) => boolean; done: (message: any) => void }> = [];
  let id = 0, version = 0, open = false, stderr = '';
  server.stderr.on('data', (chunk: Buffer) => { stderr += chunk.toString(); });
  server.stdout.on('data', (chunk: Buffer) => {
    for (const message of decoder.push(chunk) as any[]) {
      messages.push(message); pending.get(message.id)?.done(message);
      for (const waiter of [...notifications]) if (waiter.predicate(message)) waiter.done(message);
    }
  });
  const send = (message: object): void => { server.stdin.write(encodeLspMessage({ jsonrpc: '2.0', ...message })); };
  const request = (method: string, params: object | null): Promise<any> => {
    const requestId = ++id;
    return new Promise((done, reject) => {
      const timer = setTimeout(() => { pending.delete(requestId); reject(new Error(`${method} timed out: ${stderr}`)); }, 15_000);
      pending.set(requestId, { done: message => {
        clearTimeout(timer); pending.delete(requestId);
        if (message.error) reject(new Error(JSON.stringify(message.error))); else done(message.result);
      } });
      send({ id: requestId, method, params });
    });
  };
  const waitFor = (predicate: (message: any) => boolean): Promise<any> => {
    const found = messages.find(predicate); if (found) return Promise.resolve(found);
    return new Promise((done, reject) => {
      const timer = setTimeout(() => { notifications.splice(notifications.indexOf(waiter), 1); reject(new Error(`Diagnostics timed out: ${stderr}`)); }, 15_000);
      const waiter = { predicate, done: (message: any): void => {
        clearTimeout(timer); notifications.splice(notifications.indexOf(waiter), 1); done(message);
      } };
      notifications.push(waiter);
    });
  };
  const position = (source: string, offset: number): { line: number; character: number } => {
    const lines = source.slice(0, offset).split('\n'); return { line: lines.length - 1, character: lines.at(-1)!.length };
  };
  const member = async (source: string, marker: string, owner?: string): Promise<void> => {
    const offset = source.lastIndexOf(marker) + marker.indexOf('->') + 3;
    const params = { textDocument: { uri }, position: position(source, offset) };
    const definitions = await request('textDocument/definition', params);
    const name = marker.slice(marker.indexOf('->') + 2).replace('()', '');
    if (owner === undefined) expect(definitions).toEqual([]);
    else {
      const expected = source.indexOf(`function ${name}(`, source.indexOf(`class ${owner} `)) + 'function '.length;
      expect(definitions).toHaveLength(1);
      expect(definitions[0]).toMatchObject({ uri, range: { start: position(source, expected) } });
      const hover = await request('textDocument/hover', params); expect(JSON.stringify(hover)).toContain(name);
    }
    const completion = await request('textDocument/completion', params);
    const items = Array.isArray(completion) ? completion : completion?.items ?? [];
    expect(items.some((item: any) => item.label === name)).toBe(owner !== undefined);
  };
  const observations: Array<{ state: string; version: number; contract: string; mismatchLines: number[] }> = [];
  const query = async (state: GeneratorSendState): Promise<void> => {
    const source = generatorSendSource('App', state); version++;
    send({ method: open ? 'textDocument/didChange' : 'textDocument/didOpen', params: open
      ? { textDocument: { uri, version }, contentChanges: [{ text: source }] }
      : { textDocument: { uri, languageId: 'php', version, text: source } } }); open = true;
    const signature = await request('textDocument/signatureHelp', { textDocument: { uri },
      position: position(source, source.indexOf('$stream->send(new Command())') + '$stream->send('.length) });
    expect(signature?.signatures).toHaveLength(1);
    const label = signature.signatures[0].label as string;
    const sendType = generatorSendType(state);
    const qualified = ['Command', 'Other'].includes(sendType) ? `App\\${sendType}` : sendType;
    expect(label).toContain(`${qualified} $value`);
    expect(contract(label.slice(label.lastIndexOf(': ') + 2))).toBe(contract('App\\Item|null'));
    await member(source, '$received->execute()', state === 'command' || state === 'bounded' ? 'Command' : undefined);
    await member(source, '$received->wrong()', state === 'other' ? 'Other' : undefined);
    await member(source, '$sent->name()', 'Item');
    const diagnostics = await waitFor(message => message.method === 'textDocument/publishDiagnostics'
      && message.params?.uri === uri && message.params?.version === version);
    expect(diagnostics.params.diagnostics.some((item: any) => item.code === 'php.syntax')).toBe(false);
    const mismatchLines = diagnostics.params.diagnostics.filter((item: any) => item.code === 'php.argument.type-mismatch')
      .map((item: any) => item.range.start.line).sort((a: number, b: number) => a - b);
    const expectedLines = generatorSendMismatchMarkers(state).map(marker => position(source,
      source.lastIndexOf(marker) + marker.indexOf('(') + 1).line).sort((a, b) => a - b);
    expect(mismatchLines).toEqual(expectedLines);
    expect(await readFile(path, 'utf8')).toBe(initial);
    observations.push({ state, version, contract: label, mismatchLines });
  };
  try {
    await request('initialize', { processId: null, capabilities: {}, rootUri: pathToFileURL(root).toString(),
      initializationOptions: { phpVersion, indexingMode } }); send({ method: 'initialized', params: {} });
    for (const state of ['command', 'other', 'mixed', 'null', 'undeclared', 'bounded', 'command'] as const) await query(state);
    send({ method: 'textDocument/didClose', params: { textDocument: { uri } } }); open = false;
    await query('command');
    expect(observations).toHaveLength(8);
    await request('shutdown', null); send({ method: 'exit', params: {} }); expect((await exited)[0], stderr).toBe(0); expect(stderr).toBe('');
    console.log('Generator send production protocol evidence: ' + JSON.stringify({ phpVersion, indexingMode, observations, normalExit: true }));
  } finally {
    if (server.exitCode === null && server.signalCode === null) { server.kill(); await exited; }
    await rm(root, { recursive: true, force: true });
  }
});
