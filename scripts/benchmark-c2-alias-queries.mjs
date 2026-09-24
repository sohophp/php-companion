import { spawn } from 'node:child_process';
import { mkdir, mkdtemp, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { performance } from 'node:perf_hooks';
import process from 'node:process';
import { clearTimeout, setTimeout } from 'node:timers';
import { setTimeout as delay } from 'node:timers/promises';
import { pathToFileURL } from 'node:url';
import { encodeLspMessage, LspMessageDecoder } from '../packages/testkit/dist/index.js';

const files = Number(process.argv[2] ?? 256);
if (!Number.isSafeInteger(files) || files < 1 || files > 4096) throw new Error('Usage: benchmark-c2-alias-queries.mjs [1..4096 open files]');
const settleMs = Number(process.argv[3] ?? 1000);
if (!Number.isSafeInteger(settleMs) || settleMs < 0 || settleMs > 10_000) throw new Error('Expected 0–10000 ms settle time.');
const rounds = Number(process.argv[4] ?? 1);
if (!Number.isSafeInteger(rounds) || rounds < 1 || rounds > 500) throw new Error('Expected 1–500 owner edit rounds.');
const root = await mkdtemp(join(tmpdir(), 'sophp-alias-queries-'));
const src = join(root, 'src');
const actualPath = join(src, 'Record.php');
const aliasPath = join(root, 'alias', 'Record.php');
const actualUri = pathToFileURL(actualPath).toString();
const aliasUri = pathToFileURL(aliasPath).toString();
const consumerPath = join(src, 'Consumer.php');
const consumerUri = pathToFileURL(consumerPath).toString();
const real = '<?php namespace App; class Record { public function realOnly(): void {} public function inspect(): void { $this->realOnly(); } }';
const linked = '<?php namespace App; class Record { public function linkedOnly(): void {} }';
const updated = linked.replace('linkedOnly', 'linkedLatestOnly');
const consumer = '<?php namespace App; function inspect(Record $record): void { $record->; }';
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
  await writeFile(consumerPath, consumer);
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
  send({ method: 'textDocument/didOpen', params: { textDocument: { uri: consumerUri, languageId: 'php', version: 1, text: consumer } } });
  await waitFor((message) => message.method === 'phpCompanion/versionedDiagnostics' && message.params.uri === consumerUri && message.params.version === 1);
  const setupMs = performance.now() - setupStarted;
  await delay(settleMs);
  const before = await memory();
  const hover = async () => {
    const value = await request('textDocument/hover', { textDocument: { uri: actualUri }, position: positionAt(real, localOffset) });
    if (!JSON.stringify(value.result).includes('realOnly')) throw new Error(`Wrong local Hover: ${JSON.stringify(value.result)}`);
    return value.elapsedMs;
  };
  const coldMs = await hover();
  const transportMs = [];
  for (let index = 0; index < 5; index += 1) transportMs.push((await request('phpCompanion/testQueryTimings', { reset: true })).elapsedMs);
  await request('phpCompanion/testQueryTimings', { reset: true });
  const warmMs = [];
  for (let index = 0; index < 10; index += 1) warmMs.push(await hover());
  const phases = (await request('phpCompanion/testQueryTimings', { reset: true })).result;
  const afterWarm = await memory();
  const messagesBeforeRounds = messages.length;
  send({ method: 'textDocument/didChange', params: { textDocument: { uri: aliasUri, version: 2 }, contentChanges: [{ text: updated }] } });
  await waitFor((message) => message.method === 'phpCompanion/versionedDiagnostics' && message.params.uri === aliasUri && message.params.version === 2);
  const rebuildMs = await hover();
  const rebuildSamples = [rebuildMs];
  for (let round = 1; round < rounds; round += 1) {
    const version = round + 2;
    send({ method: 'textDocument/didChange', params: { textDocument: { uri: aliasUri, version },
      contentChanges: [{ text: round % 2 === 0 ? updated : linked }] } });
    await waitFor((message) => message.method === 'phpCompanion/versionedDiagnostics'
      && message.params.uri === aliasUri && message.params.version === version);
    rebuildSamples.push(await hover());
  }
  const rebuildPhases = (await request('phpCompanion/testQueryTimings', { reset: true })).result;
  const afterRebuild = await memory();
  const projectCompletion = (await request('textDocument/completion', { textDocument: { uri: consumerUri },
    position: positionAt(consumer, consumer.indexOf('$record->') + '$record->'.length) })).result;
  const projectLabels = (Array.isArray(projectCompletion) ? projectCompletion : projectCompletion?.items ?? [])
    .map((item) => item.label);
  const expectedProjectMethod = rounds % 2 === 0 ? 'linkedOnly' : 'linkedLatestOnly';
  if (!projectLabels.includes(expectedProjectMethod) || projectLabels.includes('realOnly')) {
    throw new Error(`Project owner changed unexpectedly: expected ${expectedProjectMethod}, got ${JSON.stringify(projectLabels)}`);
  }
  const sortedRebuilds = [...rebuildSamples].sort((left, right) => left - right);
  const percentile = (fraction) => Math.round(sortedRebuilds[Math.floor((sortedRebuilds.length - 1) * fraction)] * 10) / 10;
  const phaseDistribution = (name) => {
    const values = [...(rebuildPhases[name] ?? [])].sort((left, right) => left - right);
    return values.length ? { p50: Math.round(values[Math.floor((values.length - 1) * 0.5)] * 10) / 10,
      p95: Math.round(values[Math.floor((values.length - 1) * 0.95)] * 10) / 10 } : undefined;
  };
  const roundMessages = messages.slice(messagesBeforeRounds);
  process.stdout.write(`${JSON.stringify({ files, settleMs, setupMs: Math.round(setupMs), coldMs: Math.round(coldMs),
    projectMethod: expectedProjectMethod,
    transportMs: transportMs.map((value) => Math.round(value * 10) / 10),
    warmMs: warmMs.map(Math.round), rebuildMs: Math.round(rebuildMs), rounds,
    rebuildDistributionMs: { p50: percentile(0.5), p95: percentile(0.95), max: percentile(1) },
    rebuildServerMs: { hover: phaseDistribution('hover'), workspace: phaseDistribution('hoverWorkspace') },
    roundMessages: roundMessages.length,
    roundDiagnostics: roundMessages.filter((message) => message.method === 'phpCompanion/versionedDiagnostics').length,
    warmPhasesMs: Object.fromEntries(['hoverWorkspace', 'hoverFrameworkContext', 'hoverMemberLookup', 'hover']
      .map((name) => [name, (phases[name] ?? []).map((value) => Math.round(value * 10) / 10)])),
    heapMiB: [before, afterWarm, afterRebuild].map((sample) => Math.round(sample.heapUsed / 1024 / 1024)),
    rssMiB: [before, afterWarm, afterRebuild].map((sample) => Math.round(sample.rss / 1024 / 1024)) })}\n`);
  await request('shutdown', null);
  send({ method: 'exit', params: null });
} finally {
  if (server?.exitCode === null) server.kill();
  await rm(root, { recursive: true, force: true });
}
