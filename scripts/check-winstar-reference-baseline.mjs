import { spawn } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import process from 'node:process';
import { URL } from 'node:url';

const workspace = resolve(process.argv[2] ?? '/var/www/php/8.5/winstar2024');
// Validate the same bundled entrypoint and parser assets shipped in the VSIX.
// Build it first; package-level TypeScript output is a separate test target.
const serverBundle = resolve(process.argv[3] ?? 'dist/language-server.js');
const checkReload = process.env.PHP_COMPANION_CHECK_REFERENCE_RELOAD === '1';
const file = join(workspace, 'src/Security/AdminPasswordChangeGuard.php');
const cache = await mkdtemp(join(tmpdir(), 'php-companion-references-'));
const expected = new Map([
  ['textDocument/definition', { results: 1, locationSha256: '62e58df5676259065d46d41bd7c267435d09577f70420fd6f2d94308b16295e1' }],
  ['textDocument/references', { results: 112, locationSha256: 'bc8a76393e58d2675b906614cc4b375e6279aac344df5ea21d9cdffa02afc3b2' }],
]);

try {
  for (const phase of checkReload ? ['cold', 'reload'] : ['cold']) {
    const child = spawn(process.execPath, [
      'scripts/benchmark-language-queries.mjs', workspace, file, 'get', 'last', cache, 'once', serverBundle,
    ], { cwd: new URL('..', import.meta.url), stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env, PHP_COMPANION_BENCHMARK_SYMFONY: '0', PHP_COMPANION_BENCHMARK_REFERENCES_FIRST: '1', PHP_COMPANION_BENCHMARK_REFERENCE_INPUTS: '0', PHP_COMPANION_BENCHMARK_REFERENCE_PERSISTENCE: checkReload ? '1' : '0' } });
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
    if (checkReload && !(phase === 'reload' ? logs.includes('[reference-cache] restored') : logs.includes('[reference-cache] stored'))) {
      throw new Error(`Expected verified reference persistence during ${phase}`);
    }
    if (phase === 'reload' && logs.includes('[named-candidates]')) throw new Error('Reload unexpectedly rescanned candidate files');
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
  }
} finally {
  await rm(cache, { recursive: true, force: true });
}
