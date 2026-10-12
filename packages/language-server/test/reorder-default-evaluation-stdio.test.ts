import { createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { expect, it } from 'vitest';
import { encodeLspMessage, LspMessageDecoder } from '../../testkit/src/index.js';

const cases = ['7.2', '8.0', '8.5'].flatMap(phpVersion =>
  ['onDemand', 'progressive'].map(indexingMode => ({ phpVersion, indexingMode })));

it.each(cases)('checks default evaluation and source lines at PHP $phpVersion in $indexingMode mode', async ({ phpVersion, indexingMode }) => {
  const root = await mkdtemp(join(tmpdir(), 'sophp-reorder-defaults-'));
  const initial = '<?php namespace App; final class Example {}';
  const path = join(root, 'Example.php');
  const uri = pathToFileURL(path).toString();
  await writeFile(join(root, 'composer.json'), JSON.stringify({ autoload: { 'psr-4': { 'App\\': './' } } }));
  await writeFile(path, initial);
  const server = spawn(process.execPath, [resolve('../../dist/language-server.js'), '--stdio',
    '--parser-core-wasm', resolve('../../dist/web-tree-sitter.wasm'), '--php-wasm', resolve('../../dist/tree-sitter-php.wasm')], { stdio: 'pipe' });
  const exited = once(server, 'exit');
  const decoder = new LspMessageDecoder();
  const pending = new Map<number, (message: any) => void>();
  let id = 0, version = 1, stderr = '';
  server.stderr.on('data', (chunk: Buffer) => { stderr += chunk.toString(); });
  server.stdout.on('data', (chunk: Buffer) => {
    for (const message of decoder.push(chunk) as any[]) pending.get(message.id)?.(message);
  });
  const send = (message: object): void => { server.stdin.write(encodeLspMessage({ jsonrpc: '2.0', ...message })); };
  const request = (method: string, params: object | null): Promise<any> => {
    const requestId = ++id;
    return new Promise((done, reject) => {
      const timer = setTimeout(() => { pending.delete(requestId); reject(new Error(`${method} timed out: ${stderr}`)); }, 15_000);
      pending.set(requestId, message => {
        clearTimeout(timer); pending.delete(requestId);
        if (message.error) reject(new Error(JSON.stringify(message.error))); else done(message.result);
      });
      send({ id: requestId, method, params });
    });
  };
  const scenarios: Array<{ name: string; source: string; allowed: boolean; expected?: string }> = [];
  const multiline = (defaults: string, args: string): string => `<?php namespace App; final class Example {
  public function send(
    int $head,
    int $mode = ${defaults},
    int $count = ${defaults}
  ): array { return [$head, $mode, $count, __LINE__]; }
  public function run(): array { return $this->send(${args}); }
}`;
  scenarios.push(
    { name: 'omitted line defaults', source: multiline('__LINE__', '1'), allowed: false },
    { name: 'supplied line defaults', source: multiline('__LINE__', '1, 2, 3'), allowed: true, expected: '$this->send(1, 3, 2)' },
    { name: 'literal defaults', source: multiline('20', '1'), allowed: true, expected: 'int $head,\n    int $count = 20,\n    int $mode = 20' },
    { name: 'multiline call', source: multiline('20', '1,\n      2,\n      3'), allowed: true, expected: '$this->send(1,\n      3,\n      2)' },
    { name: 'same-line defaults', source: multiline('__LINE__', '1').replace('int $head,\n    int $mode = __LINE__,\n    int $count = __LINE__',
      'int $head, int $mode = __LINE__, int $count = __LINE__'), allowed: true },
  );
  if (phpVersion === '8.5') {
    const objects = (args: string): string => `<?php namespace App;
final class Mark { public function __construct(string $label) {} }
final class Example {
  public function send(int $head, Mark $mode = new Mark('mode'), Mark $count = new Mark('count')): void {}
  public function run(): void { $this->send(${args}); }
}`;
    scenarios.push(
      { name: 'omitted object defaults', source: objects('1'), allowed: false },
      { name: 'named omitted defaults', source: objects('head: 1'), allowed: false },
      { name: 'all objects supplied', source: objects("1, new Mark('mode'), new Mark('count')"), allowed: true,
        expected: "$this->send(head: 1, mode: new Mark('mode'), count: new Mark('count'))" },
      { name: 'one object omitted', source: objects("1, new Mark('mode')"), allowed: true,
        expected: "$this->send(head: 1, mode: new Mark('mode'))" },
      { name: 'interface implementation defaults', source: `<?php namespace App;
final class Mark { public function __construct(string $label) {} }
interface Contract { public function send(int $head, ?Mark $mode = null, ?Mark $count = null): void; }
final class Example implements Contract {
  public function send(int $head, ?Mark $mode = new Mark('mode'), ?Mark $count = new Mark('count')): void {}
}
function run(Contract $target): void { $target->send(1); }`, allowed: false },
    );
  }
  try {
    await request('initialize', { processId: null, capabilities: {}, rootUri: pathToFileURL(root).toString(),
      initializationOptions: { phpVersion, indexingMode } });
    send({ method: 'initialized', params: {} });
    send({ method: 'textDocument/didOpen', params: { textDocument: { uri, languageId: 'php', version, text: initial } } });
    for (const scenario of scenarios) {
      const source = scenario.source;
      send({ method: 'textDocument/didChange', params: { textDocument: { uri, version: ++version }, contentChanges: [{ text: source }] } });
      const offset = source.indexOf('$count') + 2;
      const prefix = source.slice(0, offset).split('\n');
      const plan = await request('phpCompanion/reorderMethodParameters', { textDocument: { uri },
        position: { line: prefix.length - 1, character: prefix.at(-1)!.length }, targetIndex: 1 });
      if (!scenario.allowed) { expect(plan, scenario.name).toBeNull(); continue; }
      expect(plan, scenario.name).toBeTruthy();
      expect(Object.keys(plan.changes), scenario.name).toEqual([uri]);
      expect(plan.phpCompanion.sourceHashes[uri]).toBe(createHash('sha256').update(source).digest('hex'));
      const positionOffset = (position: { line: number; character: number }): number =>
        source.split('\n').slice(0, position.line).reduce((sum, line) => sum + line.length + 1, 0) + position.character;
      const edits = plan.changes[uri] as Array<{ range: { start: { line: number; character: number }; end: { line: number; character: number } }; newText: string }>;
      let changed = source;
      for (const edit of [...edits].sort((left, right) => positionOffset(right.range.start) - positionOffset(left.range.start)))
        changed = changed.slice(0, positionOffset(edit.range.start)) + edit.newText + changed.slice(positionOffset(edit.range.end));
      expect(changed.split('\n').length, scenario.name).toBe(source.split('\n').length);
      if (scenario.expected) expect(changed, scenario.name).toContain(scenario.expected);
    }
    expect(await readFile(path, 'utf8')).toBe(initial);
    await request('shutdown', null); send({ method: 'exit', params: {} });
    expect((await exited)[0], stderr).toBe(0);
  } finally {
    if (server.exitCode === null && server.signalCode === null) { server.kill(); await exited; }
    await rm(root, { recursive: true, force: true });
  }
}, 60_000);
