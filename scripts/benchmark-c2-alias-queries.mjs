import { spawn } from 'node:child_process';
import { mkdir, mkdtemp, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { performance } from 'node:perf_hooks';
import process from 'node:process';
import { clearTimeout, setTimeout } from 'node:timers';
import { pathToFileURL } from 'node:url';
import { encodeLspMessage, LspMessageDecoder } from '../packages/testkit/dist/index.js';

const files = Number(process.argv[2] ?? 256);
if (!Number.isSafeInteger(files) || files < 1 || files > 4096) throw new Error('Usage: benchmark-c2-alias-queries.mjs [1..4096 open files]');
const root = await mkdtemp(join(tmpdir(), 'sophp-alias-queries-'));
const src = join(root, 'src');
const actualPath = join(src, 'Record.php');
const aliasPath = join(root, 'alias', 'Record.php');
const actualUri = pathToFileURL(actualPath).toString();
const aliasUri = pathToFileURL(aliasPath).toString();
const real = '<?php namespace App; class Record { public function realOnly(): void {} public function inspect(): void { $this->realOnly(); } }';
const linked = '<?php namespace App; class Record { public function linkedOnly(): void {} }';
const updated = linked.replace('linkedOnly', 'linkedLatestOnly');
const localOffset = real.indexOf('$this->realOnly') + '$this->'.length + 2;
const positionAt = (source, offset) => {
  const lines = source.slice(0, offset).split('\n');
  return { line: lines.length - 1, character: lines.at(-1).length };
};

let server;
try {
  await mkdir(src);
  await writeFile(join(root, 'composer.json'), JSON.stringify({ autoload: { 'psr-4': { 'App\\': 'src/' } } }));
  await writeFile(actualPath, '<?php namespace App; class Record { public function diskOnly(): void {} }');
  await symlink(src, join(root, 'alias'), process.platform === 'win32' ? 'junction' : 'dir');
  const noise = await Promise.all(Array.from({ length: files }, async (_, index) => {
    const path = join(src, `Noise${index}.php`);
    const text = `<?php namespace App; class Noise${index} { public function work${index}(): int { return ${index}; } }`;
    await writeFile(path, text);
    return { uri: pathToFileURL(path).toString(), text };
  }));
  server = spawn(process.execPath, ['--expose-gc', resolve('packages/language-server/dist/server.js'), '--stdio'], { stdio: 'pipe' });
  const decoder = new LspMessageDecoder();
  const messages = []; const waiters = []; let nextId = 1; let stderr = '';
  const send = (message) => server.stdin.write(encodeLspMessage({ jsonrpc: '2.0', ...message }));
  server.stderr.on('data', (chunk) => { stderr = `${stderr}${chunk}`.slice(-4096); });
  server.stdout.on('data', (chunk) => {
    for (const message of decoder.push(chunk)) {
      messages.push(message);
      if (message.method && message.id !== undefined) send({ id: message.id, result: null });
      for (const waiter of [...waiters]) {
        if (!waiter.predicate(message)) continue;
        clearTimeout(waiter.timer); waiters.splice(waiters.indexOf(waiter), 1); waiter.resolve(message);
      }
    }
  });
  const waitFor = (predicate, timeoutMs = 60_000) => new Promise((done, reject) => {
    const found = messages.find(predicate); if (found) return done(found);
    const waiter = { predicate, resolve: done, timer: setTimeout(() => {
      waiters.splice(waiters.indexOf(waiter), 1); reject(new Error(`Language server timeout: ${stderr}`));
    }, timeoutMs) };
    waiters.push(waiter);
  });
  server.once('exit', (code, signal) => {
    for (const waiter of waiters.splice(0)) {
      clearTimeout(waiter.timer); waiter.resolve({ error: { code, signal, stderr } });
    }
  });
  const request = async (method, params) => {
    const id = nextId++; const started = performance.now();
    send({ id, method, params });
    const response = await waitFor((message) => message.id === id || message.error?.stderr);
    if (response.error) throw new Error(`${method}: ${JSON.stringify(response.error)}`);
    return { result: response.result, elapsedMs: performance.now() - started };
  };
  const memory = async () => (await request('phpCompanion/testMemoryUsage', { collect: true })).result;
  await request('initialize', { processId: null, capabilities: {}, rootUri: pathToFileURL(root).toString(),
    initializationOptions: { phpVersion: '8.5', indexingMode: 'onDemand', versionedDiagnostics: true, testMode: true } });
  send({ method: 'initialized', params: {} });
  const setupStarted = performance.now();
  for (const file of noise) send({ method: 'textDocument/didOpen', params: {
    textDocument: { uri: file.uri, languageId: 'php', version: 1, text: file.text },
  } });
  const opened = new Set();
  while (opened.size < noise.length) {
    const message = await waitFor((candidate) => candidate.method === 'phpCompanion/versionedDiagnostics'
      && candidate.params.version === 1 && noise.some((file) => file.uri === candidate.params.uri) && !opened.has(candidate.params.uri));
    opened.add(message.params.uri);
  }
  send({ method: 'textDocument/didOpen', params: { textDocument: { uri: actualUri, languageId: 'php', version: 1, text: real } } });
  await waitFor((message) => message.method === 'phpCompanion/versionedDiagnostics' && message.params.uri === actualUri && message.params.version === 1);
  send({ method: 'textDocument/didOpen', params: { textDocument: { uri: aliasUri, languageId: 'php', version: 1, text: linked } } });
  await waitFor((message) => message.method === 'phpCompanion/versionedDiagnostics' && message.params.uri === aliasUri && message.params.version === 1);
  const setupMs = performance.now() - setupStarted;
  const before = await memory();
  const hover = async () => {
    const value = await request('textDocument/hover', { textDocument: { uri: actualUri }, position: positionAt(real, localOffset) });
    if (!JSON.stringify(value.result).includes('realOnly')) throw new Error(`Wrong local Hover: ${JSON.stringify(value.result)}`);
    return value.elapsedMs;
  };
  const coldMs = await hover();
  const warmMs = [];
  for (let index = 0; index < 10; index += 1) warmMs.push(await hover());
  const afterWarm = await memory();
  send({ method: 'textDocument/didChange', params: { textDocument: { uri: aliasUri, version: 2 }, contentChanges: [{ text: updated }] } });
  await waitFor((message) => message.method === 'phpCompanion/versionedDiagnostics' && message.params.uri === aliasUri && message.params.version === 2);
  const rebuildMs = await hover();
  const afterRebuild = await memory();
  process.stdout.write(`${JSON.stringify({ files, setupMs: Math.round(setupMs), coldMs: Math.round(coldMs),
    warmMs: warmMs.map(Math.round), rebuildMs: Math.round(rebuildMs),
    heapMiB: [before, afterWarm, afterRebuild].map((sample) => Math.round(sample.heapUsed / 1024 / 1024)),
    rssMiB: [before, afterWarm, afterRebuild].map((sample) => Math.round(sample.rss / 1024 / 1024)) })}\n`);
  await request('shutdown', null);
  send({ method: 'exit', params: null });
} finally {
  if (server?.exitCode === null) server.kill();
  await rm(root, { recursive: true, force: true });
}
