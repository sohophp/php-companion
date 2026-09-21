import { spawn } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { performance } from 'node:perf_hooks';
import { pathToFileURL } from 'node:url';
import process from 'node:process';
import { clearTimeout, setTimeout } from 'node:timers';
import { encodeLspMessage, LspMessageDecoder } from '../packages/testkit/dist/index.js';

const [rootArgument, phpVersion = '8.5'] = process.argv.slice(2).filter((argument) => argument !== '--');
if (!rootArgument || !/^\d+\.\d+$/.test(phpVersion)) {
  throw new Error('Usage: audit-real-lsp-progress.mjs <Composer root> [PHP version]');
}
const root = resolve(rootArgument);
const rootUri = pathToFileURL(root).toString();
const cacheDirectory = await mkdtemp(join(tmpdir(), 'php-companion-real-lsp-'));

function startServer() {
  const child = spawn(process.execPath, [resolve('packages/language-server/dist/server.js'), '--stdio'], {
    cwd: process.cwd(), stdio: ['pipe', 'pipe', 'pipe'],
  });
  const decoder = new LspMessageDecoder(); const messages = []; const waiters = [];
  let stderr = '';
  const send = (message) => child.stdin.write(encodeLspMessage(message));
  child.stdout.on('data', (chunk) => {
    for (const message of decoder.push(chunk)) {
      messages.push(message);
      if (message.id !== undefined && ['window/workDoneProgress/create', 'client/registerCapability'].includes(message.method)) {
        send({ jsonrpc: '2.0', id: message.id, result: null });
      }
      for (const waiter of [...waiters]) {
        if (messages.length <= waiter.after || !waiter.predicate(message)) continue;
        clearTimeout(waiter.timer); waiters.splice(waiters.indexOf(waiter), 1); waiter.resolve(message);
      }
    }
  });
  child.stderr.on('data', (chunk) => { stderr = `${stderr}${chunk}`.slice(-16_384); });
  child.once('exit', (code, signal) => {
    for (const waiter of [...waiters]) {
      clearTimeout(waiter.timer);
      waiter.reject(new Error(`Language Server exited early (code=${code}, signal=${signal}): ${stderr}`));
    }
    waiters.length = 0;
  });
  const waitFor = (predicate, after = 0, timeoutMs = 300_000) => {
    const found = messages.slice(after).find(predicate);
    if (found) return Promise.resolve(found);
    return new Promise((resolveWaiter, reject) => {
      const waiter = { predicate, after, resolve: resolveWaiter, reject, timer: undefined };
      waiter.timer = setTimeout(() => {
        waiters.splice(waiters.indexOf(waiter), 1);
        reject(new Error(`Timed out waiting for Language Server message: ${stderr}`));
      }, timeoutMs);
      waiters.push(waiter);
    });
  };
  return { child, messages, send, waitFor };
}

async function run(label) {
  const server = startServer();
  try {
    server.send({ jsonrpc: '2.0', id: 1, method: 'initialize', params: {
      processId: null, rootUri, workspaceFolders: [{ uri: rootUri, name: 'real-workspace' }],
      capabilities: { window: { workDoneProgress: true } },
      initializationOptions: { phpVersion, indexingMode: 'experimental', cacheDirectory },
    } });
    const initialized = await server.waitFor((message) => message.id === 1, 0, 30_000);
    if (initialized.error || !initialized.result?.capabilities?.definitionProvider) throw new Error('Language Server initialize failed.');
    const after = server.messages.length; const started = performance.now();
    server.send({ jsonrpc: '2.0', method: 'initialized', params: {} });
    const begin = await server.waitFor((message) => message.method === '$/progress'
      && message.params?.value?.kind === 'begin' && message.params.value.title === 'Indexing PHP symbols', after);
    const token = begin.params.token;
    await server.waitFor((message) => message.method === '$/progress' && message.params?.token === token
      && message.params.value?.kind === 'end', after);
    const ended = await server.waitFor((message) => message.method === 'window/logMessage'
      && /^\[index:\d+\] end elapsedMs=/.test(message.params?.message ?? ''), after);
    const durationMs = performance.now() - started;
    const progress = server.messages.slice(after).filter((message) => message.method === '$/progress' && message.params?.token === token);
    const reports = progress.filter((message) => message.params.value?.kind === 'report');
    const cacheReport = reports.filter((message) => /\b\d+ cached\b/.test(message.params.value?.message ?? '')).at(-1);
    const projectReady = server.messages.slice(after).find((message) => message.method === 'window/logMessage'
      && message.params?.message?.includes('Project source index ready with'))?.params.message;
    const indexed = server.messages.slice(after).find((message) => message.method === 'window/logMessage'
      && /^Indexed \d+ PHP files/.test(message.params?.message ?? ''))?.params.message;
    server.send({ jsonrpc: '2.0', id: 2, method: 'shutdown', params: null });
    await server.waitFor((message) => message.id === 2);
    server.send({ jsonrpc: '2.0', method: 'exit', params: null });
    await new Promise((resolveExit) => server.child.once('exit', resolveExit));
    return { label, durationMs: Math.round(durationMs * 100) / 100,
      progress: { began: true, ended: progress.some((message) => message.params.value?.kind === 'end'),
        reports: reports.length, last: reports.at(-1)?.params.value, cache: cacheReport?.params.value },
      projectReady, indexed, endLog: ended.params.message };
  } finally {
    if (server.child.exitCode === null) server.child.kill();
  }
}

try {
  const cold = await run('cold'); const warm = await run('warm');
  const indexed = /Indexed (\d+) PHP files.*?(\d+) cached/.exec(warm.indexed ?? '');
  const passed = cold.progress.ended && warm.progress.ended && Boolean(cold.projectReady && warm.projectReady)
    && cold.progress.last?.percentage === 100 && warm.progress.last?.percentage === 100
    && Boolean(indexed && Number(indexed[1]) === Number(indexed[2]))
    && /pending=0\b/.test(cold.endLog) && /pending=0\b/.test(warm.endLog);
  process.stdout.write(`${JSON.stringify({ schema: 1, root, phpVersion, cold, warm, passed }, null, 2)}\n`);
  if (!passed) process.exitCode = 1;
} finally { await rm(cacheDirectory, { recursive: true, force: true }); }
