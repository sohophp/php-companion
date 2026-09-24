import { spawn } from 'node:child_process';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { performance } from 'node:perf_hooks';
import process from 'node:process';
import { clearTimeout, setTimeout } from 'node:timers';
import { pathToFileURL, URL } from 'node:url';
import { encodeLspMessage, LspMessageDecoder } from '../packages/testkit/dist/index.js';

const iterations = Number(process.argv.slice(2).find((value) => value !== '--') ?? 500);
const profileMemory = process.env.SOPHP_C2_PROFILE_MEMORY === '1';
const profileGc = process.env.SOPHP_C2_PROFILE_GC === '1';
const profileEditsOnly = process.env.SOPHP_C2_PROFILE_EDITS_ONLY === '1';
if (!Number.isSafeInteger(iterations) || iterations < 100 || iterations > 10_000) {
  throw new Error('Usage: benchmark-c2-session.mjs [iterations: 100..10000]');
}

function positionAt(source, offset) {
  const lines = source.slice(0, offset).split('\n');
  return { line: lines.length - 1, character: lines.at(-1).length };
}

function labels(result) {
  return (Array.isArray(result) ? result : result?.items ?? []).map((item) => item.label);
}

function durations(values) {
  const sorted = [...values].sort((left, right) => left - right);
  return { p50: sorted[Math.floor((sorted.length - 1) * 0.5)], p95: sorted[Math.floor((sorted.length - 1) * 0.95)], max: sorted.at(-1) };
}

async function rssMiB(pid) {
  if (process.platform !== 'linux') return undefined;
  const source = await readFile(`/proc/${pid}/status`, 'utf8');
  const rss = /^VmRSS:\s+(\d+) kB$/m.exec(source)?.[1];
  if (!rss) throw new Error(`Cannot read RSS for language server ${pid}.`);
  return Number(rss) / 1024;
}

function startServer() {
  const child = spawn(process.execPath, [...(profileGc ? ['--expose-gc'] : []), resolve('packages/language-server/dist/server.js'), '--stdio'], { stdio: 'pipe' });
  const decoder = new LspMessageDecoder(); const messages = []; const waiters = [];
  let stderr = ''; let nextId = 1;
  const send = (message) => child.stdin.write(encodeLspMessage({ jsonrpc: '2.0', ...message }));
  child.stderr.on('data', (chunk) => { stderr = `${stderr}${chunk}`.slice(-4096); });
  child.stdout.on('data', (chunk) => {
    for (const message of decoder.push(chunk)) {
      messages.push(message);
      if (message.method && message.id !== undefined) send({ id: message.id, result: null });
      for (const waiter of [...waiters]) {
        if (messages.length - 1 < waiter.after || !waiter.predicate(message)) continue;
        clearTimeout(waiter.timer); waiters.splice(waiters.indexOf(waiter), 1); waiter.resolve(message);
      }
    }
  });
  child.once('exit', (code, signal) => {
    for (const waiter of waiters.splice(0)) {
      clearTimeout(waiter.timer);
      waiter.reject(new Error(`Language server exited code=${code} signal=${signal}: ${stderr}`));
    }
  });
  const waitFor = (predicate, after, timeoutMs = 20_000) => {
    const found = messages.slice(after).find(predicate);
    if (found) return Promise.resolve(found);
    return new Promise((resolvePromise, reject) => {
      const waiter = { after, predicate, resolve: resolvePromise, reject, timer: undefined };
      waiter.timer = setTimeout(() => {
        waiters.splice(waiters.indexOf(waiter), 1);
        reject(new Error(`Timed out waiting for language server; last messages: ${JSON.stringify(messages.slice(-4))}; ${stderr}`));
      }, timeoutMs);
      waiters.push(waiter);
    });
  };
  const request = async (method, params) => {
    const id = nextId++; const after = messages.length; const started = performance.now();
    send({ id, method, params });
    const response = await waitFor((message) => message.id === id, after);
    if (response.error) throw new Error(`${method}: ${JSON.stringify(response.error)}`);
    return { result: response.result, elapsedMs: performance.now() - started };
  };
  return { child, messages, send, waitFor, request, async stop() {
    if (child.exitCode !== null) return;
    await request('shutdown', null);
    send({ method: 'exit', params: null });
    await new Promise((done) => child.once('exit', done));
  } };
}

const root = await mkdtemp(join(tmpdir(), 'sophp-c2-session-'));
let server;
try {
  await mkdir(join(root, 'src'));
  await writeFile(join(root, 'composer.json'), JSON.stringify({ autoload: { 'psr-4': { 'App\\': 'src/' } } }));
  const declarationPath = join(root, 'src', 'Records.php');
  const declarationUri = pathToFileURL(declarationPath).toString();
  const consumerUri = pathToFileURL(join(root, 'src', 'Consumer.php')).toString();
  const alpha = `<?php namespace App;
    class Alpha { public function alphaOnly(): void {} }
    class Beta { public function betaOnly(): void {} }
    /** @return list<Alpha> */ function records(): array { return []; }`;
  const beta = alpha.replace('list<Alpha>', 'list<Beta>');
  const consumer = `<?php namespace App;
    function inspect(): void { foreach (records() as $item) { $item->; $item->betaOnly(); } }`;
  await writeFile(declarationPath, alpha);
  await writeFile(new URL(consumerUri), consumer);
  const completionPosition = positionAt(consumer, consumer.indexOf('$item->;') + '$item->'.length);
  const definitionPosition = positionAt(consumer, consumer.indexOf('betaOnly()') + 2);
  server = startServer();
  await server.request('initialize', { processId: null, capabilities: {}, rootUri: pathToFileURL(root).toString(),
    initializationOptions: { phpVersion: '8.5', indexingMode: 'onDemand', versionedDiagnostics: true, testMode: profileMemory || profileGc } });
  server.send({ method: 'initialized', params: {} });
  let after = server.messages.length;
  server.send({ method: 'textDocument/didOpen', params: { textDocument: { uri: consumerUri, languageId: 'php', version: 1, text: consumer } } });
  await server.waitFor((message) => message.method === 'phpCompanion/versionedDiagnostics'
    && message.params.uri === consumerUri && message.params.version === 1, after);
  const baselineRssMiB = await rssMiB(server.child.pid);
  const memorySample = async (cycle) => {
    const sample = { cycle, rssMiB: await rssMiB(server.child.pid) };
    if (profileMemory || profileGc) {
      const { result } = await server.request('phpCompanion/testMemoryUsage', { collect: profileGc });
      for (const name of ['heapUsed', 'heapTotal', 'external', 'arrayBuffers']) sample[`${name}MiB`] = result[name] / 1024 / 1024;
    }
    return sample;
  };
  const samples = []; const timings = { change: [], betaCompletion: [], betaHover: [], betaDefinition: [], close: [], alphaCompletion: [], alphaDefinition: [] };
  const started = performance.now();
  for (let cycle = 0; cycle < iterations; cycle += 1) {
    const openVersion = cycle * 2 + 1; const changedVersion = openVersion + 1;
    after = server.messages.length;
    server.send({ method: 'textDocument/didOpen', params: { textDocument: {
      uri: declarationUri, languageId: 'php', version: openVersion, text: alpha,
    } } });
    await server.waitFor((message) => message.method === 'phpCompanion/versionedDiagnostics'
      && message.params.uri === declarationUri && message.params.version === openVersion, after);
    after = server.messages.length; const changedAt = performance.now();
    server.send({ method: 'textDocument/didChange', params: {
      textDocument: { uri: declarationUri, version: changedVersion }, contentChanges: [{ text: beta }],
    } });
    await server.waitFor((message) => message.method === 'phpCompanion/versionedDiagnostics'
      && message.params.uri === declarationUri && message.params.version === changedVersion, after);
    timings.change.push(performance.now() - changedAt);
    if (!profileEditsOnly) {
      const betaCompletion = await server.request('textDocument/completion', {
        textDocument: { uri: consumerUri }, position: completionPosition,
      });
      timings.betaCompletion.push(betaCompletion.elapsedMs);
      const betaLabels = labels(betaCompletion.result);
      if (!betaLabels.includes('betaOnly') || betaLabels.includes('alphaOnly')) {
        throw new Error(`Cycle ${cycle + 1}: stale Beta completion: ${JSON.stringify(betaLabels)}`);
      }
      const betaHover = await server.request('textDocument/hover', {
        textDocument: { uri: consumerUri }, position: definitionPosition,
      });
      timings.betaHover.push(betaHover.elapsedMs);
      if (!JSON.stringify(betaHover.result?.contents).includes('betaOnly')) {
        throw new Error(`Cycle ${cycle + 1}: stale Beta hover: ${JSON.stringify(betaHover.result)}`);
      }
      const betaDefinition = await server.request('textDocument/definition', {
        textDocument: { uri: consumerUri }, position: definitionPosition,
      });
      timings.betaDefinition.push(betaDefinition.elapsedMs);
      if (!Array.isArray(betaDefinition.result) || betaDefinition.result.length !== 1
        || betaDefinition.result[0].uri !== declarationUri) {
        throw new Error(`Cycle ${cycle + 1}: stale Beta definition: ${JSON.stringify(betaDefinition.result)}`);
      }
    }
    after = server.messages.length; const closedAt = performance.now();
    server.send({ method: 'textDocument/didClose', params: { textDocument: { uri: declarationUri } } });
    await server.waitFor((message) => message.method === 'textDocument/publishDiagnostics'
      && message.params.uri === declarationUri && message.params.diagnostics.length === 0, after);
    timings.close.push(performance.now() - closedAt);
    if (!profileEditsOnly) {
      const alphaCompletion = await server.request('textDocument/completion', {
        textDocument: { uri: consumerUri }, position: completionPosition,
      });
      timings.alphaCompletion.push(alphaCompletion.elapsedMs);
      const alphaLabels = labels(alphaCompletion.result);
      if (!alphaLabels.includes('alphaOnly') || alphaLabels.includes('betaOnly')) {
        throw new Error(`Cycle ${cycle + 1}: stale Alpha completion: ${JSON.stringify(alphaLabels)}`);
      }
      const alphaDefinition = await server.request('textDocument/definition', {
        textDocument: { uri: consumerUri }, position: definitionPosition,
      });
      timings.alphaDefinition.push(alphaDefinition.elapsedMs);
      if (!Array.isArray(alphaDefinition.result) || alphaDefinition.result.length !== 0) {
        throw new Error(`Cycle ${cycle + 1}: stale Beta definition after close: ${JSON.stringify(alphaDefinition.result)}`);
      }
    }
    if (cycle % 25 === 0 || cycle === iterations - 1) samples.push(await memorySample(cycle + 1));
  }
  const finalRssMiB = await rssMiB(server.child.pid);
  await server.stop(); server = undefined;
  process.stdout.write(`${JSON.stringify({ schema: 1, iterations, indexingMode: 'onDemand', profileMemory, profileGc, profileEditsOnly, elapsedMs: performance.now() - started,
    languageServerRssMiB: { baseline: baselineRssMiB, final: finalRssMiB, samples },
    timingsMs: Object.fromEntries(Object.entries(timings).map(([name, values]) => [name, durations(values)])),
    checkedResults: profileEditsOnly ? 0 : iterations * 5, staleResults: profileEditsOnly ? undefined : 0 }, null, 2)}\n`);
} finally {
  server?.child.kill();
  await rm(root, { recursive: true, force: true });
}
