import { execFile, spawn } from 'node:child_process';
import { Buffer } from 'node:buffer';
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
const serverEntry = arguments_[2] ? resolve(arguments_[2]) : resolve('packages/language-server/dist/server.js');
const parserCoreWasm = arguments_[3];
const phpWasm = arguments_[4];
if (Boolean(parserCoreWasm) !== Boolean(phpWasm) || arguments_.length > 5) {
  throw new Error('Both parser WASM paths are required when overriding parser assets.');
}
const completionNoiseFunctions = Number(process.env.SOPHP_BENCHMARK_COMPLETION_NOISE_FUNCTIONS ?? 0);
const indexingMode = process.env.SOPHP_BENCHMARK_INDEXING_MODE ?? 'experimental';
const fixtureLayout = process.env.SOPHP_BENCHMARK_FIXTURE_LAYOUT ?? 'legacy';
if (!['onDemand', 'experimental'].includes(indexingMode)) {
  throw new Error('SOPHP_BENCHMARK_INDEXING_MODE must be onDemand or experimental.');
}
if (!['legacy', 'psr4'].includes(fixtureLayout)) {
  throw new Error('SOPHP_BENCHMARK_FIXTURE_LAYOUT must be legacy or psr4.');
}
if (![iterations, warmupIterations].every(Number.isInteger) || iterations < 100 || warmupIterations < 0) {
  throw new Error('Usage: benchmark-editing.mjs [iterations >= 100] [warmup iterations >= 0] [server entry] [parser core WASM] [PHP WASM]');
}
if (!Number.isSafeInteger(completionNoiseFunctions) || completionNoiseFunctions < 0 || completionNoiseFunctions > 2_000) {
  throw new Error('SOPHP_BENCHMARK_COMPLETION_NOISE_FUNCTIONS must be an integer from 0 to 2000.');
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
  const child = spawn(process.execPath, [serverEntry, '--stdio', ...(parserCoreWasm
    ? ['--parser-core-wasm', parserCoreWasm, '--php-wasm', phpWasm] : [])], {
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
    send(...messages) { child.stdin.write(Buffer.concat(messages.map(encodeLspMessage))); },
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
    processId: null, rootUri, capabilities: { textDocument: { publishDiagnostics: { versionSupport: true } } },
    initializationOptions: { phpVersion: '8.5', indexingMode, cacheDirectory },
  } });
  const response = await server.waitFor((message) => message.id === id);
  if (response.error) throw new Error(`Language server initialization failed: ${JSON.stringify(response.error)}.`);
  const after = server.messages.length;
  server.send({ jsonrpc: '2.0', method: 'initialized', params: {} });
  // onDemand prepares sources lazily after didOpen/query; it does not start a
  // workspace index or emit its completion message during initialization.
  if (indexingMode === 'experimental') await server.waitFor((message) => message.method === 'window/logMessage'
    && message.params?.message?.includes('complete=true'), { after, timeoutMs: 30_000 });
}

function memberFor(type) { return type === 'Beta' ? 'betaOnly' : 'alphaOnly'; }

function sourceFor(type, sequence) {
  return `<?php\ndeclare(strict_types=1);\nnamespace Editing;\nfunction takeName(string $value): void {}\nfunction edit(${type} $item, string $name, int $count): void { $item->${memberFor(type)}(); $item->; takeName($); takeName(value: ); takeName($item->make); takeName(value: hel); } // ${String(sequence).padStart(6, '0')}\n`;
}

const root = await mkdtemp(join(tmpdir(), 'php-companion-editing-'));
const cacheDirectory = join(root, '.cache');
let server;
try {
  await mkdir(join(root, 'src'), { recursive: true });
  await writeFile(join(root, 'composer.json'), `${JSON.stringify({ autoload: { 'psr-4': { 'Editing\\': 'src/' },
    ...(fixtureLayout === 'psr4' ? { files: ['src/Types.php'] } : {}) } }, null, 2)}\n`);
  const typesSource = `<?php\nnamespace Editing;\nclass Alpha { public function alphaOnly(): string {} public function makeNumber(): int { return 1; } public function makeUnknown() {} public function makeText(): string { return 'a'; } }\nclass Beta { public function betaOnly(): string {} public function makeNumber(): int { return 1; } public function makeUnknown() {} public function makeText(): string { return 'b'; } }\n${Array.from({ length: completionNoiseFunctions }, (_, index) => `function helper${index}(): string { return 'noise'; }`).join('\n')}\n`;
  const typesPath = join(root, 'src', 'Types.php'); const typesUri = pathToFileURL(typesPath).toString();
  const typeDefinitions = new Map();
  if (fixtureLayout === 'psr4') {
    // The historical eager-index fixture puts both classes in Types.php. Give
    // the lazy-mode fixture real Composer-resolvable files, retaining the same
    // declarations, noise functions, edits and query assertions.
    for (const type of ['Alpha', 'Beta']) {
      const classSource = `<?php\nnamespace Editing;\n${typesSource.split('\n').find(line => line.startsWith(`class ${type} {`))}\n`;
      const classPath = join(root, 'src', `${type}.php`);
      await writeFile(classPath, classSource);
      typeDefinitions.set(type, { source: classSource, uri: pathToFileURL(classPath).toString() });
    }
    await writeFile(typesPath, `<?php\nnamespace Editing;\n${typesSource.split('\n').slice(4).join('\n')}`);
  } else {
    await writeFile(typesPath, typesSource);
    for (const type of ['Alpha', 'Beta']) typeDefinitions.set(type, { source: typesSource, uri: typesUri });
  }
  const editPath = join(root, 'src', 'Editing.php'); const uri = pathToFileURL(editPath).toString(); const rootUri = pathToFileURL(root).toString();
  let source = sourceFor('Alpha', 0); await writeFile(editPath, source);
  server = startLanguageServer(); await initialize(server, rootUri, cacheDirectory, 1);
  let version = 1; server.send({ jsonrpc: '2.0', method: 'textDocument/didOpen', params: { textDocument: { uri, languageId: 'php', version, text: source } } });
  await server.waitFor((message) => message.method === 'textDocument/publishDiagnostics'
    && message.params?.uri === uri && message.params.version === version);
  const baselineRssMb = await rssMb(server.child.pid); const rssSamples = [baselineRssMb]; const updates = []; const completions = []; const typedArgumentCompletions = []; const bareArgumentCompletions = []; const typedMemberCompletions = []; const hovers = []; const definitions = [];
  let requestId = 10;
  for (let index = 0; index < warmupIterations + iterations; index += 1) {
    const measured = index >= warmupIterations; const type = index % 2 === 0 ? 'Beta' : 'Alpha'; const expected = type === 'Beta' ? 'betaOnly' : 'alphaOnly'; const rejected = type === 'Beta' ? 'alphaOnly' : 'betaOnly';
    source = sourceFor(type, index + 1); version += 1;
    const diagnosticsAfter = server.messages.length; const updateStarted = performance.now();
    server.send({ jsonrpc: '2.0', method: 'textDocument/didChange', params: { textDocument: { uri, version }, contentChanges: [{ text: source }] } });
    await server.waitFor((message) => message.method === 'textDocument/publishDiagnostics'
      && message.params?.uri === uri && message.params.version === version, { after: diagnosticsAfter });
    const updateDuration = performance.now() - updateStarted;
    const id = requestId++; const completionStarted = performance.now();
    server.send({ jsonrpc: '2.0', id, method: 'textDocument/completion', params: { textDocument: { uri }, position: positionAt(source, source.indexOf('$item->') + '$item->'.length) } });
    const response = await server.waitFor((message) => message.id === id); const completionDuration = performance.now() - completionStarted; const actual = labels(response.result);
    if (!actual.includes(expected) || actual.includes(rejected)) throw new Error(`Iteration ${index + 1} returned stale completion: ${JSON.stringify(actual)}.`);
    if (index === 0 && completionNoiseFunctions) {
      const prefixedId = requestId++;
      server.send({ jsonrpc: '2.0', id: prefixedId, method: 'textDocument/completion', params: {
        textDocument: { uri }, position: positionAt(source, source.indexOf('takeName(value: hel)') + 'takeName(value: hel'.length),
      } });
      const prefixed = labels((await server.waitFor((message) => message.id === prefixedId)).result);
      if (!prefixed.includes('helper0')) throw new Error('The function-noise fixture was not loaded for prefixed completion.');
    }
    const argumentId = requestId++; const argumentStarted = performance.now();
    server.send({ jsonrpc: '2.0', id: argumentId, method: 'textDocument/completion', params: {
      textDocument: { uri }, position: positionAt(source, source.indexOf('takeName($)') + 'takeName($'.length),
    } });
    const argumentResponse = await server.waitFor((message) => message.id === argumentId);
    const argumentDuration = performance.now() - argumentStarted;
    const argumentLabels = labels(argumentResponse.result);
    if (argumentLabels[0] !== '$name' || argumentLabels.indexOf('$count') < 0) {
      throw new Error(`Iteration ${index + 1} returned irrelevant typed argument completion: ${JSON.stringify(argumentLabels)}.`);
    }
    const bareId = requestId++; const bareStarted = performance.now();
    server.send({ jsonrpc: '2.0', id: bareId, method: 'textDocument/completion', params: {
      textDocument: { uri }, position: positionAt(source, source.indexOf('takeName(value: )') + 'takeName(value: '.length),
    } });
    const bareResponse = await server.waitFor((message) => message.id === bareId);
    const bareDuration = performance.now() - bareStarted;
    const bareLabels = labels(bareResponse.result);
    if (bareLabels[0] !== '$name' || bareLabels.indexOf('$count') < 0
      || bareLabels.includes('takeName') || bareLabels.some((label) => label.startsWith('helper'))) {
      throw new Error(`Iteration ${index + 1} returned irrelevant blank argument completion: ${JSON.stringify(bareLabels)}.`);
    }
    const typedMemberId = requestId++; const typedMemberStarted = performance.now();
    server.send({ jsonrpc: '2.0', id: typedMemberId, method: 'textDocument/completion', params: {
      textDocument: { uri }, position: positionAt(source, source.indexOf('$item->make') + '$item->make'.length),
    } });
    const typedMemberResponse = await server.waitFor((message) => message.id === typedMemberId);
    const typedMemberDuration = performance.now() - typedMemberStarted;
    const typedMemberLabels = labels(typedMemberResponse.result);
    if (typedMemberLabels.join(',') !== 'makeText,makeUnknown,makeNumber') {
      throw new Error(`Iteration ${index + 1} returned irrelevant typed member completion: ${JSON.stringify(typedMemberLabels)}.`);
    }
    const memberOffset = source.indexOf(`$item->${expected}`) + '$item->'.length + 1;
    const position = positionAt(source, memberOffset);
    const hoverId = requestId++; const hoverStarted = performance.now();
    server.send({ jsonrpc: '2.0', id: hoverId, method: 'textDocument/hover', params: { textDocument: { uri }, position } });
    const hover = await server.waitFor((message) => message.id === hoverId); const hoverDuration = performance.now() - hoverStarted;
    if (!hover.result || !JSON.stringify(hover.result.contents).includes(expected)) {
      throw new Error(`Iteration ${index + 1} returned stale hover: ${JSON.stringify(hover.result)}.`);
    }
    const definitionId = requestId++; const definitionStarted = performance.now();
    server.send({ jsonrpc: '2.0', id: definitionId, method: 'textDocument/definition', params: { textDocument: { uri }, position } });
    const definition = await server.waitFor((message) => message.id === definitionId); const definitionDuration = performance.now() - definitionStarted;
    const locations = Array.isArray(definition.result) ? definition.result : definition.result ? [definition.result] : [];
    const expectedDefinition = typeDefinitions.get(type);
    const expectedStart = positionAt(expectedDefinition.source, expectedDefinition.source.indexOf(expected));
    if (locations.length !== 1 || locations[0].uri !== expectedDefinition.uri
      || locations[0].range?.start?.line !== expectedStart.line || locations[0].range?.start?.character !== expectedStart.character) {
      throw new Error(`Iteration ${index + 1} returned stale definition: ${JSON.stringify(definition.result)}.`);
    }
    if (measured) { updates.push(updateDuration); completions.push(completionDuration); typedArgumentCompletions.push(argumentDuration); bareArgumentCompletions.push(bareDuration); typedMemberCompletions.push(typedMemberDuration); hovers.push(hoverDuration); definitions.push(definitionDuration); }
    if (index % 10 === 0) rssSamples.push(await rssMb(server.child.pid));
  }
  const verifyCurrentReferences = async (activeServer) => {
    const type = source.includes('Beta $item') ? 'Beta' : 'Alpha';
    const offset = source.indexOf(`$item->${memberFor(type)}`) + '$item->'.length;
    const id = requestId++;
    activeServer.send({ jsonrpc: '2.0', id, method: 'textDocument/references', params: {
      textDocument: { uri }, position: positionAt(source, offset + 1), context: { includeDeclaration: false },
    } });
    const response = await activeServer.waitFor(message => message.id === id, { timeoutMs: 30_000 });
    const expected = positionAt(source, offset);
    if (response.error || !Array.isArray(response.result) || response.result.length !== 1
      || response.result[0].uri !== uri || response.result[0].range?.start?.line !== expected.line
      || response.result[0].range?.start?.character !== expected.character) {
      throw new Error(`References did not match the current unsaved member: ${JSON.stringify(response)}.`);
    }
  };
  // Direct PSR-4 completion can succeed without writing any persistent index.
  // Exercise normal references to populate the lazy candidate cache explicitly.
  if (indexingMode === 'onDemand') await verifyCurrentReferences(server);
  const cancellationProbes = [];
  // Preserve the original global query and also prove a known fixture query.
  // An empty-query result is capped, so it need not contain a specific class.
  for (const query of ['', 'Alpha']) {
    const controlId = requestId++;
    server.send({ jsonrpc: '2.0', id: controlId, method: 'workspace/symbol', params: { query } });
    const control = await server.waitFor((message) => message.id === controlId);
    if (!Array.isArray(control.result) || !control.result.length
      || query === 'Alpha' && !control.result.some((symbol) => symbol.name === 'Alpha')) {
      throw new Error(`Uncancelled workspace symbol control failed for ${JSON.stringify(query)}: ${JSON.stringify(control.error ?? control.result?.map((symbol) => symbol.name))}.`);
    }
    const cancellationId = requestId++; const cancellationStarted = performance.now();
    // Deliver both frames together so the probe measures an available cancel
    // notification, rather than a request completed before the next pipe read.
    server.send({ jsonrpc: '2.0', id: cancellationId, method: 'workspace/symbol', params: { query } },
      { jsonrpc: '2.0', method: '$/cancelRequest', params: { id: cancellationId } });
    const cancellation = await server.waitFor((message) => message.id === cancellationId);
    const durationMs = performance.now() - cancellationStarted;
    if (cancellation.error?.code !== -32800 && !Array.isArray(cancellation.result)) {
      throw new Error(`Cancelled workspace symbol request returned an invalid response: ${JSON.stringify(cancellation)}.`);
    }
    cancellationProbes.push({ query, controlSymbols: control.result.length, durationMs,
      outcome: cancellation.error?.code === -32800 || cancellation.result.length === 0
        ? 'cancelled' : 'completed-before-cancellation' });
  }
  const cancellationMs = Math.max(...cancellationProbes.map((probe) => probe.durationMs));
  const cancellationOutcome = cancellationProbes.every((probe) => probe.outcome === 'cancelled')
    ? 'cancelled' : 'completed-before-cancellation';
  const finalRssMb = await rssMb(server.child.pid); rssSamples.push(finalRssMb); await server.stop(requestId++); server = undefined;

  const cacheFiles = (await readdir(cacheDirectory)).filter((name) => name.endsWith('.json')
    && !name.endsWith('.callable.json') && !name.endsWith('.symfony.json'));
  const samePath = (left, right) => process.platform === 'win32'
    ? resolve(left).toLowerCase() === resolve(right).toLowerCase() : resolve(left) === resolve(right);
  let corruptedCacheFile; let corruptedCacheVersion;
  for (const name of cacheFiles) {
    const value = JSON.parse(await readFile(join(cacheDirectory, name), 'utf8'));
    if (typeof value.root === 'string' && samePath(value.root, root)
      && value.entries && typeof value.entries === 'object' && Object.keys(value.entries).length) {
      corruptedCacheFile = name; corruptedCacheVersion = value.version; break;
    }
  }
  if (!corruptedCacheFile) throw new Error('Language server did not create a populated persistent semantic cache for this project.');
  await writeFile(join(cacheDirectory, corruptedCacheFile), '{broken');
  const restarted = startLanguageServer(); server = restarted; await initialize(restarted, rootUri, cacheDirectory, requestId++);
  const corruptionWarning = (message) => message.method === 'window/logMessage'
    && message.params?.message?.includes('Persistent index cache was unreadable and will be rebuilt.');
  if (indexingMode === 'experimental') await restarted.waitFor(corruptionWarning);
  // Replay text that differs from the disk fixture, including when an even
  // number of alternating edits ended on its original Alpha parameter.
  source = sourceFor('Beta', warmupIterations + iterations + 1);
  const unsavedReplayDiffersFromDisk = source !== await readFile(editPath, 'utf8');
  if (!unsavedReplayDiffersFromDisk) throw new Error('The restart must replay unsaved content that differs from disk.');
  version += 1; const reopenedAfter = restarted.messages.length;
  restarted.send({ jsonrpc: '2.0', method: 'textDocument/didOpen', params: { textDocument: { uri, languageId: 'php', version, text: source } } });
  await restarted.waitFor((message) => message.method === 'textDocument/publishDiagnostics'
    && message.params?.uri === uri && message.params.version === version, { after: reopenedAfter });
  const restartId = requestId++; restarted.send({ jsonrpc: '2.0', id: restartId, method: 'textDocument/completion', params: { textDocument: { uri }, position: positionAt(source, source.indexOf('$item->') + '$item->'.length) } });
  const restartLabels = labels((await restarted.waitFor((message) => message.id === restartId)).result);
  const expectedAfterRestart = source.includes('Beta $item') ? 'betaOnly' : 'alphaOnly';
  const rejectedAfterRestart = expectedAfterRestart === 'alphaOnly' ? 'betaOnly' : 'alphaOnly';
  if (!restartLabels.includes(expectedAfterRestart) || restartLabels.includes(rejectedAfterRestart)) {
    throw new Error('Completion did not recover after cache rebuild and process restart.');
  }
  const recoveredPosition = positionAt(source, source.indexOf(`$item->${expectedAfterRestart}`) + '$item->'.length + 1);
  const recoveredHoverId = requestId++;
  restarted.send({ jsonrpc: '2.0', id: recoveredHoverId, method: 'textDocument/hover', params: { textDocument: { uri }, position: recoveredPosition } });
  const recoveredHover = await restarted.waitFor((message) => message.id === recoveredHoverId);
  if (!recoveredHover.result || !JSON.stringify(recoveredHover.result.contents).includes(expectedAfterRestart)) {
    throw new Error('Hover did not recover after cache rebuild and process restart.');
  }
  const recoveredDefinitionId = requestId++;
  restarted.send({ jsonrpc: '2.0', id: recoveredDefinitionId, method: 'textDocument/definition', params: { textDocument: { uri }, position: recoveredPosition } });
  const recoveredDefinition = await restarted.waitFor((message) => message.id === recoveredDefinitionId);
  const recoveredDefinitionSource = typeDefinitions.get(expectedAfterRestart === 'betaOnly' ? 'Beta' : 'Alpha');
  const expectedRecoveredStart = positionAt(recoveredDefinitionSource.source, recoveredDefinitionSource.source.indexOf(expectedAfterRestart));
  if (!Array.isArray(recoveredDefinition.result) || recoveredDefinition.result.length !== 1
    || recoveredDefinition.result[0].uri !== recoveredDefinitionSource.uri
    || recoveredDefinition.result[0].range?.start?.line !== expectedRecoveredStart.line
    || recoveredDefinition.result[0].range?.start?.character !== expectedRecoveredStart.character) {
    throw new Error('Definition did not recover after cache rebuild and process restart.');
  }
  if (indexingMode === 'onDemand') await verifyCurrentReferences(restarted);
  const corruptionWarningObserved = restarted.messages.some(corruptionWarning);
  await restarted.stop(requestId++); server = undefined;
  // The on-demand candidate index rebuilds lazily and does not publish the
  // eager index's warning. Require actual repair of the same damaged cache.
  const rebuiltCache = JSON.parse(await readFile(join(cacheDirectory, corruptedCacheFile), 'utf8'));
  if (rebuiltCache.schema !== 2 || rebuiltCache.version !== corruptedCacheVersion
    || typeof rebuiltCache.root !== 'string' || !samePath(rebuiltCache.root, root)
    || !rebuiltCache.entries || typeof rebuiltCache.entries !== 'object' || Array.isArray(rebuiltCache.entries)
    || !Object.keys(rebuiltCache.entries).length) {
    throw new Error('The corrupted persistent cache was not rebuilt with project entries.');
  }

  // Schema 2 stores immutable payloads separately; verify the repaired generation.
  const { createHash } = await import('node:crypto');
  const { lstat } = await import('node:fs/promises');
  if (!/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/.test(rebuiltCache.generation)) {
    throw new Error('Rebuilt cache generation is invalid.');
  }
  const rebuiltGeneration = join(cacheDirectory, corruptedCacheFile + '.entries', rebuiltCache.generation);
  const generationInfo = await lstat(rebuiltGeneration);
  if (!generationInfo.isDirectory() || generationInfo.isSymbolicLink()) throw new Error('Rebuilt generation is not a real directory.');
  let verifiedRebuiltPayloads = 0;
  for (const entry of Object.values(rebuiltCache.entries)) {
    if (!entry || Object.hasOwn(entry, 'payload') || !/^[a-f0-9]{64}$/.test(entry.payloadHash)
      || !Number.isSafeInteger(entry.payloadBytes) || entry.payloadBytes < 0 || entry.payloadBytes > 64 * 1024 * 1024) {
      throw new Error('Rebuilt payload descriptor is invalid.');
    }
    const payloadPath = join(rebuiltGeneration, entry.payloadHash + '.json');
    const info = await lstat(payloadPath); const bytes = await readFile(payloadPath);
    if (!info.isFile() || info.isSymbolicLink() || info.size !== entry.payloadBytes || bytes.length !== entry.payloadBytes
      || createHash('sha256').update(bytes).digest('hex') !== entry.payloadHash) throw new Error('Rebuilt payload failed integrity verification.');
    JSON.parse(bytes.toString('utf8')); verifiedRebuiltPayloads += 1;
  }
  if (!verifiedRebuiltPayloads) throw new Error('Rebuilt cache contains no verified payloads.');

  const sampledPeakRssMb = Math.max(...rssSamples); const rssEndMinusBaselineMb = finalRssMb - baselineRssMb;
  const report = {
    schema: 2, iterations, warmupIterations, completionNoiseFunctions, fixtureLayout, runtime: process.version,
    phpVersion: '8.5', indexingMode, diagnosticsVersionMatched: true,
    platform: platform(), architecture: arch(), cpu: cpus()[0]?.model,
    updateToDiagnosticsMs: summarizeDurations(updates), hotCompletionMs: summarizeDurations(completions),
    hotTypedArgumentCompletionMs: summarizeDurations(typedArgumentCompletions),
    hotBareArgumentCompletionMs: summarizeDurations(bareArgumentCompletions),
    hotTypedMemberCompletionMs: summarizeDurations(typedMemberCompletions),
    hotHoverMs: summarizeDurations(hovers), hotDefinitionMs: summarizeDurations(definitions), cancellationMs, cancellationOutcome,
    cancellationProbes, cancellationControlSymbols: cancellationProbes.reduce((sum, probe) => sum + probe.controlSymbols, 0),
    languageServerRssMb: { baseline: baselineRssMb, sampledPeak: sampledPeakRssMb, final: finalRssMb, endMinusBaseline: rssEndMinusBaselineMb,
      samples: rssSamples.length, sampledEveryIterations: 10, metric: 'external process RSS; sampled peak is not true high water, end-minus-baseline is not retained heap' },
    persistentCache: { files: cacheFiles.length, rebuiltSchema: rebuiltCache.schema, verifiedRebuiltPayloads, corruptedFile: corruptedCacheFile, corruptCacheRecovered: true,
      rebuiltCacheValidated: true, corruptionWarningObserved,
      referencesRecoveredAfterRestart: indexingMode === 'onDemand' ? true : null,
      completionRecoveredAfterRestart: true, hoverRecoveredAfterRestart: true, definitionRecoveredAfterRestart: true,
      unsavedReplayDiffersFromDisk },
    staleCompletionFailures: 0, staleHoverFailures: 0, staleDefinitionFailures: 0,
    budgets: { hotCompletionP95Ms: R1_PERFORMANCE_BUDGETS.hotQueryMs, hotHoverP95Ms: R1_PERFORMANCE_BUDGETS.hotQueryMs,
      hotDefinitionP95Ms: R1_PERFORMANCE_BUDGETS.hotQueryMs, updateToDiagnosticsP95Ms: R1_PERFORMANCE_BUDGETS.localDiagnosticsMs,
      cancellationMs: R1_PERFORMANCE_BUDGETS.cancellationMs, rssEndMinusBaselineMb: 128 },
  };
  if (report.hotCompletionMs.p95 > report.budgets.hotCompletionP95Ms
    || report.hotTypedArgumentCompletionMs.p95 > report.budgets.hotCompletionP95Ms
    || report.hotBareArgumentCompletionMs.p95 > report.budgets.hotCompletionP95Ms
    || report.hotTypedMemberCompletionMs.p95 > report.budgets.hotCompletionP95Ms
    || report.hotHoverMs.p95 > report.budgets.hotHoverP95Ms || report.hotDefinitionMs.p95 > report.budgets.hotDefinitionP95Ms
    || report.updateToDiagnosticsMs.p95 > report.budgets.updateToDiagnosticsP95Ms
    || report.cancellationOutcome !== 'cancelled'
    || report.cancellationMs > report.budgets.cancellationMs
    || report.languageServerRssMb.endMinusBaseline > report.budgets.rssEndMinusBaselineMb) {
    process.exitCode = 1;
    // CI redirects stdout into the artifact; retain failed metrics in its log.
    process.stderr.write(`Editing resilience budget failed: ${JSON.stringify(report)}\n`);
  }
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
} finally {
  server?.child.kill(); await rm(root, { recursive: true, force: true });
}
