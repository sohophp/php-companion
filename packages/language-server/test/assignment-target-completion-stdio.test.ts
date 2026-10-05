import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { expect, it } from 'vitest';
import { encodeLspMessage, LspMessageDecoder } from '../../testkit/src/index.js';

it.each(['7.2', '8.5'] as const)('uses assignment targets in an unsaved Composer document at PHP %s', async phpVersion => {
  const root = await mkdtemp(join(tmpdir(), 'sophp-assignment-target-'));
  await mkdir(join(root, 'src'));
  await writeFile(join(root, 'composer.json'), JSON.stringify({ autoload: { 'psr-4': { 'Assign\\': 'src/' } } }));
  const file = join(root, 'src', 'Editing.php'), uri = pathToFileURL(file).toString();
  const disk = '<?php namespace Assign; // unchanged disk baseline\n';
  await writeFile(file, disk);
  const server = spawn(process.execPath, [resolve('dist/server.js'), '--stdio'], { stdio: 'pipe' });
  const decoder = new LspMessageDecoder(), messages: any[] = [];
  const waiters: Array<{ matches: (message: any) => boolean; done: (message: any) => void }> = [];
  server.stdout.on('data', chunk => {
    for (const message of decoder.push(chunk) as any[]) {
      messages.push(message);
      for (const waiter of [...waiters]) if (waiter.matches(message)) {
        waiters.splice(waiters.indexOf(waiter), 1); waiter.done(message);
      }
    }
  });
  const waitFor = (matches: (message: any) => boolean): Promise<any> => {
    const existing = messages.find(matches); if (existing) return Promise.resolve(existing);
    return new Promise((done, reject) => {
      const waiter = { matches, done: (message: any): void => { clearTimeout(timer); done(message); } };
      const timer = setTimeout(() => { waiters.splice(waiters.indexOf(waiter), 1); reject(new Error('Assignment target LSP response timed out')); }, 15_000);
      waiters.push(waiter);
    });
  };
  let id = 0, version = 0, queries = 0, hoverChecks = 0, definitionChecks = 0;
  const send = (message: object): void => { server.stdin.write(encodeLspMessage({ jsonrpc: '2.0', ...message })); };
  const request = async (method: string, params: object | null): Promise<any> => {
    const requestId = ++id, response = waitFor(message => message.id === requestId);
    send({ id: requestId, method, params }); const result = await response;
    expect(result.error).toBeUndefined(); return result.result;
  };
  const position = (source: string, offset: number): { line: number; character: number } => {
    const lines = source.slice(0, offset).split('\n'); return { line: lines.length - 1, character: lines.at(-1)!.length };
  };
  const header = `<?php namespace Assign;
class Child { /** @var bool */ public $flag; /** @var bool */ private $hidden; }
class Holder { /** @var Child */ public $child; /** @var array<int, Child> */ public $items; public function child(): Child { return new Child(); } }
function make(): Child { return new Child(); }
function pickA(): string { return 'text'; } function pickZ(): bool { return true; } function pickUnknown() {}
const OFFER_A='text'; const OFFER_Z=true;
function takeText(string $value): void {}
`;
  const query = async (marked: string, expected: string, shared: string[], propertyType?: string): Promise<void> => {
    const source = marked.replace('§', ''), offset = marked.indexOf('§'); version++;
    send({ method: version === 1 ? 'textDocument/didOpen' : 'textDocument/didChange', params: version === 1
      ? { textDocument: { uri, languageId: 'php', version, text: source } }
      : { textDocument: { uri, version }, contentChanges: [{ text: source }] } });
    const result = await request('textDocument/completion', { textDocument: { uri }, position: position(source, offset) }); queries++;
    const items = (Array.isArray(result) ? result : result.items).sort((a: any, b: any) => String(a.sortText).localeCompare(String(b.sortText)));
    expect(items[0]?.label).toBe(expected);
    for (const label of shared) expect(items.some((item: any) => item.label === label)).toBe(true);
    const published = await waitFor(message => message.method === 'textDocument/publishDiagnostics' && message.params.uri === uri && message.params.version === version);
    expect(published.params.version).toBe(version);
    if (propertyType) {
      const at = source.lastIndexOf('flag=') + 1;
      const hover = await request('textDocument/hover', { textDocument: { uri }, position: position(source, at) }); hoverChecks++;
      expect(JSON.stringify(hover)).toContain(propertyType);
      const definitions = await request('textDocument/definition', { textDocument: { uri }, position: position(source, at) }); definitionChecks++;
      expect(definitions).toHaveLength(1); expect(definitions[0].uri).toBe(uri);
      expect(definitions[0].range).toEqual({ start: position(source, source.indexOf('$flag;')), end: position(source, source.indexOf('$flag;') + '$flag'.length) });
    }
  };
  try {
    await request('initialize', { processId: null, rootUri: pathToFileURL(root).toString(), capabilities: {},
      initializationOptions: { phpVersion, indexingMode: 'onDemand', cacheDirectory: join(root, '.cache') } });
    send({ method: 'initialized', params: {} });
    for (const target of ['$holder->child->flag', 'make()->flag', '($holder->child)->flag', '$holder->items[0]->flag']) {
      await query(header + `function run(Holder $holder){${target}=pick§;}`, 'pickZ', ['pickA', 'pickUnknown'], 'bool');
      await query(header + `function run(Holder $holder,string $offerA,bool $offerZ){${target}=$offer§;}`, '$offerZ', ['$offerA']);
      await query(header + `function run(Holder $holder){${target}=OFFER_§;}`, 'OFFER_Z', ['OFFER_A']);
    }
    for (const type of ['string', 'bool']) await query(header.replace('@var bool */ public $flag', `@var ${type} */ public $flag`)
      + 'function run(Holder $holder){make()->flag=pick§;}', type === 'bool' ? 'pickZ' : 'pickA', ['pickUnknown'], type);
    await query(header + 'function run(Holder $holder){takeText($holder->child->flag=pick§);}', 'pickZ', ['pickA']);
    await query(header + 'function run(Holder $holder){$holder->child->hidden=pick§;}', 'pickA', ['pickZ']);
    await query(header + 'function run(){make()->fl§;}', 'flag', []);
    expect(await readFile(file, 'utf8')).toBe(disk);
    console.log(JSON.stringify({ phpVersion, queries, hoverChecks, definitionChecks, diagnosticVersions: version, diskUnchanged: true }));
  } finally {
    if (server.exitCode === null) { const exited = once(server, 'exit'); server.kill(); await exited; }
    await rm(root, { recursive: true, force: true });
  }
});
