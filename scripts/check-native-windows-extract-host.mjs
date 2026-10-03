import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import process from 'node:process';
import { clearTimeout, setTimeout } from 'node:timers';

assert.equal(process.platform, 'win32');
const [code, core, suite] = process.argv.slice(2); assert.ok(code && core && suite);
const root = await mkdtemp(join(tmpdir(), 'sophp-native-extract-'));
let child; let output = '';
try {
  await mkdir(join(root, 'src')); await mkdir(join(root, '.vscode'));
  await writeFile(join(root, 'composer.json'), JSON.stringify({ autoload: { 'psr-4': { 'App\\': 'src/' } } }));
  await writeFile(join(root, '.vscode', 'settings.json'), JSON.stringify({ 'phpCompanion.phpVersion': '8.5',
    'phpCompanion.indexing.mode': 'experimental', 'php.validate.enable': false, 'php.suggest.basic': false }));
  const env = { ...process.env }; delete env.ELECTRON_RUN_AS_NODE; delete env.VSCODE_ESM_ENTRYPOINT;
  child = spawn(code, [root, '--disable-extensions', '--disable-workspace-trust', '--skip-welcome', '--skip-release-notes',
    `--user-data-dir=${join(root, 'user data')}`, `--extensions-dir=${join(root, 'extensions')}`,
    `--extensionDevelopmentPath=${core}`, `--extensionTestsPath=${suite}`], { env, stdio: ['ignore', 'pipe', 'pipe'] });
  for (const stream of [child.stdout, child.stderr]) stream.on('data', chunk => {
    process.stdout.write(chunk); output = (output + chunk.toString()).slice(-262_144);
  });
  await new Promise((done, reject) => {
    const timer = setTimeout(() => { child.kill(); reject(new Error('Windows extraction host timed out')); }, 120_000);
    child.once('error', error => { clearTimeout(timer); reject(error); });
    child.once('exit', (status, signal) => { clearTimeout(timer);
      if (status === 0 && !signal) done(); else reject(new Error(`Editor exited ${status}/${signal}`));
    });
  });
  const match = output.match(/(Extract static interface host proof|Extract EOL guard host proof): (\{[^\r\n]*\})/u); assert.ok(match);
  const proof = JSON.parse(match[2]); assert.equal(proof.platform, 'win32');
  if (match[1] === 'Extract EOL guard host proof') {
    assert.deepEqual(proof.results.map(item => item.scenario), ['target-content', 'stale-source']);
    assert.ok(proof.results.every(item => item.rejected));
    assert.equal(proof.results[0].unexpectedTextPreserved, true); assert.equal(proof.results[1].targetNotCreated, true);
  } else for (const key of ['extracted', 'staticReturnsPreserved', 'undoRestoresSourceAndDeletesFile', 'redoRestoresSourceAndFile']) assert.equal(proof[key], true);
  process.stdout.write(`Windows extraction host proof: ${JSON.stringify(proof)}\n`);
} finally {
  if (child && child.exitCode === null) child.kill();
  await rm(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
}
