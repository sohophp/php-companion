import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve, join } from 'node:path';
import { performance } from 'node:perf_hooks';
import { pathToFileURL } from 'node:url';
import process from 'node:process';
import { clearInterval, setInterval } from 'node:timers';
import { indexComposerSources } from '../packages/index/dist/index.js';
import { PhpSyntaxParser } from '../packages/parser/dist/index.js';
import { SemanticWorkspace } from '../packages/semantic/dist/index.js';
import { analyzeProjectPhpFileFacts, createCachedProjectPhpFile, restoreCachedProjectPhpFile } from '../packages/language-server/dist/projectFacts.js';
import { semanticIndexCacheVersion } from '../packages/language-server/dist/cacheVersion.js';

const [rootArgument, versionArgument = '8.5', maxFilesArgument = '10000'] = process.argv.slice(2).filter((argument) => argument !== '--');
const maxFiles = Number(maxFilesArgument);
if (!rootArgument || !/^\d+\.\d+$/.test(versionArgument) || !Number.isSafeInteger(maxFiles) || maxFiles < 100) {
  throw new Error('Usage: audit-real-cache.mjs <Composer root> [PHP version] [max files >= 100]');
}
const root = resolve(rootArgument);
const rootUri = `${pathToFileURL(root).toString().replace(/\/$/, '')}/`;
const cacheVersion = semanticIndexCacheVersion(versionArgument);
const cacheDirectory = await mkdtemp(join(tmpdir(), 'php-companion-real-cache-'));
const parser = await PhpSyntaxParser.createDefault();
const limits = { maxFiles, maxFileSizeBytes: 512 * 1024, maxTotalBytes: 128 * 1024 * 1024 };

function sampleReferences(workspace, count = 20) {
  const types = workspace.workspaceTypes().filter((type) => type.uri.startsWith(rootUri)
    && !type.uri.slice(rootUri.length).startsWith('vendor/'))
    .sort((left, right) => left.uri.localeCompare(right.uri) || left.start - right.start);
  return Array.from({ length: Math.min(count, types.length) }, (_, index) => {
    const type = types[Math.floor(index * types.length / Math.min(count, types.length))];
    const references = workspace.references(type.uri, type.start + 1);
    return { type: type.fqcn, uri: type.uri, locations: references
      .map((location) => `${location.uri}:${location.start}:${location.end}`).sort() };
  });
}

async function load() {
  const workspace = new SemanticWorkspace(parser);
  let parsed = 0; let projectReadyMs; let invalidProgress = 0;
  const unpersisted = []; const rejected = [];
  let peakRssMb = process.memoryUsage().rss / 1024 / 1024;
  const sampler = setInterval(() => { peakRssMb = Math.max(peakRssMb, process.memoryUsage().rss / 1024 / 1024); }, 10);
  const started = performance.now();
  try {
    const result = await indexComposerSources(root, {
      limits,
      onProgress: (progress) => { if (progress.files > progress.total || progress.cached > progress.files) invalidProgress += 1; },
      onProjectComplete: () => { projectReadyMs = performance.now() - started; },
      onSource: ({ uri, source, hash }) => {
        parsed += 1;
        workspace.update(uri, source);
        const facts = analyzeProjectPhpFileFacts(parser, uri, source);
        const snapshot = workspace.snapshotForPersistence(uri);
        if (!snapshot) unpersisted.push(uri);
        return snapshot ? createCachedProjectPhpFile(snapshot, facts, hash) : undefined;
      },
      cache: { directory: cacheDirectory, version: cacheVersion, restore: (payload, source) => {
        const restored = restoreCachedProjectPhpFile(payload, source.uri);
        if (!restored) { rejected.push({ uri: source.uri, stage: 'project-facts' }); return false; }
        if (!workspace.restoreDeclaration(restored.semantic, source.uri)) {
          rejected.push({ uri: source.uri, stage: 'semantic' }); return false;
        }
        return true;
      } },
    });
    const durationMs = performance.now() - started;
    const references = sampleReferences(workspace);
    return { result, parsed, durationMs: Math.round(durationMs * 100) / 100,
      projectReadyMs: Math.round((projectReadyMs ?? durationMs) * 100) / 100,
      peakRssMb: Math.round(peakRssMb * 10) / 10, invalidProgress, unpersisted, rejected, references };
  } finally { clearInterval(sampler); workspace.dispose(); }
}

try {
  const cold = await load();
  const warm = await load();
  const referencesEqual = JSON.stringify(cold.references) === JSON.stringify(warm.references);
  const passed = cold.result.projectComplete && warm.result.projectComplete
    && cold.result.files === warm.result.files && cold.parsed === cold.result.files
    && warm.parsed === 0 && warm.result.cached === warm.result.files
    && cold.invalidProgress === 0 && warm.invalidProgress === 0 && referencesEqual;
  process.stdout.write(`${JSON.stringify({ schema: 1, root, cacheVersion, maxFiles,
    cold: { ...cold, references: undefined }, warm: { ...warm, references: undefined },
    references: { sampled: cold.references.length, equal: referencesEqual,
      totalLocations: cold.references.reduce((total, query) => total + query.locations.length, 0) }, passed }, null, 2)}\n`);
  if (!passed) process.exitCode = 1;
} finally {
  parser.dispose();
  await rm(cacheDirectory, { recursive: true, force: true });
}
