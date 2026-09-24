import { spawn } from 'node:child_process';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { performance } from 'node:perf_hooks';
import process from 'node:process';
import { clearTimeout, setTimeout } from 'node:timers';
import { setTimeout as delay } from 'node:timers/promises';
import { pathToFileURL } from 'node:url';
import { encodeLspMessage, LspMessageDecoder } from '../packages/testkit/dist/index.js';

const consumers = Number(process.argv[2] ?? 20);
if (!Number.isSafeInteger(consumers) || consumers < 1 || consumers > 128) throw new Error('Expected 1–128 open consumers.');
const affectedIndex = process.argv[3] === 'last' ? consumers - 1 : 0;
const root = await mkdtemp(join(tmpdir(), 'sophp-related-diagnostics-'));
let server;
try {
  const src = join(root, 'src');
  await mkdir(src);
  await writeFile(join(root, 'composer.json'), JSON.stringify({ autoload: { 'psr-4': { 'App\\': 'src/' } } }));
  const servicePath = join(src, 'Service.php');
  const source = (type) => `<?php namespace App; class Service { public function call(${type} $value): void {} }`;
  await writeFile(servicePath, source('int'));
  const files = await Promise.all(Array.from({ length: consumers }, async (_, index) => {
    const path = join(src, `Consumer${index}.php`);
    const text = index === affectedIndex
      ? "<?php declare(strict_types=1); namespace App; function run(Service $service): void { $service->call('bad'); }"
      : `<?php namespace App; class Consumer${index} { public function ok(): int { return ${index}; } }`;
    await writeFile(path, text);
    return { uri: pathToFileURL(path).toString(), text };
  }));
  const serviceUri = pathToFileURL(servicePath).toString();
  server = spawn(process.execPath, [resolve('packages/language-server/dist/server.js'), '--stdio'], { stdio: 'pipe' });
  let stderr = '';
  const decoder = new LspMessageDecoder();
  const messages = [];
  const waiters = [];
  const send = (message) => server.stdin.write(encodeLspMessage({ jsonrpc: '2.0', ...message }));
  const waitFor = (predicate, timeoutMs = 30_000) => new Promise((resolveWait, reject) => {
    const existing = messages.find(predicate);
    if (existing) return resolveWait(existing);
    const waiter = { predicate, resolve: resolveWait, reject };
    waiter.timer = setTimeout(() => {
      waiters.splice(waiters.indexOf(waiter), 1);
      reject(new Error(`Timed out waiting for LSP message; stderr=${stderr}`));
    }, timeoutMs);
    waiters.push(waiter);
  });
  server.stdout.on('data', (chunk) => {
    for (const message of decoder.push(chunk)) {
      message.receivedAt = performance.now();
      messages.push(message);
      if (message.id !== undefined && message.method) send({ id: message.id, result: null });
      for (const waiter of [...waiters]) if (waiter.predicate(message)) {
        clearTimeout(waiter.timer);
        waiters.splice(waiters.indexOf(waiter), 1);
        waiter.resolve(message);
      }
    }
  });
  server.stderr.on('data', (chunk) => { stderr = `${stderr}${chunk}`.slice(-4096); });
  send({ id: 1, method: 'initialize', params: { processId: null, capabilities: {}, rootUri: pathToFileURL(root).toString(),
    initializationOptions: { phpVersion: '8.5', indexingMode: 'experimental', versionedDiagnostics: true } } });
  await waitFor((message) => message.id === 1);
  send({ method: 'initialized', params: {} });
  await waitFor((message) => message.method === 'window/logMessage' && message.params?.message?.includes('complete=true'));
  send({ method: 'textDocument/didOpen', params: { textDocument: { uri: serviceUri, languageId: 'php', version: 1, text: source('int') } } });
  for (const file of files) send({ method: 'textDocument/didOpen', params: { textDocument: { ...file, languageId: 'php', version: 1 } } });
  await Promise.all(files.map((file) => waitFor((message) => message.method === 'phpCompanion/versionedDiagnostics'
    && message.params.uri === file.uri && message.params.version === 1)));
  await delay(150);
  const before = messages.length;
  const started = performance.now();
  send({ method: 'textDocument/didChange', params: { textDocument: { uri: serviceUri, version: 2 }, contentChanges: [{ text: source('string') }] } });
  const affected = await waitFor((message) => messages.indexOf(message) >= before && message.method === 'phpCompanion/versionedDiagnostics'
    && message.params.uri === files[affectedIndex].uri && message.params.version === 1
    && !message.params.diagnostics.some((item) => item.code === 'php.argument.type-mismatch'));
  await delay(500);
  const updates = messages.slice(before).filter((message) => message.method === 'phpCompanion/versionedDiagnostics'
    && files.some((file) => file.uri === message.params.uri));
  process.stdout.write(`${JSON.stringify({ consumers, affectedIndex, affectedMs: Math.round(affected.receivedAt - started),
    lastNotificationMs: Math.round(Math.max(...updates.map((message) => message.receivedAt)) - started), consumerNotifications: updates.length })}\n`);
  send({ id: 2, method: 'shutdown', params: null });
  await waitFor((message) => message.id === 2);
  send({ method: 'exit', params: null });
} finally {
  if (server?.exitCode === null) server.kill();
  await rm(root, { recursive: true, force: true });
}
