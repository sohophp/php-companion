import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { arch, cpus, platform, tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { performance } from 'node:perf_hooks';
import process from 'node:process';
import { indexComposerSources } from '../packages/index/dist/index.js';
import { PhpSyntaxParser } from '../packages/parser/dist/index.js';
import { SemanticWorkspace } from '../packages/semantic/dist/index.js';
import { analyzeProjectPhpFileFacts, createCachedProjectPhpFile, restoreCachedProjectPhpFile } from '../packages/language-server/dist/projectFacts.js';
import { CallableFactCache } from '../packages/language-server/dist/callableFactsCache.js';
import { generatePhpComposerProject } from '../packages/testkit/dist/index.js';

const arguments_ = process.argv.slice(2).filter((argument) => argument !== '--');
const files = Number(arguments_[0] ?? 1_000);
if (!Number.isInteger(files) || files < 4) throw new Error('Usage: benchmark-persistent-index.mjs [files >= 4]');

const root = await mkdtemp(join(tmpdir(), `php-companion-persistent-index-${files}-`));
const cacheDirectory = join(root, '.cache'); const cacheVersion = 'semantic-v48-closure-literal-callable-benchmark';
const sourcePath = (index) => join(root, 'src', `Fixture${String(index).padStart(6, '0')}.php`);
const uri = (index) => pathToFileURL(sourcePath(index)).toString();
const base = (initialized) => `<?php namespace Benchmark; use Doctrine\\ORM\\Mapping as ORM; #[ORM\\Entity] class Base { #[ORM\\ManyToOne(targetEntity: Owner::class)] public ?Owner $owner; public readonly int $value; public function __construct() { ${initialized ? '$this->value = 1;' : ''} } } function inner(): Child { return new Child(); }`;
const middle = '<?php namespace Benchmark; class Middle extends Base {} function middle(): Child { return inner(); }';
const child = '<?php namespace Benchmark; class Child extends Middle { public function childMethod(): void {} } function outer(): Child { return middle(); }';
const consumer = "<?php namespace Benchmark; class Consumer { public function inspect(): void { $child = outer(); $child->childM; foreach ($child as &$value) {} $this->render('child.html.twig', ['child' => $child]); } public function untouched(): void {} }";

async function load(workspace) {
  let parsed = 0; let frameworkParsed = 0; let controllerContexts = 0; let doctrineProperties = 0; const started = performance.now();
  const acceptFacts = (facts) => { controllerContexts += facts.controllerContexts.length; doctrineProperties += facts.doctrineProperties.length; };
  const result = await indexComposerSources(root, {
    limits: { maxFiles: files, maxFileSizeBytes: 512 * 1024, maxTotalBytes: Math.max(128 * 1024 * 1024, files * 512) },
    onSource: ({ uri: sourceUri, source }) => {
      parsed += 1; workspace.update(sourceUri, source);
      if (source.includes('render') || source.includes('Doctrine') || source.includes('ServiceEntityRepository')) frameworkParsed += 1;
      const facts = analyzeProjectPhpFileFacts(parser, sourceUri, source, 'benchmark'); acceptFacts(facts);
      return createCachedProjectPhpFile(workspace.snapshot(sourceUri), facts);
    },
    cache: { directory: cacheDirectory, version: cacheVersion, restore: (payload, source) => {
      const restored = restoreCachedProjectPhpFile(payload, source.uri, 'benchmark');
      if (!restored || !workspace.restoreDeclaration(restored.semantic, source.uri)) return false;
      acceptFacts(restored.facts); return true;
    } },
  });
  return { durationMs: performance.now() - started, parsed, frameworkParsed, controllerContexts, doctrineProperties, result };
}

const parser = await PhpSyntaxParser.createDefault();
try {
  await generatePhpComposerProject(root, files);
  await Promise.all([writeFile(sourcePath(0), base(true)), writeFile(sourcePath(1), middle), writeFile(sourcePath(2), child), writeFile(sourcePath(3), consumer)]);
  const coldWorkspace = new SemanticWorkspace(parser); const cold = await load(coldWorkspace);
  if (cold.result.files !== files || cold.result.cached !== 0 || cold.parsed !== files) throw new Error(`Cold index did not parse every file: ${JSON.stringify(cold)}`);
  if (cold.frameworkParsed !== 2 || cold.controllerContexts !== 1 || cold.doctrineProperties !== 1) throw new Error(`Cold framework facts were incomplete: ${JSON.stringify(cold)}`);
  if (coldWorkspace.readonlyPropertyAssignments(uri(3)).length !== 1) throw new Error('Cold index did not resolve the transitive constructor fact.');
  const coldCallableCache = await CallableFactCache.open(cacheDirectory, root);
  const coldCallableCommit = await coldCallableCache.commit(coldWorkspace, new Set());
  if (!coldCallableCommit.written || coldCallableCommit.facts !== 3) throw new Error(`Cold callable facts were not persisted: ${JSON.stringify(coldCallableCommit)}`);
  coldWorkspace.dispose();

  const warmWorkspace = new SemanticWorkspace(parser); const warm = await load(warmWorkspace);
  if (warm.result.files !== files || warm.result.cached !== files || warm.parsed !== 0) throw new Error(`Warm index did not restore every file: ${JSON.stringify(warm)}`);
  if (warm.frameworkParsed !== 0 || warm.controllerContexts !== 1 || warm.doctrineProperties !== 1) throw new Error(`Warm framework facts were not restored exactly: ${JSON.stringify(warm)}`);
  const deferredImplementations = warmWorkspace.deferredImplementationCount();
  if (deferredImplementations !== files) throw new Error(`Warm index eagerly loaded implementation records: ${deferredImplementations}/${files} remained deferred.`);
  const callableImplementationRecords = Array.from({ length: files }, (_, index) => warmWorkspace.callableImplementationStates(uri(index)))
    .flat();
  if (callableImplementationRecords.length === 0 || callableImplementationRecords.some((record) => record.state !== 'deferred'))
    throw new Error('Warm index did not preserve independently observable deferred callable implementation records.');
  const warmCallableCache = await CallableFactCache.open(cacheDirectory, root);
  const restoredCallableFacts = warmCallableCache.restore(warmWorkspace);
  if (restoredCallableFacts !== 3) throw new Error(`Warm callable facts were not restored exactly: ${restoredCallableFacts}`);
  const completionOffset = consumer.indexOf('$child->childM') + '$child->childM'.length;
  if (!warmWorkspace.completeMembers(uri(3), completionOffset).some((member) => member.name === 'childMethod'))
    throw new Error('Focused warm completion lost the restored transitive callable result.');
  const focusedCallableStates = warmWorkspace.callableImplementationStates(uri(3));
  const callableImplementationsLoadedByFocusedQuery = focusedCallableStates.filter((record) => record.state === 'loaded').map((record) => record.identity);
  if (JSON.stringify(callableImplementationsLoadedByFocusedQuery) !== JSON.stringify(['benchmark\\consumer::inspect'])
    || warmWorkspace.deferredImplementationCount() !== deferredImplementations)
    throw new Error(`Focused completion did not preserve unrelated callable records: ${JSON.stringify(focusedCallableStates)}`);
  if (warmWorkspace.readonlyPropertyAssignments(uri(3)).length !== 1) throw new Error('Warm index lost the transitive constructor fact.');
  const implementationsLoadedByQuery = deferredImplementations - warmWorkspace.deferredImplementationCount();
  if (implementationsLoadedByQuery < 1 || implementationsLoadedByQuery >= files) throw new Error(`Focused query loaded an invalid implementation set: ${implementationsLoadedByQuery}/${files}.`);
  warmWorkspace.update(uri(0), base(false));
  if (warmWorkspace.readonlyPropertyAssignments(uri(3)).length !== 0) throw new Error('Restored dependency graph retained a stale derived constructor fact.');
  warmWorkspace.dispose();

  const cacheFile = join(cacheDirectory, (await readdir(cacheDirectory)).find((name) => name.endsWith('.json') && !name.endsWith('.callable.json')) ?? '');
  const persisted = JSON.parse(await readFile(cacheFile, 'utf8'));
  const baseEntry = persisted.entries[sourcePath(0)];
  if (!baseEntry?.payload?.semantic?.declaration || !baseEntry?.payload?.semantic?.implementation?.file
    || !Array.isArray(baseEntry?.payload?.semantic?.implementation?.callables)
    || !baseEntry?.payload?.semantic?.layers?.referenceCandidates
    || !['source', 'declaration', 'implementationFile', 'layers', 'facts'].every((key) => /^[0-9a-f]{64}$/.test(baseEntry?.payload?.checksums?.[key] ?? ''))
    || !Array.isArray(baseEntry?.payload?.checksums?.callableImplementations)
    || baseEntry.payload.semantic.implementation.callables.length === 0
    || baseEntry.payload.checksums.callableImplementations.length !== baseEntry.payload.semantic.implementation.callables.length
    || !baseEntry.payload.checksums.callableImplementations.every((record) => typeof record.identity === 'string' && /^[0-9a-f]{64}$/.test(record.checksum)))
    throw new Error('Persistent cache did not contain separately checksummed source, declaration, file implementation, callable implementation, derived, and framework records.');
  baseEntry.payload.semantic.layers.referenceCandidates.keys = ['raw-ci:corrupt'];
  await writeFile(cacheFile, JSON.stringify(persisted));
  const recoveredWorkspace = new SemanticWorkspace(parser); const recovered = await load(recoveredWorkspace);
  if (recovered.result.cached !== files - 1 || recovered.parsed !== 1) throw new Error(`Layer corruption did not rebuild exactly one file: ${JSON.stringify(recovered)}`);
  if (recoveredWorkspace.workspaceTypes().filter((item) => item.fqcn === 'Benchmark\\Base').length !== 1) throw new Error('Layer corruption recovery lost the rebuilt declaration.');
  recoveredWorkspace.dispose();

  const callablePersisted = JSON.parse(await readFile(cacheFile, 'utf8'));
  const callableEntry = callablePersisted.entries[sourcePath(0)];
  callableEntry.payload.semantic.implementation.callables[0].facts.rawNames.push({ text: 'corrupt', start: 0, end: 1, context: 'code' });
  await writeFile(cacheFile, JSON.stringify(callablePersisted));
  const callableRecoveredWorkspace = new SemanticWorkspace(parser); const callableRecovered = await load(callableRecoveredWorkspace);
  if (callableRecovered.result.cached !== files - 1 || callableRecovered.parsed !== 1) throw new Error(`Callable record corruption did not rebuild exactly one file: ${JSON.stringify(callableRecovered)}`);
  callableRecoveredWorkspace.dispose();

  process.stdout.write(`${JSON.stringify({
    schema: 1, files, runtime: process.version, platform: platform(), architecture: arch(), cpu: cpus()[0]?.model,
    cold: { durationMs: Math.round(cold.durationMs * 100) / 100, parsed: cold.parsed, restored: cold.result.cached, frameworkParsed: cold.frameworkParsed },
    warm: { durationMs: Math.round(warm.durationMs * 100) / 100, parsed: warm.parsed, restored: warm.result.cached, frameworkParsed: warm.frameworkParsed },
    warmToColdRatio: Math.round(warm.durationMs / cold.durationMs * 10_000) / 10_000,
    exactness: { transitiveDependencyRestored: true, derivedFactInvalidated: true, frameworkFactsRestored: true,
      callableFactsRestored: restoredCallableFacts, deferredImplementations, implementationsLoadedByQuery,
      callableImplementationsLoadedByFocusedQuery,
      callableImplementationRecords: callableImplementationRecords.length,
      corruptLayerReparsedFiles: recovered.parsed, corruptCallableReparsedFiles: callableRecovered.parsed },
  }, null, 2)}\n`);
} finally {
  parser.dispose(); await rm(root, { recursive: true, force: true });
}
