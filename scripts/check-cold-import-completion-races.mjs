import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdtemp, mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import process from 'node:process';
import console from 'node:console';
import { clearTimeout, setTimeout } from 'node:timers';
import { fileURLToPath, pathToFileURL, URL } from 'node:url';
import { encodeLspMessage, LspMessageDecoder } from '../packages/testkit/dist/index.js';

// Hold one actual filesystem read in our child, never in the installed host.
const workspace = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const reportPath = process.argv[2];
const serverPath = process.argv[3] ? resolve(process.argv[3]) : join(workspace, 'dist/language-server.js');
if (process.argv.length > 4) throw new Error('Usage: check-cold-import-completion-races.mjs [report.json] [server entry]');
const results = [];
for (const phpVersion of ['7.2', '8.5']) for (const indexingMode of ['onDemand', 'progressive'])
  for (const autoloadKind of ['psr4', 'psr0', 'classmap', 'files'])
  for (const scenario of ['cancel', 'consumer-edit', 'consumer-reopen', 'candidate-open', 'candidate-close-disk-replacement']) {
    if (process.env.SOPHP_COLD_IMPORT_CASE && process.env.SOPHP_COLD_IMPORT_CASE !== `${phpVersion}/${indexingMode}/${autoloadKind}/${scenario}`) continue;
    const root = await mkdtemp(join(tmpdir(), 'sophp-cold-import-race-'));
    let child;
    try {
      await mkdir(join(root, 'src'));
      const candidatePath = join(root, 'src', 'RootCandidate.php');
      const candidate = '<?php class RootCandidate {}';
      const liveCandidate = '<?php interface RootCandidate {}';
      const closingCandidate = '<?php class RootCandidate { public function bufferMethod(): void {} }';
      const replacementCandidate = '<?php interface RootCandidate { public function currentMethod(): void; }';
      const closesCandidate = scenario === 'candidate-close-disk-replacement';
      const source = '<?php namespace Consumer; use RootCand;';
      const changed = '<?php namespace Consumer; use RootRepl;';
      const consumerPath = join(root, 'Consumer.php');
      const uri = pathToFileURL(consumerPath).toString(), candidateUri = pathToFileURL(candidatePath).toString();
      const autoload = autoloadKind === 'psr4' ? { 'psr-4': { '': 'src/' } }
        : autoloadKind === 'psr0' ? { 'psr-0': { '': 'src/' } }
          : autoloadKind === 'classmap' ? { classmap: ['src/'] }
            : { files: ['src/RootCandidate.php', 'src/RootReplacement.php'] };
      await writeFile(join(root, 'composer.json'), JSON.stringify({ autoload }));
      await writeFile(candidatePath, candidate);
      await writeFile(join(root, 'src', 'RootReplacement.php'), '<?php class RootReplacement {}');
      await writeFile(consumerPath, source);
      child = spawn(process.execPath, ['--import', fileURLToPath(new URL('./fixtures/cold-parent-read-gate.mjs', import.meta.url)),
        serverPath, '--stdio',
        '--parser-core-wasm', join(workspace, 'dist/web-tree-sitter.wasm'),
        '--php-wasm', join(workspace, 'dist/tree-sitter-php.wasm')], { stdio: ['pipe', 'pipe', 'pipe', 'ipc'] });
      const messages = [], waiters = [], decoder = new LspMessageDecoder();
      let stderr = '';
      const accept = message => {
        messages.push(message);
        for (const waiter of [...waiters]) if (waiter.predicate(message)) {
          clearTimeout(waiter.timer); waiters.splice(waiters.indexOf(waiter), 1); waiter.resolve(message);
        }
      };
      child.on('message', message => accept({ ipc: message }));
      child.stderr.on('data', part => { stderr = (stderr + part).slice(-4096); });
      child.stdout.on('data', part => decoder.push(part).forEach(accept));
      const wait = predicate => {
        const existing = messages.find(predicate); if (existing) return Promise.resolve(existing);
        return new Promise((resolveWait, reject) => {
          const waiter = { predicate, resolve: resolveWait };
          waiter.timer = setTimeout(() => {
            waiters.splice(waiters.indexOf(waiter), 1);
            reject(new Error(`${phpVersion}/${indexingMode}/${autoloadKind}/${scenario}: wait timed out; ${stderr}; ${JSON.stringify(messages.slice(-6))}`));
          }, 20000);
          waiters.push(waiter);
        });
      };
      const send = message => child.stdin.write(encodeLspMessage({ jsonrpc: '2.0', ...message }));
      const request = async (id, method, params) => {
        send({ id, method, params }); const reply = await wait(message => message.id === id);
        assert.equal(reply.error, undefined); return reply.result;
      };
      await request(1, 'initialize', { processId: null, capabilities: {}, rootUri: pathToFileURL(root).toString(),
        initializationOptions: { phpVersion, indexingMode, testMode: true,
          // Keep progressive background source preparation from prewarming this cold query.
          testPauseNextQueries: indexingMode === 'progressive' ? ['indexProjectSource'] : [] } });
      send({ method: 'initialized', params: {} });
      send({ method: 'textDocument/didOpen', params: { textDocument: { uri, languageId: 'php', version: 1, text: source } } });
      await wait(message => message.method === 'textDocument/publishDiagnostics' && message.params?.uri === uri);
      child.send({ kind: 'arm', path: candidatePath, afterRead: closesCandidate }); await wait(message => message.ipc?.kind === 'armed');
      const completionParams = text => ({ textDocument: { uri }, position: { line: 0, character: text.lastIndexOf(';') } });
      send({ id: 10, method: 'textDocument/completion', params: completionParams(source) });
      const held = await wait(message => message.ipc?.kind === 'held'); assert.equal(held.ipc.path, candidatePath);
      if (closesCandidate) {
        assert.equal(held.ipc.phase, 'after-read');
        assert.equal(held.ipc.capturedSource, candidate);
      }
      assert.equal(messages.some(message => message.id === 10), false);
      let current = source;
      if (scenario === 'cancel') send({ method: '$/cancelRequest', params: { id: 10 } });
      if (scenario === 'consumer-edit') {
        current = changed;
        send({ method: 'textDocument/didChange', params: { textDocument: { uri, version: 2 }, contentChanges: [{ text: current }] } });
      }
      if (scenario === 'consumer-reopen') {
        current = changed;
        send({ method: 'textDocument/didClose', params: { textDocument: { uri } } });
        send({ method: 'textDocument/didOpen', params: { textDocument: { uri, languageId: 'php', version: 1, text: current } } });
      }
      if (scenario === 'candidate-open' || closesCandidate) {
        send({ method: 'textDocument/didOpen', params: { textDocument: { uri: candidateUri, languageId: 'php', version: 1,
          text: closesCandidate ? closingCandidate : liveCandidate } } });
        await wait(message => message.method === 'textDocument/publishDiagnostics' && message.params?.uri === candidateUri);
      }
      if (closesCandidate) {
        await writeFile(candidatePath, replacementCandidate);
        send({ method: 'textDocument/didClose', params: { textDocument: { uri: candidateUri } } });
        await wait(message => message.method === 'textDocument/publishDiagnostics' && message.params?.uri === candidateUri
          && message.params.version === undefined && message.params.diagnostics.length === 0);
      }
      const state = await request(11, 'phpCompanion/testQueryState', { method: 'completion', uri });
      assert.equal(state.version, scenario === 'consumer-edit' ? 2 : 1);
      child.send({ kind: 'release' }); await wait(message => message.ipc?.kind === 'released');
      const old = await wait(message => message.id === 10); assert.equal(old.error, undefined);
      const items = result => Array.isArray(result) ? result : result?.items ?? [];
      const labels = result => items(result).map(item => item.label);
      if (scenario === 'candidate-open' || closesCandidate) assert.ok(items(old.result).every(item => item.kind === 8), JSON.stringify(old.result));
      else assert.deepEqual(old.result, []);
      const fresh = await request(12, 'textDocument/completion', completionParams(current));
      const expected = current === changed ? 'RootReplacement' : 'RootCandidate';
      assert.deepEqual(labels(fresh), [expected]);
      assert.equal(items(fresh)[0].kind, scenario === 'candidate-open' || closesCandidate ? 8 : 7);
      assert.equal(items(fresh)[0].textEdit.newText, expected);
      assert.equal(items(fresh)[0].additionalTextEdits, undefined);
      assert.equal(await readFile(candidatePath, 'utf8'), closesCandidate ? replacementCandidate : candidate);
      assert.equal(await readFile(consumerPath, 'utf8'), source);
      results.push({ phpVersion, indexingMode, autoloadKind, scenario, heldAt: held.ipc.phase,
        capturedSource: held.ipc.capturedSource, oldLabels: labels(old.result),
        oldKinds: items(old.result).map(item => item.kind), freshLabels: labels(fresh), freshKinds: items(fresh).map(item => item.kind),
        consumerVersion: state.version, consumerDiskUnchanged: true, candidateDiskChangedAsExpected: closesCandidate,
        candidateDiskUnchanged: !closesCandidate });
      if (reportPath) await writeFile(reportPath, JSON.stringify(results, null, 2) + '\n');
      console.log(JSON.stringify(results.at(-1)));
      await request(13, 'phpCompanion/testReleaseQuery', { method: 'indexProjectSource' });
      await request(14, 'shutdown', null); const exited = once(child, 'exit'); send({ method: 'exit', params: null });
      assert.equal((await exited)[0], 0);
    } finally {
      if (child?.exitCode === null) { const exited = once(child, 'exit'); child.kill(); await exited; }
      await rm(root, { recursive: true, force: true });
    }
  }
assert.equal(results.length, process.env.SOPHP_COLD_IMPORT_CASE ? 1 : 80,
  'Every selected cold-import case must complete; an unknown filter must not pass.');
