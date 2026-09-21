import { spawn } from 'node:child_process';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { performance } from 'node:perf_hooks';
import { pathToFileURL } from 'node:url';
import { encodeLspMessage, LspMessageDecoder } from '../packages/testkit/dist/index.js';

if (!process.argv[2]) throw new Error('Usage: audit-real-on-demand-navigation.mjs <Winstar Composer root>');
const root = resolve(process.argv[2]);
const file = resolve(root, 'src/Bridge/AdminSecuritySubscriber.php');
const source = await readFile(file, 'utf8');
const uri = pathToFileURL(file).toString();
const rootUri = pathToFileURL(root).toString();
const cacheDirectory = await mkdtemp(join(tmpdir(), 'php-companion-on-demand-'));
const symfonyDist = resolve('packages/php-companion-symfony/dist');
const parserArgs = ['--parser-core-wasm', join(symfonyDist, 'web-tree-sitter.wasm'), '--php-wasm', join(symfonyDist, 'tree-sitter-php.wasm')];
const semanticProviders = [
  { providerId: 'php-companion.symfony.services', command: process.execPath,
    args: [join(symfonyDist, 'service-provider.js'), ...parserArgs], timeoutMs: 30_000,
    maxOutputBytes: 16 * 1024 * 1024, requiresProjectTypes: true, acceptsDocumentSnapshots: true, replacesContainerServices: true },
  { providerId: 'php-companion.symfony.events', command: process.execPath,
    args: [join(symfonyDist, 'event-provider.js'), ...parserArgs], timeoutMs: 30_000,
    maxOutputBytes: 16 * 1024 * 1024, requiresProjectTypes: true, requiresContainerServices: true,
    acceptsDocumentSnapshots: true, replacesEventRelations: true },
];

function positionOf(needle, occurrence = 0) {
  let offset = -1;
  for (let index = 0; index <= occurrence; index += 1) offset = source.indexOf(needle, offset + 1);
  if (offset < 0) throw new Error(`Missing source marker: ${needle}`);
  const lines = source.slice(0, offset + 1).split('\n');
  return { line: lines.length - 1, character: lines.at(-1).length };
}

async function run(label) {
  const child = spawn(process.execPath, [resolve('packages/language-server/dist/server.js'), '--stdio'],
    { stdio: ['pipe', 'pipe', 'pipe'] });
  const decoder = new LspMessageDecoder(); const messages = []; const pending = new Map();
  let nextId = 0; let stderr = '';
  const send = (message) => child.stdin.write(encodeLspMessage(message));
  child.stdout.on('data', (chunk) => {
    for (const message of decoder.push(chunk)) {
      messages.push(message);
      if (message.id !== undefined && message.method) send({ jsonrpc: '2.0', id: message.id, result: null });
      else if (pending.has(message.id)) {
        const waiter = pending.get(message.id); pending.delete(message.id);
        clearTimeout(waiter.timer); message.error ? waiter.reject(new Error(JSON.stringify(message.error))) : waiter.resolve(message.result);
      }
    }
  });
  child.stderr.on('data', (chunk) => { stderr = `${stderr}${chunk}`.slice(-8192); });
  child.once('exit', (code) => {
    for (const waiter of pending.values()) { clearTimeout(waiter.timer); waiter.reject(new Error(`LSP exited ${code}: ${stderr}`)); }
    pending.clear();
  });
  const request = (method, params, timeoutMs = 120_000) => new Promise((resolveRequest, reject) => {
    const id = ++nextId;
    const timer = setTimeout(() => { pending.delete(id); reject(new Error(`${method} timed out: ${stderr}`)); }, timeoutMs);
    pending.set(id, { resolve: resolveRequest, reject, timer });
    send({ jsonrpc: '2.0', id, method, params });
  });
  const measure = async (method, params) => {
    const started = performance.now(); const result = await request(method, params);
    return { elapsedMs: Math.round(performance.now() - started), result };
  };
  try {
    await request('initialize', { processId: null, rootUri, workspaceFolders: [{ uri: rootUri, name: 'winstar' }],
      capabilities: { window: { workDoneProgress: true } },
      initializationOptions: { phpVersion: '8.5', indexingMode: 'onDemand', cacheDirectory,
        bundledSemanticProviders: semanticProviders } }, 30_000);
    send({ jsonrpc: '2.0', method: 'initialized', params: {} });
    send({ jsonrpc: '2.0', method: 'textDocument/didOpen', params: {
      textDocument: { uri, languageId: 'php', version: 1, text: source },
    } });
    const classPosition = positionOf('final class AdminSecuritySubscriber');
    classPosition.character += 'final class '.length;
    const propertyPosition = positionOf('$urlGenerator');
    const classParams = { textDocument: { uri }, position: classPosition };
    const propertyParams = { textDocument: { uri }, position: propertyPosition };
    const classReferences = await measure('textDocument/references', { ...classParams, context: { includeDeclaration: false } });
    const classDefinition = await measure('textDocument/definition', classParams);
    const propertyReferences = await measure('textDocument/references', { ...propertyParams, context: { includeDeclaration: true } });
    const prepareRename = await measure('textDocument/prepareRename', propertyParams);
    const rename = await measure('textDocument/rename', { ...propertyParams, newName: 'urlGeneratorProbe' });
    const locations = (result) => (Array.isArray(result) ? result : result ? [result] : []).map((item) => ({
      file: item.uri?.replace(rootUri, ''), line: item.range?.start?.line + 1,
    }));
    const edits = rename.result?.documentChanges?.flatMap((change) => change.edits ?? [])
      ?? Object.values(rename.result?.changes ?? {}).flat();
    const progress = messages.filter((message) => message.method === '$/progress'
      && message.params?.value?.title === 'Indexing PHP symbols');
    const fullIndexLogs = messages.filter((message) => message.method === 'window/logMessage'
      && /^\[index:\d+\] start/.test(message.params?.message ?? ''));
    const report = { label, root, mode: 'onDemand', classReferences: { elapsedMs: classReferences.elapsedMs,
      locations: locations(classReferences.result) }, classDefinition: { elapsedMs: classDefinition.elapsedMs,
      locations: locations(classDefinition.result) }, propertyReferences: { elapsedMs: propertyReferences.elapsedMs,
      locations: locations(propertyReferences.result) }, prepareRename: { elapsedMs: prepareRename.elapsedMs,
      available: Boolean(prepareRename.result) }, rename: { elapsedMs: rename.elapsedMs,
      editCount: edits.length }, fullIndexProgressCount: progress.length, fullIndexLogCount: fullIndexLogs.length };
    const classRefs = report.classReferences.locations.map((location) => `${location.file}:${location.line}`).sort();
    const propertyRefs = report.propertyReferences.locations.map((location) => `${location.file}:${location.line}`).sort();
    report.passed = JSON.stringify(classRefs) === JSON.stringify([
      '/config/symfony/services.yaml:42', '/src/Bridge/AdminSecuritySubscriber.php:32',
    ]) && JSON.stringify(propertyRefs) === JSON.stringify([
      '/src/Bridge/AdminSecuritySubscriber.php:24', '/src/Bridge/AdminSecuritySubscriber.php:51',
      '/src/Bridge/AdminSecuritySubscriber.php:58',
    ]) && report.classDefinition.locations.length === 1
      && report.classDefinition.locations[0].file === '/src/Bridge/AdminSecuritySubscriber.php'
      && report.classDefinition.locations[0].line === 20 && report.prepareRename.available
      && report.rename.editCount === 3 && !progress.length && !fullIndexLogs.length;
    await request('shutdown', null, 10_000);
    send({ jsonrpc: '2.0', method: 'exit', params: null });
    return report;
  } finally { if (child.exitCode === null) child.kill(); }
}

try {
  const cold = await run('cold'); const warm = await run('warm');
  process.stdout.write(`${JSON.stringify({ schema: 1, cold, warm, passed: cold.passed && warm.passed }, null, 2)}\n`);
  if (!cold.passed || !warm.passed) process.exitCode = 1;
} finally { await rm(cacheDirectory, { recursive: true, force: true }); }
