import { spawn } from 'node:child_process';
import { cp, mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { performance } from 'node:perf_hooks';
import process from 'node:process';
import { clearTimeout, setTimeout } from 'node:timers';
import { pathToFileURL } from 'node:url';
import { encodeLspMessage, LspMessageDecoder } from '../packages/testkit/dist/index.js';

const parameters = process.argv.slice(2).filter((value) => value !== '--');
const rounds = Number(parameters[0] ?? 100);
const noiseFiles = Number(parameters[1] ?? 9100);
if (!Number.isSafeInteger(rounds) || rounds < 1 || rounds > 1000
  || !Number.isSafeInteger(noiseFiles) || noiseFiles < 0 || noiseFiles > 20_000) {
  throw new Error('Usage: benchmark-c2-real-vendor-feedback.mjs [rounds: 1..1000] [noise PHP files: 0..20000]');
}

const positionAt = (source, offset) => {
  const lines = source.slice(0, offset).split('\n');
  return { line: lines.length - 1, character: lines.at(-1).length };
};
const summary = (values) => {
  const sorted = [...values].sort((left, right) => left - right);
  return { p50: sorted[Math.floor((sorted.length - 1) * 0.5)],
    p95: sorted[Math.floor((sorted.length - 1) * 0.95)], max: sorted.at(-1) };
};
const rssMiB = async (pid) => {
  if (process.platform !== 'linux') return undefined;
  const status = await readFile(`/proc/${pid}/status`, 'utf8');
  return Number(/^VmRSS:\s+(\d+) kB$/m.exec(status)?.[1]) / 1024;
};

function startServer() {
  const child = spawn(process.execPath, [resolve('packages/language-server/dist/server.js'), '--stdio'], { stdio: 'pipe' });
  const decoder = new LspMessageDecoder(); const messages = []; const waiters = [];
  let nextId = 1; let stderr = '';
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
  const waitFor = (predicate, after = 0, timeoutMs = 30_000) => {
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

const source = (type) => `<?php namespace App\\C1;
final class Service { public function text(): ${type} { return ${type === 'int' ? '42' : "'bad'"}; } public function accept(int $value): void {} }
`;
const consumer = `<?php declare(strict_types=1); namespace App\\C1;
function inspect(Service $service): void { $value = $service->text(); // source remains stable
  $service->accept($value); }
`;
const root = await mkdtemp(join(tmpdir(), 'sophp-c2-real-vendor-'));
let server;
try {
  const fixture = resolve('test/extension/real-vendor');
  await cp(join(fixture, 'composer.json'), join(root, 'composer.json'));
  await cp(join(fixture, 'composer.lock'), join(root, 'composer.lock'));
  await cp(join(fixture, 'vendor'), join(root, 'vendor'), { recursive: true });
  const vendorPhpFiles = (await readdir(join(root, 'vendor'), { recursive: true, withFileTypes: true }))
    .filter((entry) => entry.isFile() && entry.name.endsWith('.php')).length;
  await mkdir(join(root, 'src', 'Noise'), { recursive: true });
  for (let start = 0; start < noiseFiles; start += 100) {
    await Promise.all(Array.from({ length: Math.min(100, noiseFiles - start) }, (_, offset) => {
      const index = start + offset;
      return writeFile(join(root, 'src', 'Noise', `Noise${index}.php`),
        `<?php namespace App\\C1\\Noise; class Noise${index} { public function work(): int { return ${index}; } }`);
    }));
  }
  const serviceUri = pathToFileURL(join(root, 'src', 'Service.php')).toString();
  const consumerUri = pathToFileURL(join(root, 'src', 'Consumer.php')).toString();
  await writeFile(join(root, 'src', 'Service.php'), source('string'));
  await writeFile(join(root, 'src', 'Consumer.php'), consumer);
  const hoverPosition = positionAt(consumer, consumer.lastIndexOf('$value);') + 2);
  server = startServer();
  await server.request('initialize', { processId: null, capabilities: {}, rootUri: pathToFileURL(root).toString(),
    initializationOptions: { phpVersion: '8.5', indexingMode: 'onDemand', versionedDiagnostics: true,
      testMode: true, testPauseNextQueries: ['hover'] } });
  server.send({ method: 'initialized', params: {} });
  for (const [uri, text] of [[serviceUri, source('string')], [consumerUri, consumer]]) {
    server.send({ method: 'textDocument/didOpen', params: { textDocument: { uri, languageId: 'php', version: 1, text } } });
  }
  const mismatch = (message, expected) => message.method === 'phpCompanion/versionedDiagnostics'
    && message.params.uri === consumerUri && message.params.version === 1
    && message.params.diagnostics.some((item) => item.code === 'php.argument.type-mismatch') === expected;
  await server.waitFor((message) => mismatch(message, true));
  const initialRssMiB = await rssMiB(server.child.pid);

  const pausedId = 10_000; const pausedAt = server.messages.length;
  server.send({ id: pausedId, method: 'textDocument/hover', params: {
    textDocument: { uri: consumerUri }, position: hoverPosition,
  } });
  await server.waitFor((message) => message.method === 'window/logMessage'
    && message.params?.message === '[test-query-paused] method=hover', pausedAt);
  server.send({ method: '$/cancelRequest', params: { id: pausedId } });
  let version = 2; let after = server.messages.length;
  server.send({ method: 'textDocument/didChange', params: {
    textDocument: { uri: serviceUri, version }, contentChanges: [{ text: source('int') }],
  } });
  await server.waitFor((message) => mismatch(message, false), after);
  const released = await server.request('phpCompanion/testReleaseQuery', { method: 'hover' });
  if (released.result !== true) throw new Error('Paused Hover was not released.');
  const cancelled = await server.waitFor((message) => message.id === pausedId, pausedAt);
  if (cancelled.result !== null) throw new Error(`Cancelled Hover returned an old value: ${JSON.stringify(cancelled)}`);
  const hover = async (type) => {
    const response = await server.request('textDocument/hover', { textDocument: { uri: consumerUri }, position: hoverPosition });
    if (!response.result?.contents?.value?.includes(`$value: ${type}`)) {
      throw new Error(`Hover disagrees with ${type}: ${JSON.stringify(response.result)}`);
    }
    return response.elapsedMs;
  };
  await hover('int');
  const timings = { diagnostics: [], hover: [] }; const rssSamples = [{ round: 0, rssMiB: initialRssMiB }];
  const started = performance.now();
  for (let round = 0; round < rounds; round += 1) {
    const type = round % 2 === 0 ? 'string' : 'int';
    version += 1; after = server.messages.length; const changedAt = performance.now();
    server.send({ method: 'textDocument/didChange', params: {
      textDocument: { uri: serviceUri, version }, contentChanges: [{ text: source(type) }],
    } });
    await server.waitFor((message) => mismatch(message, type === 'string'), after);
    timings.diagnostics.push(performance.now() - changedAt);
    timings.hover.push(await hover(type));
    if ((round + 1) % 25 === 0 || round === rounds - 1) rssSamples.push({ round: round + 1, rssMiB: await rssMiB(server.child.pid) });
  }
  await server.stop(); server = undefined;
  process.stdout.write(`${JSON.stringify({ schema: 1, rounds, noiseFiles, vendorPhpFiles,
    projectPhpFiles: vendorPhpFiles + noiseFiles + 2, indexingMode: 'onDemand', cancelledHoverReturnedNull: true,
    elapsedMs: performance.now() - started, timingsMs: Object.fromEntries(Object.entries(timings)
      .map(([name, values]) => [name, summary(values)])), rssSamples }, null, 2)}\n`);
} finally {
  server?.child.kill();
  await rm(root, { recursive: true, force: true });
}
