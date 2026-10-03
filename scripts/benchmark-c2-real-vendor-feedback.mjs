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
const scenario = parameters[2] ?? 'scalar';
const persistentCache = process.env.SOPHP_C2_PERSISTENT_CACHE === '1';
if (!Number.isSafeInteger(rounds) || rounds < 1 || rounds > 1000
  || !Number.isSafeInteger(noiseFiles) || noiseFiles < 0 || noiseFiles > 20_000
  || !['scalar', 'shape'].includes(scenario)) {
  throw new Error('Usage: benchmark-c2-real-vendor-feedback.mjs [rounds: 1..1000] [noise PHP files: 0..20000] [scalar|shape]');
}
if (persistentCache && scenario !== 'shape') throw new Error('Persistent cache recovery currently requires the shape scenario.');

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
const shapeSource = (compatible) => `<?php namespace App\\C1;
class ShapeAlpha { public function common(): void {} }
class ShapeBeta { public function common(): void {} }
/** @return array{item: ShapeAlpha}|${compatible ? 'array{item: ShapeBeta}' : 'string'} */
function chooseShape(): array { return []; }
`;
const shapeConsumer = `<?php declare(strict_types=1); namespace App\\C1;
function acceptShapeInt(int $value): void {}
function inspectShape(): void { $row = chooseShape(); $item = $row['item']; $item->common(); acceptShapeInt($item); }
`;
const root = await mkdtemp(join(tmpdir(), 'sophp-c2-real-vendor-'));
const cacheDirectory = persistentCache ? join(root, '.session-cache') : undefined;
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
  const initialSource = scenario === 'shape' ? shapeSource(true) : source('string');
  const consumerText = scenario === 'shape' ? shapeConsumer : consumer;
  await writeFile(join(root, 'src', 'Service.php'), initialSource);
  await writeFile(join(root, 'src', 'Consumer.php'), consumerText);
  server = startServer();
  await server.request('initialize', { processId: null, capabilities: {}, rootUri: pathToFileURL(root).toString(),
    initializationOptions: { phpVersion: '8.5', indexingMode: 'onDemand', versionedDiagnostics: true, cacheDirectory,
      testMode: true, testPauseNextQueries: scenario === 'shape' ? ['hover', 'completion'] : ['hover'] } });
  server.send({ method: 'initialized', params: {} });
  for (const [uri, text] of [[serviceUri, initialSource], [consumerUri, consumerText]]) {
    server.send({ method: 'textDocument/didOpen', params: { textDocument: { uri, languageId: 'php', version: 1, text } } });
  }
  const mismatch = (message, expected) => message.method === 'phpCompanion/versionedDiagnostics'
    && message.params.uri === consumerUri && message.params.version === 1
    && message.params.diagnostics.some((item) => item.code === 'php.argument.type-mismatch') === expected;
  await server.waitFor((message) => mismatch(message, true));
  const initialRssMiB = await rssMiB(server.child.pid);

  if (scenario === 'shape') {
    const hoverPosition = positionAt(shapeConsumer, shapeConsumer.lastIndexOf('$item);') + 2);
    const definitionPosition = positionAt(shapeConsumer, shapeConsumer.indexOf('common();') + 2);
    const unionText = 'App\\C1\\ShapeAlpha|App\\C1\\ShapeBeta';
    const feedback = async (compatible) => {
      const definition = await server.request('textDocument/definition', {
        textDocument: { uri: consumerUri }, position: definitionPosition,
      });
      const hover = await server.request('textDocument/hover', {
        textDocument: { uri: consumerUri }, position: hoverPosition,
      });
      const locations = Array.isArray(definition.result) ? definition.result.filter((item) => item.uri === serviceUri) : [];
      const hasUnion = hover.result?.contents?.value?.includes(unionText) === true;
      if (locations.length !== (compatible ? 2 : 0) || hasUnion !== compatible) {
        throw new Error(`Union-shape feedback disagrees with ${compatible}: ${JSON.stringify({ definition: definition.result, hover: hover.result })}`);
      }
      return { definitionMs: definition.elapsedMs, hoverMs: hover.elapsedMs };
    };
    const pausedId = 10_000; const pausedAt = server.messages.length;
    server.send({ id: pausedId, method: 'textDocument/hover', params: {
      textDocument: { uri: consumerUri }, position: hoverPosition,
    } });
    await server.waitFor((message) => message.method === 'window/logMessage'
      && message.params?.message === '[test-query-paused] method=hover', pausedAt);
    server.send({ method: '$/cancelRequest', params: { id: pausedId } });
    let version = 2; let after = server.messages.length;
    server.send({ method: 'textDocument/didChange', params: {
      textDocument: { uri: serviceUri, version }, contentChanges: [{ text: shapeSource(false) }],
    } });
    await server.waitFor((message) => mismatch(message, false), after);
    const released = await server.request('phpCompanion/testReleaseQuery', { method: 'hover' });
    if (released.result !== true) throw new Error('Paused shape Hover was not released.');
    const cancelled = await server.waitFor((message) => message.id === pausedId, pausedAt);
    if (cancelled.result !== null) throw new Error(`Cancelled shape Hover returned an old value: ${JSON.stringify(cancelled)}`);
    await feedback(false);
    const timings = { diagnostics: [], definition: [], hover: [] };
    const rssSamples = [{ round: 0, rssMiB: initialRssMiB }]; const started = performance.now();
    for (let round = 0; round < rounds; round += 1) {
      const compatible = round % 2 === 0;
      version += 1; after = server.messages.length; const changedAt = performance.now();
      server.send({ method: 'textDocument/didChange', params: {
        textDocument: { uri: serviceUri, version }, contentChanges: [{ text: shapeSource(compatible) }],
      } });
      await server.waitFor((message) => mismatch(message, compatible), after);
      timings.diagnostics.push(performance.now() - changedAt);
      const result = await feedback(compatible);
      timings.definition.push(result.definitionMs); timings.hover.push(result.hoverMs);
      if ((round + 1) % 25 === 0 || round === rounds - 1) rssSamples.push({ round: round + 1, rssMiB: await rssMiB(server.child.pid) });
    }
    if (rounds % 2 === 1) {
      version += 1; after = server.messages.length;
      server.send({ method: 'textDocument/didChange', params: {
        textDocument: { uri: serviceUri, version }, contentChanges: [{ text: shapeSource(false) }],
      } });
      await server.waitFor((message) => mismatch(message, false), after);
      await feedback(false);
    }
    after = server.messages.length;
    server.send({ method: 'textDocument/didClose', params: { textDocument: { uri: serviceUri } } });
    await server.waitFor((message) => mismatch(message, true), after);
    await feedback(true);
    await writeFile(join(root, 'src', 'Service.php'), shapeSource(false));
    after = server.messages.length;
    server.send({ method: 'workspace/didChangeWatchedFiles', params: { changes: [{ uri: serviceUri, type: 2 }] } });
    await server.waitFor((message) => mismatch(message, false), after);
    await feedback(false);
    await writeFile(join(root, 'src', 'Service.php'), shapeSource(true));
    after = server.messages.length;
    server.send({ method: 'workspace/didChangeWatchedFiles', params: { changes: [{ uri: serviceUri, type: 2 }] } });
    await server.waitFor((message) => mismatch(message, true), after);
    await feedback(true);
    after = server.messages.length;
    server.send({ method: 'textDocument/didOpen', params: {
      textDocument: { uri: serviceUri, languageId: 'php', version: 1, text: shapeSource(false) },
    } });
    await server.waitFor((message) => mismatch(message, false), after);
    await feedback(false);
    after = server.messages.length;
    server.send({ method: 'textDocument/didClose', params: { textDocument: { uri: serviceUri } } });
    server.send({ method: 'textDocument/didOpen', params: {
      textDocument: { uri: serviceUri, languageId: 'php', version: 1, text: shapeSource(true) },
    } });
    await server.waitFor((message) => mismatch(message, true), after);
    await feedback(true);
    const settledAt = server.messages.length;
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 150));
    if (server.messages.slice(settledAt).some((message) => mismatch(message, false))) {
      throw new Error('A stale union-shape diagnostic appeared after same-version reopen.');
    }
    const completionPosition = positionAt(shapeConsumer, shapeConsumer.indexOf('$item->common()') + '$item->'.length);
    const pausedCompletionId = 10_001; const pausedCompletionAt = server.messages.length;
    server.send({ id: pausedCompletionId, method: 'textDocument/completion', params: {
      textDocument: { uri: consumerUri }, position: completionPosition,
    } });
    await server.waitFor((message) => message.method === 'window/logMessage'
      && message.params?.message === '[test-query-paused] method=completion', pausedCompletionAt);
    server.send({ method: '$/cancelRequest', params: { id: pausedCompletionId } });
    await writeFile(join(root, 'src', 'Service.php'), shapeSource(true));
    after = server.messages.length;
    server.send({ method: 'textDocument/didClose', params: { textDocument: { uri: serviceUri } } });
    server.send({ method: 'textDocument/didOpen', params: {
      textDocument: { uri: serviceUri, languageId: 'php', version: 1, text: shapeSource(false) },
    } });
    server.send({ method: 'workspace/didChangeWatchedFiles', params: { changes: [{ uri: serviceUri, type: 2 }] } });
    await server.waitFor((message) => mismatch(message, false), after);
    await feedback(false);
    const completionReleased = await server.request('phpCompanion/testReleaseQuery', { method: 'completion' });
    if (completionReleased.result !== true) throw new Error('Paused shape Completion was not released.');
    const staleCompletion = await server.waitFor((message) => message.id === pausedCompletionId, pausedCompletionAt);
    if (staleCompletion.result !== null && (!Array.isArray(staleCompletion.result) || staleCompletion.result.length !== 0)) {
      throw new Error(`Cancelled shape Completion returned old candidates: ${JSON.stringify(staleCompletion.result)}`);
    }
    const completion = async (expected) => {
      const response = await server.request('textDocument/completion', {
        textDocument: { uri: consumerUri }, position: completionPosition,
      });
      const hasCommon = JSON.stringify(response.result ?? null).includes('"label":"common"');
      if (hasCommon !== expected) throw new Error(`Completion disagrees with ${expected}: ${JSON.stringify(response.result)}`);
    };
    await completion(false);
    after = server.messages.length;
    server.send({ method: 'textDocument/didChange', params: {
      textDocument: { uri: serviceUri, version: 2 }, contentChanges: [{ text: shapeSource(true) }],
    } });
    await server.waitFor((message) => mismatch(message, true), after);
    await feedback(true);
    await completion(true);
    await server.stop(); server = undefined;
    const persistentRecovery = [];
    if (persistentCache) {
      let cacheFiles = [];
      // The edited declaration stayed open during the loop, so its facts may
      // never have entered the persistent cache. Seed it from disk in a
      // separate cold process rather than calling an in-memory result a hit.
      for (const phase of ['cold', 'warm', 'corrupt']) {
        if (phase === 'corrupt') {
          // These are owned temporary cache files. Never mutate fixture/vendor
          // sources or an installed user's cache during failure injection.
          for (const name of cacheFiles) await writeFile(join(cacheDirectory, name), '{broken-cache');
        }
        server = startServer(); const restartAt = performance.now();
        await server.request('initialize', { processId: null, capabilities: { window: { workDoneProgress: true } }, rootUri: pathToFileURL(root).toString(),
          initializationOptions: { phpVersion: '8.5', indexingMode: 'progressive', versionedDiagnostics: true, cacheDirectory } });
        server.send({ method: 'initialized', params: {} });
        await server.waitFor(message => message.method === '$/progress' && message.params.value.kind === 'end', 0, 100_000);
        server.send({ method: 'textDocument/didOpen', params: { textDocument: {
          uri: consumerUri, languageId: 'php', version: 1, text: consumerText,
        } } });
        // Resolve the declaration from disk without opening it in this process.
        const declaration = await server.request('textDocument/definition', { textDocument: { uri: consumerUri },
          position: positionAt(consumerText, consumerText.indexOf('chooseShape()') + 2) });
        if (!Array.isArray(declaration.result) || declaration.result.length !== 1 || declaration.result[0].uri !== serviceUri) {
          throw new Error(`Restart did not resolve chooseShape: ${JSON.stringify(declaration.result)}`);
        }
        await server.waitFor(message => mismatch(message, true));
        const result = await feedback(true); await completion(true);
        const logMessages = server.messages.filter(message => message.method === 'window/logMessage').map(message => message.params.message);
        const hits = logMessages.flatMap(message => /\[named-candidates\].*cached=(\d+)/u.exec(message)?.[1] ?? [])
          .reduce((sum, count) => sum + Number(count), 0);
        const indexHits = logMessages.flatMap(message => /Indexed \d+ PHP files \(\d+ bytes, (\d+) cached\)/u.exec(message)?.[1] ?? [])
          .reduce((sum, count) => sum + Number(count), 0);
        if (phase === 'warm' && indexHits < 1) throw new Error('Warm restart did not reuse any persistent cache entries.');
        if (phase === 'corrupt' && !logMessages.some(message => /cache was unreadable/u.test(message))) {
          throw new Error('Corrupt cache recovery did not report the rejected cache.');
        }
        persistentRecovery.push({ phase, cacheFilesAtStart: cacheFiles.length, indexingMode: 'progressive', cachedCandidates: hits, indexHits,
          elapsedMs: performance.now() - restartAt, ...result });
        await server.stop(); server = undefined;
        if (phase === 'cold') {
          cacheFiles = (await readdir(cacheDirectory)).filter(name => name.endsWith('.json'));
          if (!cacheFiles.length) throw new Error('The cold process did not persist cache files.');
        }
      }
      if (await readFile(join(root, 'src', 'Service.php'), 'utf8') !== shapeSource(true)
        || await readFile(join(root, 'src', 'Consumer.php'), 'utf8') !== consumerText) {
        throw new Error('Persistent recovery changed fixture source bytes.');
      }
    }
    process.stdout.write(`${JSON.stringify({ schema: 1, scenario, rounds, noiseFiles, vendorPhpFiles,
      projectPhpFiles: vendorPhpFiles + noiseFiles + 2, indexingMode: 'onDemand', cancelledHoverReturnedNull: true,
      persistentCache, persistentRecovery,
      elapsedMs: performance.now() - started, timingsMs: Object.fromEntries(Object.entries(timings)
        .map(([name, values]) => [name, summary(values)])), rssSamples,
      recovery: { closeRestoredDisk: true, watcherRoundTrip: true, sameVersionReopen: true,
        cancelledCompletionAcrossReopenAndWatcher: true } }, null, 2)}\n`);
  } else {
    const hoverPosition = positionAt(consumer, consumer.lastIndexOf('$value);') + 2);
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
    const firstDefinition = await server.request('textDocument/definition', {
      textDocument: { uri: consumerUri }, position: positionAt(consumer, consumer.indexOf('text()') + 2),
    });
    if (!Array.isArray(firstDefinition.result) || firstDefinition.result.length !== 1
      || firstDefinition.result[0].uri !== serviceUri) {
      throw new Error(`First Definition did not resolve the source method: ${JSON.stringify(firstDefinition.result)}`);
    }
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
      firstDefinitionMs: firstDefinition.elapsedMs,
      elapsedMs: performance.now() - started, timingsMs: Object.fromEntries(Object.entries(timings)
        .map(([name, values]) => [name, summary(values)])), rssSamples }, null, 2)}\n`);
  }
} finally {
  server?.child.kill();
  await rm(root, { recursive: true, force: true });
}
