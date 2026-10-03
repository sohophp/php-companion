import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { performance } from 'node:perf_hooks';
import process from 'node:process';
import { clearInterval, setInterval } from 'node:timers';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { indexComposerSources } from '../packages/index/dist/index.js';
import { PhpSyntaxParser } from '../packages/parser/dist/index.js';
import { SemanticWorkspace } from '../packages/semantic/dist/index.js';
import { analyzeProjectPhpFileFacts, createCachedProjectPhpFile, restoreCachedProjectPhpFile } from '../packages/language-server/dist/projectFacts.js';
import { CallableFactCache } from '../packages/language-server/dist/callableFactsCache.js';
import { generatePhpComposerProject, R1_PERFORMANCE_BUDGETS } from '../packages/testkit/dist/index.js';

const [count = '1000', coreWasm, phpWasm, workerMode, workerRoot] = process.argv.slice(2);
const files = Number(count);
assert.ok(Number.isSafeInteger(files) && files >= 4);
assert.equal(Boolean(coreWasm), Boolean(phpWasm), 'Supply both parser assets');
const cacheVersion = 'semantic-v49-callable-array-benchmark';
const base = initialized => `<?php namespace Benchmark; use Doctrine\\ORM\\Mapping as ORM; #[ORM\\Entity] class Base { #[ORM\\ManyToOne(targetEntity: Owner::class)] public ?Owner $owner; public readonly int $value; public function __construct() { ${initialized ? '$this->value = 1;' : ''} } } function inner(): Child { return new Child(); }`;
const consumer = "<?php namespace Benchmark; class Consumer { public function inspect(): void { $child = outer(); $child->childM; foreach ($child as &$value) {} $this->render('child.html.twig', ['child' => $child]); } public function untouched(): void {} }";
const sourcePath = (root, index) => join(root, 'src', `Fixture${String(index).padStart(6, '0')}.php`);

async function worker(root, mode) {
  assert.equal(resolve(dirname(root)).toLowerCase(), resolve(tmpdir()).toLowerCase());
  assert.ok(basename(root).startsWith('sophp-persistence-processes-'));
  assert.ok(['cold', 'warm', 'layerRecovery', 'callableRecovery'].includes(mode));
  const parser = coreWasm ? await PhpSyntaxParser.create({ coreWasmPath: coreWasm, phpWasmPath: phpWasm })
    : await PhpSyntaxParser.createDefault();
  const workspace = new SemanticWorkspace(parser);
  let peakRssMb = process.memoryUsage().rss / 1024 / 1024;
  const sampler = setInterval(() => { peakRssMb = Math.max(peakRssMb, process.memoryUsage().rss / 1024 / 1024); }, 10);
  const cacheDirectory = join(root, '.cache'); const started = performance.now();
  let parsed = 0; let doctrineProperties = 0;
  try {
    const result = await indexComposerSources(root, {
      limits: { maxFiles: files, maxFileSizeBytes: 512 * 1024, maxTotalBytes: Math.max(128 * 1024 * 1024, files * 512) },
      onSource: ({ uri, source, hash }) => {
        parsed++; workspace.update(uri, source);
        const facts = analyzeProjectPhpFileFacts(parser, uri, source); doctrineProperties += facts.doctrineProperties.length;
        return createCachedProjectPhpFile(workspace.snapshotForPersistence(uri), facts, hash);
      },
      cache: { directory: cacheDirectory, version: cacheVersion, restore: (payload, source) => {
        const cached = restoreCachedProjectPhpFile(payload, source.uri);
        if (!cached || !workspace.restoreDeclaration(cached.semantic, source.uri)) return false;
        doctrineProperties += cached.facts.doctrineProperties.length; return true;
      } },
    });
    assert.equal(result.complete, true); assert.equal(result.files, files);
    assert.equal(parsed, mode === 'cold' ? files : mode === 'warm' ? 0 : 1);
    assert.equal(result.cached, files - parsed); assert.equal(doctrineProperties, 1);
    const indexDurationMs = performance.now() - started;
    const consumerUri = pathToFileURL(sourcePath(root, 3)).toString();
    const baseUri = pathToFileURL(sourcePath(root, 0)).toString();
    const callableCache = await CallableFactCache.open(cacheDirectory, root);
    let callableFacts;
    if (mode === 'cold') {
      assert.equal(workspace.readonlyPropertyAssignments(consumerUri).length, 1);
      const commit = await callableCache.commit(workspace, new Set());
      assert.equal(commit.written, true); assert.equal(commit.facts, 3); callableFacts = commit.facts;
    } else {
      callableFacts = callableCache.restore(workspace); assert.equal(callableFacts, 3);
    }
    assert.ok(workspace.completeMembers(consumerUri, consumer.indexOf('$child->childM') + '$child->childM'.length)
      .some(item => item.name === 'childMethod'));
    if (mode !== 'cold') assert.deepEqual(workspace.callableImplementationStates(consumerUri)
      .filter(item => item.state === 'loaded').map(item => item.identity), ['benchmark\\consumer::inspect']);
    assert.equal(workspace.readonlyPropertyAssignments(consumerUri).length, 1);
    workspace.update(baseUri, base(false));
    assert.equal(workspace.readonlyPropertyAssignments(consumerUri).length, 0);
    peakRssMb = Math.max(peakRssMb, process.memoryUsage().rss / 1024 / 1024);
    return { mode, pid: process.pid, parsed, restored: result.cached, callableFacts, indexDurationMs,
      peakRssMb, crossFileCompletion: true, derivedFactInvalidated: true };
  } finally { clearInterval(sampler); workspace.dispose(); parser.dispose(); }
}

async function runWorker(root, mode) {
  const child = spawn(process.execPath, [fileURLToPath(import.meta.url), count, coreWasm ?? '', phpWasm ?? '', mode, root],
    { stdio: ['ignore', 'pipe', 'pipe'] });
  let stdout = '', stderr = '';
  child.stdout.on('data', data => stdout += data); child.stderr.on('data', data => stderr += data);
  await new Promise((done, reject) => {
    child.once('error', reject); child.once('exit', (code, signal) => code === 0 && !signal ? done()
      : reject(new Error(`${mode} exited ${code}/${signal}: ${stderr}`)));
  });
  assert.equal(stderr, ''); return JSON.parse(stdout);
}

async function corrupt(root, kind) {
  const directory = join(root, '.cache');
  const name = (await readdir(directory)).find(name => name.endsWith('.json') && !name.endsWith('.callable.json'));
  assert.ok(name); const path = join(directory, name);
  const data = JSON.parse(await readFile(path, 'utf8'));
  const entry = data.entries[sourcePath(root, 0)]; assert.ok(entry);
  if (kind === 'layerRecovery') entry.payload.semantic.layers.referenceCandidates.keys = ['raw-ci:corrupt'];
  else entry.payload.semantic.implementation.callables[0].facts.rawNames.push({ text: 'corrupt', start: 0, end: 1, context: 'code' });
  await writeFile(path, JSON.stringify(data));
}

if (workerMode) {
  process.stdout.write(JSON.stringify(await worker(workerRoot, workerMode)) + '\n');
} else {
  const root = await mkdtemp(join(tmpdir(), 'sophp-persistence-processes-'));
  try {
    await generatePhpComposerProject(root, files);
    await Promise.all([
      writeFile(sourcePath(root, 0), base(true)),
      writeFile(sourcePath(root, 1), '<?php namespace Benchmark; class Middle extends Base {} function middle(): Child { return inner(); }'),
      writeFile(sourcePath(root, 2), '<?php namespace Benchmark; class Child extends Middle { public function childMethod(): void {} } function outer(): Child { return middle(); }'),
      writeFile(sourcePath(root, 3), consumer),
    ]);
    const results = [];
    for (const mode of ['cold', 'warm', 'layerRecovery', 'callableRecovery']) {
      if (mode.endsWith('Recovery')) await corrupt(root, mode);
      results.push(await runWorker(root, mode));
    }
    assert.equal(new Set(results.map(item => item.pid)).size, 4);
    const frozenPeakRssMb = R1_PERFORMANCE_BUDGETS.peakRssMb[`files${files}`] ?? null;
    const memoryWithinBudget = frozenPeakRssMb === null || results.every(item => item.peakRssMb <= frozenPeakRssMb);
    process.stdout.write(JSON.stringify({ files, platform: process.platform, runtime: process.version,
      sampledIntervalMs: 10, frozenPeakRssMb, memoryWithinBudget, results }, null, 2) + '\n');
    if (!memoryWithinBudget) process.exitCode = 1;
  } finally { await rm(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }); }
}
