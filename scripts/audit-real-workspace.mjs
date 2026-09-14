import { cpus, platform, arch } from 'node:os';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { performance } from 'node:perf_hooks';
import { pathToFileURL, URL } from 'node:url';
import process from 'node:process';
import { clearInterval, setInterval } from 'node:timers';
import { indexComposerSources } from '../packages/index/dist/index.js';
import { PhpSyntaxParser } from '../packages/parser/dist/index.js';
import { SemanticWorkspace } from '../packages/semantic/dist/index.js';
import { R1_PERFORMANCE_BUDGETS, summarizeDurations } from '../packages/testkit/dist/index.js';

const arguments_ = process.argv.slice(2).filter((argument) => argument !== '--');
const root = resolve(arguments_[0] ?? ''); const sampleSize = Number(arguments_[1] ?? 100); const maxFiles = Number(arguments_[2] ?? 10_000);
if (!arguments_[0] || !Number.isInteger(sampleSize) || sampleSize < 20 || !Number.isInteger(maxFiles) || maxFiles < 100) {
  throw new Error('Usage: audit-real-workspace.mjs <Composer root> [sample size >= 20] [max files >= 100] [oracle JSON]');
}
const oraclePath = arguments_[3] ? resolve(arguments_[3]) : undefined;
const oracle = oraclePath ? JSON.parse(await readFile(oraclePath, 'utf8')) : { schema: 1, memberQueries: [] };
if (oracle.schema !== 1 || !Array.isArray(oracle.memberQueries)) throw new Error('The workspace oracle must use schema 1 and contain memberQueries.');

const parser = await PhpSyntaxParser.createDefault(); const workspace = new SemanticWorkspace(parser);
let peakRssMb = process.memoryUsage().rss / 1024 / 1024;
const sampler = setInterval(() => { peakRssMb = Math.max(peakRssMb, process.memoryUsage().rss / 1024 / 1024); }, 10);
try {
  const started = performance.now();
  const index = await indexComposerSources(root, {
    limits: { maxFiles, maxFileSizeBytes: 512 * 1024, maxTotalBytes: 128 * 1024 * 1024 },
    onSource: ({ uri, source }) => workspace.update(uri, source),
  });
  const indexMs = performance.now() - started;
  const rootUri = `${pathToFileURL(root).toString().replace(/\/$/, '')}/`;
  const allTypes = workspace.workspaceTypes(); const projectTypes = allTypes.filter((type) => type.uri.startsWith(rootUri)
    && !type.uri.slice(rootUri.length).startsWith('vendor/')).sort((left, right) => left.uri.localeCompare(right.uri) || left.start - right.start);
  const count = Math.min(sampleSize, projectTypes.length); const sample = [];
  for (let index = 0; index < count; index += 1) sample.push(projectTypes[Math.floor(index * projectTypes.length / count)]);
  const durations = []; let resolvedDeclarations = 0; let crossFileReferences = 0; let returnedLocations = 0;
  for (const type of sample) {
    const queryStarted = performance.now(); const references = workspace.references(type.uri, type.start + 1);
    durations.push(performance.now() - queryStarted); returnedLocations += references.length;
    if (references.some((location) => location.uri === type.uri && location.start === type.start && location.end === type.end)) resolvedDeclarations += 1;
    if (references.some((location) => location.uri !== type.uri)) crossFileReferences += 1;
  }
  const memberQueries = oracle.memberQueries.map((query) => {
    const uri = pathToFileURL(resolve(root, query.file)).toString(); const source = workspace.source(uri);
    if (!source) return { file: query.file, passed: false, reason: 'file was not indexed' };
    const occurrence = query.occurrence ?? 1; let markerStart = -1;
    for (let found = 0; found < occurrence; found += 1) markerStart = source.indexOf(query.marker, markerStart + 1);
    if (!Number.isInteger(occurrence) || occurrence < 1 || markerStart < 0) return { file: query.file, passed: false, reason: 'marker occurrence was invalid or missing' };
    const cursorInMarker = query.marker.indexOf(query.cursorAfter); const memberInMarker = query.marker.indexOf(query.member);
    if (cursorInMarker < 0 || memberInMarker < 0) return { file: query.file, passed: false, reason: 'cursorAfter or member was not inside marker' };
    const completionOffset = markerStart + cursorInMarker + query.cursorAfter.length;
    const definitionOffset = markerStart + memberInMarker + Math.min(1, query.member.length - 1);
    const completions = workspace.completeMembers(uri, completionOffset).filter((item) => item.name === query.member);
    const definitions = workspace.definition(uri, definitionOffset);
    const expectedDefinition = query.definitionSuffix.replaceAll('\\', '/');
    const definitionMatched = definitions.some((location) => decodeURIComponent(new URL(location.uri).pathname).replaceAll('\\', '/').endsWith(expectedDefinition));
    return { file: query.file, marker: query.marker, occurrence, completionMatched: completions.length > 0, definitionMatched,
      definitionUris: definitions.map((location) => location.uri), passed: completions.length > 0 && definitionMatched };
  });
  const oracleFailures = memberQueries.filter((query) => !query.passed).length;
  const resolutionRatio = count ? resolvedDeclarations / count : 0;
  const report = {
    schema: 1, root, runtime: process.version, platform: platform(), architecture: arch(), cpu: cpus()[0]?.model,
    index: { ...index, durationMs: Math.round(indexMs * 100) / 100, peakRssMb: Math.round(peakRssMb * 10) / 10 },
    catalog: { types: allTypes.length, projectTypes: projectTypes.length, functions: workspace.workspaceFunctions().length, constants: workspace.workspaceConstants().length },
    sampledTypeReferences: { requested: sampleSize, sampled: count, resolvedDeclarations, resolutionRatio, crossFileReferences, returnedLocations,
      durationMs: summarizeDurations(durations) },
    oracle: { path: oraclePath, memberQueries, failures: oracleFailures },
    gates: { projectComplete: true, minimumResolutionRatio: 0.9, hotReferenceP95Ms: R1_PERFORMANCE_BUDGETS.hotQueryMs, oracleFailures: 0 },
  };
  if (!index.projectComplete || projectTypes.length === 0 || resolutionRatio < report.gates.minimumResolutionRatio
    || report.sampledTypeReferences.durationMs.p95 > report.gates.hotReferenceP95Ms || oracleFailures > 0) process.exitCode = 1;
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
} finally { clearInterval(sampler); workspace.dispose(); parser.dispose(); }
