import assert from 'node:assert/strict';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import process from 'node:process';
import { runTests } from '@vscode/test-electron';

const [code, core, debuggerPath, suite, php] = process.argv.slice(2); assert.ok(code && core && debuggerPath && suite && php);
const root = await mkdtemp(join(tmpdir(), 'sophp-xdebug-host-'));
try {
  const server = createServer();
  await new Promise(done => server.listen(0, '127.0.0.1', done));
  const port = server.address().port;
  await new Promise(done => server.close(done));
  await mkdir(join(root, '.vscode'));
  await mkdir(join(root, 'src'));
  await writeFile(join(root, 'composer.json'), JSON.stringify({ require: { php: '>=8.5' }, autoload: { 'psr-4': { 'App\\': 'src/' } } }));
  await writeFile(join(root, '.vscode', 'settings.json'), JSON.stringify({ 'phpCompanion.phpExecutablePath': php,
    'phpCompanion.phpVersion': 'auto', 'phpCompanion.indexing.mode': debuggerPath === '-' ? 'experimental' : 'onDemand', 'php.validate.enable': false, 'php.suggest.basic': false }));
  await runTests({ vscodeExecutablePath: resolve(code), extensionDevelopmentPath: [resolve(core), ...(debuggerPath === '-' ? [] : [resolve(debuggerPath)])],
    extensionTestsPath: resolve(suite), extensionTestsEnv: { SOPHP_DEBUG_PHP: php, SOPHP_DEBUG_PORT: String(port),
      ELECTRON_RUN_AS_NODE: undefined, VSCODE_ESM_ENTRYPOINT: undefined },
    launchArgs: [root, '--no-sandbox', '--disable-gpu', '--disable-extensions', '--skip-welcome', '--skip-release-notes',
      `--user-data-dir=${join(root, 'user-data')}`, `--extensions-dir=${join(root, 'extensions')}`] });
} finally { await rm(root, { recursive: true, force: true }); }
