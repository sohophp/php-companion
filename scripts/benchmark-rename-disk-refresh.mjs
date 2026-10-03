import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import process from 'node:process';
import { performance } from 'node:perf_hooks';
import { clearTimeout, setTimeout } from 'node:timers';
import { pathToFileURL } from 'node:url';
import { encodeLspMessage, LspMessageDecoder } from '../packages/testkit/dist/index.js';

const count = Number(process.argv[2] ?? 1000);
const expectBudgetRejection = process.argv.includes('--expect-budget-rejection');
const bundle = process.argv.find(value => value.startsWith('--server='))?.slice('--server='.length);
assert.ok(Number.isSafeInteger(count) && count >= 100 && count <= 10_000);
assert.ok(!expectBudgetRejection || count === 10_000, 'Budget proof requires 10,000 initial files plus one new consumer');
const root = await mkdtemp(join(tmpdir(), 'sophp-rename-refresh-'));
let child;
try {
  await mkdir(join(root, 'src'));
  await writeFile(join(root, 'composer.json'), JSON.stringify({ autoload: { 'psr-4': { 'App\\': 'src/' } } }));
  const source = '<?php namespace App; final class Target {}';
  const uri = pathToFileURL(join(root, 'src', 'Target.php')).toString();
  await writeFile(join(root, 'src', 'Target.php'), source);
  for (let start = 0; start < count - 1; start += 64) await Promise.all(
    Array.from({ length: Math.min(64, count - 1 - start) }, (_, index) => {
      const name = `Noise${start + index}`;
      return writeFile(join(root, 'src', `${name}.php`), `<?php namespace App; final class ${name} { public function value(): int { return 1; } }`);
    }));
  const executable = resolve(bundle ?? 'packages/language-server/dist/server.js');
  const parserArgs = bundle ? ['--parser-core-wasm', join(dirname(executable), 'web-tree-sitter.wasm'),
    '--php-wasm', join(dirname(executable), 'tree-sitter-php.wasm')] : [];
  child = spawn(process.execPath, [executable, ...parserArgs, '--stdio'], { stdio: 'pipe' });
  const decoder = new LspMessageDecoder(); const waiters = new Map(); const messages = [];
  let nextId = 1; let stderr = '';
  const send = message => child.stdin.write(encodeLspMessage({ jsonrpc: '2.0', ...message }));
  child.stderr.on('data', chunk => { stderr = (stderr + chunk).slice(-4096); });
  child.stdout.on('data', chunk => {
    for (const message of decoder.push(chunk)) {
      messages.push(message);
      if (message.method && message.id !== undefined) send({ id: message.id, result: null });
      const waiter = waiters.get(message.id);
      if (waiter) { clearTimeout(waiter.timer); waiters.delete(message.id); waiter.done(message); }
    }
  });
  const pending = (method, params) => {
    const id = nextId++; const started = performance.now();
    const response = new Promise((done, reject) => {
      const timer = setTimeout(() => { waiters.delete(id); reject(new Error(`${method} timed out: ${stderr}`)); }, 60_000);
      waiters.set(id, { done, reject, timer });
    });
    send({ id, method, params });
    return { id, response: response.then(reply => ({ reply, elapsedMs: performance.now() - started })) };
  };
  const request = async (method, params) => {
    const result = await pending(method, params).response;
    assert.ok(!result.reply.error, JSON.stringify(result.reply.error)); return result;
  };
  child.once('exit', (code, signal) => {
    for (const waiter of waiters.values()) {
      clearTimeout(waiter.timer); waiter.reject(new Error(`Server exited ${code}/${signal}: ${stderr}`));
    }
    waiters.clear();
  });
  await request('initialize', { processId: null, rootUri: pathToFileURL(root).toString(), capabilities: {},
    initializationOptions: { phpVersion: '8.5', indexingMode: 'experimental', testMode: true } });
  send({ method: 'initialized', params: {} });
  const readyStarted = performance.now();
  while (!messages.some(message => message.method === 'window/logMessage' && message.params?.message?.includes('complete=true'))) {
    assert.ok(performance.now() - readyStarted < 120_000, 'Initial project index timed out');
    await new Promise(done => setTimeout(done, 25));
  }
  const initialIndexMs = performance.now() - readyStarted;
  send({ method: 'textDocument/didOpen', params: { textDocument: { uri, languageId: 'php', version: 1, text: source } } });
  const params = { textDocument: { uri }, position: { line: 0, character: source.indexOf('Target') + 2 }, newName: 'RenamedTarget' };
  const elapsed = [];
  const consumerPath = join(root, 'src', 'FreshConsumer.php'); const consumerUri = pathToFileURL(consumerPath).toString();
  const editsFor = plan => plan?.changes?.[consumerUri] ?? plan?.documentChanges?.find(change => change.textDocument?.uri === consumerUri)?.edits;
  let proof;
  if (expectBudgetRejection) {
    await writeFile(consumerPath, '<?php namespace App; class FreshConsumer { public function run(Target $value): void {} }');
    const result = await request('textDocument/rename', params);
    assert.equal(result.reply.result, null, 'Over-budget scan must refuse the cross-file edit');
    proof = { platform: process.platform, node: process.version, initialFiles: count, filesWithConsumer: count + 1,
      elapsedMs: result.elapsedMs, budgetRejection: true };
  } else {
  for (let index = 0; index < 5; index++) {
    await writeFile(consumerPath, `<?php namespace App; class FreshConsumer { public function run(Target $value): void {} } // round ${index}`);
    const result = await request('textDocument/rename', params); elapsed.push(result.elapsedMs);
    assert.equal(editsFor(result.reply.result)?.length, 1);
    assert.equal(editsFor(result.reply.result)[0].newText, 'RenamedTarget');
    assert.equal(await readFile(consumerPath, 'utf8'), `<?php namespace App; class FreshConsumer { public function run(Target $value): void {} } // round ${index}`);
  }
  const cancelled = pending('textDocument/rename', params);
  send({ method: '$/cancelRequest', params: { id: cancelled.id } });
  const cancelledResult = await cancelled.response;
  assert.ok(cancelledResult.reply.result == null || cancelledResult.reply.error?.code === -32800, 'Cancelled rename returned an edit plan');
  const fresh = await request('textDocument/rename', params); assert.equal(editsFor(fresh.reply.result)?.length, 1);
  await rm(consumerPath);
  const deleted = await request('textDocument/rename', params); assert.equal(editsFor(deleted.reply.result), undefined);
  proof = { platform: process.platform, node: process.version, initialFiles: count, filesWithConsumer: count + 1, renameMs: elapsed,
    cancellationMs: cancelledResult.elapsedMs, freshAfterCancelMs: fresh.elapsedMs, deletionMs: deleted.elapsedMs,
    initialIndexMs, correctness: 'passed' };
  }
  proof.timings = (await request('phpCompanion/testQueryTimings', {})).reply.result;
  await request('shutdown', null);
  const exited = new Promise(done => child.once('exit', (code, signal) => done({ code, signal })));
  send({ method: 'exit', params: null }); assert.deepEqual(await exited, { code: 0, signal: null });
  process.stdout.write(`${JSON.stringify(proof, null, 2)}\n`);
} finally {
  if (child && child.exitCode === null) child.kill();
  await rm(root, { recursive: true, force: true });
}
