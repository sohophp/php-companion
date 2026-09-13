import { mkdtemp, rm } from 'node:fs/promises';
import { cpus, platform, arch, tmpdir } from 'node:os';
import { join } from 'node:path';
import { performance } from 'node:perf_hooks';
import process from 'node:process';
import { clearInterval, setInterval } from 'node:timers';
import { indexComposerSources } from '../packages/index/dist/index.js';
import { PhpSyntaxParser } from '../packages/parser/dist/index.js';
import { SemanticWorkspace } from '../packages/semantic/dist/index.js';
import { generatePhpComposerProject, R1_PERFORMANCE_BUDGETS, summarizeDurations } from '../packages/testkit/dist/index.js';

const arguments_ = process.argv.slice(2).filter((argument) => argument !== '--');
const files = Number(arguments_[0] ?? 1000); const repeats = Number(arguments_[1] ?? 5);
if (![files, repeats].every(Number.isInteger) || files < 1 || repeats < 1) throw new Error('Usage: benchmark-index.mjs [positive file count] [positive repeats]');
const root = await mkdtemp(join(tmpdir(), `php-companion-benchmark-${files}-`));
try {
  await generatePhpComposerProject(root, files);
  const durations = []; const firstAvailable = []; let peakRssMb = 0;
  for (let run = 0; run < repeats; run += 1) {
    const parser = await PhpSyntaxParser.createDefault(); const workspace = new SemanticWorkspace(parser); const started = performance.now(); let first;
    const sampler = setInterval(() => { peakRssMb = Math.max(peakRssMb, process.memoryUsage().rss / 1024 / 1024); }, 10);
    const result = await indexComposerSources(root, { limits: { maxFiles: files, maxFileSizeBytes: 512 * 1024, maxTotalBytes: Math.max(128 * 1024 * 1024, files * 256) }, onSource: ({ uri, source }) => { first ??= performance.now() - started; workspace.update(uri, source); } });
    clearInterval(sampler); peakRssMb = Math.max(peakRssMb, process.memoryUsage().rss / 1024 / 1024);
    if (!result.complete || result.files !== files) throw new Error(`Benchmark index was incomplete: ${JSON.stringify(result)}`);
    durations.push(performance.now() - started); firstAvailable.push(first ?? durations.at(-1)); workspace.dispose(); parser.dispose();
  }
  const scale = files === 1000 ? 'files1000' : files === 10000 ? 'files10000' : files === 50000 ? 'files50000' : undefined;
  const report = {
    schema: 1, files, repeats, runtime: process.version, platform: platform(), architecture: arch(), cpu: cpus()[0]?.model,
    coldIndexMs: summarizeDurations(durations), firstAvailableMs: summarizeDurations(firstAvailable), peakRssMb: Math.round(peakRssMb * 10) / 10,
    frozenBudget: scale ? { coldIndexMs: R1_PERFORMANCE_BUDGETS.coldIndexMs[scale], peakRssMb: R1_PERFORMANCE_BUDGETS.peakRssMb[scale] } : undefined,
  };
  if (scale && (report.coldIndexMs.p95 > R1_PERFORMANCE_BUDGETS.coldIndexMs[scale] || report.peakRssMb > R1_PERFORMANCE_BUDGETS.peakRssMb[scale])) process.exitCode = 1;
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
} finally { await rm(root, { recursive: true, force: true }); }
