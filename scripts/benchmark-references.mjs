import { cpus, platform, arch } from 'node:os';
import { performance } from 'node:perf_hooks';
import process from 'node:process';
import { PhpSyntaxParser } from '../packages/parser/dist/index.js';
import { SemanticWorkspace } from '../packages/semantic/dist/index.js';
import { R1_PERFORMANCE_BUDGETS, summarizeDurations } from '../packages/testkit/dist/index.js';

const arguments_ = process.argv.slice(2).filter((argument) => argument !== '--');
const files = Number(arguments_[0] ?? 10_000); const queries = Number(arguments_[1] ?? 200);
if (![files, queries].every(Number.isInteger) || files < 2 || queries < 20) {
  throw new Error('Usage: benchmark-references.mjs [files >= 2] [queries >= 20]');
}

const parser = await PhpSyntaxParser.createDefault(); const workspace = new SemanticWorkspace(parser);
const targetUri = 'file:///benchmark/Target.php'; const useUri = 'file:///benchmark/UseTarget.php';
const target = '<?php namespace Benchmark; class Target { public function act(): void {} }';
const use = '<?php namespace Benchmark; function consume(Target $target): void { $target->act(); }';
try {
  const indexStarted = performance.now();
  workspace.update(targetUri, target); workspace.update(useUri, use);
  for (let index = 2; index < files; index += 1) {
    workspace.update(`file:///benchmark/Noise${index}.php`, `<?php namespace Benchmark\\Noise; class Noise${index} { public function work${index}(): void {} }`);
  }
  const indexMs = performance.now() - indexStarted;
  const typeOffset = target.indexOf('Target'); const methodOffset = target.indexOf('act');
  const verify = (kind, result) => {
    if (!result.some((item) => item.uri === useUri) || result.some((item) => item.uri.includes('/Noise'))) {
      throw new Error(`${kind} references were stale or imprecise: ${JSON.stringify(result)}`);
    }
  };
  verify('type', workspace.references(targetUri, typeOffset + 1));
  verify('method', workspace.references(targetUri, methodOffset + 1));
  const typeDurations = []; const methodDurations = [];
  for (let query = 0; query < queries; query += 1) {
    let started = performance.now(); verify('type', workspace.references(targetUri, typeOffset + 1)); typeDurations.push(performance.now() - started);
    started = performance.now(); verify('method', workspace.references(targetUri, methodOffset + 1)); methodDurations.push(performance.now() - started);
  }
  const snapshot = workspace.snapshot(useUri); workspace.update(useUri, '<?php namespace Benchmark; function consume(): void {}');
  if (workspace.references(targetUri, typeOffset + 1).some((item) => item.uri === useUri)
    || workspace.references(targetUri, methodOffset + 1).some((item) => item.uri === useUri)) throw new Error('Incremental replacement retained stale references.');
  workspace.restore(snapshot);
  verify('restored type', workspace.references(targetUri, typeOffset + 1));
  verify('restored method', workspace.references(targetUri, methodOffset + 1));
  const report = {
    schema: 1, files, queries, runtime: process.version, platform: platform(), architecture: arch(), cpu: cpus()[0]?.model,
    workspaceIndexMs: Math.round(indexMs * 100) / 100,
    typeReferencesMs: summarizeDurations(typeDurations), memberReferencesMs: summarizeDurations(methodDurations),
    exactness: { unrelatedMatches: 0, staleMatchesAfterReplace: 0, restoredAfterSnapshot: true },
    budget: { hotReferenceP95Ms: R1_PERFORMANCE_BUDGETS.hotQueryMs },
  };
  if (report.typeReferencesMs.p95 > report.budget.hotReferenceP95Ms
    || report.memberReferencesMs.p95 > report.budget.hotReferenceP95Ms) process.exitCode = 1;
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
} finally { workspace.dispose(); parser.dispose(); }
