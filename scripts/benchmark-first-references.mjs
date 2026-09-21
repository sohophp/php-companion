import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawn } from 'node:child_process';
import process from 'node:process';

const [root, file, symbol, occurrence = 'first', candidate = 'dist/language-server.js', baseline] = process.argv.slice(2);
if (!root || !file || !symbol || !['first', 'last'].includes(occurrence)) {
  throw new Error('Usage: node scripts/benchmark-first-references.mjs <root> <file> <symbol> [first|last] [candidate-bundle] [baseline-bundle]');
}

const compareClosure = process.env.PHP_COMPANION_BENCHMARK_COMPARE_REFERENCE_CLOSURE === '1';
const compareRg = process.env.PHP_COMPANION_BENCHMARK_COMPARE_REFERENCE_RG === '1';
if (compareClosure && compareRg) throw new Error('Select only one reference candidate comparison mode.');
const run = async (bundle, closure = process.env.PHP_COMPANION_BENCHMARK_REFERENCE_CLOSURE === '1',
  rg = process.env.PHP_COMPANION_BENCHMARK_REFERENCE_RG === '1' ? true
    : process.env.PHP_COMPANION_BENCHMARK_REFERENCE_RG === '0' ? false : undefined) => {
  const cache = await mkdtemp(join(tmpdir(), 'php-companion-first-references-'));
  try {
    const child = spawn(process.execPath, ['scripts/benchmark-language-queries.mjs', resolve(root), resolve(file), symbol,
      occurrence, cache, 'once', resolve(bundle)], {
      env: { ...process.env, PHP_COMPANION_BENCHMARK_REFERENCES_FIRST: '1',
        PHP_COMPANION_BENCHMARK_REFERENCE_CLOSURE: closure ? '1' : '0',
        ...(rg === undefined ? {} : { PHP_COMPANION_BENCHMARK_REFERENCE_RG: rg ? '1' : '0' }) }, stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stdout = ''; let stderr = '';
    child.stdout.setEncoding('utf8').on('data', (chunk) => { stdout += chunk; });
    child.stderr.setEncoding('utf8').on('data', (chunk) => { stderr += chunk; });
    const status = await new Promise((done) => child.once('exit', (code, signal) => done({ code, signal })));
    if (status.code !== 0) throw new Error(`${bundle} exited ${status.code ?? status.signal}: ${stderr}`);
    const query = stdout.split('\n').filter(Boolean).map((line) => JSON.parse(line))
      .find((item) => item.method === 'textDocument/references');
    if (!query) throw new Error(`${bundle} returned no References result: ${stderr}`);
    const phase = (pattern) => Number(pattern.exec(stderr)?.[1] ?? NaN);
    const candidateScan = /\[named-candidates\] files=(\d+) cached=(\d+) parsed=(\d+) restored=(\d+) declarations=(\d+) restoredDeclarations=(\d+) prepared=(\d+) preparedRestores=(\d+)/.exec(stderr);
    const closureResult = /\[reference-closure\] roots=(\d+) loaded=(\d+) unresolved=(\d+) missing=(\[[^\n]*\])/.exec(stderr);
    const rgResult = /\[reference-rg\] paths=(\d+) elapsedMs=(\d+)/.exec(stderr);
    return {
      bundle, ...(compareClosure ? { referenceClosure: closure } : {}), ...(compareRg ? { ripgrepCandidates: rg } : {}), elapsedMs: query.elapsedMs,
      results: query.results, locationSha256: query.locationSha256,
      ...(query.peakRssKiB ? { peakRssKiB: query.peakRssKiB } : {}),
      namedCandidateScans: [...stderr.matchAll(/\[named-candidates\]/g)].length,
      ...(candidateScan ? { candidateScan: {
        files: Number(candidateScan[1]), cached: Number(candidateScan[2]), parsed: Number(candidateScan[3]),
        restored: Number(candidateScan[4]), declarations: Number(candidateScan[5]),
        restoredDeclarations: Number(candidateScan[6]), prepared: Number(candidateScan[7]),
        preparedRestores: Number(candidateScan[8]),
      } } : {}),
      ...(closureResult ? { closure: { roots: Number(closureResult[1]), loaded: Number(closureResult[2]), unresolved: Number(closureResult[3]), missing: JSON.parse(closureResult[4]) } } : {}),
      ...(rgResult ? { rg: { paths: Number(rgResult[1]), elapsedMs: Number(rgResult[2]) } } : {}),
      phasesMs: {
        candidates: phase(/\[named-candidates\][^\n]*elapsedMs=(\d+)/),
        container: phase(/\[references:\d+\] container elapsedMs=(\d+)/),
        routes: phase(/\[references:\d+\] routes elapsedMs=(\d+)/),
        events: phase(/\[references:\d+\] events elapsedMs=(\d+)/),
        semantic: phase(/\[references:\d+\] semantic count=\d+ elapsedMs=(\d+)/),
      },
    };
  } finally { await rm(cache, { recursive: true, force: true }); }
};

if ((compareClosure || compareRg) && baseline) throw new Error('Compare candidate modes with the same bundle; omit the baseline bundle.');
const hasReference = compareClosure || compareRg || Boolean(baseline);
const reverse = hasReference && process.env.PHP_COMPANION_BENCHMARK_REVERSE === '1';
const runReference = () => compareClosure || compareRg ? run(candidate, false, false) : run(baseline);
const candidateRg = compareRg ? true : process.env.PHP_COMPANION_BENCHMARK_REFERENCE_RG === '1' ? true
  : process.env.PHP_COMPANION_BENCHMARK_REFERENCE_RG === '0' ? false : undefined;
const runCandidate = () => run(candidate, compareClosure || process.env.PHP_COMPANION_BENCHMARK_REFERENCE_CLOSURE === '1',
  candidateRg);
const result = reverse ? await runCandidate() : undefined;
const reference = hasReference ? await runReference() : undefined;
const candidateResult = result ?? await runCandidate();
const expectedHash = process.env.PHP_COMPANION_EXPECTED_REFERENCES_SHA256;
if (expectedHash && candidateResult.locationSha256 !== expectedHash) throw new Error(`References locations changed: ${candidateResult.locationSha256}`);
if (process.env.PHP_COMPANION_BENCHMARK_SELECTION_PREWARM === '1' && candidateResult.namedCandidateScans !== 1) {
  throw new Error(`Expected one shared candidate scan, observed ${candidateResult.namedCandidateScans}.`);
}
if (reference && (reference.results !== candidateResult.results || reference.locationSha256 !== candidateResult.locationSha256)) {
  process.stdout.write(`${JSON.stringify({ baseline: reference, candidate: candidateResult }, null, 2)}\n`);
  throw new Error('References result count or locations changed.');
}
process.stdout.write(`${JSON.stringify(reference ? { order: reverse ? 'candidate-first' : 'baseline-first', baseline: reference, candidate: candidateResult,
  changeMs: candidateResult.elapsedMs - reference.elapsedMs } : { candidate: candidateResult }, null, 2)}\n`);
