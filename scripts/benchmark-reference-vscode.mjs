import { execFileSync } from 'node:child_process';
import { mkdtemp, mkdir, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import process from 'node:process';
import { downloadAndUnzipVSCode, runTests } from '@vscode/test-electron';

const args = process.argv.slice(2);
if (args[0] === '--') args.shift();
const [workspace, candidate, idle = '0'] = args;
if (!workspace || !candidate || !/^\d+$/.test(idle) || Number(idle) > 30_000) {
  throw new Error('Usage: node scripts/benchmark-reference-vscode.mjs <winstar-root> <alpha-candidate-dir> [idle-ms]');
}
const root = resolve(workspace);
const artifact = resolve(candidate);
await stat(join(root, 'src', 'Security', 'AdminPasswordChangeGuard.php'));
await stat(join(artifact, 'php-companion-0.4.5.vsix'));
await stat(join(artifact, 'php-companion-symfony-0.4.5.vsix'));
const temporary = await mkdtemp(join(tmpdir(), 'php-companion-reference-vscode-'));
try {
  const core = join(temporary, 'core'); const symfony = join(temporary, 'symfony'); const profile = join(temporary, 'profile');
  await Promise.all([mkdir(core), mkdir(symfony)]);
  execFileSync('unzip', ['-q', join(artifact, 'php-companion-0.4.5.vsix'), '-d', core]);
  execFileSync('unzip', ['-q', join(artifact, 'php-companion-symfony-0.4.5.vsix'), '-d', symfony]);
  await runTests({
    vscodeExecutablePath: await downloadAndUnzipVSCode(),
    extensionDevelopmentPath: [join(core, 'extension'), join(symfony, 'extension')],
    extensionTestsPath: resolve('dist-test/suite/referencePerformance'),
    launchArgs: [root, '--disable-extensions', '--disable-gpu', '--disable-workspace-trust', '--skip-welcome', '--skip-release-notes',
      `--user-data-dir=${join(profile, 'user-data')}`, `--extensions-dir=${join(profile, 'extensions')}`],
    extensionTestsEnv: { ELECTRON_RUN_AS_NODE: undefined, VSCODE_ESM_ENTRYPOINT: undefined,
      PHP_COMPANION_REFERENCE_PERF_WORKSPACE: root, PHP_COMPANION_REFERENCE_PERF_IDLE_MS: idle },
  });
} finally { await rm(temporary, { recursive: true, force: true }); }
