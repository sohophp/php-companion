import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { arch, cpus, platform, tmpdir } from 'node:os';
import { join } from 'node:path';
import { performance } from 'node:perf_hooks';
import { pathToFileURL } from 'node:url';
import process from 'node:process';
import { indexComposerSources } from '../packages/index/dist/index.js';
import { PhpSyntaxParser } from '../packages/parser/dist/index.js';
import { SemanticWorkspace } from '../packages/semantic/dist/index.js';
import { generatePhpComposerProject, summarizeDurations } from '../packages/testkit/dist/index.js';

const arguments_ = process.argv.slice(2).filter((argument) => argument !== '--');
const files = Number(arguments_[0] ?? 10_000); const iterations = Number(arguments_[1] ?? 200);
if (!Number.isInteger(files) || files < 1_000 || !Number.isInteger(iterations) || iterations < 100) {
  throw new Error('Usage: benchmark-local-change.mjs [files >= 1000] [iterations >= 100]');
}

const root = await mkdtemp(join(tmpdir(), 'php-companion-local-change-'));
const parser = await PhpSyntaxParser.createDefault(); const workspace = new SemanticWorkspace(parser);
try {
  await generatePhpComposerProject(root, files);
  const indexed = await indexComposerSources(root, {
    limits: { maxFiles: files, maxFileSizeBytes: 512 * 1024, maxTotalBytes: Math.max(128 * 1024 * 1024, files * 512) },
    onSource: ({ uri, source }) => workspace.update(uri, source),
  });
  if (!indexed.complete || indexed.files !== files) throw new Error(`Baseline index was incomplete: ${JSON.stringify(indexed)}`);

  const path = join(root, 'src', 'Fixture000000.php'); const uri = pathToFileURL(path).toString();
  const original = await readFile(path, 'utf8');
  if (!original.includes('return 0;')) throw new Error('Fixture method body was not found.');
  const changed = original.replace('return 0;', 'return 1;');
  const originalParse = parser.parse.bind(parser); const originalParseDeclarations = parser.parseDeclarations.bind(parser);
  const reparsedUris = []; let declarationParseCalls = 0;
  parser.parse = (...args) => { reparsedUris.push(args[2]); return originalParse(...args); };
  parser.parseDeclarations = (...args) => { declarationParseCalls += 1; return originalParseDeclarations(...args); };

  const durations = []; let changedCallableCount = 0;
  for (let index = 0; index < iterations; index += 1) {
    const before = reparsedUris.length; const started = performance.now();
    const result = workspace.update(uri, index % 2 === 0 ? changed : original);
    durations.push(performance.now() - started);
    if (result.kind !== 'implementation' || result.changedTypes.length !== 0
      || JSON.stringify(result.changedCallables) !== JSON.stringify(['benchmark\\fixture000000::id'])) {
      throw new Error(`Method-body edit changed an unexpected semantic layer: ${JSON.stringify(result)}`);
    }
    if (reparsedUris.length !== before + 1 || reparsedUris[before] !== uri || declarationParseCalls !== 0) {
      throw new Error(`Method-body edit reparsed other files: ${JSON.stringify({ reparsedUris: reparsedUris.slice(before), declarationParseCalls })}`);
    }
    changedCallableCount += result.changedCallables.length;
  }
  if (workspace.workspaceTypes().length !== files) throw new Error('Method-body edits changed the project type catalog.');

  process.stdout.write(`${JSON.stringify({
    schema: 1, files, iterations, runtime: process.version, platform: platform(), architecture: arch(), cpu: cpus()[0]?.model,
    baseline: { indexedFiles: indexed.files, complete: indexed.complete },
    implementationEditMs: summarizeDurations(durations),
    affected: { uniqueFilesReparsed: new Set(reparsedUris).size, totalFileParses: reparsedUris.length,
      declarationParseCalls, changedTypes: 0, changedCallablesPerEdit: changedCallableCount / iterations },
  }, null, 2)}\n`);
} finally {
  workspace.dispose(); parser.dispose(); await rm(root, { recursive: true, force: true });
}
