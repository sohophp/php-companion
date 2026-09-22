import { performance } from 'node:perf_hooks';
import { resolve } from 'node:path';
import process from 'node:process';
import { createSourceCandidateSummary, indexComposerSources, sourceCandidateSummaryDecision } from '../packages/index/dist/index.js';
import { PhpSyntaxParser } from '../packages/parser/dist/index.js';

const [workspace, ...requestedNames] = process.argv.slice(2);
if (!workspace || !requestedNames.length || requestedNames.some((name) => !/^[A-Za-z_][A-Za-z0-9_]*$/.test(name))) {
  throw new Error('Usage: node scripts/profile-reference-candidates.mjs <project-root> <symbol> [additional-symbol ...]');
}
const names = new Set(requestedNames.map((name) => name.toLowerCase()));
const parser = await PhpSyntaxParser.createDefault();
const times = { summaryMs: 0, declarationsMs: 0, fullMs: 0 };
let declarations = 0; let full = 0; let candidateBytes = 0;
const started = performance.now();
try {
  const scan = await indexComposerSources(resolve(workspace), {
    includeDependencies: false,
    readConcurrency: 1,
    onSource: ({ uri, source }) => {
      if (![...names].some((name) => source.toLowerCase().includes(name))) return;
      const summaryStarted = performance.now();
      const summary = createSourceCandidateSummary(source);
      times.summaryMs += performance.now() - summaryStarted;
      const declarationsOnly = sourceCandidateSummaryDecision(summary, names, 'symbol') === 'skip';
      const parseStarted = performance.now();
      parser.prepare(source, uri, declarationsOnly);
      if (declarationsOnly) { declarations++; times.declarationsMs += performance.now() - parseStarted; }
      else { full++; times.fullMs += performance.now() - parseStarted; }
      candidateBytes += source.length;
    },
  });
  process.stdout.write(`${JSON.stringify({ files: scan.files, candidates: declarations + full, declarations, full, candidateBytes,
    elapsedMs: Math.round(performance.now() - started),
    summaryMs: Math.round(times.summaryMs), declarationsMs: Math.round(times.declarationsMs), fullMs: Math.round(times.fullMs),
    projectComplete: scan.projectComplete, warnings: scan.warnings }, null, 2)}\n`);
} finally { parser.dispose(); }
