import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdir, mkdtemp, readFile, realpath, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve, sep } from 'node:path';
import { pathToFileURL } from 'node:url';
import { expect, it } from 'vitest';
import { encodeLspMessage, LspMessageDecoder } from '../../testkit/src/index.js';

const cases = ['7.2', '8.5'].flatMap(phpVersion => ['progressive', 'experimental'].map(indexingMode => ({ phpVersion, indexingMode })));
it.each(cases)('bounds prepared reads and preserves a newly opened buffer and cancellation at PHP $phpVersion in $indexingMode', async ({ phpVersion, indexingMode }) => {
  const root = await realpath(await mkdtemp(join(tmpdir(), 'sophp-prepared-batch-')));
  const src = join(root, 'src'); await mkdir(src);
  await writeFile(join(root, 'composer.json'), JSON.stringify({ autoload: { 'psr-4': { 'App\\': 'src/' } } }));
  const contract = '<?php namespace App; interface Target { public function refreshSnapshot(): void; }';
  const contractPath = join(src, 'Target.php'), uri = pathToFileURL(contractPath).toString();
  await writeFile(contractPath, contract);
  const callers = Array.from({ length: 32 }, (_, index) => {
    const path = join(src, `Consumer${index}.php`);
    const text = `<?php namespace App; class Consumer${index} { public function run(Target $target): void { $target->refreshSnapshot(); } }`;
    return { path, text, uri: pathToFileURL(path).toString() };
  });
  await Promise.all(callers.map(caller => writeFile(caller.path, caller.text)));
  const arm = join(root, 'arm.json'), held = join(root, 'held.json'), release = join(root, 'release'), stats = join(root, 'reads.json');
  const preload = join(root, 'hold-read.cjs');
  // Hold an actual completed disk read until the client opens a newer buffer.
  // The instrument applies only after source preparation, inside this fixture.
  await writeFile(preload, `const fs = require('node:fs'); const fsp = require('node:fs/promises');
const original = fsp.readFile, originalCallback = fs.readFile; let active = 0, peak = 0, serial = 0, seen = '';
const thread = require('node:worker_threads').threadId;
const saveStats = () => { const temp = stats + '.' + process.pid + '.' + thread; fs.writeFileSync(temp, JSON.stringify({ active, peak })); fs.renameSync(temp, stats); };
const arm = ${JSON.stringify(arm)}, held = ${JSON.stringify(held)}, release = ${JSON.stringify(release)}, stats = ${JSON.stringify(stats)};
const observed = path => fs.existsSync(arm) && typeof path === 'string' && path.startsWith(${JSON.stringify(src + sep)}) && path.endsWith('.php');
const observeRead = async (path, read) => {
  const control = JSON.parse(fs.readFileSync(arm, 'utf8'));
  active++; peak = Math.max(peak, active); saveStats();
  try {
    const result = await read();
    if (path === control.path && seen !== control.serial) {
      seen = control.serial; serial++; fs.writeFileSync(held, JSON.stringify({ path, serial }));
      await new Promise(done => { const timer = setInterval(() => { if (fs.existsSync(release)) { clearInterval(timer); done(); } }, 5); });
    }
    return result;
  } finally { active--; saveStats(); }
};
fsp.readFile = function(path, ...args) {
  return observed(path) ? observeRead(path, () => original.call(this, path, ...args)) : original.call(this, path, ...args);
};
fs.readFile = function(path, ...args) {
  if (!observed(path)) return originalCallback.call(this, path, ...args);
  const callback = args.pop();
  observeRead(path, () => new Promise((done, reject) => originalCallback.call(this, path, ...args, (error, data) => error ? reject(error) : done(data))))
    .then(data => callback(null, data), error => callback(error));
};`);
  const runtime = resolve('../../dist');
  const server = spawn(process.execPath, ['--require', preload, join(runtime, 'language-server.js'), '--stdio',
    '--parser-core-wasm', join(runtime, 'web-tree-sitter.wasm'), '--php-wasm', join(runtime, 'tree-sitter-php.wasm')], { stdio: 'pipe' });
  const exited = once(server, 'exit'), decoder = new LspMessageDecoder();
  const messages: any[] = []; let id = 0, stderr = '';
  const pending = new Map<number, (message: any) => void>();
  server.stderr.on('data', (chunk: Buffer) => { stderr += chunk.toString(); });
  server.stdout.on('data', (chunk: Buffer) => {
    for (const message of decoder.push(chunk) as any[]) { messages.push(message); pending.get(message.id)?.(message); }
  });
  const send = (message: object): void => { server.stdin.write(encodeLspMessage({ jsonrpc: '2.0', ...message })); };
  const request = (method: string, params: object | null): { id: number; reply: Promise<any> } => {
    const requestId = ++id;
    const reply = new Promise<any>((done, reject) => {
      const timer = setTimeout(() => { pending.delete(requestId); reject(new Error(`${method} timed out: ${stderr}`)); }, 15_000);
      pending.set(requestId, message => { clearTimeout(timer); pending.delete(requestId); done(message); });
      send({ id: requestId, method, params });
    });
    return { id: requestId, reply };
  };
  const waitUntil = async (predicate: () => Promise<boolean> | boolean): Promise<void> => {
    const deadline = Date.now() + 15_000;
    while (!await predicate()) {
      if (Date.now() > deadline) throw new Error(`Fixture condition timed out: ${stderr}`);
      await new Promise(done => setTimeout(done, 5));
    }
  };
  const readHeld = async (): Promise<any> => { try { return JSON.parse(await readFile(held, 'utf8')); } catch { return null; } };
  const params = { textDocument: { uri }, position: { line: 0, character: contract.indexOf('refreshSnapshot') + 2 }, context: { includeDeclaration: true } };
  const query = async (): Promise<any> => { const reply = await request('textDocument/references', params).reply; expect(reply.error).toBeUndefined(); return reply.result; };
  try {
    expect((await request('initialize', { processId: null, capabilities: {}, rootUri: pathToFileURL(root).toString(),
      initializationOptions: { phpVersion, indexingMode, experimentalReferenceSourceOnly: indexingMode === 'experimental', cacheDirectory: join(root, 'cache') } }).reply).error).toBeUndefined();
    send({ method: 'initialized', params: {} });
    await waitUntil(() => messages.some(message => message.method === 'window/logMessage' && message.params?.message?.includes('Reference source facts ready')));
    send({ method: 'textDocument/didOpen', params: { textDocument: { uri, languageId: 'php', version: 1, text: contract } } });
    await waitUntil(() => messages.some(message => message.method === 'textDocument/publishDiagnostics' && message.params.uri === uri));
    expect((await query()).map((location: any) => location.uri).sort()).toEqual([uri, ...callers.map(caller => caller.uri)].sort());
    const first = callers[0]!;
    await writeFile(arm, JSON.stringify({ serial: 'open', path: first.path }));
    const openedQuery = request('textDocument/references', params);
    await waitUntil(async () => (await readHeld())?.path === first.path);
    const peak = JSON.parse(await readFile(stats, 'utf8')).peak;
    expect(peak).toBeGreaterThan(1); expect(peak).toBeLessThanOrEqual(8);
    const edited = first.text.replace('$target->refreshSnapshot();', '');
    send({ method: 'textDocument/didOpen', params: { textDocument: { uri: first.uri, languageId: 'php', version: 1, text: edited } } });
    await waitUntil(() => messages.some(message => message.method === 'textDocument/publishDiagnostics' && message.params.uri === first.uri));
    await writeFile(release, 'release');
    const opened = await openedQuery.reply;
    expect(opened.error).toBeUndefined();
    expect(opened.result.map((location: any) => location.uri).sort()).toEqual([uri, ...callers.slice(1).map(caller => caller.uri)].sort());
    expect(await readFile(first.path, 'utf8')).toBe(first.text);
    await rm(release); await rm(held);
    await writeFile(arm, JSON.stringify({ serial: 'cancel', path: callers[1]!.path }));
    const cancelled = request('textDocument/references', params);
    await waitUntil(async () => (await readHeld())?.path === callers[1]!.path);
    // The URI set is unchanged: a membership cache must still use current text.
    send({ method: 'textDocument/didChange', params: { textDocument: { uri: first.uri, version: 2 }, contentChanges: [{ text: first.text }] } });
    send({ method: '$/cancelRequest', params: { id: cancelled.id } });
    await writeFile(release, 'release');
    expect((await cancelled.reply).error?.code).toBe(-32800);
    await rm(arm);
    expect((await query()).map((location: any) => location.uri).sort()).toEqual([uri, ...callers.map(caller => caller.uri)].sort());
    expect((await request('shutdown', null).reply).error).toBeUndefined(); send({ method: 'exit', params: {} });
    expect((await exited)[0], stderr).toBe(0);
  } finally {
    await writeFile(release, 'release');
    if (server.exitCode === null) { server.kill(); await exited; }
    await rm(root, { recursive: true, force: true });
  }
}, 30_000);
