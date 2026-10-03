import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import console from 'node:console';
import { clearTimeout, setTimeout } from 'node:timers';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { performance } from 'node:perf_hooks';
import process from 'node:process';
import { pathToFileURL } from 'node:url';
import { encodeLspMessage, LspMessageDecoder } from '../packages/testkit/dist/index.js';

const files = Number(process.argv[2] ?? 1000);
const rounds = Number(process.argv[3] ?? 10);
const mode = process.argv[4] ?? 'onDemand';
assert.ok(Number.isSafeInteger(files) && files >= 100 && files <= 8000);
assert.ok(Number.isSafeInteger(rounds) && rounds >= 5 && rounds <= 100);
assert.ok(['onDemand', 'progressive'].includes(mode));
const summarize = values => {
  const sorted = [...values].sort((a, b) => a - b);
  return { p50: sorted[Math.ceil(sorted.length * .5) - 1], p95: sorted[Math.ceil(sorted.length * .95) - 1], max: sorted.at(-1) };
};
const root = await mkdtemp(join(tmpdir(), 'sophp-paste-imports-'));
let child;
try {
  await mkdir(join(root, 'src'));
  await mkdir(join(root, 'vendor', 'acme', 'lib', 'src'), { recursive: true });
  await mkdir(join(root, 'vendor', 'composer'), { recursive: true });
  await writeFile(join(root, 'composer.json'), JSON.stringify({ autoload: { 'psr-4': { 'App\\': 'src/' } } }));
  await writeFile(join(root, 'composer.lock'), JSON.stringify({ packages: [{ name: 'acme/lib', autoload: { 'psr-4': { 'Acme\\': 'src/' } } }] }));
  await writeFile(join(root, 'vendor', 'composer', 'installed.json'), JSON.stringify({ packages: [{ name: 'acme/lib', install_path: '../acme/lib' }] }));
  for (let offset = 0; offset < files; offset += 64) await Promise.all(Array.from({ length: Math.min(64, files - offset) }, (_, index) => {
    const name = `Noise${offset + index}`;
    return writeFile(join(root, 'src', `${name}.php`), `<?php namespace App; final class ${name} { public function run(): int { return 1; } }`);
  }));
  const source = '<?php namespace App; use Acme\\Receipt as ImportedReceipt; function copied(ImportedReceipt $value) { return $value; }';
  const target = '<?php namespace Other; function pasted() { new Receipt(); }';
  const sourcePath = join(root, 'src', 'Source.php'); const targetPath = join(root, 'src', 'Target.php');
  const vendorPath = join(root, 'vendor', 'acme', 'lib', 'src', 'Receipt.php');
  await writeFile(sourcePath, source); await writeFile(targetPath, target);
  await writeFile(vendorPath, '<?php namespace Acme; class Receipt {}');
  const uri = pathToFileURL(sourcePath).toString(); const targetUri = pathToFileURL(targetPath).toString();
  const profileDirectory = process.env.SOPHP_IMPORT_CPU_PROFILE;
  if (profileDirectory) await mkdir(profileDirectory, { recursive: true });
  child = spawn(process.execPath, [...(profileDirectory ? ['--cpu-prof', `--cpu-prof-dir=${profileDirectory}`] : []),
    resolve('packages/language-server/dist/server.js'), '--stdio'], { stdio: 'pipe' });
  const stopped = new Promise(done => child.once('exit', done));
  const decoder = new LspMessageDecoder(); const waiters = new Map(); let id = 1; let stderr = '';
  const send = message => child.stdin.write(encodeLspMessage({ jsonrpc: '2.0', ...message }));
  child.stderr.on('data', chunk => { stderr = `${stderr}${chunk}`.slice(-4096); });
  child.stdout.on('data', chunk => {
    for (const message of decoder.push(chunk)) {
      if (message.method && message.id !== undefined) send({ id: message.id, result: null });
      const pending = waiters.get(message.id);
      if (pending) { clearTimeout(pending.timer); waiters.delete(message.id); pending.resolve(message); }
    }
  });
  child.on('exit', (code, signal) => {
    for (const pending of waiters.values()) { clearTimeout(pending.timer); pending.reject(new Error(`Server exited ${code}/${signal}: ${stderr}`)); }
    waiters.clear();
  });
  const request = async (method, params) => {
    const requestId = id++; const started = performance.now();
    const promise = new Promise((resolve, reject) => {
      const timer = setTimeout(() => { waiters.delete(requestId); reject(new Error(`${method} timed out: ${stderr}`)); }, 60_000);
      waiters.set(requestId, { resolve, reject, timer });
    });
    send({ id: requestId, method, params }); const reply = await promise;
    assert.ok(!reply.error, JSON.stringify(reply.error));
    return { result: reply.result, ms: performance.now() - started };
  };
  await request('initialize', { processId: null, rootUri: pathToFileURL(root).toString(), capabilities: {},
    initializationOptions: { phpVersion: '8.5', indexingMode: mode, testMode: true } });
  send({ method: 'initialized', params: {} });
  for (const [documentUri, text] of [[uri, source], [targetUri, target]]) send({ method: 'textDocument/didOpen', params: {
    textDocument: { uri: documentUri, languageId: 'php', version: 1, text },
  } });
  const copyParams = { textDocument: { uri }, ranges: [{ start: { line: 0, character: source.indexOf('ImportedReceipt $') },
    end: { line: 0, character: source.indexOf('ImportedReceipt $') + 'ImportedReceipt'.length } }] };
  const candidateParams = { textDocument: { uri: targetUri }, position: { line: 0, character: target.indexOf('Receipt') + 2 }, name: 'Receipt', context: 'paste' };
  const planParams = { textDocument: { uri: targetUri }, position: candidateParams.position, symbols: [{ fqcn: 'Acme\\Receipt', sourceAlias: 'Receipt' }] };
  const samples = { copy: [], candidates: [], plan: [], total: [] }; let cold;
  for (let round = 0; round <= rounds; round++) {
    const started = performance.now();
    const copy = await request('phpCompanion/copyTypeSymbols', copyParams);
    assert.equal(copy.result[0]?.fqcn, 'Acme\\Receipt');
    const candidates = await request('phpCompanion/importCandidates', candidateParams);
    assert.equal(candidates.result[0]?.fqcn, 'Acme\\Receipt');
    const plan = await request('phpCompanion/planTypeImports', planParams);
    assert.ok(plan.result?.edit?.changes[targetUri]?.some(edit => edit.newText.includes('use Acme\\Receipt;')));
    const timings = { copy: copy.ms, candidates: candidates.ms, plan: plan.ms, total: performance.now() - started };
    if (round === 0) cold = timings;
    else for (const [name, ms] of Object.entries(timings)) samples[name].push(ms);
  }
  // Current-state checks outside the measured steady-input samples.
  await rm(vendorPath);
  assert.deepEqual((await request('phpCompanion/copyTypeSymbols', copyParams)).result, []);
  assert.equal((await request('phpCompanion/planTypeImports', planParams)).result, null);
  assert.equal(await readFile(sourcePath, 'utf8'), source); assert.equal(await readFile(targetPath, 'utf8'), target);
  const scanTimings = (await request('phpCompanion/testQueryTimings', {})).result.importDiskRefresh;
  console.log(JSON.stringify({ mode, noiseFiles: files, totalFilesBeforeDeletion: files + 3, rounds, cold,
    hot: Object.fromEntries(Object.entries(samples).map(([name, values]) => [name, summarize(values)])),
    sourceScan: summarize(scanTimings), deletionWithoutWatcherVerified: true, planningDidNotWriteFiles: true }, null, 2));
  await request('shutdown', null); send({ method: 'exit', params: null });
  await stopped;
} finally { if (child?.exitCode === null) child.kill(); await rm(root, { recursive: true, force: true }); }
