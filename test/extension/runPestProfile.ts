import { mkdtemp, readFile, realpath, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve, sep } from 'node:path';
import { runTests } from '@vscode/test-electron';

async function main(): Promise<void> {
  const projectSetting = process.env.PHP_COMPANION_TEST_PEST_PROJECT;
  const extensionsSetting = process.env.PHP_COMPANION_TEST_EXTENSIONS_DIR;
  const phpExecutable = process.env.PHP_COMPANION_PHP_EXECUTABLE;
  if (!projectSetting || !extensionsSetting || !phpExecutable) {
    throw new Error('Pest Profile requires a disposable project, isolated extensions directory and PHP executable.');
  }
  const project = await realpath(projectSetting);
  const temporaryRoot = await realpath(tmpdir());
  if (!project.startsWith(`${temporaryRoot}${sep}`)) throw new Error('Pest Profile project must be under the temporary directory.');
  const composer = JSON.parse(await readFile(join(project, 'composer.json'), 'utf8')) as {
    name?: string; 'require-dev'?: Record<string, string> };
  if (composer.name !== 'sophp/pest-evaluation' || !composer['require-dev']?.['pestphp/pest']) {
    throw new Error('Pest Profile needs the dedicated disposable Composer fixture.');
  }
  const userData = await mkdtemp(join(tmpdir(), 'sophp-pest-profile-'));
  try {
    await runTests({
      version: process.env.PHP_COMPANION_TEST_VSCODE_VERSION ?? '1.139.0',
      extensionDevelopmentPath: [resolve(__dirname, '..'),
        resolve(__dirname, '..', 'packages', 'php-companion-symfony'),
        resolve(__dirname, '..', 'packages', 'php-companion-extension-pack')],
      extensionTestsPath: resolve(__dirname, 'suite', 'pestProfile'),
      launchArgs: [project, `--extensions-dir=${resolve(extensionsSetting)}`, `--user-data-dir=${userData}`],
      extensionTestsEnv: {
        ELECTRON_RUN_AS_NODE: undefined,
        VSCODE_ESM_ENTRYPOINT: undefined,
        PHP_COMPANION_PHP_EXECUTABLE: phpExecutable,
      },
    });
  } finally {
    await rm(userData, { recursive: true, force: true });
  }
}

void main();
