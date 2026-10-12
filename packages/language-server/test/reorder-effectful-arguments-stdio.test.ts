import { createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { expect, it } from 'vitest';
import { encodeLspMessage, LspMessageDecoder } from '../../testkit/src/index.js';

const cases = ['7.2', '8.0', '8.5'].flatMap(phpVersion => ['onDemand', 'progressive'].map(indexingMode => ({ phpVersion, indexingMode })));

it.each(cases)('preserves effectful reorder arguments at PHP $phpVersion in $indexingMode mode', async ({ phpVersion, indexingMode }) => {
  const root = await mkdtemp(join(tmpdir(), 'sophp-reorder-effects-'));
  const contract = '<?php namespace App; interface Contract { public function send(int $head, int $mode = 20, int $count = 30): array; }';
  const implementation = '<?php namespace App; final class Example implements Contract { public function send(int $head, int $mode = 20, int $count = 30): array { return [$head, $mode, $count]; } }';
  const caller = `<?php namespace App; final class Caller {
    public function run(Contract $contract, Example $example): void {
        $contract->send(nextValue('head'), nextValue('mode'), nextValue('count'));
        $example->send(nextValue('head'), mode: nextValue('mode'), count: nextValue('count'));
        $contract->send(nextValue('head'), nextValue('mode'));
    }
}`;
  await mkdir(join(root, 'src'));
  await writeFile(join(root, 'composer.json'), JSON.stringify({ autoload: { 'psr-4': { 'App\\': 'src/' } } }));
  const sources = new Map<string, string>();
  for (const [name, source] of [['Contract', contract], ['Example', implementation], ['Caller', caller]]) {
    const path = join(root, 'src', `${name}.php`);
    await writeFile(path, source!);
    sources.set(pathToFileURL(path).toString(), source!);
  }
  const contractUri = pathToFileURL(join(root, 'src/Contract.php')).toString();
  const callerUri = pathToFileURL(join(root, 'src/Caller.php')).toString();
  const unsaved = caller.replace("nextValue('head')", "nextValue('unsaved-head')");
  sources.set(callerUri, unsaved);
  const server = spawn(process.execPath, [resolve('../../dist/language-server.js'), '--stdio',
    '--parser-core-wasm', resolve('../../dist/web-tree-sitter.wasm'), '--php-wasm', resolve('../../dist/tree-sitter-php.wasm')], { stdio: 'pipe' });
  const exited = once(server, 'exit');
  const decoder = new LspMessageDecoder();
  const pending = new Map<number, { done: (message: any) => void }>();
  let id = 0, stderr = '';
  server.stderr.on('data', (chunk: Buffer) => { stderr += chunk.toString(); });
  server.stdout.on('data', (chunk: Buffer) => {
    for (const message of decoder.push(chunk) as any[]) pending.get(message.id)?.done(message);
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
  const params = { textDocument: { uri: contractUri }, position: { line: 0, character: contract.indexOf('$count') + 2 }, targetIndex: 1 };
  try {
    await request('initialize', { processId: null, capabilities: {}, rootUri: pathToFileURL(root).toString(),
      initializationOptions: { phpVersion, indexingMode } });
    send({ method: 'initialized', params: {} });
    for (const [uri, text] of [[contractUri, contract], [callerUri, unsaved]])
      send({ method: 'textDocument/didOpen', params: { textDocument: { uri, languageId: 'php', version: 1, text } } });
    const plan = await request('phpCompanion/reorderMethodParameters', params);
    if (phpVersion === '7.2') expect(plan).toBeNull();
    else {
      expect(plan).toBeTruthy();
      expect(Object.keys(plan.changes).sort()).toEqual([...sources.keys()].sort());
      expect(plan.phpCompanion.sourceHashes).toEqual(Object.fromEntries([...sources].map(([uri, text]) => [uri, createHash('sha256').update(text).digest('hex')])));
      const changed = new Map<string, string>();
      for (const [uri, source] of sources) {
        const offset = (position: { line: number; character: number }): number => {
          const lines = source.split('\n');
          return lines.slice(0, position.line).reduce((sum, line) => sum + line.length + 1, 0) + position.character;
        };
        const edits = plan.changes[uri] as Array<{ range: { start: { line: number; character: number }; end: { line: number; character: number } }; newText: string }>;
        let result = source;
        for (const edit of [...edits].sort((left, right) => offset(right.range.start) - offset(left.range.start)))
          result = result.slice(0, offset(edit.range.start)) + edit.newText + result.slice(offset(edit.range.end));
        changed.set(uri, result);
      }
      expect(changed.get(contractUri)).toContain('send(int $head, int $count = 30, int $mode = 20)');
      expect(changed.get(callerUri)).toContain("send(head: nextValue('unsaved-head'), mode: nextValue('mode'), count: nextValue('count'))");
      expect(changed.get(callerUri)).toContain("send(head: nextValue('head'), mode: nextValue('mode'), count: nextValue('count'))");
      expect(changed.get(callerUri)).toContain("send(head: nextValue('head'), mode: nextValue('mode'))");
      const nextSource = unsaved.replace('unsaved-head', 'newer-head');
      send({ method: 'textDocument/didChange', params: { textDocument: { uri: callerUri, version: 2 }, contentChanges: [{ text: nextSource }] } });
      const fresh = await request('phpCompanion/reorderMethodParameters', params);
      expect(fresh.phpCompanion.sourceHashes[callerUri]).toBe(createHash('sha256').update(nextSource).digest('hex'));
      expect(fresh.changes[callerUri].map((edit: { newText: string }) => edit.newText))
        .toEqual(plan.changes[callerUri].map((edit: { newText: string }) => edit.newText));
      expect(fresh.changes[callerUri]).not.toEqual(plan.changes[callerUri]);
    }
    expect(await readFile(join(root, 'src/Caller.php'), 'utf8')).toBe(caller);
    await request('shutdown', null);
    send({ method: 'exit', params: {} });
    expect((await exited)[0], stderr).toBe(0);
  } finally {
    if (server.exitCode === null && server.signalCode === null) { server.kill(); await exited; }
    await rm(root, { recursive: true, force: true });
  }
}, 60_000);
