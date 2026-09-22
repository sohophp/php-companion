import { spawn } from 'node:child_process';
import { resolve } from 'node:path';
import process from 'node:process';

const [workspace, candidate = 'dist/language-server.js', baseline] = process.argv.slice(2);
if (!workspace) throw new Error('Usage: node scripts/benchmark-reference-suite.mjs <winstar-root> [candidate-bundle] [baseline-bundle]');

const root = resolve(workspace);
const fixtures = [
  {
    name: 'short vendor method', file: 'src/Security/AdminPasswordChangeGuard.php', symbol: 'get',
    sha256: 'a525dddaa628ccd7ee25dbd5dbfae0ead5e9ebedb434b9176336eb08c1c725e7',
  },
  {
    name: 'Symfony service class', file: 'src/Bridge/AdminSecuritySubscriber.php', symbol: 'AdminSecuritySubscriber',
    sha256: 'c0d5d86b7e083c6f21354d508f2897712e0b7b6a8663efd6cf2066788ff221fd',
  },
];

for (const fixture of fixtures) {
  const args = ['scripts/benchmark-first-references.mjs', root, resolve(root, fixture.file), fixture.symbol,
    'last', resolve(candidate), ...(baseline ? [resolve(baseline)] : [])];
  const child = spawn(process.execPath, args, {
    env: { ...process.env, PHP_COMPANION_BENCHMARK_SYMFONY: '1',
      PHP_COMPANION_EXPECTED_REFERENCES_SHA256: fixture.sha256 },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let stdout = ''; let stderr = '';
  child.stdout.setEncoding('utf8').on('data', (chunk) => { stdout += chunk; });
  child.stderr.setEncoding('utf8').on('data', (chunk) => { stderr += chunk; });
  const status = await new Promise((done) => child.once('exit', (code, signal) => done({ code, signal })));
  if (status.code !== 0) throw new Error(`${fixture.name} failed (${status.code ?? status.signal}): ${stderr}`);
  process.stdout.write(`${JSON.stringify({ fixture: fixture.name, ...JSON.parse(stdout) }, null, 2)}\n`);
}
