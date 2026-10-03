import { spawn } from 'node:child_process';
import console from 'node:console';
import { once } from 'node:events';
import { mkdir, mkdtemp, readFile, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { isAbsolute, join, relative, resolve } from 'node:path';
import { performance } from 'node:perf_hooks';
import process from 'node:process';
import { clearTimeout, setTimeout } from 'node:timers';
import { pathToFileURL } from 'node:url';
import { encodeLspMessage, LspMessageDecoder } from '../packages/testkit/dist/index.js';

const [rootArgument, fileArgument, fragmentA, expectedA, fragmentB, expectedB, roundsArgument = '100'] = process.argv.slice(2);
const rounds = Number(roundsArgument);
const cursorMarker = '{{cursor}}';
const expectFirst = process.env.SOPHP_BENCHMARK_EXPECT_FIRST === '1';
const expectEmptyForDash = process.env.SOPHP_BENCHMARK_EXPECT_EMPTY === '1';
const sharedCandidates = process.env.SOPHP_BENCHMARK_SHARED_CANDIDATES === '1';
const expectedDetails = { a: process.env.SOPHP_BENCHMARK_DETAIL_A, b: process.env.SOPHP_BENCHMARK_DETAIL_B };
const measureRss = process.env.SOPHP_BENCHMARK_RSS === '1';
const profileGc = process.env.SOPHP_BENCHMARK_GC === '1';
const cpuProfileDirectory = process.env.SOPHP_BENCHMARK_CPU_PROFILE_DIR;
const serverEntry = process.env.SOPHP_BENCHMARK_SERVER_ENTRY
  ? resolve(process.env.SOPHP_BENCHMARK_SERVER_ENTRY) : resolve('packages/language-server/dist/server.js');
const parserCoreWasm = process.env.SOPHP_BENCHMARK_PARSER_CORE_WASM;
const phpWasm = process.env.SOPHP_BENCHMARK_PHP_WASM;
if (Boolean(parserCoreWasm) !== Boolean(phpWasm)) throw new Error('Both parser WASM paths are required when overriding parser assets.');
if (cpuProfileDirectory && !isAbsolute(cpuProfileDirectory)) throw new Error('SOPHP_BENCHMARK_CPU_PROFILE_DIR must be absolute.');
if (sharedCandidates && !expectFirst) throw new Error('Shared candidate ranking requires SOPHP_BENCHMARK_EXPECT_FIRST=1.');
if (measureRss && process.platform !== 'linux') throw new Error('SOPHP_BENCHMARK_RSS currently requires Linux /proc.');
if (Boolean(expectedDetails.a) !== Boolean(expectedDetails.b)) throw new Error('Provide both SOPHP_BENCHMARK_DETAIL_A and SOPHP_BENCHMARK_DETAIL_B.');
if (!rootArgument || !fileArgument || !fragmentA || !expectedA || !fragmentB || !expectedB
  || !Number.isSafeInteger(rounds) || rounds < 100 || rounds > 1_000
  || [fragmentA, fragmentB].some((fragment) => fragment.includes('\n')
    || fragment.split(cursorMarker).length > 2)) {
  throw new Error('Usage: node scripts/benchmark-project-completion.mjs <composer-root> <php-file> <fragment-a> <label-a> <fragment-b> <label-b-or-> [rounds: 100..1000]; optional {{cursor}} marks a position inside a fragment');
}

const root = resolve(rootArgument);
const file = resolve(fileArgument);
const withinRoot = relative(root, file);
if (!withinRoot || withinRoot === '..' || withinRoot.startsWith(`..${process.platform === 'win32' ? '\\' : '/'}`)
  || isAbsolute(withinRoot)) throw new Error('The PHP file must be inside the Composer root.');
if (!(await stat(file)).isFile()) throw new Error('The PHP input must be a regular file.');
if (!(await stat(join(root, 'composer.json'))).isFile()) throw new Error('The root needs a composer.json file.');
const original = await readFile(file, 'utf8');
if (!original.includes('<?php') || original.trimEnd().endsWith('?>')) {
  throw new Error('Choose a PHP file whose end remains in PHP code.');
}
const prefix = original.endsWith('\n') ? original : `${original}\n`;
const uri = pathToFileURL(file).toString();
const cacheDirectory = await mkdtemp(join(tmpdir(), 'sophp-project-completion-'));
if (cpuProfileDirectory) await mkdir(cpuProfileDirectory, { recursive: true });
const child = spawn(process.execPath, [...(profileGc ? ['--expose-gc'] : []),
  ...(cpuProfileDirectory ? ['--cpu-prof', `--cpu-prof-dir=${cpuProfileDirectory}`] : []),
  serverEntry, '--stdio', ...(parserCoreWasm
    ? ['--parser-core-wasm', resolve(parserCoreWasm), '--php-wasm', resolve(phpWasm)] : [])], {
  stdio: ['pipe', 'pipe', 'pipe'],
});
const decoder = new LspMessageDecoder();
const pending = new Map();
let stderr = '';
child.stderr.on('data', (chunk) => { stderr = `${stderr}${chunk}`.slice(-4_096); });
child.stdout.on('data', (chunk) => {
  for (const message of decoder.push(chunk)) {
    if (message.id === undefined) continue;
    const waiter = pending.get(message.id);
    if (waiter) { pending.delete(message.id); clearTimeout(waiter.timer); waiter.resolve(message); }
  }
});
child.once('exit', (code) => {
  for (const waiter of pending.values()) {
    clearTimeout(waiter.timer);
    waiter.reject(new Error(`Language server exited with ${code}. ${stderr}`));
  }
  pending.clear();
});

function send(message) { child.stdin.write(encodeLspMessage({ jsonrpc: '2.0', ...message })); }
function waitFor(id) {
  return new Promise((resolvePromise, reject) => {
    const timer = setTimeout(() => {
      pending.delete(id);
      reject(new Error(`Completion request ${id} timed out. ${stderr}`));
    }, 20_000);
    pending.set(id, { resolve: resolvePromise, reject, timer });
  });
}
function sourceAndPosition(fragment) {
  const markerAt = fragment.indexOf(cursorMarker);
  const text = markerAt < 0 ? fragment : fragment.slice(0, markerAt) + fragment.slice(markerAt + cursorMarker.length);
  const source = `${prefix}${text}`;
  return { source, position: { line: source.split('\n').length - 1,
    character: markerAt < 0 ? text.length : markerAt } };
}
function summarize(values) {
  const sorted = [...values].sort((left, right) => left - right);
  return { p50Ms: Number(sorted[Math.ceil(sorted.length * 0.5) - 1].toFixed(2)),
    p95Ms: Number(sorted[Math.ceil(sorted.length * 0.95) - 1].toFixed(2)),
    maxMs: Number(sorted.at(-1).toFixed(2)) };
}

const rssSamples = [];
async function sampleRss(round) {
  if (!measureRss && !profileGc) return;
  const sample = { round };
  if (profileGc) {
    const id = 200_000 + round;
    const response = waitFor(id);
    send({ id, method: 'phpCompanion/testMemoryUsage', params: { collect: true } });
    const message = await response;
    if (message.error || !message.result) throw new Error('Test memory measurement is unavailable.');
    for (const name of ['rss', 'heapUsed', 'external', 'arrayBuffers']) {
      sample[`${name}MiB`] = Number((message.result[name] / 1024 / 1024).toFixed(2));
    }
  } else {
    const status = await readFile(`/proc/${child.pid}/status`, 'utf8');
    const match = /^VmRSS:\s+(\d+)\s+kB$/m.exec(status);
    if (!match) throw new Error('Language server RSS is unavailable.');
    sample.rssMiB = Number((Number(match[1]) / 1024).toFixed(2));
  }
  rssSamples.push(sample);
}

try {
  const initialized = waitFor(1);
  send({ id: 1, method: 'initialize', params: { processId: null, capabilities: {},
    rootUri: pathToFileURL(root).toString(), initializationOptions: {
      phpVersion: process.env.SOPHP_BENCHMARK_PHP_VERSION ?? '8.5', indexingMode: 'onDemand', cacheDirectory, testMode: profileGc,
    } } });
  const initialization = await initialized;
  if (initialization.error) throw new Error(JSON.stringify(initialization.error));
  send({ method: 'initialized', params: {} });
  send({ method: 'textDocument/didOpen', params: { textDocument: {
    uri, languageId: 'php', version: 1, text: sourceAndPosition(fragmentA).source,
  } } });
  const samples = { a: [], b: [] };
  const incomplete = { a: 0, b: 0 };
  for (let index = 0; index < rounds; index += 1) {
    const side = index % 2 === 0 ? 'a' : 'b';
    const fragment = side === 'a' ? fragmentA : fragmentB;
    const expected = side === 'a' ? expectedA : expectedB;
    const stale = side === 'a' ? expectedB : expectedA;
    const { source, position } = sourceAndPosition(fragment);
    send({ method: 'textDocument/didChange', params: {
      textDocument: { uri, version: index + 2 }, contentChanges: [{ text: source }],
    } });
    const id = index + 2;
    const response = waitFor(id);
    const started = performance.now();
    send({ id, method: 'textDocument/completion', params: { textDocument: { uri }, position } });
    const message = await response;
    if (message.error) throw new Error(JSON.stringify(message.error));
    const result = message.result;
    const items = Array.isArray(result) ? result : result?.items ?? [];
    const labels = items.map((item) => typeof item.label === 'string' ? item.label : item.label?.label);
    if (expected !== '-' && !labels.includes(expected)) {
      throw new Error(`Round ${index + 1} missed ${expected}; incomplete=${result?.isIncomplete === true}; labels=${JSON.stringify(labels.slice(0, 40))}`);
    }
    if (expectFirst && expected !== '-' && labels[0] !== expected) {
      throw new Error(`Round ${index + 1} ranked ${expected} below another candidate: ${JSON.stringify(labels.slice(0, 10))}`);
    }
    if (expectEmptyForDash && expected === '-' && labels.length) {
      throw new Error(`Round ${index + 1} returned unrelated candidates: ${JSON.stringify(labels.slice(0, 10))}`);
    }
    if (sharedCandidates && stale !== '-' && !labels.includes(stale)) throw new Error(`Round ${index + 1} dropped shared candidate ${stale}.`);
    if (!sharedCandidates && stale !== '-' && labels.includes(stale)) throw new Error(`Round ${index + 1} returned stale ${stale}.`);
    if (expectedDetails[side]) {
      const selected = items.find((item) => item.label === expected);
      if (!selected) throw new Error(`Round ${index + 1} cannot resolve missing ${expected}.`);
      const resolveId = 100_000 + index;
      const resolvedResponse = waitFor(resolveId);
      send({ id: resolveId, method: 'completionItem/resolve', params: selected });
      const resolved = await resolvedResponse;
      if (resolved.error || resolved.result?.detail !== expectedDetails[side]) {
        throw new Error(`Round ${index + 1} returned unexpected variable detail: ${JSON.stringify(resolved)}`);
      }
    }
    samples[side].push(performance.now() - started);
    if (!Array.isArray(result) && result?.isIncomplete) incomplete[side] += 1;
    if (index === 0 || (index + 1) % 50 === 0 || index + 1 === rounds) await sampleRss(index + 1);
  }
  if (await readFile(file, 'utf8') !== original) throw new Error('The project file changed on disk during the read-only benchmark.');
  console.log(JSON.stringify({ root, file, serverEntry, rounds, expectFirst, expectEmptyForDash, sharedCandidates, resolveDetails: Boolean(expectedDetails.a), firstMs: Number(samples.a[0].toFixed(2)),
    all: summarize([...samples.a, ...samples.b]), a: { fragment: fragmentA, expected: expectedA,
      ...summarize(samples.a), incomplete: incomplete.a }, b: { fragment: fragmentB, expected: expectedB,
      ...summarize(samples.b), incomplete: incomplete.b },
    ...(measureRss || profileGc ? { memory: { collectedGc: profileGc, metric: profileGc ? 'Node memory after explicit GC' : 'process RSS; not retained heap', samples: rssSamples } } : {}), readOnly: true, diskUnchanged: true }));
} finally {
  if (cpuProfileDirectory && child.exitCode === null) {
    // Node flushes CPU profiles on normal exit, not a SIGTERM termination.
    try {
      const shutdown = waitFor(999_999);
      send({ id: 999_999, method: 'shutdown', params: null });
      await shutdown;
      const exited = once(child, 'exit');
      const deadline = setTimeout(() => child.kill(), 5_000);
      try { send({ method: 'exit' }); await exited; } finally { clearTimeout(deadline); }
    } catch { /* The ordinary cleanup below also covers failed profiling runs. */ }
  }
  if (child.exitCode === null) { const exited = once(child, 'exit'); child.kill(); await exited; }
  await rm(cacheDirectory, { recursive: true, force: true });
}
