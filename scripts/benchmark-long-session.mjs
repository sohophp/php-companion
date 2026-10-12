import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdir, mkdtemp, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { performance } from 'node:perf_hooks';
import process from 'node:process';
import { clearTimeout, setTimeout } from 'node:timers';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { encodeLspMessage, LspMessageDecoder, R1_PERFORMANCE_BUDGETS, summarizeDurations } from '../packages/testkit/dist/index.js';

const [secondsText = '7200', intervalText = '250', entry = 'dist/language-server.js', core = 'dist/web-tree-sitter.wasm', php = 'dist/tree-sitter-php.wasm'] = process.argv.slice(2);
const seconds = Number(secondsText), intervalMs = Number(intervalText);
assert.ok(Number.isSafeInteger(seconds) && seconds >= 30 && seconds <= 86400, 'Duration must be 30..86400 seconds');
assert.ok(Number.isSafeInteger(intervalMs) && intervalMs >= 0 && intervalMs <= 10000, 'Interval must be 0..10000 milliseconds');
assert.equal(process.platform, 'linux', 'This runner currently samples real Linux /proc RSS');
const evidence = resolve(process.env.SOPHP_LONG_SESSION_EVIDENCE ?? `.vscode-test/long-session-${Date.now()}`);
await mkdir(evidence, { recursive: false });
const hash = value => createHash('sha256').update(value).digest('hex');
const assets = Object.fromEntries(await Promise.all([entry, core, php].map(async path => [resolve(path), hash(await readFile(path))])));
const root = await mkdtemp(join(tmpdir(), 'sophp-long-session-'));
const cache = join(root, '.cache'), declarationPath = join(root, 'src', 'Records.php');
const declarationUri = pathToFileURL(declarationPath).toString(), consumerUri = pathToFileURL(join(root, 'src', 'Consumer.php')).toString();
const alpha = '<?php namespace LongSession; class Alpha {public function alphaOnly(): void {}} class Beta {public function betaOnly(): void {}} /** @return list<Alpha> */ function records(): array {return [];}';
const beta = alpha.replace('list<Alpha>', 'list<Beta>');
const consumer = '<?php namespace LongSession; function inspect(): void {foreach (records() as $item) {$item->; $item->betaOnly();}}';
const positionAt = offset => ({ line: 0, character: offset });
const completionPosition = positionAt(consumer.indexOf('$item->;') + '$item->'.length);
const memberPosition = positionAt(consumer.indexOf('betaOnly()') + 2);
const labels = result => (Array.isArray(result) ? result : result?.items ?? []).map(item => item.label);
const report = { status: 'preparing', parentPid: process.pid, root, seconds, intervalMs, assets, platform: process.platform,
  node: process.version, phpTarget: '8.5', indexingMode: 'onDemand', fixtureFiles: 1000, editorAcceptance: false,
  multiHourQualified: false, qualified: false, cycles: 0, checkedResults: 0, staleResults: 0, serverPids: [],
  faults: [], samples: [], windows: [], budgets: R1_PERFORMANCE_BUDGETS, clientMessageHistoryLimit: 32 };
report.runnerSha256 = hash(await readFile(fileURLToPath(import.meta.url)));
const save = () => writeFile(join(evidence, 'run.json'), JSON.stringify(report, null, 2) + '\n');
let server, started;

function startServer() {
  const child = spawn(process.execPath, [resolve(entry), '--stdio', '--parser-core-wasm', resolve(core), '--php-wasm', resolve(php)], { stdio: 'pipe' });
  report.serverPids.push(child.pid);
  const decoder = new LspMessageDecoder(), pending = new Map(), notifications = new Map();
  const recent = []; let id = 1, stderr = '', terminal = false;
  const ended = new Promise(done => {
    const finish = (code, signal, spawnError) => {
    terminal = true;
    for (const waiter of [...pending.values(), ...notifications.values()]) { clearTimeout(waiter.timer); waiter.reject(new Error(`LS ended ${code}/${signal}: ${spawnError ?? stderr}`)); }
    pending.clear(); notifications.clear(); done(spawnError ? { code, signal, spawnError } : { code, signal });
    };
    child.once('exit', (code, signal) => finish(code, signal));
    child.once('error', error => finish(null, null, error.message));
  });
  const send = message => child.stdin.write(encodeLspMessage({ jsonrpc: '2.0', ...message }));
  child.stdin.on('error', error => { stderr = (stderr + error.message).slice(-16384); });
  child.stderr.on('data', chunk => { stderr = (stderr + chunk).slice(-16384); });
  child.stdout.on('data', chunk => {
    for (const message of decoder.push(chunk)) {
      recent.push(message); if (recent.length > 32) recent.shift();
      if (message.method && message.id !== undefined) { send({ id: message.id, result: null }); continue; }
      const notificationKey = message.method === 'phpCompanion/versionedDiagnostics' ? `${message.params.uri}#${message.params.version}`
        : message.method === 'textDocument/publishDiagnostics' && message.params.diagnostics.length === 0 ? `closed:${message.params.uri}` : undefined;
      const waiter = notificationKey ? notifications.get(notificationKey) : pending.get(message.id);
      if (!waiter) continue;
      clearTimeout(waiter.timer);
      if (notificationKey) notifications.delete(notificationKey); else pending.delete(message.id);
      if (message.error) waiter.reject(new Error(JSON.stringify(message.error))); else waiter.resolve(message);
    }
  });
  const wait = (map, key) => {
    assert.ok(!terminal && !map.has(key));
    return new Promise((resolvePromise, reject) => {
      const timer = setTimeout(() => { map.delete(key); reject(new Error(`LS timeout ${key}: ${stderr}; ${JSON.stringify(recent)}`)); }, 20000);
      map.set(key, { resolve: resolvePromise, reject, timer });
    });
  };
  return { child, ended, send, get terminal() { return terminal; },
    async request(method, params) { const key = id++, promise = wait(pending, key), at = performance.now(); send({ id: key, method, params }); return { result: (await promise).result, ms: performance.now() - at }; },
    async document(method, uri, version, text) {
      const promise = wait(notifications, `${uri}#${version}`), at = performance.now();
      send({ method, params: method === 'textDocument/didOpen'
        ? { textDocument: { uri, version, text, languageId: 'php' } }
        : { textDocument: { uri, version }, contentChanges: [{ text }] } });
      await promise; return performance.now() - at;
    },
    async close(uri) { const promise = wait(notifications, `closed:${uri}`); send({ method: 'textDocument/didClose', params: { textDocument: { uri } } }); await promise; },
    async stop() { if (terminal) return; await this.request('shutdown', null); send({ method: 'exit', params: null }); assert.deepEqual(await ended, { code: 0, signal: null }); },
  };
}

async function initialize(current, declaration) {
  await current.request('initialize', { processId: process.pid, rootUri: pathToFileURL(root).toString(), capabilities: {},
    initializationOptions: { phpVersion: '8.5', indexingMode: 'onDemand', cacheDirectory: cache, versionedDiagnostics: true } });
  current.send({ method: 'initialized', params: {} });
  await current.document('textDocument/didOpen', consumerUri, 1, consumer);
  if (declaration) await current.document('textDocument/didOpen', declarationUri, declaration.version, declaration.text);
  const references = await current.request('textDocument/references', { textDocument: { uri: consumerUri },
    position: positionAt(consumer.indexOf('records()') + 2), context: { includeDeclaration: true } });
  assert.ok(references.result.some(location => location.uri === consumerUri), 'Real reference preparation did not include the caller');
  report.referencePreparations = (report.referencePreparations ?? 0) + 1;
}

async function cacheInventory(directory = cache) {
  const files = [];
  for (const item of await readdir(directory, { withFileTypes: true }).catch(error => { if (error.code === 'ENOENT') return []; throw error; })) {
    const path = join(directory, item.name);
    if (item.isDirectory()) files.push(...await cacheInventory(path));
    else if (item.isFile()) {
      try { files.push({ path, bytes: (await stat(path)).size }); }
      catch (error) { if (error.code !== 'ENOENT') throw error; report.cacheEnumerationRaces = (report.cacheEnumerationRaces ?? 0) + 1; }
    }
  }
  return files;
}

async function sample() {
  const status = await readFile(`/proc/${server.child.pid}/status`, 'utf8');
  const rssMiB = Number(/^VmRSS:\s+(\d+) kB$/m.exec(status)?.[1]) / 1024;
  const highWaterMiB = Number(/^VmHWM:\s+(\d+) kB$/m.exec(status)?.[1]) / 1024;
  assert.ok(Number.isFinite(rssMiB) && Number.isFinite(highWaterMiB));
  const files = await cacheInventory(), cacheMiB = files.reduce((total, item) => total + item.bytes, 0) / 1024 / 1024;
  assert.ok(rssMiB <= R1_PERFORMANCE_BUDGETS.peakRssMb.files1000, `RSS budget exceeded: ${rssMiB}`);
  assert.ok(highWaterMiB <= R1_PERFORMANCE_BUDGETS.peakRssMb.files1000, `Lifetime RSS high-water budget exceeded: ${highWaterMiB}`);
  assert.ok(cacheMiB <= R1_PERFORMANCE_BUDGETS.warmCacheMb.files1000, `Cache budget exceeded: ${cacheMiB}`);
  report.samples.push({ elapsedMs: performance.now() - started, cycle: report.cycles, pid: server.child.pid, rssMiB, highWaterMiB, cacheMiB, cacheFiles: files.length });
}

const windows = Object.fromEntries(['change', 'betaCompletion', 'betaHover', 'betaDefinition', 'alphaCompletion', 'alphaDefinition'].map(name => [name, []]));
const allTimings = Object.fromEntries(Object.keys(windows).map(name => [name, []]));
function verifyResult(condition, message) {
  report.checkedResults++;
  if (!condition) report.staleResults++;
  assert.ok(condition, message);
}
function flushWindow() {
  if (windows.change.length < 100) return;
  const timings = Object.fromEntries(Object.entries(windows).map(([name, values]) => [name, summarizeDurations(values)]));
  for (const [name, values] of Object.entries(timings)) assert.ok(values.p95 <= (name === 'change' ? R1_PERFORMANCE_BUDGETS.localDiagnosticsMs : R1_PERFORMANCE_BUDGETS.hotQueryMs), `${name} P95 exceeded: ${values.p95}`);
  report.windows.push({ cycle: report.cycles, timings });
  for (const values of Object.values(windows)) values.length = 0;
}

try {
  await mkdir(join(root, 'src'));
  await writeFile(join(root, 'composer.json'), JSON.stringify({ autoload: { 'psr-4': { 'LongSession\\': 'src/' }, files: ['src/Records.php'] } }));
  await writeFile(declarationPath, alpha); await writeFile(join(root, 'src', 'Consumer.php'), consumer);
  await Promise.all(Array.from({ length: 998 }, (_, i) => writeFile(join(root, 'src', `Noise${i}.php`), `<?php namespace LongSession; class Noise${i} {public function value(): int {return ${i};}}`)));
  server = startServer(); await initialize(server); started = performance.now(); report.status = 'running'; await save();
  let crashDone = false, corruptionDone = false;
  while (performance.now() - started < seconds * 1000) {
    const cycle = report.cycles + 1, version = cycle * 2;
    await server.document('textDocument/didOpen', declarationUri, version - 1, alpha);
    const changeMs = await server.document('textDocument/didChange', declarationUri, version, beta);
    if ((!crashDone && performance.now() - started >= seconds * 1000 / 3)
      || (!corruptionDone && performance.now() - started >= seconds * 2000 / 3)) {
      const at = performance.now(); let fault;
      await sample();
      if (!crashDone) {
        const pid = server.child.pid; server.child.kill('SIGKILL'); assert.deepEqual(await server.ended, { code: null, signal: 'SIGKILL' });
        crashDone = true; fault = { kind: 'forced-process-exit', previousPid: pid };
      } else {
        await server.stop();
        const files = (await cacheInventory()).filter(item => item.path.endsWith('.json') && !item.path.includes('.entries/'));
        let chosen;
        for (const item of files) { const bytes = await readFile(item.path); const json = JSON.parse(bytes); if (json.entries && Object.keys(json.entries).some(key => key.endsWith('/Consumer.php'))) { chosen = { ...item, bytes, originalSha256: hash(bytes) }; break; } }
        assert.ok(chosen, 'No real persistent source manifest was produced for the caller');
        await writeFile(join(evidence, 'cache-before-corruption.json'), chosen.bytes);
        await writeFile(chosen.path, '{broken'); corruptionDone = true;
        fault = { kind: 'cache-manifest-corruption', path: chosen.path, originalSha256: chosen.originalSha256, corruptedSha256: hash('{broken') };
      }
      server = startServer(); await initialize(server, { version, text: beta });
      const recovered = await server.request('textDocument/completion', { textDocument: { uri: consumerUri }, position: completionPosition });
      assert.ok(labels(recovered.result).includes('betaOnly') && !labels(recovered.result).includes('alphaOnly'), 'Unsaved declaration was lost across recovery');
      assert.equal(await readFile(declarationPath, 'utf8'), alpha);
      if (fault.kind === 'cache-manifest-corruption') {
        // A valid reference-result proof can bypass a damaged source manifest.
        // Exercise a different real symbol so recovery must prepare candidates.
        const noisePath = join(root, 'src', 'Noise997.php'), noiseUri = pathToFileURL(noisePath).toString();
        const noiseText = await readFile(noisePath, 'utf8');
        await server.document('textDocument/didOpen', noiseUri, 1, noiseText);
        const proof = await server.request('textDocument/references', { textDocument: { uri: noiseUri },
          position: positionAt(noiseText.indexOf('Noise997') + 2), context: { includeDeclaration: true } });
        assert.ok(proof.result.some(location => location.uri === noiseUri));
        await server.close(noiseUri);
        fault.recoveryProbe = { uri: noiseUri, method: 'textDocument/references', declarationReturned: true };
        const deadline = performance.now() + 20000;
        while (!fault.rebuiltSha256 && performance.now() < deadline) {
          const bytes = await readFile(fault.path);
          try { JSON.parse(bytes); if (hash(bytes) !== fault.corruptedSha256) fault.rebuiltSha256 = hash(bytes); }
          catch (error) { if (!(error instanceof SyntaxError)) throw error; }
          if (!fault.rebuiltSha256) await delay(50);
        }
        assert.ok(fault.rebuiltSha256, 'The damaged manifest was not rebuilt after real candidate preparation');
      }
      report.faults.push({ ...fault, replacementPid: server.child.pid, recoveryMs: performance.now() - at, unsavedBufferReopenedExactly: true, firstQueryCorrect: true, diskUnchanged: true });
    }
    const query = (method, position) => server.request(method, { textDocument: { uri: consumerUri }, position });
    const betaCompletion = await query('textDocument/completion', completionPosition);
    verifyResult(labels(betaCompletion.result).includes('betaOnly') && !labels(betaCompletion.result).includes('alphaOnly'), 'Stale Beta completion');
    const betaHover = await query('textDocument/hover', memberPosition); verifyResult(JSON.stringify(betaHover.result?.contents).includes('betaOnly'), 'Stale Beta Hover');
    const betaDefinition = await query('textDocument/definition', memberPosition);
    verifyResult(betaDefinition.result?.length === 1 && betaDefinition.result[0].uri === declarationUri
      && betaDefinition.result[0].range.start.line === 0 && betaDefinition.result[0].range.start.character === beta.indexOf('betaOnly'), 'Wrong Beta definition');
    await server.close(declarationUri);
    const alphaCompletion = await query('textDocument/completion', completionPosition);
    verifyResult(labels(alphaCompletion.result).includes('alphaOnly') && !labels(alphaCompletion.result).includes('betaOnly'), 'Stale Alpha completion after close');
    const alphaDefinition = await query('textDocument/definition', memberPosition); verifyResult(Array.isArray(alphaDefinition.result) && alphaDefinition.result.length === 0, 'Stale Beta definition after close');
    if (cycle > 10) {
      windows.change.push(changeMs); allTimings.change.push(changeMs);
      for (const [name, value] of Object.entries({ betaCompletion, betaHover, betaDefinition, alphaCompletion, alphaDefinition })) { windows[name].push(value.ms); allTimings[name].push(value.ms); }
    }
    report.cycles = cycle; flushWindow();
    if (cycle % 100 === 0 || cycle === 1) { await sample(); await save(); }
    if (intervalMs) await delay(intervalMs);
  }
  await sample(); await server.stop();
  for (const pid of report.serverPids) await assert.rejects(readFile(`/proc/${pid}/cmdline`), error => error.code === 'ENOENT');
  report.serverPidsGone = true;
  assert.ok(crashDone && corruptionDone && report.windows.length > 0 && report.cycles >= 110);
  report.allTimings = Object.fromEntries(Object.entries(allTimings).map(([name, values]) => [name, summarizeDurations(values)]));
  for (const [name, values] of Object.entries(report.allTimings)) assert.ok(values.samples >= 100
    && values.p95 <= (name === 'change' ? R1_PERFORMANCE_BUDGETS.localDiagnosticsMs : R1_PERFORMANCE_BUDGETS.hotQueryMs), `${name} final P95 exceeded: ${values.p95}`);
  for (const [path, checksum] of Object.entries(assets)) assert.equal(hash(await readFile(path)), checksum);
  report.elapsedMs = performance.now() - started; report.qualified = true;
  report.multiHourQualified = seconds >= 7200 && report.elapsedMs >= 7200000;
  report.status = 'passed';
} catch (error) {
  report.status = 'failed'; report.error = error.stack ?? String(error); report.elapsedMs = started === undefined ? 0 : performance.now() - started;
  throw error;
} finally {
  if (server && !server.terminal) { server.child.kill('SIGTERM'); await server.ended; }
  await rm(root, { recursive: true, force: true }); report.ownedFixtureRemoved = true; await save();
  process.stdout.write(JSON.stringify({ status: report.status, evidence, cycles: report.cycles, checkedResults: report.checkedResults, qualified: report.qualified, multiHourQualified: report.multiHourQualified }) + '\n');
}
