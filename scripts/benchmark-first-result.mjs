import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir, platform } from 'node:os';
import { join, resolve } from 'node:path';
import { performance } from 'node:perf_hooks';
import { pathToFileURL, fileURLToPath } from 'node:url';
import process from 'node:process';
import { clearTimeout, setTimeout } from 'node:timers';
import { encodeLspMessage, LspMessageDecoder, generatePhpComposerProject, summarizeDurations } from '../packages/testkit/dist/index.js';

const [fileArgument = '1000', repeatArgument = '5', version = '8.5'] = process.argv.slice(2);
const files = Number(fileArgument); const repeats = Number(repeatArgument);
if (!Number.isSafeInteger(files) || files < 2 || !Number.isSafeInteger(repeats) || repeats < 1
  || !['7.2', '8.5'].includes(version) || process.argv.length > 5) {
  throw new Error('Usage: benchmark-first-result.mjs [files >= 2] [repeats >= 1] [7.2|8.5]');
}
const serverEntry = resolve('dist/language-server.js');
const coreWasm = resolve('dist/web-tree-sitter.wasm');
const phpWasm = resolve('dist/tree-sitter-php.wasm');
const sha256 = (value) => createHash('sha256').update(value).digest('hex');
function positionAt(source, offset) {
  const lines = source.slice(0, offset).split('\n');
  return { line: lines.length - 1, character: lines.at(-1).length };
}

function startServer() {
  const started = performance.now();
  const child = spawn(process.execPath, [serverEntry, '--stdio', '--parser-core-wasm', coreWasm,
    '--php-wasm', phpWasm], { stdio: ['pipe', 'pipe', 'pipe'] });
  const decoder = new LspMessageDecoder(); const pending = new Map(); const logs = [];
  let sequence = 0; let stderr = '';
  child.stderr.on('data', (chunk) => { stderr = (stderr + chunk).slice(-8192); });
  child.stdout.on('data', (chunk) => {
    for (const message of decoder.push(chunk)) {
      if (message.method && message.id !== undefined) {
        child.stdin.write(encodeLspMessage({ jsonrpc: '2.0', id: message.id, result: null }));
      } else if (message.method === 'window/logMessage') {
        if (logs.length < 50) logs.push({ elapsedMs: performance.now() - started, message: message.params?.message });
      } else if (pending.has(message.id)) {
        const waiter = pending.get(message.id); pending.delete(message.id); clearTimeout(waiter.timer);
        waiter.resolve({ message, receivedMs: performance.now() - started });
      }
    }
  });
  const rejectPending = (error) => {
    for (const waiter of pending.values()) { clearTimeout(waiter.timer); waiter.reject(error); }
    pending.clear();
  };
  child.on('error', rejectPending);
  child.on('exit', (code, signal) => rejectPending(new Error(`Server exit ${code}/${signal}: ${stderr}`)));
  const send = (method, params) => child.stdin.write(encodeLspMessage({ jsonrpc: '2.0', method, params }));
  async function request(method, params) {
    const id = ++sequence;
    const waiting = new Promise((resolveResponse, reject) => {
      const waiter = { resolve: resolveResponse, reject, timer: undefined };
      waiter.timer = setTimeout(() => { pending.delete(id); reject(new Error(`${method} exceeded the 30s observation limit`)); }, 30_000);
      pending.set(id, waiter);
    });
    const sentMs = performance.now() - started;
    child.stdin.write(encodeLspMessage({ jsonrpc: '2.0', id, method, params }));
    const response = await waiting;
    if (response.message.error) throw new Error(`${method}: ${JSON.stringify(response.message.error)}`);
    return { sentMs, receivedMs: response.receivedMs, latencyMs: response.receivedMs - sentMs, result: response.message.result };
  }
  async function stop() {
    if (child.exitCode !== null || child.signalCode !== null) return;
    try {
      await request('shutdown', null);
      const exited = new Promise((done) => child.once('exit', done));
      send('exit', null); await exited;
    } catch {
      if (child.exitCode === null && child.signalCode === null) {
        const exited = new Promise((done) => child.once('exit', done)); child.kill(); await exited;
      }
    }
  }
  return { started, child, request, send, stop, logs };
}

const root = await mkdtemp(join(tmpdir(), 'sophp-first-result-'));
const rounds = [];
const report = { schema: 1, files, repeats, phpTarget: version, platform: platform(), runtime: process.version,
  bundleSha256: sha256(await readFile(serverEntry)),
  benchmarkSha256: sha256(await readFile(fileURLToPath(import.meta.url))),
  parserAssets: { coreSha256: sha256(await readFile(coreWasm)), phpSha256: sha256(await readFile(phpWasm)) },
  scope: 'first exact member completion from process start, followed by Hover and Definition; fresh process/cache each round; no diagnostics/index-ready wait or query prewarm',
  firstVisibleEditorResult: 'not measured', indexLimits: 'unchanged server defaults (maxFiles 10000)', rounds };
try {
  await generatePhpComposerProject(root, files);
  const name = `Fixture${String(files - 1).padStart(6, '0')}`;
  const consumerPath = join(root, 'src', 'Fixture000000.php');
  const targetPath = join(root, 'src', `${name}.php`);
  const uri = pathToFileURL(consumerPath).toString(); const targetUri = pathToFileURL(targetPath).toString();
  const source = `<?php\nnamespace Benchmark;\nfunction consume(${name} $item): void { $item->id(); $item->i; }\n`;
  await writeFile(consumerPath, source);
  const targetSource = await readFile(targetPath, 'utf8');
  const completionPosition = positionAt(source, source.lastIndexOf('$item->i') + '$item->i'.length);
  const definitionPosition = positionAt(source, source.indexOf('->id') + 3);
  const hoverPosition = positionAt(source, source.indexOf('$item->id') + 2);
  const methodStart = targetSource.indexOf('id():');
  assert.ok(methodStart >= 0);
  const expectedDefinition = { uri: targetUri, range: { start: positionAt(targetSource, methodStart), end: positionAt(targetSource, methodStart + 2) } };
  report.consumerSha256 = sha256(source); report.targetSha256 = sha256(targetSource);
  for (const mode of ['onDemand', 'progressive']) {
    for (let run = 0; run < repeats; run++) {
      const server = startServer(); const round = { mode, run: run + 1, passed: false, logs: server.logs };
      rounds.push(round);
      try {
        const initialization = await server.request('initialize', { processId: null, rootUri: pathToFileURL(root).toString(), capabilities: {},
          initializationOptions: { phpVersion: version, indexingMode: mode, cacheDirectory: join(root, '.cache', `${mode}-${run}`) } });
        round.initializeMs = initialization.receivedMs;
        server.send('initialized', {});
        server.send('textDocument/didOpen', { textDocument: { uri, languageId: 'php', version: 1, text: source } });
        const completion = await server.request('textDocument/completion', { textDocument: { uri }, position: completionPosition });
        round.completion = completion;
        const items = Array.isArray(completion.result) ? completion.result : completion.result?.items ?? [];
        assert.equal(items[0]?.label, 'id', 'First response must contain the correct member first; no retry');
        assert.equal(items[0]?.kind, 2);
        assert.equal(items[0]?.detail, `Benchmark\\${name}::id(): int`);
        assert.deepEqual(items[0]?.textEdit, { range: {
          start: positionAt(source, source.lastIndexOf('$item->i') + '$item->'.length),
          end: completionPosition }, newText: 'id()$0' });
        round.firstUsableProtocolResultMs = completion.receivedMs;
        const hover = await server.request('textDocument/hover', { textDocument: { uri }, position: hoverPosition });
        round.hover = hover;
        assert.ok(JSON.stringify(hover.result?.contents).includes(name), 'Hover must preserve the same receiver type');
        const definition = await server.request('textDocument/definition', { textDocument: { uri }, position: definitionPosition });
        round.definition = definition;
        assert.deepEqual(definition.result, [expectedDefinition]);
        assert.equal(await readFile(consumerPath, 'utf8'), source); assert.equal(await readFile(targetPath, 'utf8'), targetSource);
        round.passed = true;
      } catch (error) { round.error = String(error); process.exitCode = 1; }
      finally { await server.stop(); }
    }
  }
  assert.equal(sha256(await readFile(serverEntry)), report.bundleSha256, 'Server bundle changed during measurement');
  assert.equal(sha256(await readFile(coreWasm)), report.parserAssets.coreSha256);
  assert.equal(sha256(await readFile(phpWasm)), report.parserAssets.phpSha256);
  report.summary = Object.fromEntries(['onDemand', 'progressive'].map((mode) => {
    const selected = rounds.filter((round) => round.mode === mode);
    const passed = selected.filter((round) => round.passed);
    const available = selected.filter((round) => round.firstUsableProtocolResultMs !== undefined);
    return [mode, { attempted: selected.length, passed: passed.length, failed: selected.length - passed.length, firstExactCompletionResponses: available.length,
      firstUsableProtocolResultMs: available.length ? summarizeDurations(available.map((round) => round.firstUsableProtocolResultMs)) : null,
      completionRequestMs: available.length ? summarizeDurations(available.map((round) => round.completion.latencyMs)) : null }];
  }));
} finally { await rm(root, { recursive: true, force: true }); }
process.stdout.write(JSON.stringify(report, null, 2) + '\n');
