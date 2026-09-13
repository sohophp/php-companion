import { execFile, spawn } from 'node:child_process';
import { mkdtemp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { cpus, platform, arch, tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { performance } from 'node:perf_hooks';
import { pathToFileURL } from 'node:url';
import process from 'node:process';
import { clearTimeout, setTimeout } from 'node:timers';
import { promisify } from 'node:util';
import { encodeLspMessage, LspMessageDecoder, R1_PERFORMANCE_BUDGETS, summarizeDurations } from '../packages/testkit/dist/index.js';

const arguments_ = process.argv.slice(2).filter((argument) => argument !== '--');
const iterations = Number(arguments_[0] ?? 500);
const warmupIterations = Number(arguments_[1] ?? 50);
if (![iterations, warmupIterations].every(Number.isInteger) || iterations < 100 || warmupIterations < 0) {
  throw new Error('Usage: benchmark-editing.mjs [iterations >= 100] [warmup iterations >= 0]');
}

function positionAt(source, offset) {
  const lines = source.slice(0, offset).split('\n');
  return { line: lines.length - 1, character: lines.at(-1).length };
}

function labels(result) {
  const items = Array.isArray(result) ? result : result?.items ?? [];
  return items.map((item) => typeof item.label === 'string' ? item.label : item.label?.label).filter(Boolean);
}

const execFileAsync = promisify(execFile);

async function rssMb(pid) {
  if (process.platform === 'linux') {
    const source = await readFile(`/proc/${pid}/status`, 'utf8'); const value = /^VmRSS:\s+(\d+)\s+kB$/m.exec(source)?.[1];
    if (!value) throw new Error(`Could not read RSS for language server ${pid}.`);
    return Number(value) / 1024;
  }
  if (process.platform === 'darwin') {
    const { stdout } = await execFileAsync('ps', ['-o', 'rss=', '-p', String(pid)]); const value = Number(stdout.trim());
    if (!Number.isFinite(value)) throw new Error(`Could not read RSS for language server ${pid}.`);
    return value / 1024;
  }
  if (process.platform === 'win32') {
    const command = `(Get-Process -Id ${pid} -ErrorAction Stop).WorkingSet64`;
    const { stdout } = await execFileAsync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', command]); const value = Number(stdout.trim());
    if (!Number.isFinite(value)) throw new Error(`Could not read RSS for language server ${pid}.`);
    return value / 1024 / 1024;
  }
  throw new Error(`RSS sampling is not implemented for ${process.platform}.`);
}

function startLanguageServer() {
  const child = spawn(process.execPath, [resolve('packages/language-server/dist/server.js'), '--stdio'], {
    cwd: process.cwd(), stdio: ['pipe', 'pipe', 'pipe'],
  });
  const decoder = new LspMessageDecoder(); const messages = []; const waiters = []; let stderr = '';
  child.stdout.on('data', (chunk) => {
    for (const message of decoder.push(chunk)) {
      messages.push(message);
      for (const waiter of [...waiters]) {
        if (messages.length <= waiter.after || !waiter.predicate(message)) continue;
        clearTimeout(waiter.timer); waiters.splice(waiters.indexOf(waiter), 1); waiter.resolve(message);
      }
    }
  });
  child.stderr.on('data', (chunk) => { stderr = `${stderr}${chunk}`.slice(-16_384); });
  child.once('exit', (code, signal) => {
    for (const waiter of [...waiters]) {
      clearTimeout(waiter.timer); waiter.reject(new Error(`Language server exited before the expected response (code=${code}, signal=${signal}). ${stderr}`));
    }
    waiters.length = 0;
  });
  return {
    child, messages,
    send(message) { child.stdin.write(encodeLspMessage(message)); },
    waitFor(predicate, { after = 0, timeoutMs = 10_000 } = {}) {
      const existing = messages.slice(after).find(predicate); if (existing) return Promise.resolve(existing);
      return new Promise((resolvePromise, reject) => {
        const waiter = { after, predicate, resolve: resolvePromise, reject, timer: undefined };
        waiter.timer = setTimeout(() => {
          waiters.splice(waiters.indexOf(waiter), 1);
          reject(new Error(`Timed out waiting for language server response. ${stderr}`));
        }, timeoutMs);
        waiters.push(waiter);
      });
    },
    async stop(id) {
      if (child.exitCode !== null) return;
      this.send({ jsonrpc: '2.0', id, method: 'shutdown', params: null });
      await this.waitFor((message) => message.id === id);
      this.send({ jsonrpc: '2.0', method: 'exit', params: null });
      await new Promise((resolveExit) => child.once('exit', resolveExit));
    },
  };
}

async function initialize(server, rootUri, cacheDirectory, id) {
  server.send({ jsonrpc: '2.0', id, method: 'initialize', params: {
    processId: null, rootUri, capabilities: {}, initializationOptions: { phpVersion: '8.5', cacheDirectory },
  } });
  await server.waitFor((message) => message.id === id);
  const after = server.messages.length;
  server.send({ jsonrpc: '2.0', method: 'initialized', params: {} });
  await server.waitFor((message) => message.method === 'window/logMessage' && message.params?.message?.includes('complete=true'), { after, timeoutMs: 30_000 });
}

function sourceFor(type, sequence) {
  return `<?php\ndeclare(strict_types=1);\nnamespace Editing;\nfunction edit(${type} $item): void { $item->; } // ${String(sequence).padStart(6, '0')}\n`;
}

const root = await mkdtemp(join(tmpdir(), 'php-companion-editing-'));
const cacheDirectory = join(root, '.cache');
let server;
try {
  await mkdir(join(root, 'src'), { recursive: true });
  await writeFile(join(root, 'composer.json'), `${JSON.stringify({ autoload: { 'psr-4': { 'Editing\\': 'src/' } } }, null, 2)}\n`);
  await writeFile(join(root, 'src', 'Types.php'), `<?php\nnamespace Editing;\nclass Alpha { public function alphaOnly(): string {} }\nclass Beta { public function betaOnly(): string {} }\n`);
  const editPath = join(root, 'src', 'Editing.php'); const uri = pathToFileURL(editPath).toString(); const rootUri = pathToFileURL(root).toString();
  let source = sourceFor('Alpha', 0); await writeFile(editPath, source);
  server = startLanguageServer(); await initialize(server, rootUri, cacheDirectory, 1);
  let version = 1; server.send({ jsonrpc: '2.0', method: 'textDocument/didOpen', params: { textDocument: { uri, languageId: 'php', version, text: source } } });
  await server.waitFor((message) => message.method === 'textDocument/publishDiagnostics' && message.params?.uri === uri);
  const baselineRssMb = await rssMb(server.child.pid); const rssSamples = [baselineRssMb]; const updates = []; const completions = [];
  let requestId = 10;
  for (let index = 0; index < warmupIterations + iterations; index += 1) {
    const measured = index >= warmupIterations; const type = index % 2 === 0 ? 'Beta' : 'Alpha'; const expected = type === 'Beta' ? 'betaOnly' : 'alphaOnly'; const rejected = type === 'Beta' ? 'alphaOnly' : 'betaOnly';
    source = sourceFor(type, index + 1); version += 1;
    const diagnosticsAfter = server.messages.length; const updateStarted = performance.now();
    server.send({ jsonrpc: '2.0', method: 'textDocument/didChange', params: { textDocument: { uri, version }, contentChanges: [{ text: source }] } });
    await server.waitFor((message) => message.method === 'textDocument/publishDiagnostics' && message.params?.uri === uri, { after: diagnosticsAfter });
    const updateDuration = performance.now() - updateStarted;
    const id = requestId++; const completionStarted = performance.now();
    server.send({ jsonrpc: '2.0', id, method: 'textDocument/completion', params: { textDocument: { uri }, position: positionAt(source, source.indexOf('$item->') + '$item->'.length) } });
    const response = await server.waitFor((message) => message.id === id); const completionDuration = performance.now() - completionStarted; const actual = labels(response.result);
    if (!actual.includes(expected) || actual.includes(rejected)) throw new Error(`Iteration ${index + 1} returned stale completion: ${JSON.stringify(actual)}.`);
    if (measured) { updates.push(updateDuration); completions.push(completionDuration); }
    if (index % 10 === 0) rssSamples.push(await rssMb(server.child.pid));
  }
  const cancellationId = requestId++; const cancellationStarted = performance.now();
  server.send({ jsonrpc: '2.0', id: cancellationId, method: 'workspace/symbol', params: { query: '' } });
  server.send({ jsonrpc: '2.0', method: '$/cancelRequest', params: { id: cancellationId } });
  const cancellation = await server.waitFor((message) => message.id === cancellationId);
  const cancellationMs = performance.now() - cancellationStarted;
  if (!Array.isArray(cancellation.result)) throw new Error(`Cancelled workspace symbol request returned an invalid response: ${JSON.stringify(cancellation)}.`);
  const cancellationOutcome = cancellation.result.length === 0 ? 'cancelled' : 'completed-before-cancellation';
  const finalRssMb = await rssMb(server.child.pid); rssSamples.push(finalRssMb); await server.stop(requestId++); server = undefined;

  const cacheFiles = (await readdir(cacheDirectory)).filter((name) => name.endsWith('.json'));
  if (cacheFiles.length === 0) throw new Error('Language server did not create a persistent semantic cache.');
  await writeFile(join(cacheDirectory, cacheFiles[0]), '{broken');
  const restarted = startLanguageServer(); server = restarted; await initialize(restarted, rootUri, cacheDirectory, requestId++);
  await restarted.waitFor((message) => message.method === 'window/logMessage'
    && message.params?.message?.includes('Persistent index cache was unreadable and will be rebuilt.'));
  version += 1; const reopenedAfter = restarted.messages.length;
  restarted.send({ jsonrpc: '2.0', method: 'textDocument/didOpen', params: { textDocument: { uri, languageId: 'php', version, text: source } } });
  await restarted.waitFor((message) => message.method === 'textDocument/publishDiagnostics' && message.params?.uri === uri, { after: reopenedAfter });
  const restartId = requestId++; restarted.send({ jsonrpc: '2.0', id: restartId, method: 'textDocument/completion', params: { textDocument: { uri }, position: positionAt(source, source.indexOf('$item->') + '$item->'.length) } });
  const restartLabels = labels((await restarted.waitFor((message) => message.id === restartId)).result);
  const expectedAfterRestart = source.includes('Beta $item') ? 'betaOnly' : 'alphaOnly';
  if (!restartLabels.includes(expectedAfterRestart)) throw new Error('Completion did not recover after cache rebuild and process restart.');
  await restarted.stop(requestId++); server = undefined;

  const peakRssMb = Math.max(...rssSamples); const retainedRssGrowthMb = finalRssMb - baselineRssMb;
  const report = {
    schema: 1, iterations, warmupIterations, runtime: process.version, platform: platform(), architecture: arch(), cpu: cpus()[0]?.model,
    updateToDiagnosticsMs: summarizeDurations(updates), hotCompletionMs: summarizeDurations(completions), cancellationMs, cancellationOutcome,
    languageServerRssMb: { baseline: baselineRssMb, peak: peakRssMb, final: finalRssMb, retainedGrowth: retainedRssGrowthMb },
    persistentCache: { files: cacheFiles.length, corruptCacheRecovered: true, completionRecoveredAfterRestart: true },
    staleCompletionFailures: 0,
    budgets: { hotCompletionP95Ms: R1_PERFORMANCE_BUDGETS.hotQueryMs, updateToDiagnosticsP95Ms: R1_PERFORMANCE_BUDGETS.localDiagnosticsMs,
      cancellationMs: R1_PERFORMANCE_BUDGETS.cancellationMs, retainedRssGrowthMb: 128 },
  };
  if (report.hotCompletionMs.p95 > report.budgets.hotCompletionP95Ms
    || report.updateToDiagnosticsMs.p95 > report.budgets.updateToDiagnosticsP95Ms
    || report.cancellationMs > report.budgets.cancellationMs
    || report.languageServerRssMb.retainedGrowth > report.budgets.retainedRssGrowthMb) process.exitCode = 1;
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
} finally {
  server?.child.kill(); await rm(root, { recursive: true, force: true });
}
