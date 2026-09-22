import { Buffer } from 'node:buffer';
import { createHash } from 'node:crypto';
import { setTimeout, clearTimeout } from 'node:timers';
import process from 'node:process';
import { performance } from 'node:perf_hooks';
import { spawn } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
const root = resolve(process.argv[2]); const file = resolve(process.argv[3]); const name = process.argv[4]; const occurrence = process.argv[5] ?? 'first';
const cacheDirectory = process.argv[6] ? resolve(process.argv[6]) : undefined;
const once = process.argv[7] === 'once';
const serverEntrypoint = process.argv[8] ? resolve(process.argv[8]) : 'packages/language-server/dist/server.js';
const profileDirectory = process.env.PHP_COMPANION_CPU_PROF_DIR;
const sourceOnly = process.env.PHP_COMPANION_BENCHMARK_REFERENCE_SOURCE_ONLY === '1';
const indexingMode = sourceOnly || process.env.PHP_COMPANION_BENCHMARK_INDEXING_MODE === 'experimental' ? 'experimental' : 'onDemand';
const auditInputs = process.env.PHP_COMPANION_BENCHMARK_REFERENCE_INPUTS === '1';
const persistReferences = process.env.PHP_COMPANION_BENCHMARK_REFERENCE_PERSISTENCE === '1';
if ((persistReferences || auditInputs) && !process.argv[8]) {
  throw new Error('Reference persistence and input audits require an explicit bundled language server path with parser WASM files.');
}
const symfonyProfile = process.env.PHP_COMPANION_BENCHMARK_SYMFONY === '1';
const frameworkInitialization = symfonyProfile
  ? await (await import('./benchmark-symfony-profile.mjs')).symfonyBenchmarkInitialization(
    process.env.PHP_COMPANION_BENCHMARK_SYMFONY_BUNDLE_DIR ? resolve(process.env.PHP_COMPANION_BENCHMARK_SYMFONY_BUNDLE_DIR) : undefined) : {};
const frameworkSnapshotPath = process.env.PHP_COMPANION_BENCHMARK_FRAMEWORK_SNAPSHOT
  ? resolve(root, process.env.PHP_COMPANION_BENCHMARK_FRAMEWORK_SNAPSHOT) : undefined;
const frameworkSnapshot = frameworkSnapshotPath ? { frameworkDocumentSnapshots: { complete: true, documents: [{
  uri: pathToFileURL(frameworkSnapshotPath).toString(), languageId: frameworkSnapshotPath.endsWith('.xml') ? 'xml' : 'yaml',
  source: await readFile(frameworkSnapshotPath, 'utf8'), snapshotVersion: 'benchmark-disk',
}] } } : {};
const server = spawn(process.execPath, [...(profileDirectory ? ['--cpu-prof', `--cpu-prof-dir=${resolve(profileDirectory)}`] : []),
  serverEntrypoint, '--stdio', ...(process.argv[8] ? ['--parser-core-wasm', join(dirname(serverEntrypoint), 'web-tree-sitter.wasm'),
    '--php-wasm', join(dirname(serverEntrypoint), 'tree-sitter-php.wasm')] : [])], { stdio: ['pipe', 'pipe', 'pipe'] });
const pending = new Map(); let sequence = 0; let buffer = Buffer.alloc(0); let serverStderr = '';
let referenceSourceReady = false; const referenceSourceReadyWaiters = [];
let sourceIndexComplete = false; const sourceIndexCompleteWaiters = [];
let selectionPrewarmReady = false; const selectionPrewarmWaiters = [];
const send = (message) => { const body = JSON.stringify(message); server.stdin.write(`Content-Length: ${Buffer.byteLength(body)}\r\n\r\n${body}`); };
server.stderr.on('data', (data) => { serverStderr = `${serverStderr}${data}`.slice(-8_192); });
server.once('exit', (code, signal) => {
  for (const done of pending.values()) done({ error: { message: `LSP exited code=${code} signal=${signal}: ${serverStderr}` } });
  pending.clear();
});
server.stdout.on('data', (data) => {
  buffer = Buffer.concat([buffer, data]);
  while (true) {
    const header = buffer.indexOf('\r\n\r\n'); if (header < 0) return;
    const size = Number(/Content-Length: (\d+)/i.exec(buffer.subarray(0, header).toString())[1]);
    if (buffer.length < header + 4 + size) return;
    const message = JSON.parse(buffer.subarray(header + 4, header + 4 + size)); buffer = buffer.subarray(header + 4 + size);
    if (message.method && message.id !== undefined) send({ jsonrpc: '2.0', id: message.id, result: null });
    if (message.method === 'window/logMessage' && message.params?.message?.includes('Reference source facts ready in ')) {
      referenceSourceReady = true;
      for (const ready of referenceSourceReadyWaiters.splice(0)) ready();
    }
    if (message.method === 'window/logMessage' && /Indexed \d+ PHP files[^\n]*complete=false/.test(message.params?.message ?? '')) {
      sourceIndexComplete = true;
      for (const done of sourceIndexCompleteWaiters.splice(0)) done();
    }
    if (message.method === 'window/logMessage' && message.params?.message?.includes('[reference-prewarm] semantic count=')) {
      selectionPrewarmReady = true;
      for (const ready of selectionPrewarmWaiters.splice(0)) ready();
    }
    if (message.method === 'window/logMessage' && (/\[(?:index:|named-candidates|references:|reference-cache|reference-prewarm|reference-closure|reference-rg)/.test(message.params?.message ?? '')
      || indexingMode === 'experimental' && /(?:Project source index ready|Reference source facts ready|Indexed \d+ PHP files)/.test(message.params?.message ?? '')
      || symfonyProfile && /(?:provider|Symfony)/i.test(message.params?.message ?? ''))) {
      process.stderr.write(`${message.params.message}\n`);
    }
    else if (pending.has(message.id)) { pending.get(message.id)(message); pending.delete(message.id); }
  }
});
const request = (method, params) => new Promise((done, reject) => {
  const id = ++sequence; const timer = setTimeout(() => reject(new Error(`${method} timed out`)), 120000);
  pending.set(id, (message) => { clearTimeout(timer); if (message.error) reject(new Error(JSON.stringify(message.error))); else done(message.result); });
  send({ jsonrpc: '2.0', id, method, params });
});
try {
  const initializeStarted = performance.now();
  await request('initialize', { processId: null, rootUri: pathToFileURL(root).toString(), capabilities: {}, initializationOptions: { indexingMode, cacheDirectory, testMode: process.env.PHP_COMPANION_BENCHMARK_PRODUCTION_MODE !== '1'
    && (auditInputs || persistReferences || process.env.PHP_COMPANION_BENCHMARK_REFERENCE_CLOSURE === '1' || process.env.PHP_COMPANION_BENCHMARK_REFERENCE_RG === '1' || sourceOnly), experimentalReferenceClosure: process.env.PHP_COMPANION_BENCHMARK_REFERENCE_CLOSURE === '1', experimentalReferenceSourceOnly: sourceOnly,
    ...(process.env.PHP_COMPANION_BENCHMARK_REFERENCE_RG === '1' || process.env.PHP_COMPANION_BENCHMARK_REFERENCE_RG === '0'
      ? { experimentalRipgrepCandidates: process.env.PHP_COMPANION_BENCHMARK_REFERENCE_RG === '1' } : {}), ...frameworkInitialization, ...frameworkSnapshot } });
  process.stderr.write(`[benchmark-init] elapsedMs=${Math.round(performance.now() - initializeStarted)}\n`);
  send({ jsonrpc: '2.0', method: 'initialized', params: {} });
  const initialIdleMs = Number(process.env.PHP_COMPANION_BENCHMARK_INITIAL_IDLE_MS ?? 0);
  if (Number.isSafeInteger(initialIdleMs) && initialIdleMs > 0 && initialIdleMs <= 30_000) await new Promise((done) => setTimeout(done, initialIdleMs));
  if (process.env.PHP_COMPANION_BENCHMARK_WAIT_REFERENCE_READY === '1') {
    const readyStarted = performance.now();
    await new Promise((done, reject) => {
      if (referenceSourceReady) { done(); return; }
      const timer = setTimeout(() => reject(new Error('Reference source facts did not become ready within 60 seconds')), 60_000);
      referenceSourceReadyWaiters.push(() => { clearTimeout(timer); done(); });
    });
    process.stderr.write(`[benchmark-reference-ready] elapsedMs=${Math.round(performance.now() - readyStarted)}\n`);
  }
  const source = await readFile(file, 'utf8'); const uri = pathToFileURL(file).toString();
  const match = occurrence === 'last' ? source.lastIndexOf(name) : source.indexOf(name); const offset = match + 1;
  if (offset < 1) throw new Error('Symbol missing');
  const lines = source.slice(0, offset).split('\n'); const position = { line: lines.length - 1, character: lines.at(-1).length };
  send({ jsonrpc: '2.0', method: 'textDocument/didOpen', params: { textDocument: { uri, languageId: 'php', version: 1, text: source } } });
  const openedAt = performance.now();
  if (process.env.PHP_COMPANION_BENCHMARK_SELECTION_PREWARM === '1') {
    const selectionDelayMs = Number(process.env.PHP_COMPANION_BENCHMARK_SELECTION_DELAY_MS ?? 0);
    if (!Number.isSafeInteger(selectionDelayMs) || selectionDelayMs < 0 || selectionDelayMs > 5_000) throw new Error('Invalid selection notification delay');
    setTimeout(() => send({ jsonrpc: '2.0', method: 'phpCompanion/prewarmReferenceAt', params: { uri, version: 1, position } }), selectionDelayMs);
  }
  const documentIdleMs = Number(process.env.PHP_COMPANION_BENCHMARK_DOCUMENT_IDLE_MS ?? 0);
  if (Number.isSafeInteger(documentIdleMs) && documentIdleMs > 0 && documentIdleMs <= 30_000) {
    await new Promise((done) => setTimeout(done, Math.max(0, documentIdleMs - (performance.now() - openedAt))));
  }
  if (process.env.PHP_COMPANION_BENCHMARK_WAIT_SELECTION_PREWARM === '1' && !selectionPrewarmReady) {
    await new Promise((done, reject) => {
      const timer = setTimeout(() => reject(new Error('Selected reference did not prewarm within 30 seconds')), 30_000);
      selectionPrewarmWaiters.push(() => { clearTimeout(timer); done(); });
    });
  }
  const methods = process.env.PHP_COMPANION_BENCHMARK_REFERENCES_FIRST === '1'
    ? ['textDocument/references', ...(!once ? ['textDocument/references'] : []), 'textDocument/definition', ...(!once ? ['textDocument/references'] : [])]
    : ['textDocument/definition', 'textDocument/references', ...(!once ? ['textDocument/references'] : [])];
  for (const method of methods) {
    const started = performance.now(); const result = await request(method, { textDocument: { uri }, position,
      context: { includeDeclaration: process.env.PHP_COMPANION_BENCHMARK_INCLUDE_DECLARATION === '1' } });
    const locationSha256 = createHash('sha256').update(JSON.stringify([...result].sort((a, b) =>
      a.uri.localeCompare(b.uri) || a.range.start.line - b.range.start.line
      || a.range.start.character - b.range.start.character))).digest('hex');
    const elapsedMs = Math.round(performance.now() - started);
    if (method === 'textDocument/references' && process.env.PHP_COMPANION_BENCHMARK_REFERENCE_LOCATIONS_PATH) {
      await writeFile(resolve(process.env.PHP_COMPANION_BENCHMARK_REFERENCE_LOCATIONS_PATH), JSON.stringify(result));
    }
    let peakRssKiB; let currentRssKiB;
    if (process.env.PHP_COMPANION_BENCHMARK_RSS === '1' && process.platform === 'linux') {
      try {
        const status = await readFile(`/proc/${server.pid}/status`, 'utf8');
        const match = /^VmHWM:\s+(\d+) kB$/m.exec(status);
        if (match) peakRssKiB = Number(match[1]);
        const current = /^VmRSS:\s+(\d+) kB$/m.exec(status);
        if (current) currentRssKiB = Number(current[1]);
      } catch { /* Optional measurement must not change query correctness checks. */ }
    }
    process.stdout.write(JSON.stringify({ method, elapsedMs, results: result.length, peakRssKiB, currentRssKiB,
      ...(process.env.PHP_COMPANION_BENCHMARK_COMPACT === '1' ? {}
        : { uris: [...new Set(result.map((location) => location.uri))].sort() }), locationSha256 }) + '\n');
    if (persistReferences && method === 'textDocument/references') await request('phpCompanion/testWaitReferencePersistence', {});
  }
  if (process.env.PHP_COMPANION_BENCHMARK_WAIT_INDEX_COMPLETE === '1' && !sourceIndexComplete) {
    await new Promise((done, reject) => {
      const timer = setTimeout(() => reject(new Error('Source index did not commit within 30 seconds after the query')), 30_000);
      sourceIndexCompleteWaiters.push(() => { clearTimeout(timer); done(); });
    });
  }
  if (auditInputs) {
    const started = performance.now(); const evidence = await request('phpCompanion/testReferenceInputs', { uri });
    process.stdout.write(JSON.stringify({ method: 'phpCompanion/testReferenceInputs', elapsedMs: Math.round(performance.now() - started), ...evidence }) + '\n');
  }
} finally {
  if (server.exitCode === null) {
    try {
      await request('shutdown', null);
      send({ jsonrpc: '2.0', method: 'exit', params: null });
      let shutdownTimer;
      try {
        await Promise.race([new Promise((done) => server.once('exit', done)),
          new Promise((done) => { shutdownTimer = setTimeout(done, 5_000); })]);
      } finally { clearTimeout(shutdownTimer); }
    } catch { /* A failed query may leave the server unable to shut down. */ }
    if (server.exitCode === null) server.kill();
  }
}
