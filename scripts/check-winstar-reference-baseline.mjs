import { spawn } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import process from 'node:process';
import { URL } from 'node:url';

const workspace = resolve(process.argv[2] ?? '/var/www/php/8.5/winstar2024');
const file = join(workspace, 'src/Security/AdminPasswordChangeGuard.php');
const cache = await mkdtemp(join(tmpdir(), 'php-companion-references-'));
const expected = new Map([
  ['textDocument/definition', { results: 1, locationSha256: '62e58df5676259065d46d41bd7c267435d09577f70420fd6f2d94308b16295e1' }],
  ['textDocument/references', { results: 112, locationSha256: 'bc8a76393e58d2675b906614cc4b375e6279aac344df5ea21d9cdffa02afc3b2' }],
]);

try {
  const child = spawn(process.execPath, [
    'scripts/benchmark-language-queries.mjs', workspace, file, 'get', 'last', cache, 'once',
  ], { cwd: new URL('..', import.meta.url), stdio: ['ignore', 'pipe', 'inherit'],
    env: { ...process.env, PHP_COMPANION_BENCHMARK_REFERENCES_FIRST: '1' } });
  let output = '';
  child.stdout.setEncoding('utf8');
  child.stdout.on('data', (chunk) => { output += chunk; });
  const code = await new Promise((done, reject) => {
    child.once('error', reject);
    child.once('exit', done);
  });
  if (code !== 0) throw new Error(`Benchmark exited with code ${code}`);
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
    process.stdout.write(`${result.method}: ${result.results} locations, ${result.elapsedMs} ms, full-location SHA-256 matched\n`);
  }
} finally {
  await rm(cache, { recursive: true, force: true });
}
