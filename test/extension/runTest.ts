import { cp, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { runTests, runVSCodeCommand } from '@vscode/test-electron';

async function main(): Promise<void> {
  const sourceFixture = resolve(__dirname, '..', 'test', 'extension', 'baseline');
  const fixture = await mkdtemp(join(tmpdir(), 'php-companion-extension-'));
  await cp(sourceFixture, fixture, { recursive: true });
  const withIntelephense = process.env.PHP_COMPANION_TEST_WITH_INTELEPHENSE === '1';

  if (withIntelephense) {
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
      extensionDevelopmentPath: resolve(__dirname, '..'),
      extensionTestsPath: resolve(__dirname, 'suite', 'index'),
      launchArgs: [fixture, ...(withIntelephense ? [] : ['--disable-extensions'])],
      extensionTestsEnv: {
        ELECTRON_RUN_AS_NODE: undefined,
        VSCODE_ESM_ENTRYPOINT: undefined,
        PHP_COMPANION_TEST_WITH_INTELEPHENSE: withIntelephense ? '1' : undefined,
      },
    });
  } finally {
    await rm(fixture, { recursive: true, force: true });
  }
}

void main();
