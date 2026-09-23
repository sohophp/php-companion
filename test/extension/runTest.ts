import { cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { runTests, runVSCodeCommand } from '@vscode/test-electron';

async function main(): Promise<void> {
  const sourceFixture = resolve(__dirname, '..', 'test', 'extension', 'baseline');
  const fixture = await mkdtemp(join(tmpdir(), 'php-companion-extension-'));
  await cp(sourceFixture, fixture, { recursive: true });
  const withIntelephense = process.env.PHP_COMPANION_TEST_WITH_INTELEPHENSE === '1';
  const c1Only = process.env.PHP_COMPANION_TEST_C1_ONLY === '1';
  const coreOnly = c1Only || process.env.PHP_COMPANION_TEST_CORE_ONLY === '1';
  const c1PhpVersion = process.env.PHP_COMPANION_TEST_C1_PHP_VERSION;

  if (c1Only) {
    const settingsPath = join(fixture, '.vscode', 'settings.json');
    const settings = JSON.parse(await readFile(settingsPath, 'utf8')) as Record<string, unknown>;
    settings['phpCompanion.indexing.mode'] = 'onDemand';
    if (c1PhpVersion) settings['phpCompanion.phpVersion'] = c1PhpVersion;
    await writeFile(settingsPath, JSON.stringify(settings, null, 2));
  }

  if (withIntelephense) {
    const settingsPath = join(fixture, '.vscode', 'settings.json');
    const settings = JSON.parse(await readFile(settingsPath, 'utf8')) as Record<string, unknown>;
    delete settings['phpCompanion.languageServer.enabled'];
    await writeFile(settingsPath, JSON.stringify(settings, null, 2));
    await runVSCodeCommand([
      '--install-extension',
      'bmewburn.vscode-intelephense-client',
      '--force',
    ], {
      spawn: {
        env: {
          ...process.env,
          VSCODE_IPC_HOOK_CLI: undefined,
          DONT_PROMPT_WSL_INSTALL: '1',
        },
      },
    });
  }

  try {
    await runTests({
      extensionDevelopmentPath: coreOnly ? resolve(__dirname, '..')
        : [resolve(__dirname, '..'), resolve(__dirname, '..', 'packages', 'php-companion-symfony')],
      extensionTestsPath: resolve(__dirname, 'suite', c1Only ? 'c1' : 'index'),
      launchArgs: [fixture, ...(withIntelephense ? [] : ['--disable-extensions'])],
      extensionTestsEnv: {
        ELECTRON_RUN_AS_NODE: undefined,
        VSCODE_ESM_ENTRYPOINT: undefined,
        PHP_COMPANION_TEST_WITH_INTELEPHENSE: withIntelephense ? '1' : undefined,
        PHP_COMPANION_TEST_CORE_ONLY: coreOnly ? '1' : undefined,
        PHP_COMPANION_TEST_C1_ONLY: c1Only ? '1' : undefined,
        PHP_COMPANION_TEST_C1_PHP_VERSION: c1Only ? c1PhpVersion : undefined,
      },
    });
  } finally {
    await rm(fixture, { recursive: true, force: true });
  }
}

void main();
