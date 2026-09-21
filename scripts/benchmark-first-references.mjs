import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawn } from 'node:child_process';
import process from 'node:process';

const [root, file, symbol, occurrence = 'first', candidate = 'dist/language-server.js', baseline] = process.argv.slice(2);
if (!root || !file || !symbol || !['first', 'last'].includes(occurrence)) {
  throw new Error('Usage: node scripts/benchmark-first-references.mjs <root> <file> <symbol> [first|last] [candidate-bundle] [baseline-bundle]');
}

const run = async (bundle) => {
  const cache = await mkdtemp(join(tmpdir(), 'php-companion-first-references-'));
  try {
    const child = spawn(process.execPath, ['scripts/benchmark-language-queries.mjs', resolve(root), resolve(file), symbol,
      occurrence, cache, 'once', resolve(bundle)], {
      env: { ...process.env, PHP_COMPANION_BENCHMARK_REFERENCES_FIRST: '1' }, stdio: ['ignore', 'pipe', 'pipe'],
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
    return {
      bundle, elapsedMs: query.elapsedMs, results: query.results, locationSha256: query.locationSha256,
      ...(query.peakRssKiB ? { peakRssKiB: query.peakRssKiB } : {}),
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

const reference = baseline ? await run(baseline) : undefined;
const result = await run(candidate);
const expectedHash = process.env.PHP_COMPANION_EXPECTED_REFERENCES_SHA256;
if (expectedHash && result.locationSha256 !== expectedHash) throw new Error(`References locations changed: ${result.locationSha256}`);
if (reference && (reference.results !== result.results || reference.locationSha256 !== result.locationSha256)) {
  process.stdout.write(`${JSON.stringify({ baseline: reference, candidate: result }, null, 2)}\n`);
  throw new Error('References result count or locations changed.');
}
process.stdout.write(`${JSON.stringify(reference ? { baseline: reference, candidate: result,
  changeMs: result.elapsedMs - reference.elapsedMs } : { candidate: result }, null, 2)}\n`);
