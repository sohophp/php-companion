import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import process from 'node:process';
import { setTimeout, clearTimeout } from 'node:timers';
import { pathToFileURL } from 'node:url';
import { encodeLspMessage, LspMessageDecoder } from '../packages/testkit/dist/index.js';
import { SUPPORTED_PHP_VERSIONS } from '../packages/language-spec/dist/index.js';

const bundle = process.argv[2];
if (!bundle) throw new Error('Usage: check-native-platform-lsp.mjs PATH_TO_LANGUAGE_SERVER_BUNDLE [--all-versions | --cache-recovery]');
assert.ok(!(process.argv.includes('--all-versions') && process.argv.includes('--cache-recovery')),
  'Cache recovery and the version matrix are separate gates');
const phpVersions = process.argv.includes('--all-versions') ? SUPPORTED_PHP_VERSIONS : ['7.2', '8.5'];
const root = await mkdtemp(join(tmpdir(), 'sophp-native-lsp-'));
const position = (text, offset) => {
  const lines = text.slice(0, offset).split('\n');
  return { line: lines.length - 1, character: lines.at(-1).length };
};
const labels = result => (Array.isArray(result) ? result : result?.items ?? []).map(item => item.label);

function start() {
  const directory = dirname(resolve(bundle));
  const child = spawn(process.execPath, [resolve(bundle), '--parser-core-wasm', join(directory, 'web-tree-sitter.wasm'),
    '--php-wasm', join(directory, 'tree-sitter-php.wasm'), '--stdio'], { stdio: 'pipe' });
  const decoder = new LspMessageDecoder(); const messages = []; const waiters = [];
  let nextId = 1; let stderr = '';
  const send = message => child.stdin.write(encodeLspMessage({ jsonrpc: '2.0', ...message }));
  child.stderr.on('data', chunk => { stderr = (stderr + chunk).slice(-4096); });
  child.stdout.on('data', chunk => {
    for (const message of decoder.push(chunk)) {
      messages.push(message);
      if (message.method && message.id !== undefined) send({ id: message.id, result: null });
      for (const waiter of [...waiters]) if (waiter.accept(message)) {
        clearTimeout(waiter.timer); waiters.splice(waiters.indexOf(waiter), 1); waiter.done(message);
      }
    }
  });
  child.once('exit', (code, signal) => {
    for (const waiter of waiters.splice(0)) {
      clearTimeout(waiter.timer); waiter.reject(new Error(`Server exited ${code}/${signal}: ${stderr}`));
    }
  });
  const wait = accept => {
    const found = messages.find(accept); if (found) return Promise.resolve(found);
    return new Promise((done, reject) => {
      const waiter = { accept, done, reject, timer: undefined };
      waiter.timer = setTimeout(() => { waiters.splice(waiters.indexOf(waiter), 1);
        reject(new Error(`Server request timed out: ${stderr}`)); }, 35_000);
      waiters.push(waiter);
    });
  };
  const pending = (method, params) => {
    const id = nextId++; send({ id, method, params });
    return { id, result: wait(message => message.id === id).then(reply => {
      assert.ok(!reply.error, `${method}: ${JSON.stringify(reply.error)}`); return reply.result;
    }) };
  };
  return { child, send, pending, request: (method, params) => pending(method, params).result,
    waitForMessage: wait,
    async stop() {
      await this.request('shutdown', null);
      const exited = new Promise(done => child.once('exit', (code, signal) => done({ code, signal })));
      send({ method: 'exit', params: null });
      const status = await exited; assert.deepEqual(status, { code: 0, signal: null });
    } };
}

const consumer = kind => `<?php namespace App; function inspect(${kind}Contract $item): void { $item->${kind.toLowerCase()}Only('value'); $item->${kind.toLowerCase().slice(0, 3)}; }`;
const proofs = []; let server;
async function verifyCacheRecovery() {
  const directory = join(root, 'src'); await mkdir(directory);
  const cacheDirectory = join(root, 'cache with spaces');
  const target = '<?php namespace App; final class Target { public function get(): int { return 1; } }';
  const saved = '<?php namespace App; final class Consumer extends Getter { public function use(): int { return $this->target->get(); } }';
  const getter = '<?php namespace App; class Getter { protected Target $target; public function helper(): int { return 0; } }';
  const targetUri = pathToFileURL(join(directory, 'Target.php')).toString();
  const consumerUri = pathToFileURL(join(directory, 'Consumer.php')).toString();
  await writeFile(join(root, 'composer.json'), JSON.stringify({ autoload: { 'psr-4': { 'App\\': 'src/' } } }));
  for (const [name, source] of Object.entries({ Target: target, Consumer: saved, Getter: getter, Noise: '<?php namespace App; final class Noise {}' }))
    await writeFile(join(directory, `${name}.php`), source);
  const phases = [];
  for (let run = 0; run < 5; run++) {
    server = start();
    await server.request('initialize', { processId: null, rootUri: pathToFileURL(root).toString(), capabilities: {},
      initializationOptions: { phpVersion: '8.5', indexingMode: 'onDemand', cacheDirectory } });
    server.send({ method: 'initialized', params: {} });
    server.send({ method: 'textDocument/didOpen', params: { textDocument: { uri: targetUri, languageId: 'php', version: 1, text: target } } });
    const references = await server.request('textDocument/references', { textDocument: { uri: targetUri },
      position: position(target, target.indexOf('get()') + 1), context: { includeDeclaration: false } });
    assert.equal(references.length, run >= 2 ? 0 : 1);
    if (run < 2) assert.equal(references[0].uri, consumerUri);
    const scan = await server.waitForMessage(message => message.method === 'window/logMessage'
      && message.params?.message?.includes('[named-candidates] files=4'));
    assert.ok(scan.params.message.includes(`cached=${[0, 3, 2, 0, 3][run]}`), scan.params.message);
    const text = run >= 2 ? saved.replace('->get()', '->run()') : saved;
    server.send({ method: 'textDocument/didOpen', params: { textDocument: { uri: consumerUri, languageId: 'php', version: 1, text } } });
    const offset = text.lastIndexOf('->') + 2;
    const query = method => server.request(`textDocument/${method}`, { textDocument: { uri: consumerUri }, position: position(text, offset) });
    assert.deepEqual(labels(await query('completion')), ['get']);
    if (run < 2) {
      assert.ok(JSON.stringify((await query('hover'))?.contents).includes('get'));
      assert.deepEqual((await query('definition')).map(item => item.uri), [targetUri]);
    } else {
      assert.equal(await query('hover'), null);
      assert.deepEqual(await query('definition'), []);
    }
    const pid = server.child.pid;
    await server.stop(); server = undefined;
    phases.push({ phase: ['cold', 'warm reload', 'changed source', 'corrupt cache', 'warm after recovery'][run], pid,
      referenceCount: references.length, candidateScan: scan.params.message, completionHoverDefinitionCorrect: true });
    if (run === 1) await writeFile(join(directory, 'Consumer.php'), saved.replace('->get()', '->run()'));
    if (run === 2) {
      let damaged = 0;
      for (const file of await readdir(cacheDirectory)) {
        if (!file.endsWith('.json')) continue;
        const path = join(cacheDirectory, file); const manifest = JSON.parse(await readFile(path, 'utf8'));
        if (manifest.schema !== 1 || !manifest.entries) continue;
        for (const entry of Object.values(manifest.entries)) entry.hash = 'damaged';
        await writeFile(path, JSON.stringify(manifest)); damaged++;
      }
      assert.ok(damaged > 0);
    }
  }
  assert.equal(new Set(phases.map(item => item.pid)).size, 5);
  process.stdout.write(JSON.stringify({ platform: process.platform, node: process.version, phases,
    scope: 'Native stdio LSP, onDemand PHP 8.5; no editor UI' }, null, 2) + '\n');
}
try {
  if (process.argv.includes('--cache-recovery')) {
    await verifyCacheRecovery();
  } else {
  await mkdir(join(root, 'src'));
  await writeFile(join(root, 'composer.json'), JSON.stringify({ autoload: { 'psr-4': { 'App\\': 'src/' } } }));
  for (const kind of ['Alpha', 'Beta']) {
    await writeFile(join(root, 'src', `${kind}Contract.php`), `<?php namespace App; interface ${kind}Contract { public function ${kind.toLowerCase()}Only(string $value): string; }`);
    await writeFile(join(root, 'src', `${kind}.php`), `<?php namespace App; class ${kind} implements ${kind}Contract { public function ${kind.toLowerCase()}Only(string $value): string { return $value; } }`);
  }
  const uri = pathToFileURL(join(root, 'src', 'Consumer.php')).toString();
  const saved = consumer('Alpha'); await writeFile(join(root, 'src', 'Consumer.php'), saved);
  for (const phpVersion of phpVersions) for (const indexingMode of ['onDemand', 'experimental', 'progressive']) {
    server = start();
    await server.request('initialize', { processId: null, rootUri: pathToFileURL(root).toString(), capabilities: {},
      initializationOptions: { phpVersion, indexingMode, testMode: true } });
    server.send({ method: 'initialized', params: {} });
    const open = (kind, version) => server.send({ method: 'textDocument/didOpen', params: {
      textDocument: { uri, languageId: 'php', version, text: consumer(kind) } } });
    const query = (method, text, offset) => server.request(`textDocument/${method}`, {
      textDocument: { uri }, position: position(text, offset), ...(method === 'references' ? { context: { includeDeclaration: false } } : {}) });
    const verify = async kind => {
      const text = consumer(kind); const method = `${kind.toLowerCase()}Only`;
      const opposite = kind === 'Alpha' ? 'betaOnly' : 'alphaOnly';
      const offset = text.indexOf(`$item->${method}`) + '$item->'.length;
      const partial = text.lastIndexOf('$item->') + '$item->'.length + 3;
      const completion = labels(await query('completion', text, partial));
      assert.ok(completion.includes(method)); assert.ok(!completion.includes(opposite));
      const hover = await query('hover', text, offset + 2); assert.ok(JSON.stringify(hover?.contents).includes(method));
      const signature = await query('signatureHelp', text, offset + method.length + 1);
      assert.ok(signature?.signatures.some(item => item.label.includes(method) && item.label.includes('$value')));
      const definition = await query('definition', text, offset + 2);
      assert.deepEqual(definition.map(item => item.uri), [pathToFileURL(join(root, 'src', `${kind}Contract.php`)).toString()]);
      const implementation = await query('implementation', text, offset + 2);
      assert.deepEqual(implementation.map(item => item.uri), [pathToFileURL(join(root, 'src', `${kind}.php`)).toString()]);
      const references = await query('references', text, offset + 2);
      assert.ok(references.some(item => item.uri === uri && item.range.start.character === offset));
      assert.ok(references.every(item => item.uri !== uri || item.range.start.character === offset));
    };
    open('Alpha', 1); await verify('Alpha');
    assert.equal(await server.request('phpCompanion/testPauseNextQuery', { method: 'hover' }), true);
    const old = server.pending('textDocument/hover', { textDocument: { uri }, position: position(saved, saved.indexOf('alphaOnly') + 2) });
    assert.equal((await server.request('phpCompanion/testQueryState', { method: 'hover', uri })).paused, true);
    server.send({ method: '$/cancelRequest', params: { id: old.id } });
    server.send({ method: 'textDocument/didChange', params: { textDocument: { uri, version: 2 }, contentChanges: [{ text: consumer('Beta') }] } });
    assert.equal(await server.request('phpCompanion/testReleaseQuery', { method: 'hover' }), true);
    assert.equal(await old.result, null); await verify('Beta');
    server.send({ method: 'textDocument/didClose', params: { textDocument: { uri } } });
    open('Alpha', 1); await verify('Alpha');
    const keywordUri = pathToFileURL(join(root, 'src', 'Keyword.php')).toString();
    const keywordText = '<?php str_con';
    server.send({ method: 'textDocument/didOpen', params: { textDocument: { uri: keywordUri, languageId: 'php', version: 1, text: keywordText } } });
    const names = labels(await server.request('textDocument/completion', { textDocument: { uri: keywordUri }, position: position(keywordText, keywordText.length) }));
    assert.equal(names.includes('str_contains'), Number.parseFloat(phpVersion) >= 8.0);
    await server.stop(); server = undefined;
    proofs.push({ phpVersion, indexingMode, queries: 18, cancelledHover: true, sameVersionReopen: true, versionedBuiltins: true });
  }
  process.stdout.write(JSON.stringify({ schema: 1, platform: process.platform, node: process.version, proofs }, null, 2) + '\n');
  }
} finally { server?.child.kill(); await rm(root, { recursive: true, force: true }); }
