import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { createHash } from 'node:crypto';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { expect, it } from 'vitest';
import { encodeLspMessage, LspMessageDecoder } from '../../testkit/src/index.js';

it.each(['onDemand', 'experimental'] as const)('keeps legacy constructor Rename root/version/source scoped (%s)', async indexingMode => {
  const root = await mkdtemp(join(tmpdir(), 'sophp-legacy-rename-'));
  await mkdir(join(root, 'src'));
  await writeFile(join(root, 'composer.json'), JSON.stringify({ autoload: { 'psr-4': { '': 'src/' } } }));
  const file = join(root, 'src', 'C.php'), traitFile = join(root, 'src', 'Init.php');
  const disk = '<?php class C {}', traitSource = '<?php trait Init {function C(int $value){}}';
  await writeFile(file, disk); await writeFile(traitFile, traitSource);
  const uri = pathToFileURL(file).toString(), traitUri = pathToFileURL(traitFile).toString();
  const server = spawn(process.execPath, [resolve('dist/server.js'), '--stdio', '--parser-core-wasm',
    resolve('../../dist/web-tree-sitter.wasm'), '--php-wasm', resolve('../../dist/tree-sitter-php.wasm')], { stdio: 'pipe' });
  const decoder = new LspMessageDecoder(), messages: any[] = [];
  const waiters: Array<{ matches: (message: any) => boolean; done: (message: any) => void }> = [];
  let stderr = ''; server.stderr.on('data', chunk => { stderr += chunk; });
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
      const timer = setTimeout(() => { waiters.splice(waiters.indexOf(waiter), 1); reject(new Error(`Rename timed out: ${stderr}`)); }, 15_000);
      waiters.push(waiter);
    });
  };
  let id = 0, version = 0;
  const send = (message: object): void => { server.stdin.write(encodeLspMessage({ jsonrpc: '2.0', ...message })); };
  const request = async (method: string, params: object | null): Promise<any> => {
    const requestId = ++id, response = waitFor(message => message.id === requestId);
    send({ id: requestId, method, params }); const result = await response;
    expect(result.error).toBeUndefined(); return result.result;
  };
  const position = (source: string, offset: number): { line: number; character: number } => {
    const lines = source.slice(0, offset).split('\n'); return { line: lines.length - 1, character: lines.at(-1)!.length };
  };
  const offsetAt = (source: string, pos: { line: number; character: number }): number =>
    source.split('\n').slice(0, pos.line).reduce((count, line) => count + line.length + 1, 0) + pos.character;
  const query = async (source: string, selected: string, expected: string | null): Promise<any> => {
    version++;
    send({ method: version === 1 ? 'textDocument/didOpen' : 'textDocument/didChange', params: version === 1
      ? { textDocument: { uri, languageId: 'php', version, text: source } }
      : { textDocument: { uri, version }, contentChanges: [{ text: source }] } });
    const params = { textDocument: { uri }, position: position(source, source.indexOf(selected) + selected.length - 1) };
    if (expected) expect((await request('textDocument/prepareRename', params))?.placeholder).toBe('C');
    const plan = await request('textDocument/rename', { ...params, newName: 'D' });
    if (expected === null) { expect(plan, source).toBeNull(); return null; }
    expect(plan.documentChanges.find((item: any) => item.kind === 'rename')).toMatchObject({ oldUri: uri, newUri: pathToFileURL(join(root, 'src', 'D.php')).toString() });
    const changes = plan.documentChanges.filter((item: any) => item.textDocument?.uri === uri).flatMap((item: any) => item.edits);
    const result = changes.map((edit: any) => ({ start: offsetAt(source, edit.range.start), end: offsetAt(source, edit.range.end), newText: edit.newText }))
      .sort((a: any, b: any) => b.start - a.start).reduce((text: string, edit: any) => text.slice(0, edit.start) + edit.newText + text.slice(edit.end), source);
    expect(result).toBe(expected);
    expect(plan.phpCompanion.sourceHashes[uri]).toBe(createHash('sha256').update(source).digest('hex'));
    return plan;
  };
  try {
    await request('initialize', { processId: null, rootUri: pathToFileURL(root).toString(), capabilities: { workspace: { workspaceEdit: { documentChanges: true, resourceOperations: ['rename'] } } },
      initializationOptions: { phpVersion: '7.2', indexingMode, cacheDirectory: join(root, '.cache') } });
    send({ method: 'initialized', params: {} });
    if (indexingMode === 'experimental') await waitFor(message => message.method === 'window/logMessage' && message.params?.message?.includes('complete=true'));
    await query('<?php class C {function C(int $value){}} $c=new C(7); $c->C(8);', 'class C',
      '<?php class D {function D(int $value){}} $c=new D(7); $c->D(8);');
    await query('<?php class C {function C(int $value){}} new C(7);', 'function C',
      '<?php class D {function D(int $value){}} new D(7);');
    const shared = '<?php class C {use Init;} new C(7);';
    const plan = await query(shared, 'class C', '<?php class D {use Init { Init::C as public D; }} new D(7);');
    expect(plan.phpCompanion.sourceHashes[traitUri]).toBe(createHash('sha256').update(traitSource).digest('hex'));
    expect(plan.documentChanges.some((item: any) => item.textDocument?.uri === traitUri)).toBe(false);
    await query('<?php class C {function D(){}} new C();', 'class C', null);
    await query('<?php class C {function C(){}}', 'function C', '<?php class D {function D(){}}');
    send({ method: 'phpCompanion/phpVersions', params: { fallback: '8.5', versions: [{ uri: pathToFileURL(root).toString(), version: '8.5' }] } });
    await query('<?php class C {function C(int $value){}} new C(7);', 'class C',
      '<?php class D {function C(int $value){}} new D(7);');
    await query('<?php class C {function D(){}} new C();', 'class C', '<?php class D {function D(){}} new D();');
    send({ method: 'phpCompanion/phpVersions', params: { fallback: '7.4', versions: [{ uri: pathToFileURL(root).toString(), version: '7.4' }] } });
    await query('<?php class C {function C(int $value){}} new C(7);', 'class C', '<?php class D {function D(int $value){}} new D(7);');
    expect(await readFile(file, 'utf8')).toBe(disk); expect(await readFile(traitFile, 'utf8')).toBe(traitSource);
    await request('shutdown', null); send({ method: 'exit' }); await once(server, 'exit');
  } finally { if (server.exitCode === null) server.kill(); await rm(root, { recursive: true, force: true }); }
}, 60_000);
