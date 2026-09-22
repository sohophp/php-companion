import { spawn } from 'node:child_process';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import process from 'node:process';
import { URL, pathToFileURL } from 'node:url';

const workspace = resolve(process.argv[2] ?? '/var/www/php/8.5/winstar2024');
// Validate the same bundled entrypoint and parser assets shipped in the VSIX.
// Build it first; package-level TypeScript output is a separate test target.
const serverBundle = resolve(process.argv[3] ?? 'dist/language-server.js');
const checkReload = process.env.PHP_COMPANION_CHECK_REFERENCE_RELOAD === '1';
const sourceOnly = process.env.PHP_COMPANION_BENCHMARK_REFERENCE_SOURCE_ONLY === '1';
const symfonyProfile = process.env.PHP_COMPANION_CHECK_REFERENCE_SYMFONY !== '0';
const file = join(workspace, 'src/Security/AdminPasswordChangeGuard.php');
const cache = await mkdtemp(join(tmpdir(), 'php-companion-references-'));
const locationsPath = join(cache, 'reference-locations.json');
const expected = new Map([
  ['textDocument/definition', { results: 1, locationSha256: '62e58df5676259065d46d41bd7c267435d09577f70420fd6f2d94308b16295e1' }],
  ['textDocument/references', { results: 127, locationSha256: '64da8a3d32297acd6ff06ec6e25ba54a940f2f81032f9936b85c238622aec531' }],
]);

try {
  for (const phase of checkReload ? ['cold', 'reload'] : ['cold']) {
    const child = spawn(process.execPath, [
      'scripts/benchmark-language-queries.mjs', workspace, file, 'get', 'last', cache, 'once', serverBundle,
    ], { cwd: new URL('..', import.meta.url), stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env, PHP_COMPANION_BENCHMARK_SYMFONY: symfonyProfile ? '1' : '0', PHP_COMPANION_BENCHMARK_REFERENCES_FIRST: '1',
        PHP_COMPANION_BENCHMARK_REFERENCE_LOCATIONS_PATH: locationsPath,
        PHP_COMPANION_BENCHMARK_REFERENCE_INPUTS: '0', PHP_COMPANION_BENCHMARK_REFERENCE_PERSISTENCE: checkReload && !sourceOnly ? '1' : '0',
        ...(phase === 'reload' && sourceOnly ? { PHP_COMPANION_BENCHMARK_INITIAL_IDLE_MS: process.env.PHP_COMPANION_BENCHMARK_RELOAD_IDLE_MS ?? '15000' } : {}) } });
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
      if (sourceOnly && (!/Indexed (\d+) PHP files[^\n]*\b\1 cached\b/.test(logs) || logs.includes('[named-candidates]'))) {
        throw new Error('Expected complete source-only index restoration during reload');
      }
      const scan = /\[named-candidates\] files=(\d+) cached=(\d+) parsed=(\d+)/.exec(logs);
      if (scan && (Number(scan[2]) < Number(scan[1]) - 1 || Number(scan[3]) > 1)) {
        throw new Error(`Reload rebuilt candidate files instead of restoring them: ${scan[0]}`);
      }
    }
    const results = output.trim().split('\n').map((line) => JSON.parse(line));
    if (results.length !== expected.size) throw new Error(`Expected ${expected.size} query results, received ${results.length}`);
    if (results[0]?.method !== 'textDocument/references' || new Set(results.map((result) => result.method)).size !== expected.size) {
      throw new Error('Expected first References without Definition warm-up, followed by Definition');
    }
    for (const result of results) {
      const baseline = expected.get(result.method);
      if (!baseline || result.results !== baseline.results || result.locationSha256 !== baseline.locationSha256) {
        throw new Error(`Reference baseline changed: ${JSON.stringify({ method: result.method, results: result.results, locationSha256: result.locationSha256 })}`);
      }
      process.stdout.write(`${phase} ${result.method}: ${result.results} locations, ${result.elapsedMs} ms, full-location SHA-256 matched\n`);
    }
    if (phase === 'cold') {
      const preindexed = process.env.PHP_COMPANION_BENCHMARK_REFERENCE_SOURCE_ONLY === '1'
        && logs.includes('Project source index ready') && /Indexed \d+ PHP files[^\n]*complete=false/.test(logs)
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
  }
} finally {
  await rm(cache, { recursive: true, force: true });
}
