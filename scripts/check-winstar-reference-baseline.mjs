import { spawn } from 'node:child_process';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import process from 'node:process';
import { URL, pathToFileURL } from 'node:url';

const defaultWorkspace = resolve('/var/www/php/8.5/winstar2024');
const workspace = resolve(process.argv[2] ?? defaultWorkspace);
const fixtureSha256 = process.argv[4]; const fixtureDefinitionSha256 = process.argv[5];
if (fixtureSha256 || fixtureDefinitionSha256) {
  if (workspace === defaultWorkspace || !fixtureSha256 || !fixtureDefinitionSha256
    || ![fixtureSha256, fixtureDefinitionSha256].every((hash) => /^[a-f0-9]{64}$/.test(hash))) {
    throw new Error('Alternate location SHA-256 values require an isolated fixture workspace and both reference/definition hashes.');
  }
}
// Validate the same bundled entrypoint and parser assets shipped in the VSIX.
// Build it first; package-level TypeScript output is a separate test target.
const serverBundle = resolve(process.argv[3] ?? 'dist/language-server.js');
const checkReload = process.env.PHP_COMPANION_CHECK_REFERENCE_RELOAD === '1';
const checkEarlyReload = process.env.PHP_COMPANION_CHECK_REFERENCE_EARLY_RELOAD === '1';
const checkEarlyReloadPrewarm = process.env.PHP_COMPANION_CHECK_REFERENCE_EARLY_RELOAD_PREWARM === '1';
const sourceOnly = process.env.PHP_COMPANION_BENCHMARK_REFERENCE_SOURCE_ONLY === '1';
const immediateSourceOnly = sourceOnly && process.env.PHP_COMPANION_BENCHMARK_REFERENCE_IMMEDIATE === '1';
const primeThenImmediate = process.env.PHP_COMPANION_CHECK_REFERENCE_PRIME_THEN_IMMEDIATE === '1';
if (primeThenImmediate && (!checkReload || !sourceOnly || immediateSourceOnly)) {
  throw new Error('Prime-then-immediate References requires source-only indexing and reload without immediate mode.');
}
if (checkEarlyReload && (!checkReload || sourceOnly)) throw new Error('Early reload gate requires on-demand References with reload enabled.');
if (checkEarlyReloadPrewarm && !checkEarlyReload) throw new Error('Early reload prewarm gate requires early reload validation.');
const selected = sourceOnly && process.env.PHP_COMPANION_CHECK_REFERENCE_SELECTION === '1';
const symfonyProfile = process.env.PHP_COMPANION_CHECK_REFERENCE_SYMFONY !== '0';
const file = join(workspace, 'src/Security/AdminPasswordChangeGuard.php');
const cache = await mkdtemp(join(tmpdir(), 'php-companion-references-'));
const locationsPath = join(cache, 'reference-locations.json');
const expected = new Map([
  ['textDocument/definition', { results: 1, locationSha256: fixtureDefinitionSha256 ?? '62e58df5676259065d46d41bd7c267435d09577f70420fd6f2d94308b16295e1' }],
  ['textDocument/references', { results: 174, locationSha256: fixtureSha256 ?? 'a525dddaa628ccd7ee25dbd5dbfae0ead5e9ebedb434b9176336eb08c1c725e7' }],
]);

try {
  for (const phase of checkReload ? ['cold', 'reload'] : ['cold']) {
    const waitReferenceReady = sourceOnly && !immediateSourceOnly && !(primeThenImmediate && phase === 'reload');
    const child = spawn(process.execPath, [
      'scripts/benchmark-language-queries.mjs', workspace, file, 'get', 'last', cache, 'once', serverBundle,
    ], { cwd: new URL('..', import.meta.url), stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env, PHP_COMPANION_BENCHMARK_SYMFONY: symfonyProfile ? '1' : '0', PHP_COMPANION_BENCHMARK_REFERENCES_FIRST: '1',
        PHP_COMPANION_BENCHMARK_REFERENCE_LOCATIONS_PATH: locationsPath,
        PHP_COMPANION_BENCHMARK_REFERENCE_INPUTS: '0', PHP_COMPANION_BENCHMARK_REFERENCE_PERSISTENCE: checkReload && !sourceOnly ? '1' : '0',
        ...(waitReferenceReady ? { PHP_COMPANION_BENCHMARK_WAIT_REFERENCE_READY: '1', PHP_COMPANION_BENCHMARK_WAIT_INDEX_COMPLETE: '1' } : {}),
        ...(selected ? { PHP_COMPANION_BENCHMARK_SELECTION_PREWARM: '1', PHP_COMPANION_BENCHMARK_SELECTION_DELAY_MS: '0',
          PHP_COMPANION_BENCHMARK_WAIT_SELECTION_PREWARM: '1' } : {}),
        ...(checkEarlyReloadPrewarm && phase === 'reload' ? { PHP_COMPANION_BENCHMARK_SELECTION_PREWARM: '1',
          PHP_COMPANION_BENCHMARK_SELECTION_DELAY_MS: '0', PHP_COMPANION_BENCHMARK_WAIT_PROOF_PREWARM: '1' } : {}) } });
    let output = ''; let logs = '';
    child.stderr.setEncoding('utf8');
    child.stderr.on('data', (chunk) => { logs += chunk; process.stderr.write(chunk); });
    child.stdout.setEncoding('utf8');
    child.stdout.on('data', (chunk) => { output += chunk; });
    const code = await new Promise((done, reject) => {
      child.once('error', reject);
      child.once('exit', done);
    });
    if (code !== 0) throw new Error(`Benchmark exited with code ${code}`);
    if (checkReload && !sourceOnly && !(phase === 'reload' ? logs.includes('[reference-cache] restored') : logs.includes('[reference-cache] stored'))) {
      throw new Error(`Expected verified reference persistence during ${phase}`);
    }
    if (phase === 'reload') {
      if (checkEarlyReloadPrewarm && !logs.includes('[reference-prewarm] persistent proof available')) {
        throw new Error('Reload selection did not suppress the candidate prewarm scan.');
      }
      if (checkEarlyReload && (!logs.includes('[reference-cache] restored count=174 beforeProviders=true')
        || logs.includes('[named-candidates]') || logs.includes('Semantic provider ')
        || logs.includes('Authoritative route provider '))) {
        throw new Error('Reload did not restore the proven result before candidates and framework providers.');
      }
      if (sourceOnly && waitReferenceReady && (!/Indexed (\d+) PHP files[^\n]*\b\1 cached\b/.test(logs) || logs.includes('[named-candidates]'))) {
        throw new Error('Expected complete source-only index restoration during reload');
      }
      if (sourceOnly && waitReferenceReady && Number(/Indexed \d+ PHP files[^\n]*deferred implementations=(\d+)/.exec(logs)?.[1] ?? 0) < 1_000) {
        throw new Error('Expected cached source implementations to remain deferred after reload');
      }
      if (primeThenImmediate && !logs.includes('[named-candidates]')) {
        throw new Error('Immediate source-only reload unexpectedly skipped candidate validation; review the gate before accepting the timing.');
      }
      const scan = /\[named-candidates\] files=(\d+) cached=(\d+) parsed=(\d+)/.exec(logs);
      if (scan && !primeThenImmediate && (Number(scan[2]) < Number(scan[1]) - 1 || Number(scan[3]) > 1)) {
        throw new Error(`Reload rebuilt candidate files instead of restoring them: ${scan[0]}`);
      }
    }
    const results = output.trim().split('\n').map((line) => JSON.parse(line));
    if (results.length !== expected.size) throw new Error(`Expected ${expected.size} query results, received ${results.length}`);
    if (results[0]?.method !== 'textDocument/references' || new Set(results.map((result) => result.method)).size !== expected.size) {
      throw new Error('Expected first References without Definition warm-up, followed by Definition');
    }
    if (phase === 'reload' && checkEarlyReload && results[0].elapsedMs > 3_500) {
      throw new Error(`Early reload References exceeded 3500 ms: ${results[0].elapsedMs} ms`);
    }
    for (const result of results) {
      const baseline = expected.get(result.method);
      if (!baseline || result.results !== baseline.results || result.locationSha256 !== baseline.locationSha256) {
        throw new Error(`Reference baseline changed: ${JSON.stringify({ method: result.method, results: result.results, locationSha256: result.locationSha256 })}`);
      }
      process.stdout.write(`${phase} ${result.method}: ${result.results} locations, ${result.elapsedMs} ms${result.peakRssKiB ? `, peak/current RSS ${result.peakRssKiB}/${result.currentRssKiB} KiB` : ''}, full-location SHA-256 matched\n`);
    }
    if (selected) {
      const prewarmCount = /\[reference-prewarm\] semantic count=(\d+)/.exec(logs);
      const semanticMs = Number(/\[references:\d+\] semantic count=\d+ elapsedMs=(\d+)/.exec(logs)?.[1] ?? NaN);
      if (Number(prewarmCount?.[1]) !== 174 || !Number.isFinite(semanticMs) || semanticMs > 100
        || results[0].elapsedMs > 1_000 || logs.includes('[named-candidates]')) {
        throw new Error(`Selected References did not reuse its prepared semantic result during ${phase}`);
      }
    }
    if (phase === 'cold') {
      const preindexed = sourceOnly && logs.includes('Reference source facts ready')
        && /Indexed \d+ PHP files[^\n]*complete=false/.test(logs)
        && !logs.includes('[named-candidates]');
      const timings = Object.fromEntries(['candidates', 'container', 'routes', 'events', 'semantic'].map((name) => {
        const pattern = name === 'candidates' ? /\[named-candidates\][^\n]*elapsedMs=(\d+)/
          : name === 'semantic' ? /\[references:\d+\] semantic count=\d+ elapsedMs=(\d+)/
            : new RegExp(`\\[references:\\d+\\] ${name} elapsedMs=(\\d+)`);
        return [name, name === 'candidates' && preindexed ? 0 : Number(pattern.exec(logs)?.[1] ?? NaN)];
      }));
      if (Object.values(timings).some((value) => !Number.isFinite(value))) throw new Error('Cold References phase timing is incomplete.');
      process.stdout.write(`${phase} References phases: ${JSON.stringify(timings)}\n`);
    }
    const locations = JSON.parse(await readFile(locationsPath, 'utf8'));
    const subscriberUri = pathToFileURL(join(workspace, 'src/Bridge/ApplicationContextSubscriber.php')).toString();
    for (const line of [81, 84]) {
      if (!locations.some((location) => location.uri === subscriberUri && location.range?.start?.line === line)) {
        throw new Error(`Missing inherited RequestEvent ParameterBag::get reference at ApplicationContextSubscriber.php:${line + 1}`);
      }
    }
    const responseUri = pathToFileURL(join(workspace, 'vendor/symfony/http-foundation/Response.php')).toString();
    for (const line of [287, 1316]) {
      if (!locations.some((location) => location.uri === responseUri && location.range?.start?.line === line)) {
        throw new Error(`Missing vendor HeaderBag::get inherited reference at Response.php:${line + 1}`);
      }
    }
  }
} finally {
  await rm(cache, { recursive: true, force: true });
}
