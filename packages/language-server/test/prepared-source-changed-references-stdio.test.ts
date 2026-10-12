import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { expect, it } from 'vitest';
import { encodeLspMessage, LspMessageDecoder } from '../../testkit/src/index.js';

const cases = ['progressive', 'experimental'].flatMap(indexingMode => ['system', 'portable', 'off'].map(experimentalRipgrepCandidates => ({ phpVersion: '8.5', indexingMode, experimentalRipgrepCandidates })));
it.each(cases)('uses configured $experimentalRipgrepCandidates search for changed and deleted unopened prepared consumers in $indexingMode', async ({ phpVersion, indexingMode, experimentalRipgrepCandidates }) => {
  const root = await mkdtemp(join(tmpdir(), 'sophp-prepared-fresh-references-'));
  await mkdir(join(root, 'src/Contract'), { recursive: true });
  await mkdir(join(root, 'src/Controller'), { recursive: true });
  await writeFile(join(root, 'composer.json'), JSON.stringify({ autoload: { 'psr-4': { 'App\\': 'src/' } } }));
  const contract = '<?php namespace App\\Contract; interface FreshContract { public function refreshSnapshot(): void; }';
  const unrelated = '<?php namespace App\\Contract; interface OtherContract { public function refreshSnapshot(): void; }';
  const otherCaller = '<?php namespace App\\Controller; use App\\Contract\\OtherContract; class OtherCaller { public function run(OtherContract $target): void { $target->refreshSnapshot(); } }';
  const caller = '<?php namespace App\\Controller; use App\\Contract\\FreshContract; class FreshCaller { public function run(FreshContract $target): void { $target->refreshSnapshot(); } }';
  const path = join(root, 'src/Contract/FreshContract.php'), uri = pathToFileURL(path).toString();
  const callerPath = join(root, 'src/Controller/FreshCaller.php'), callerUri = pathToFileURL(callerPath).toString();
  await writeFile(path, contract);
  await writeFile(callerPath, caller);
  await writeFile(join(root, 'src/Contract/OtherContract.php'), unrelated);
  await writeFile(join(root, 'src/Controller/OtherCaller.php'), otherCaller);
  const runtime = resolve(process.env.SOPHP_PREPARED_REFERENCE_RUNTIME ?? '../../dist');
  const server = spawn(process.execPath, [join(runtime, 'language-server.js'), '--stdio',
    '--parser-core-wasm', join(runtime, 'web-tree-sitter.wasm'), '--php-wasm', join(runtime, 'tree-sitter-php.wasm')], { stdio: 'pipe' });
  const exited = once(server, 'exit'), decoder = new LspMessageDecoder();
  const pending = new Map<number, { done: (message: any) => void }>();
  const messages: any[] = [];
  const notifications: Array<{ predicate: (message: any) => boolean; done: (message: any) => void }> = [];
  let id = 0, stderr = '';
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
  try {
    await request('initialize', { processId: null, capabilities: {}, rootUri: pathToFileURL(root).toString(),
      initializationOptions: { phpVersion, indexingMode, experimentalReferenceSourceOnly: indexingMode === 'experimental',
        experimentalRipgrepCandidates: experimentalRipgrepCandidates === 'off' ? false : experimentalRipgrepCandidates === 'portable' ? 'portable' : undefined,
        testMode: experimentalRipgrepCandidates === 'portable', cacheDirectory: join(root, 'cache') } });
    send({ method: 'initialized', params: {} });
    if (indexingMode === 'progressive' || indexingMode === 'experimental') await waitFor(message => message.method === 'window/logMessage'
      && message.params?.message?.includes('Reference source facts ready'));
    send({ method: 'textDocument/didOpen', params: { textDocument: { uri, languageId: 'php', version: 1, text: contract } } });
    await waitFor(message => message.method === 'textDocument/publishDiagnostics' && message.params?.uri === uri && message.params?.version === 1);
    const at = (source: string, name: string): { start: { line: number; character: number }; end: { line: number; character: number } } => ({
      start: position(source, source.indexOf(name)), end: position(source, source.indexOf(name) + name.length),
    });
    const params = { textDocument: { uri }, position: position(contract, contract.indexOf('refreshSnapshot') + 2), context: { includeDeclaration: true } };
    const result = await request('textDocument/references', params);
    expect(result.map((location: any) => location.uri).sort()).toEqual([uri, callerUri].sort());
    expect(result).toContainEqual({ uri, range: at(contract, 'refreshSnapshot') });
    expect(result).toContainEqual({ uri: callerUri, range: at(caller, 'refreshSnapshot') });
    const edited = caller.replace('$target->refreshSnapshot();', '');
    await writeFile(callerPath, edited); // A later disk-only edit must also invalidate the proof.
    expect(await request('textDocument/references', params)).toEqual([{ uri, range: at(contract, 'refreshSnapshot') }]);
    await writeFile(callerPath, caller);
    expect((await request('textDocument/references', params)).map((location: any) => location.uri).sort()).toEqual([uri, callerUri].sort());
    await rm(callerPath); // Deletion also arrives before a watcher event.
    expect(await request('textDocument/references', params)).toEqual([{ uri, range: at(contract, 'refreshSnapshot') }]);
    await writeFile(callerPath, edited);
    expect(await readFile(path, 'utf8')).toBe(contract);
    expect(await readFile(callerPath, 'utf8')).toBe(edited);
    await request('shutdown', null); send({ method: 'exit', params: {} });
    const [code] = await exited; expect(code, stderr).toBe(0);
  } finally {
    if (server.exitCode === null) { server.kill(); await exited; }
    await rm(root, { recursive: true, force: true });
  }
}, 20_000);
