import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { Buffer } from 'node:buffer';
import console from 'node:console';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { spawn } from 'node:child_process';
import { performance } from 'node:perf_hooks';
import process from 'node:process';
import { clearTimeout, setTimeout } from 'node:timers';

const sizes = process.env.SOPHP_BENCH_GROUPS ? process.env.SOPHP_BENCH_GROUPS.split(',').map(Number) : [2, 20, 100];
const rounds = 3;
const mode = process.argv[2] ?? 'psr4';
if (!['psr4', 'classmap', 'psr0', 'classmapNamespace'].includes(mode)
  || sizes.some((size) => !Number.isSafeInteger(size) || size < 1 || size > 100))
  throw new Error('Usage: node scripts/benchmark-ondemand-type-completion.mjs [psr4|classmap|psr0|classmapNamespace]');
const prefix = mode === 'psr0' ? 'Domain_Target_Requ' : mode === 'classmapNamespace' ? 'Dom' : 'Requ';
const expected = mode === 'psr0' ? 'Domain_Target_RequestTarget'
  : mode === 'classmapNamespace' ? 'Domain\\' : 'Domain\\Target\\RequestTarget';
const label = mode === 'psr0' ? expected : mode === 'classmapNamespace' ? 'Domain\\' : 'RequestTarget';
const source = mode === 'classmapNamespace' ? `<?php namespace App; use ${prefix};` : `<?php namespace App; new ${prefix};`;

function client(process) {
  let buffer = Buffer.alloc(0);
  const messages = [];
  const waiters = [];
  process.stdout.on('data', (chunk) => {
    buffer = Buffer.concat([buffer, chunk]);
    while (true) {
      const end = buffer.indexOf('\r\n\r\n');
      if (end < 0) break;
      const match = /Content-Length: (\d+)/i.exec(buffer.subarray(0, end).toString('ascii'));
      if (!match) throw new Error('Invalid LSP header');
      const length = Number(match[1]);
      if (buffer.length < end + 4 + length) break;
      const message = JSON.parse(buffer.subarray(end + 4, end + 4 + length).toString('utf8'));
      buffer = buffer.subarray(end + 4 + length);
      messages.push(message);
      for (const waiter of [...waiters]) if (waiter.matches(message)) {
        clearTimeout(waiter.timer);
        waiters.splice(waiters.indexOf(waiter), 1);
        waiter.done(message);
      }
    }
  });
  return {
    send(message) {
      const body = Buffer.from(JSON.stringify(message));
      process.stdin.write(Buffer.concat([Buffer.from(`Content-Length: ${body.length}\r\n\r\n`), body]));
    },
    wait(matches) {
      const existing = messages.find(matches);
      if (existing) return Promise.resolve(existing);
      return new Promise((done, reject) => {
        const waiter = { matches, done, timer: setTimeout(() => reject(new Error('LSP response timed out')), 30_000) };
        waiters.push(waiter);
      });
    },
  };
}

async function fixture(groups) {
  const root = await mkdtemp(join(tmpdir(), 'sophp-c1-types-'));
  await mkdir(join(root, 'src'));
  await mkdir(join(root, 'lib'));
  await writeFile(join(root, 'composer.json'), JSON.stringify({ autoload: mode === 'psr4'
    ? { 'psr-4': { 'App\\': 'src/', 'Domain\\': 'lib/' } }
    : mode === 'psr0' ? { 'psr-4': { 'App\\': 'src/' }, 'psr-0': { 'Domain_': 'lib/' } }
      : { 'psr-4': { 'App\\': 'src/' }, classmap: ['lib/'] } }));
  if (mode === 'psr0') await mkdir(join(root, 'lib', 'Domain'));
  for (let group = 0; group < groups; group += 1) {
    const groupName = `Group${String(group).padStart(3, '0')}`;
    const directory = join(root, 'lib', ...(mode === 'psr0' ? ['Domain'] : []), groupName);
    await mkdir(directory);
    await Promise.all(Array.from({ length: 499 }, (_, index) => {
      const name = `Class${String(index).padStart(3, '0')}`;
      return writeFile(join(directory, `${name}.php`), mode === 'psr0'
        ? `<?php class Domain_${groupName}_${name} {}`
        : `<?php namespace Domain\\${groupName}; class ${name} {}`);
    }));
  }
  const targetDirectory = join(root, 'lib', ...(mode === 'psr0' ? ['Domain'] : []), 'Target');
  await mkdir(targetDirectory);
  await writeFile(join(targetDirectory, mode === 'classmap' ? 'Payload.php' : 'RequestTarget.php'),
    mode === 'psr0' ? '<?php class Domain_Target_RequestTarget {}' : '<?php namespace Domain\\Target; class RequestTarget {}');
  const uri = pathToFileURL(join(root, 'src', 'Consumer.php')).toString();
  await writeFile(join(root, 'src', 'Consumer.php'), source);
  return { root, uri, phpFiles: groups * 499 + 2 };
}

async function run({ root, uri }) {
  const serverProcess = spawn(process.execPath, [resolve('packages/language-server/dist/server.js'), '--stdio'], { stdio: 'pipe' });
  const lsp = client(serverProcess);
  try {
    lsp.send({ jsonrpc: '2.0', id: 1, method: 'initialize', params: {
      processId: null, capabilities: {}, rootUri: pathToFileURL(root).toString(),
      initializationOptions: { phpVersion: '8.5', indexingMode: 'onDemand' },
    } });
    await lsp.wait((message) => message.id === 1);
    lsp.send({ jsonrpc: '2.0', method: 'initialized', params: {} });
    lsp.send({ jsonrpc: '2.0', method: 'textDocument/didOpen', params: {
      textDocument: { uri, languageId: 'php', version: 1, text: source },
    } });
    await lsp.wait((message) => message.method === 'textDocument/publishDiagnostics' && message.params.uri === uri);
    const samples = [];
    for (const id of [2, 3]) {
      const started = performance.now();
      lsp.send({ jsonrpc: '2.0', id, method: 'textDocument/completion', params: {
        textDocument: { uri }, position: { line: 0, character: source.indexOf(prefix) + prefix.length },
      } });
      const result = (await lsp.wait((message) => message.id === id)).result;
      const items = Array.isArray(result) ? result : result?.items;
      if (!items?.some((item) => item.label === label && item.detail === expected))
        throw new Error(`Missing ${expected}: ${JSON.stringify(result)}`);
      samples.push(Math.round(performance.now() - started));
    }
    if (mode === 'classmapNamespace') {
      const narrowed = '<?php namespace App; use Domain\\Tar;';
      lsp.send({ jsonrpc: '2.0', method: 'textDocument/didChange', params: {
        textDocument: { uri, version: 2 }, contentChanges: [{ text: narrowed }],
      } });
      lsp.send({ jsonrpc: '2.0', id: 4, method: 'textDocument/completion', params: {
        textDocument: { uri }, position: { line: 0, character: narrowed.indexOf('Domain\\Tar') + 'Domain\\Tar'.length },
      } });
      const result = (await lsp.wait((message) => message.id === 4)).result;
      const items = Array.isArray(result) ? result : result?.items;
      if (!items?.some((item) => item.label === 'Target\\' && item.kind === 9))
        throw new Error(`The narrower classmap namespace was missing: ${JSON.stringify(result)}`);
    }
    return samples;
  } finally { serverProcess.kill(); }
}

for (const groups of sizes) {
  const data = await fixture(groups);
  try {
    const samples = [];
    for (let round = 0; round < rounds; round += 1) samples.push(await run(data));
    const median = (values) => [...values].sort((left, right) => left - right)[Math.floor(values.length / 2)];
    console.log(JSON.stringify({ mode, phpFiles: data.phpFiles, firstRequestMs: samples.map((sample) => sample[0]),
      repeatedRequestMs: samples.map((sample) => sample[1]), firstMedianMs: median(samples.map((sample) => sample[0])),
      repeatedMedianMs: median(samples.map((sample) => sample[1])) }));
  } finally { await rm(data.root, { recursive: true, force: true }); }
}
