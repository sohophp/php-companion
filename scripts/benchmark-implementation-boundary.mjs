import { spawn } from 'node:child_process';
import { cp, mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { performance } from 'node:perf_hooks';
import process from 'node:process';
import { setTimeout, clearTimeout } from 'node:timers';
import { setTimeout as delay } from 'node:timers/promises';
import { pathToFileURL } from 'node:url';
import { encodeLspMessage, LspMessageDecoder } from '../packages/testkit/dist/index.js';

const noiseFiles = Number(process.argv[2] ?? 9_100);
if (!Number.isSafeInteger(noiseFiles) || noiseFiles < 0 || noiseFiles > 20_000) throw new Error('Expected 0–20,000 noise files.');
const portable = process.argv[3] === 'portable';
const withoutRipgrep = process.argv[3] === 'no-rg';
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
  const source = '<?php namespace App\\C1; use Psr\\Http\\Message\\ResponseInterface; function run(ResponseInterface $value): int { return $value->getStatusCode(); }';
  const file = join(root, 'src', 'Consumer.php');
  await writeFile(file, source);
  const uri = pathToFileURL(file).toString();
  const rootUri = pathToFileURL(root).toString();
  server = spawn(process.execPath, [resolve('packages/language-server/dist/server.js'), '--stdio'], {
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
  const offset = source.indexOf('getStatusCode()') + 2;
  const position = { line: 0, character: offset };
  const definition = await request('textDocument/definition', { textDocument: { uri }, position });
  if (portable || withoutRipgrep) await delay(1_100);
  const started = performance.now();
  const implementation = await request('textDocument/implementation', { textDocument: { uri }, position });
  const elapsedMs = Math.round(performance.now() - started);
  process.stdout.write(`${JSON.stringify({ noiseFiles, candidateMode: process.argv[3] ?? 'default', totalPhpFiles: noiseFiles + 1_029 + 1, elapsedMs,
    definitionUris: definition.result?.map((item) => item.uri),
    implementationUris: implementation.result?.map((item) => item.uri), error: implementation.error?.message, scanLogs }, null, 2)}\n`);
  await request('shutdown', null, 10_000);
  send({ jsonrpc: '2.0', method: 'exit', params: null });
} finally {
  if (server?.exitCode === null) server.kill();
  await rm(root, { recursive: true, force: true });
}
