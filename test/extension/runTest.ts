import { resolve } from 'node:path';
import { runTests, runVSCodeCommand } from '@vscode/test-electron';

async function main(): Promise<void> {
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

  await runTests({
    extensionDevelopmentPath: resolve(__dirname, '..'),
    extensionTestsPath: resolve(__dirname, 'suite', 'index'),
    launchArgs: [
      resolve(__dirname, '..', 'test', 'extension', 'fixture'),
      ...(withIntelephense ? [] : ['--disable-extensions']),
    ],
    extensionTestsEnv: {
      ELECTRON_RUN_AS_NODE: undefined,
      VSCODE_ESM_ENTRYPOINT: undefined,
      PHP_COMPANION_TEST_WITH_INTELEPHENSE: withIntelephense ? '1' : undefined,
    },
  });
}

void main();
