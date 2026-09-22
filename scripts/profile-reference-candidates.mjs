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
const profileTreeOnly = process.env.PHP_COMPANION_PROFILE_TREE_ONLY === '1';
const candidateSources = profileTreeOnly ? [] : undefined;
const times = { summaryMs: 0, declarationsMs: 0, fullMs: 0 };
let declarations = 0; let full = 0; let candidateBytes = 0;
let emptyDeclarationCandidates = 0; let declarationFacts = 0;
const slowest = [];
const memberAccesses = { total: 0, static: 0, directStatic: 0, directVariable: 0, thisProperty: 0, byName: {}, staticOnlyFiles: 0 };
const started = performance.now();
try {
  const scan = await indexComposerSources(resolve(workspace), {
    includeDependencies: false,
    readConcurrency: 1,
    onSource: ({ uri, path, source }) => {
      if (![...names].some((name) => source.toLowerCase().includes(name))) return;
      const summaryStarted = performance.now();
      const summary = createSourceCandidateSummary(source);
      times.summaryMs += performance.now() - summaryStarted;
      const declarationsOnly = sourceCandidateSummaryDecision(summary, names, 'symbol') === 'skip';
      candidateSources?.push({ source, declarationsOnly });
      const parseStarted = performance.now();
      const prepared = parser.prepare(source, uri, declarationsOnly);
      const parseMs = performance.now() - parseStarted;
      slowest.push({ path, bytes: source.length, mode: declarationsOnly ? 'declarations' : 'full', parseMs: Math.round(parseMs * 10) / 10 });
      slowest.sort((left, right) => right.parseMs - left.parseMs);
      if (slowest.length > 10) slowest.length = 10;
      if (declarationsOnly) {
        declarations++; times.declarationsMs += parseMs;
        declarationFacts += prepared.facts.declarations.length;
        if (!prepared.facts.declarations.length && !prepared.facts.callables.length
          && !prepared.facts.properties.length && !prepared.facts.constants.length) emptyDeclarationCandidates++;
      }
      else {
        full++; times.fullMs += parseMs;
        let staticGet = false; let instanceGet = false;
        for (const access of prepared.facts.memberAccesses) if (access.kind === 'method' && names.has(access.name.toLowerCase())) {
          const name = access.name.toLowerCase();
          const counts = memberAccesses.byName[name] ??= { total: 0, static: 0 };
          counts.total++;
          memberAccesses.total++;
          if (access.static) {
            counts.static++;
            memberAccesses.static++;
            if (/[\\A-Za-z_][A-Za-z0-9_\\]*\s*::\s*$/.test(source.slice(Math.max(0, access.start - 128), access.start))) memberAccesses.directStatic++;
          }
          else {
            const before = source.slice(Math.max(0, access.start - 160), access.start);
            if (/\$[A-Za-z_][A-Za-z0-9_]*\s*(?:\?->|->)\s*$/.test(before)) memberAccesses.directVariable++;
            if (/\$this\s*(?:\?->|->)\s*[A-Za-z_][A-Za-z0-9_]*\s*(?:\?->|->)\s*$/.test(before)) memberAccesses.thisProperty++;
          }
          if (name === requestedNames[0].toLowerCase()) { if (access.static) staticGet = true; else instanceGet = true; }
        }
        if (staticGet && !instanceGet) memberAccesses.staticOnlyFiles++;
      }
      candidateBytes += source.length;
    },
  });
  const scanElapsedMs = Math.round(performance.now() - started);
  let treeOnly;
  if (candidateSources) {
    const treeTimes = { declarationsMs: 0, fullMs: 0 };
    for (const { source, declarationsOnly } of candidateSources) {
      const started = performance.now();
      const tree = parser.parseTree(source);
      tree.delete();
      treeTimes[declarationsOnly ? 'declarationsMs' : 'fullMs'] += performance.now() - started;
    }
    treeOnly = Object.fromEntries(Object.entries(treeTimes).map(([key, value]) => [key, Math.round(value)]));
  }
  process.stdout.write(`${JSON.stringify({ files: scan.files, candidates: declarations + full, declarations, full, candidateBytes,
    elapsedMs: scanElapsedMs, memberAccesses, slowest,
    emptyDeclarationCandidates, declarationFacts,
    ...(treeOnly ? { treeOnly } : {}),
    summaryMs: Math.round(times.summaryMs), declarationsMs: Math.round(times.declarationsMs), fullMs: Math.round(times.fullMs),
    projectComplete: scan.projectComplete, warnings: scan.warnings }, null, 2)}\n`);
} finally { parser.dispose(); }
