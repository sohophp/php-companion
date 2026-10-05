import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { expect, it } from 'vitest';
import { encodeLspMessage, LspMessageDecoder } from '../../testkit/src/index.js';

it.each([['7.2', 'onDemand'], ['7.2', 'experimental'], ['8.5', 'onDemand'], ['8.5', 'experimental']] as const)(
  'keeps Reflection construction contracts in an unsaved Composer document at PHP %s (%s)', async (phpVersion, indexingMode) => {
  const root = await mkdtemp(join(tmpdir(), 'sophp-reflection-construction-'));
  await mkdir(join(root, 'src'));
  await writeFile(join(root, 'composer.json'), JSON.stringify({ autoload: { 'psr-4': { 'Consumer\\': 'src/' } } }));
  const file = join(root, 'src', 'Editing.php'), uri = pathToFileURL(file).toString();
  const disk = '<?php namespace Consumer; // unchanged disk baseline\n';
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
      const timer = setTimeout(() => { waiters.splice(waiters.indexOf(waiter), 1); reject(new Error('Reflection construction LSP response timed out')); }, 15_000);
      waiters.push(waiter);
    });
  };
  let id = 0, version = 0, queries = 0;
  const send = (message: object): void => { server.stdin.write(encodeLspMessage({ jsonrpc: '2.0', ...message })); };
  const request = async (method: string, params: object | null): Promise<any> => {
    const requestId = ++id, response = waitFor(message => message.id === requestId);
    send({ id: requestId, method, params }); const result = await response;
    expect(result.error).toBeUndefined(); return result.result;
  };
  const position = (source: string, offset: number): { line: number; character: number } => {
    const lines = source.slice(0, offset).split('\n'); return { line: lines.length - 1, character: lines.at(-1)!.length };
  };
  const query = async (marked: string, expected: string, present: boolean, construct: boolean): Promise<void> => {
    const source = marked.replace('§', ''), offset = marked.indexOf('§'); version++;
    send({ method: version === 1 ? 'textDocument/didOpen' : 'textDocument/didChange', params: version === 1
      ? { textDocument: { uri, languageId: 'php', version, text: source } }
      : { textDocument: { uri, version }, contentChanges: [{ text: source }] } });
    const result = await request('textDocument/completion', { textDocument: { uri }, position: position(source, offset) }); queries++;
    const items = Array.isArray(result) ? result : result.items;
    const item = items.find((item: any) => item.label === expected);
    expect(Boolean(item), marked).toBe(present);
    if (item && construct) {
      expect(item.insertText ?? item.textEdit?.newText).toContain('(');
      expect(item.insertText ?? item.textEdit?.newText).toContain(')');
    }
    if (item && !construct) expect(item.insertText ?? item.textEdit?.newText).not.toContain('(');
    const published = await waitFor(message => message.method === 'textDocument/publishDiagnostics' && message.params.uri === uri && message.params.version === version);
    expect(published.params.version).toBe(version);
    if (/new(?:\s|\/\*[^]*?\*\/)*\\ReflectionType\(\);/u.test(source)) {
      expect(published.params.diagnostics.some((item: any) => item.code === 'php.instantiation.invalid-target'
        && item.message.includes('ReflectionType'))).toBe(indexingMode === 'experimental' && Number(phpVersion.replace('.', '')) >= 80);
    }
  };
  try {
    await request('initialize', { processId: null, rootUri: pathToFileURL(root).toString(), capabilities: { textDocument: { completion: { completionItem: { snippetSupport: true } } } },
      initializationOptions: { phpVersion, indexingMode, cacheDirectory: join(root, '.cache') } });
    send({ method: 'initialized', params: {} });
    if (indexingMode === 'experimental') await waitFor(message => message.method === 'window/logMessage'
      && message.params?.message?.includes('complete=true'));
    const target = Number(phpVersion.replace('.', ''));
    for (const [name, present, constructible] of [
      ['ReflectionType', true, target < 80], ['ReflectionNamedType', true, true],
      ['ReflectionUnionType', target >= 80, target >= 80],
      ['ReflectionIntersectionType', target >= 81, target >= 81],
      ['ReflectionAttribute', target >= 80, false], ['ReflectionReference', target >= 74, false],
    ] as const) {
      await query(`<?php new \\${name}§;`, name, constructible, true);
      await query(`<?php new \\${name}§();`, name, constructible, false);
      await query(`<?php new /*🙂*/ \\${name}§;`, name, constructible, true);
      await query(`<?php use ${name} as Selected; new Sele§;`, 'Selected', constructible, true);
      await query(`<?php use ${name}§;`, name, present, false);
      await query(`<?php function accepts(\\${name}§ $value){}`, name, present, false);
      await query(`<?php function produces():\\${name}§{}`, name, present, false);
    }
    const local = '<?php namespace Consumer; class ReflectionType {} new ReflectionTy§;';
    await query(local, 'ReflectionType', true, true);
    expect(await readFile(file, 'utf8')).toBe(disk);
    console.log(JSON.stringify({ phpVersion, indexingMode, queries, diagnosticVersions: version, diskUnchanged: true }));
  } finally {
    if (server.exitCode === null) { const exited = once(server, 'exit'); server.kill(); await exited; }
    await rm(root, { recursive: true, force: true });
  }
});
