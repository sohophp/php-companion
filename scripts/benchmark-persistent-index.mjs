import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { arch, cpus, platform, tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { performance } from 'node:perf_hooks';
import process from 'node:process';
import { indexComposerSources } from '../packages/index/dist/index.js';
import { PhpSyntaxParser } from '../packages/parser/dist/index.js';
import { SemanticWorkspace } from '../packages/semantic/dist/index.js';
import { generatePhpComposerProject } from '../packages/testkit/dist/index.js';

const arguments_ = process.argv.slice(2).filter((argument) => argument !== '--');
const files = Number(arguments_[0] ?? 1_000);
if (!Number.isInteger(files) || files < 4) throw new Error('Usage: benchmark-persistent-index.mjs [files >= 4]');

const root = await mkdtemp(join(tmpdir(), `php-companion-persistent-index-${files}-`));
const cacheDirectory = join(root, '.cache'); const cacheVersion = 'semantic-v43-benchmark';
const sourcePath = (index) => join(root, 'src', `Fixture${String(index).padStart(6, '0')}.php`);
const uri = (index) => pathToFileURL(sourcePath(index)).toString();
const base = (initialized) => `<?php namespace Benchmark; class Base { public readonly int $value; public function __construct() { ${initialized ? '$this->value = 1;' : ''} } }`;
const middle = '<?php namespace Benchmark; class Middle extends Base {}';
const child = '<?php namespace Benchmark; class Child extends Middle {}';
const consumer = '<?php namespace Benchmark; class Consumer { public function inspect(): void { $child = new Child(); foreach ($child as &$value) {} } }';

async function load(workspace) {
  let parsed = 0; const started = performance.now();
  const result = await indexComposerSources(root, {
    limits: { maxFiles: files, maxFileSizeBytes: 512 * 1024, maxTotalBytes: Math.max(128 * 1024 * 1024, files * 512) },
    onSource: ({ uri: sourceUri, source }) => { parsed += 1; workspace.update(sourceUri, source); return workspace.snapshot(sourceUri); },
    cache: { directory: cacheDirectory, version: cacheVersion, restore: (payload, source) => workspace.restore(payload, source.uri) },
  });
  return { durationMs: performance.now() - started, parsed, result };
}

const parser = await PhpSyntaxParser.createDefault();
try {
  await generatePhpComposerProject(root, files);
  await Promise.all([writeFile(sourcePath(0), base(true)), writeFile(sourcePath(1), middle), writeFile(sourcePath(2), child), writeFile(sourcePath(3), consumer)]);
  const coldWorkspace = new SemanticWorkspace(parser); const cold = await load(coldWorkspace);
  if (cold.result.files !== files || cold.result.cached !== 0 || cold.parsed !== files) throw new Error(`Cold index did not parse every file: ${JSON.stringify(cold)}`);
  if (coldWorkspace.readonlyPropertyAssignments(uri(3)).length !== 1) throw new Error('Cold index did not resolve the transitive constructor fact.');
  coldWorkspace.dispose();

  const warmWorkspace = new SemanticWorkspace(parser); const warm = await load(warmWorkspace);
  if (warm.result.files !== files || warm.result.cached !== files || warm.parsed !== 0) throw new Error(`Warm index did not restore every file: ${JSON.stringify(warm)}`);
  if (warmWorkspace.readonlyPropertyAssignments(uri(3)).length !== 1) throw new Error('Warm index lost the transitive constructor fact.');
  warmWorkspace.update(uri(0), base(false));
  if (warmWorkspace.readonlyPropertyAssignments(uri(3)).length !== 0) throw new Error('Restored dependency graph retained a stale derived constructor fact.');
  warmWorkspace.dispose();

  const cacheFile = join(cacheDirectory, (await readdir(cacheDirectory)).find((name) => name.endsWith('.json')) ?? '');
  const persisted = JSON.parse(await readFile(cacheFile, 'utf8'));
  const baseEntry = persisted.entries[sourcePath(0)];
  if (!baseEntry?.payload?.layers?.referenceCandidates) throw new Error('Persistent cache did not contain the layered semantic payload.');
  baseEntry.payload.layers.referenceCandidates.keys = ['raw-ci:corrupt'];
  await writeFile(cacheFile, JSON.stringify(persisted));
  const recoveredWorkspace = new SemanticWorkspace(parser); const recovered = await load(recoveredWorkspace);
  if (recovered.result.cached !== files - 1 || recovered.parsed !== 1) throw new Error(`Layer corruption did not rebuild exactly one file: ${JSON.stringify(recovered)}`);
  if (recoveredWorkspace.workspaceTypes().filter((item) => item.fqcn === 'Benchmark\\Base').length !== 1) throw new Error('Layer corruption recovery lost the rebuilt declaration.');
  recoveredWorkspace.dispose();

  process.stdout.write(`${JSON.stringify({
    schema: 1, files, runtime: process.version, platform: platform(), architecture: arch(), cpu: cpus()[0]?.model,
    cold: { durationMs: Math.round(cold.durationMs * 100) / 100, parsed: cold.parsed, restored: cold.result.cached },
    warm: { durationMs: Math.round(warm.durationMs * 100) / 100, parsed: warm.parsed, restored: warm.result.cached },
    warmToColdRatio: Math.round(warm.durationMs / cold.durationMs * 10_000) / 10_000,
    exactness: { transitiveDependencyRestored: true, derivedFactInvalidated: true, corruptLayerReparsedFiles: recovered.parsed },
  }, null, 2)}\n`);
} finally {
  parser.dispose(); await rm(root, { recursive: true, force: true });
}
