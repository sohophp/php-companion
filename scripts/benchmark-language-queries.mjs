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
const indexingMode = process.env.PHP_COMPANION_BENCHMARK_INDEXING_MODE === 'experimental' ? 'experimental' : 'onDemand';
const auditInputs = process.env.PHP_COMPANION_BENCHMARK_REFERENCE_INPUTS === '1';
const persistReferences = process.env.PHP_COMPANION_BENCHMARK_REFERENCE_PERSISTENCE === '1';
const symfonyProfile = process.env.PHP_COMPANION_BENCHMARK_SYMFONY === '1';
const frameworkInitialization = symfonyProfile
  ? await (await import('./benchmark-symfony-profile.mjs')).symfonyBenchmarkInitialization(
    process.env.PHP_COMPANION_BENCHMARK_SYMFONY_BUNDLE_DIR ? resolve(process.env.PHP_COMPANION_BENCHMARK_SYMFONY_BUNDLE_DIR) : undefined) : {};
const server = spawn(process.execPath, [...(profileDirectory ? ['--cpu-prof', `--cpu-prof-dir=${resolve(profileDirectory)}`] : []),
  serverEntrypoint, '--stdio', ...(process.argv[8] ? ['--parser-core-wasm', join(dirname(serverEntrypoint), 'web-tree-sitter.wasm'),
    '--php-wasm', join(dirname(serverEntrypoint), 'tree-sitter-php.wasm')] : [])], { stdio: ['pipe', 'pipe', 'pipe'] });
const pending = new Map(); let sequence = 0; let buffer = Buffer.alloc(0); let serverStderr = '';
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
    if (message.method === 'window/logMessage' && (/\[(?:named-candidates|references:|reference-cache|reference-prewarm)/.test(message.params?.message ?? '')
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
  await request('initialize', { processId: null, rootUri: pathToFileURL(root).toString(), capabilities: {}, initializationOptions: { indexingMode, cacheDirectory, testMode: auditInputs || persistReferences, ...frameworkInitialization } });
  send({ jsonrpc: '2.0', method: 'initialized', params: {} });
  const initialIdleMs = Number(process.env.PHP_COMPANION_BENCHMARK_INITIAL_IDLE_MS ?? 0);
  if (Number.isSafeInteger(initialIdleMs) && initialIdleMs > 0 && initialIdleMs <= 30_000) await new Promise((done) => setTimeout(done, initialIdleMs));
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
  const methods = process.env.PHP_COMPANION_BENCHMARK_REFERENCES_FIRST === '1'
    ? ['textDocument/references', ...(!once ? ['textDocument/references'] : []), 'textDocument/definition', ...(!once ? ['textDocument/references'] : [])]
    : ['textDocument/definition', 'textDocument/references', ...(!once ? ['textDocument/references'] : [])];
  for (const method of methods) {
    const started = performance.now(); const result = await request(method, { textDocument: { uri }, position, context: { includeDeclaration: false } });
    const locationSha256 = createHash('sha256').update(JSON.stringify([...result].sort((a, b) =>
      a.uri.localeCompare(b.uri) || a.range.start.line - b.range.start.line
      || a.range.start.character - b.range.start.character))).digest('hex');
    const elapsedMs = Math.round(performance.now() - started);
    if (method === 'textDocument/references' && process.env.PHP_COMPANION_BENCHMARK_REFERENCE_LOCATIONS_PATH) {
      await writeFile(resolve(process.env.PHP_COMPANION_BENCHMARK_REFERENCE_LOCATIONS_PATH), JSON.stringify(result));
    }
    let peakRssKiB;
    if (process.env.PHP_COMPANION_BENCHMARK_RSS === '1' && process.platform === 'linux') {
      try {
        const status = await readFile(`/proc/${server.pid}/status`, 'utf8');
        const match = /^VmHWM:\s+(\d+) kB$/m.exec(status);
        if (match) peakRssKiB = Number(match[1]);
      } catch { /* Optional measurement must not change query correctness checks. */ }
    }
    process.stdout.write(JSON.stringify({ method, elapsedMs, results: result.length, peakRssKiB,
      ...(process.env.PHP_COMPANION_BENCHMARK_COMPACT === '1' ? {}
        : { uris: [...new Set(result.map((location) => location.uri))].sort() }), locationSha256 }) + '\n');
    if (persistReferences && method === 'textDocument/references') await request('phpCompanion/testWaitReferencePersistence', {});
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
