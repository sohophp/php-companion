import { performance } from 'node:perf_hooks';
import process from 'node:process';
import { PhpSyntaxParser } from '../packages/parser/dist/index.js';
import { SemanticWorkspace } from '../packages/semantic/dist/index.js';

const files = Number(process.argv[2] ?? 3000);
const rounds = Number(process.argv[3] ?? 20);
if (!Number.isInteger(files) || files < 30 || files > 50000
  || !Number.isInteger(rounds) || rounds < 1 || rounds > 1000) {
  throw new Error('Usage: node scripts/benchmark-type-completion.mjs [files: 30..50000] [rounds: 1..1000]');
}

const parser = await PhpSyntaxParser.createDefault();
const workspace = new SemanticWorkspace(parser);
try {
  const indexedAt = performance.now();
  for (let index = 0; index < files; index += 1) {
    workspace.update(`file:///type-completion-bench/Type${index}.php`,
      `<?php namespace Bench; class Type${index} {}`);
  }
  const source = '<?php namespace Bench; function useType(): void { new Type29; }';
  const uri = 'file:///type-completion-bench/Consumer.php';
  workspace.update(uri, source);
  const updateMs = performance.now() - indexedAt;
  const offset = source.indexOf('Type29') + 'Type29'.length;
  for (let round = 0; round < 3; round += 1) workspace.completeTypes(uri, offset);
  const times = [];
  for (let round = 0; round < rounds; round += 1) {
    const started = performance.now();
    const candidates = workspace.completeTypes(uri, offset);
    times.push(performance.now() - started);
    if (!candidates.some((candidate) => candidate.fqcn === 'Bench\\Type29')) {
      throw new Error('Completion omitted the expected class.');
    }
  }
  times.sort((left, right) => left - right);
  process.stdout.write(`${JSON.stringify({ files: files + 1, rounds, updateMs,
    medianMs: times[Math.ceil(rounds / 2) - 1], p95Ms: times[Math.ceil(rounds * 0.95) - 1], maxMs: times.at(-1) })}\n`);
} finally {
  workspace.dispose();
  parser.dispose();
}
