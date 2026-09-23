import { spawn } from 'node:child_process';
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { performance } from 'node:perf_hooks';
import process from 'node:process';
import { setTimeout, clearTimeout } from 'node:timers';
import { setTimeout as delay } from 'node:timers/promises';
import { pathToFileURL } from 'node:url';
import { encodeLspMessage, LspMessageDecoder } from '../packages/testkit/dist/index.js';

const noiseFiles = Number(process.argv[2] ?? 9_100);
if (!Number.isSafeInteger(noiseFiles) || noiseFiles < 0 || noiseFiles > 60_000) throw new Error('Expected 0–60,000 noise files.');
const portable = process.argv[3] === 'portable';
const withoutRipgrep = process.argv[3] === 'no-rg' || process.argv[3] === 'bundle-no-rg';
const bundled = process.argv[3] === 'bundle-no-rg';
const rounds = Number(process.argv[4] ?? 1);
if (!Number.isSafeInteger(rounds) || rounds < 1 || rounds > 100) throw new Error('Expected 1–100 rounds.');
const expectIncomplete = process.argv[5] === 'incomplete';
const checkReferences = process.argv.includes('references');
const fixture = resolve('test/extension/real-vendor');
const root = await mkdtemp(join(tmpdir(), 'sophp-implementation-boundary-'));
let server;
try {
  await cp(fixture, root, { recursive: true });
  const noise = join(root, 'src', 'Noise');
  await mkdir(noise, { recursive: true });
  for (let start = 0; start < noiseFiles; start += 100) {
    await Promise.all(Array.from({ length: Math.min(100, noiseFiles - start) }, (_, offset) => {
      const index = start + offset;
      return writeFile(join(noise, `Unrelated${index}.php`),
        `<?php namespace App\\C1\\Noise; final class Unrelated${index} { public function item${index}(): int { return ${index}; } }`);
    }));
  }
  const consumerSource = (method) => `<?php namespace App\\C1; use Psr\\Http\\Message\\ResponseInterface; function run(ResponseInterface $value): ${method === 'getStatusCode' ? 'int' : 'string'} { return $value->${method}(); }`;
  let source = consumerSource('getStatusCode');
  const file = join(root, 'src', 'Consumer.php');
  await writeFile(file, source);
  const uri = pathToFileURL(file).toString();
  const rootUri = pathToFileURL(root).toString();
  server = spawn(process.execPath, [resolve(bundled ? 'dist/language-server.js' : 'packages/language-server/dist/server.js'),
    ...(bundled ? ['--parser-core-wasm', resolve('dist/web-tree-sitter.wasm'), '--php-wasm', resolve('dist/tree-sitter-php.wasm')] : []),
    '--stdio'], {
    stdio: ['pipe', 'pipe', 'pipe'], env: withoutRipgrep ? { ...process.env, PATH: '' } : process.env,
  });
  const decoder = new LspMessageDecoder();
  const pending = new Map();
  let id = 0; let stderr = ''; const scanLogs = [];
  const send = (message) => server.stdin.write(encodeLspMessage(message));
  server.stdout.on('data', (chunk) => {
    for (const message of decoder.push(chunk)) {
      if (message.method === 'window/logMessage' && /\[reference-candidates\]|\[named-candidates\]/.test(message.params?.message ?? '')) {
        scanLogs.push(message.params.message);
      }
      if (message.id !== undefined && message.method) send({ jsonrpc: '2.0', id: message.id, result: null });
      else if (pending.has(message.id)) {
        const waiter = pending.get(message.id); pending.delete(message.id); clearTimeout(waiter.timer); waiter.resolve(message);
      }
    }
  });
  server.stderr.on('data', (chunk) => { stderr = `${stderr}${chunk}`.slice(-4096); });
  server.once('exit', (code) => {
    for (const waiter of pending.values()) { clearTimeout(waiter.timer); waiter.reject(new Error(`LSP exited ${code}: ${stderr}`)); }
    pending.clear();
  });
  const request = (method, params, timeoutMs = 120_000) => new Promise((resolveRequest, reject) => {
    const requestId = ++id;
    const timer = setTimeout(() => { pending.delete(requestId); reject(new Error(`${method} timed out: ${stderr}`)); }, timeoutMs);
    pending.set(requestId, { resolve: resolveRequest, reject, timer });
    send({ jsonrpc: '2.0', id: requestId, method, params });
  });
  const serverRssMiB = async () => {
    if (process.platform !== 'linux' || !server.pid) return undefined;
    try {
      const status = await readFile(`/proc/${server.pid}/status`, 'utf8');
      const value = /^VmRSS:\s+(\d+) kB$/m.exec(status)?.[1];
      return value ? Math.round(Number(value) / 1024) : undefined;
    } catch { return undefined; }
  };
  const initialized = await request('initialize', { processId: null, capabilities: {},
    workspaceFolders: [{ uri: rootUri, name: 'boundary' }],
    initializationOptions: { phpVersion: '7.2', indexingMode: 'onDemand',
      ...(portable ? { testMode: true, experimentalRipgrepCandidates: 'portable' } : {}),
      ...(withoutRipgrep ? { testMode: true, experimentalRipgrepCandidates: true } : {}) } }, 30_000);
  if (initialized.error) throw new Error(JSON.stringify(initialized.error));
  send({ jsonrpc: '2.0', method: 'initialized', params: {} });
  send({ jsonrpc: '2.0', method: 'textDocument/didOpen', params: {
    textDocument: { uri, languageId: 'php', version: 1, text: source },
  } });
  const definition = await request('textDocument/definition', { textDocument: { uri }, position: { line: 0, character: source.indexOf('getStatusCode()') + 2 } });
  if (portable || withoutRipgrep) await delay(1_100);
  const implementationPath = join(root, 'vendor', 'guzzlehttp', 'psr7', 'src', 'Response.php');
  const implementationUri = pathToFileURL(implementationPath).toString();
  const implementationSource = await readFile(implementationPath, 'utf8');
  const results = [];
  for (let round = 0; round < rounds; round += 1) {
    const method = round % 2 === 0 ? 'getStatusCode' : 'getReasonPhrase';
    if (round > 0) {
      source = consumerSource(method);
      send({ jsonrpc: '2.0', method: 'textDocument/didChange', params: {
        textDocument: { uri, version: round + 1 }, contentChanges: [{ text: source }],
      } });
    }
    const position = { line: 0, character: source.indexOf(`${method}()`) + 2 };
    const started = performance.now();
    const implementation = await request('textDocument/implementation', { textDocument: { uri }, position });
    const elapsedMs = Math.round(performance.now() - started);
    const expectedLine = implementationSource.slice(0, implementationSource.indexOf(`function ${method}(`)).split('\n').length - 1;
    const locations = implementation.result ?? [];
    const implementationCorrect = expectIncomplete
      ? /Implementation search incomplete/.test(implementation.error?.message ?? '') && locations.length === 0
      : !implementation.error && locations.length === 1 && locations[0].uri === implementationUri
        && locations[0].range?.start?.line === expectedLine;
    let referenceMs; let referenceCount; let referenceError; let referencesCorrect = true;
    if (checkReferences) {
      const referenceStarted = performance.now();
      const references = await request('textDocument/references', { textDocument: { uri }, position,
        context: { includeDeclaration: false } });
      referenceMs = Math.round(performance.now() - referenceStarted);
      const referenceLocations = references.result ?? [];
      referenceCount = referenceLocations.length;
      referenceError = references.error?.message;
      const consumerReferences = referenceLocations.filter((item) => item.uri === uri);
      referencesCorrect = !referenceError && consumerReferences.length === 1
        && consumerReferences[0].range?.start?.line === 0
        && consumerReferences[0].range.start.character === source.indexOf(`${method}()`);
    }
    const correct = implementationCorrect && referencesCorrect;
    const rssMiB = await serverRssMiB();
    results.push({ round: round + 1, method, elapsedMs, implementationUris: locations.map((item) => item.uri),
      line: locations[0]?.range?.start?.line, expectedLine, error: implementation.error?.message,
      ...(checkReferences ? { referenceMs, referenceCount, referenceError, referencesCorrect } : {}), rssMiB, correct });
    if (!correct) throw new Error(`Implementation round ${round + 1} returned an incorrect result: ${JSON.stringify({ result: results.at(-1), scanLogs, stderr })}`);
  }
  const timings = results.map((result) => result.elapsedMs).sort((left, right) => left - right);
  const medianMs = (timings[Math.floor((timings.length - 1) / 2)] + timings[Math.ceil((timings.length - 1) / 2)]) / 2;
  process.stdout.write(`${JSON.stringify({ noiseFiles, candidateMode: process.argv[3] ?? 'default', totalPhpFiles: noiseFiles + 1_029 + 1,
    expected: expectIncomplete ? 'incomplete' : 'implementation', checkReferences,
    rounds, minMs: timings[0], medianMs, p95Ms: timings[Math.ceil(timings.length * 0.95) - 1], maxMs: timings.at(-1),
    maxSampledRssMiB: Math.max(...results.map((result) => result.rssMiB ?? 0)) || undefined,
    definitionUris: definition.result?.map((item) => item.uri), results, scanLogs }, null, 2)}\n`);
  await request('shutdown', null, 10_000);
  send({ jsonrpc: '2.0', method: 'exit', params: null });
} finally {
  if (server?.exitCode === null) server.kill();
  await rm(root, { recursive: true, force: true });
}
