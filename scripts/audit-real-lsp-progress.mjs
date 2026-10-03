import { spawn } from 'node:child_process';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { isAbsolute, join, relative, resolve } from 'node:path';
import { performance } from 'node:perf_hooks';
import { pathToFileURL } from 'node:url';
import process from 'node:process';
import { clearTimeout, setTimeout } from 'node:timers';
import { encodeLspMessage, LspMessageDecoder } from '../packages/testkit/dist/index.js';

const [rootArgument, phpVersion = '8.5', indexingMode = 'experimental'] = process.argv.slice(2).filter((argument) => argument !== '--');
if (!rootArgument || !/^\d+\.\d+$/.test(phpVersion) || !['experimental', 'progressive'].includes(indexingMode)) {
  throw new Error('Usage: audit-real-lsp-progress.mjs <Composer root> [PHP version] [experimental|progressive]');
}
const root = resolve(rootArgument);
const rootUri = pathToFileURL(root).toString();
const cacheDirectory = await mkdtemp(join(tmpdir(), 'php-companion-real-lsp-'));
const idleMs = Number(process.env.PHP_COMPANION_AUDIT_IDLE_MS ?? '0');
if (!Number.isSafeInteger(idleMs) || idleMs < 0 || idleMs > 30_000) {
  throw new Error('PHP_COMPANION_AUDIT_IDLE_MS must be an integer from 0 to 30000.');
}
const firstQuery = process.env.PHP_COMPANION_AUDIT_FIRST_QUERY
  ? JSON.parse(process.env.PHP_COMPANION_AUDIT_FIRST_QUERY) : undefined;
if (firstQuery) {
  const { method, file, line, character, target } = firstQuery;
  const withinRoot = (path) => typeof path === 'string' && !isAbsolute(path)
    && relative(root, resolve(root, path)) !== '..' && !relative(root, resolve(root, path)).startsWith(`..${process.platform === 'win32' ? '\\' : '/'}`);
  if (!['definition', 'references'].includes(method) || !withinRoot(file) || target !== undefined && !withinRoot(target)
    || !Number.isSafeInteger(line) || line < 0 || !Number.isSafeInteger(character) || character < 0) {
    throw new Error('PHP_COMPANION_AUDIT_FIRST_QUERY must contain definition/references method, root-relative file, zero-based line/character, and optional root-relative target.');
  }
}

async function cpuRuntimeNs(pid) {
  try {
    const value = await readFile(`/proc/${pid}/schedstat`, 'utf8');
    const runtime = value.trim().split(/\s+/u)[0];
    return /^\d+$/u.test(runtime) ? BigInt(runtime) : undefined;
  } catch {
    return undefined;
  }
}

function startServer() {
  const profileDir = process.env.PHP_COMPANION_AUDIT_CPU_PROF_DIR;
  const profileArgs = profileDir ? ['--cpu-prof', `--cpu-prof-dir=${profileDir}`] : [];
  const child = spawn(process.execPath, [...profileArgs, resolve('packages/language-server/dist/server.js'), '--stdio'], {
    cwd: process.cwd(), stdio: ['pipe', 'pipe', 'pipe'],
  });
  const decoder = new LspMessageDecoder(); const messages = []; const waiters = []; const arrivals = new WeakMap();
  let stderr = '';
  const send = (message) => child.stdin.write(encodeLspMessage(message));
  child.stdout.on('data', (chunk) => {
    for (const message of decoder.push(chunk)) {
      messages.push(message); arrivals.set(message, performance.now());
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
  return { child, messages, arrivals, send, waitFor };
}

async function run(label) {
  const server = startServer();
  try {
    server.send({ jsonrpc: '2.0', id: 1, method: 'initialize', params: {
      processId: null, rootUri, workspaceFolders: [{ uri: rootUri, name: 'real-workspace' }],
      capabilities: { window: { workDoneProgress: true } },
      initializationOptions: { phpVersion, indexingMode, cacheDirectory, testMode: true },
    } });
    const initialized = await server.waitFor((message) => message.id === 1, 0, 30_000);
    if (initialized.error || !initialized.result?.capabilities?.definitionProvider) throw new Error('Language Server initialize failed.');
    const after = server.messages.length; const started = performance.now();
    server.send({ jsonrpc: '2.0', method: 'initialized', params: {} });
    const begin = await server.waitFor((message) => message.method === '$/progress'
      && message.params?.value?.kind === 'begin'
      && message.params.value.title === (indexingMode === 'progressive' ? 'Preparing PHP references' : 'Indexing PHP symbols'), after);
    const token = begin.params.token;
    let initialQuery;
    if (firstQuery) {
      const path = resolve(root, firstQuery.file);
      const uri = pathToFileURL(path).toString();
      const source = await readFile(path, 'utf8');
      server.send({ jsonrpc: '2.0', method: 'textDocument/didOpen', params: {
        textDocument: { uri, languageId: 'php', version: 1, text: source },
      } });
      const sentAt = performance.now();
      server.send({ jsonrpc: '2.0', id: 100, method: `textDocument/${firstQuery.method}`, params: {
        textDocument: { uri }, position: { line: firstQuery.line, character: firstQuery.character },
        ...(firstQuery.method === 'references' ? { context: { includeDeclaration: true } } : {}),
      } });
      const reply = await server.waitFor((message) => message.id === 100, after);
      const locations = Array.isArray(reply.result) ? reply.result : reply.result ? [reply.result] : [];
      const targets = locations.map((location) => location.targetUri ?? location.uri).filter(Boolean);
      const expectedUri = firstQuery.target ? pathToFileURL(resolve(root, firstQuery.target)).toString() : undefined;
      initialQuery = { method: firstQuery.method, sentAtMs: Math.round(sentAt - started), responseMs: Math.round(server.arrivals.get(reply) - started),
        waitMs: Math.round(server.arrivals.get(reply) - sentAt), targetCount: targets.length,
        targetFileCount: new Set(targets).size, sampleTargets: [...new Set(targets)].slice(0, 5),
        matched: !reply.error && targets.length > 0 && (!expectedUri || targets.includes(expectedUri)),
        ...(reply.error ? { error: reply.error } : {}) };
    }
    await server.waitFor((message) => message.method === '$/progress' && message.params?.token === token
      && message.params.value?.kind === 'end', after);
    const ended = await server.waitFor((message) => message.method === 'window/logMessage'
      && /^\[index:\d+\] end elapsedMs=/.test(message.params?.message ?? ''), after);
    const durationMs = performance.now() - started;
    const progress = server.messages.slice(after).filter((message) => message.method === '$/progress' && message.params?.token === token);
    const reports = progress.filter((message) => message.params.value?.kind === 'report');
    const cacheReport = reports.filter((message) => /\b\d+ cached\b/.test(message.params.value?.message ?? '')).at(-1);
    const progressMarks = Object.fromEntries([10, 20, 30, 40, 50, 60, 96, 100].flatMap((threshold) => {
      const report = reports.find((message) => message.params.value?.percentage >= threshold);
      return report ? [[`${threshold}%`, Math.round(server.arrivals.get(report) - started)]] : [];
    }));
    const projectReady = server.messages.slice(after).find((message) => message.method === 'window/logMessage'
      && message.params?.message?.includes('Project source index ready with'));
    const factsReport = reports.find((message) => message.params.value?.message === 'Finishing PHP reference facts');
    const indexed = server.messages.slice(after).find((message) => message.method === 'window/logMessage'
      && /^Indexed \d+ PHP files/.test(message.params?.message ?? ''))?.params.message;
    const restoreTiming = server.messages.slice(after).find((message) => message.method === 'window/logMessage'
      && message.params?.message?.startsWith('[index:restore-timing]'))?.params.message;
    let idleCpu;
    if (idleMs > 0) {
      const before = await cpuRuntimeNs(server.child.pid);
      await new Promise((done) => setTimeout(done, idleMs));
      const afterIdle = await cpuRuntimeNs(server.child.pid);
      if (before !== undefined && afterIdle !== undefined) {
        const cpuMs = Number(afterIdle - before) / 1_000_000;
        idleCpu = { observedMs: idleMs, cpuMs: Math.round(cpuMs * 100) / 100,
          cpuPercent: Math.round(cpuMs / idleMs * 10_000) / 100 };
      }
    }
    server.send({ jsonrpc: '2.0', id: 2, method: 'shutdown', params: null });
    await server.waitFor((message) => message.id === 2);
    server.send({ jsonrpc: '2.0', method: 'exit', params: null });
    await new Promise((resolveExit) => server.child.once('exit', resolveExit));
    return { label, durationMs: Math.round(durationMs * 100) / 100, ...(initialQuery ? { firstQuery: initialQuery } : {}),
      phases: {
        progressMarks,
        ...(projectReady ? { projectReadyMs: Math.round(server.arrivals.get(projectReady) - started) } : {}),
        ...(factsReport ? { finishingFactsMs: Math.round(server.arrivals.get(factsReport) - started) } : {}),
      },
      progress: { began: true, ended: progress.some((message) => message.params.value?.kind === 'end'),
        reports: reports.length, last: reports.at(-1)?.params.value, cache: cacheReport?.params.value },
      projectReady: projectReady?.params.message, indexed, restoreTiming, idleCpu, endLog: ended.params.message };
  } finally {
    if (server.child.exitCode === null) server.child.kill();
  }
}

try {
  const cold = await run('cold'); const warm = await run('warm');
  const indexed = /Indexed (\d+) PHP files.*?(\d+) cached/.exec(warm.indexed ?? '');
  const passed = cold.progress.ended && warm.progress.ended && Boolean(cold.projectReady && warm.projectReady)
    && (!firstQuery || cold.firstQuery?.matched && warm.firstQuery?.matched)
    && cold.progress.last?.percentage === 100 && warm.progress.last?.percentage === 100
    && (indexingMode !== 'progressive' || cold.progress.last?.message === 'PHP references ready'
      && warm.progress.last?.message === 'PHP references ready')
    && Boolean(indexed && Number(indexed[1]) === Number(indexed[2]))
    && /pending=0\b/.test(cold.endLog) && /pending=0\b/.test(warm.endLog);
  process.stdout.write(`${JSON.stringify({ schema: 1, root, phpVersion, indexingMode, cold, warm, passed }, null, 2)}\n`);
  if (!passed) process.exitCode = 1;
} finally { await rm(cacheDirectory, { recursive: true, force: true }); }
