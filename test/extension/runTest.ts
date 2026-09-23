import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { runTests, runVSCodeCommand } from '@vscode/test-electron';

async function availableDebugPort(): Promise<number> {
  const server = createServer();
  await new Promise<void>((resolveListen) => server.listen(0, '127.0.0.1', resolveListen));
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Could not reserve a Chromium debugging port.');
  await new Promise<void>((resolveClose) => server.close(() => resolveClose()));
  return address.port;
}

async function main(): Promise<void> {
  const sourceFixture = resolve(__dirname, '..', 'test', 'extension', 'baseline');
  const fixture = await mkdtemp(join(tmpdir(), 'php-companion-extension-'));
  await cp(sourceFixture, fixture, { recursive: true });
  const withIntelephense = process.env.PHP_COMPANION_TEST_WITH_INTELEPHENSE === '1';
  const c1Only = process.env.PHP_COMPANION_TEST_C1_ONLY === '1';
  const coreOnly = c1Only || process.env.PHP_COMPANION_TEST_CORE_ONLY === '1';
  const c1PhpVersion = process.env.PHP_COMPANION_TEST_C1_PHP_VERSION;
  const c1DebugPort = c1Only
    ? process.env.PHP_COMPANION_TEST_C1_DEBUG_PORT ?? (process.env.PHP_COMPANION_TEST_C1_UI === '1' ? String(await availableDebugPort()) : undefined)
    : undefined;
  if (c1Only && process.env.PHP_COMPANION_TEST_C1_UI === '1') {
    const bulk = join(fixture, 'vendor', 'acme', 'c1-library', 'src', 'Bulk');
    await mkdir(bulk, { recursive: true });
    for (let start = 0; start < 1_000; start += 50) {
      await Promise.all(Array.from({ length: 50 }, (_, offset) => {
        const index = start + offset;
        const target = index < 6 ? `UiVendorTarget${index}` : `Noise${index}`;
        const method = index < 6 ? `vendorVisible${index}` : `noiseMethod${index}`;
        return writeFile(join(bulk, `${target}.php`), `<?php namespace Acme\\C1\\Bulk; class ${target} { public function ${method}(): void {} }`);
      }));
    }
  }
  const runtimePhp = c1Only && !c1PhpVersion ? process.env.PHP_COMPANION_TEST_C1_RUNTIME_PHP : undefined;
  const runtimeVersion = runtimePhp ? execFileSync(runtimePhp, ['-r', 'echo PHP_VERSION;'], { encoding: 'utf8', timeout: 3_000 }).trim() : undefined;
  if (runtimeVersion && !/^8\.[0-5]\./u.test(runtimeVersion)) throw new Error(`C1 runtime probe needs PHP 8.0–8.5, received ${runtimeVersion}.`);
  const secondFixture = c1Only ? await mkdtemp(join(tmpdir(), 'php-companion-extension-second-')) : undefined;
  if (secondFixture) await cp(sourceFixture, secondFixture, { recursive: true });
  const runtimeFixture = runtimePhp ? await mkdtemp(join(tmpdir(), 'php-companion-extension-runtime-')) : undefined;
  if (runtimeFixture) {
    await cp(sourceFixture, runtimeFixture, { recursive: true });
    const composerPath = join(runtimeFixture, 'composer.json');
    const composer = JSON.parse(await readFile(composerPath, 'utf8')) as { require?: Record<string, string> };
    delete composer.require;
    await writeFile(composerPath, JSON.stringify(composer, null, 2));
    const settingsPath = join(runtimeFixture, '.vscode', 'settings.json');
    const settings = JSON.parse(await readFile(settingsPath, 'utf8')) as Record<string, unknown>;
    settings['phpCompanion.indexing.mode'] = 'onDemand';
    settings['phpCompanion.phpVersion'] = 'auto';
    settings['phpCompanion.phpExecutablePath'] = runtimePhp;
    await writeFile(settingsPath, JSON.stringify(settings, null, 2));
  }

  if (c1Only) {
    const settingsPath = join(fixture, '.vscode', 'settings.json');
    const settings = JSON.parse(await readFile(settingsPath, 'utf8')) as Record<string, unknown>;
    settings['phpCompanion.indexing.mode'] = 'onDemand';
    if (c1PhpVersion) settings['phpCompanion.phpVersion'] = c1PhpVersion;
    await writeFile(settingsPath, JSON.stringify(settings, null, 2));
    if (secondFixture) {
      const secondSettingsPath = join(secondFixture, '.vscode', 'settings.json');
      const secondSettings = { ...settings };
      if (c1PhpVersion) secondSettings['phpCompanion.phpVersion'] = c1PhpVersion === '7.2' ? '8.5' : '7.2';
      await writeFile(secondSettingsPath, JSON.stringify(secondSettings, null, 2));
      if (!c1PhpVersion) {
        const secondComposerPath = join(secondFixture, 'composer.json');
        const composer = JSON.parse(await readFile(secondComposerPath, 'utf8')) as Record<string, unknown>;
        composer.config = { platform: { php: '8.5.0' } };
        await writeFile(secondComposerPath, JSON.stringify(composer, null, 2));
      }
    }
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
    const workspaceFile = c1Only ? join(fixture, 'c1.code-workspace') : undefined;
    if (workspaceFile) await writeFile(workspaceFile, JSON.stringify({ folders: [
      { path: fixture, name: 'first' }, { path: secondFixture, name: 'second' },
      ...(runtimeFixture ? [{ path: runtimeFixture, name: 'runtime' }] : []),
    ] }));
    await runTests({
      extensionDevelopmentPath: coreOnly ? resolve(__dirname, '..')
        : [resolve(__dirname, '..'), resolve(__dirname, '..', 'packages', 'php-companion-symfony')],
      extensionTestsPath: resolve(__dirname, 'suite', c1Only ? 'c1' : 'index'),
      launchArgs: [workspaceFile ?? fixture, ...(withIntelephense ? [] : ['--disable-extensions']),
        ...(c1DebugPort ? [`--remote-debugging-port=${c1DebugPort}`] : [])],
      extensionTestsEnv: {
        ELECTRON_RUN_AS_NODE: undefined,
        VSCODE_ESM_ENTRYPOINT: undefined,
        PHP_COMPANION_TEST_WITH_INTELEPHENSE: withIntelephense ? '1' : undefined,
        PHP_COMPANION_TEST_CORE_ONLY: coreOnly ? '1' : undefined,
        PHP_COMPANION_TEST_C1_ONLY: c1Only ? '1' : undefined,
        PHP_COMPANION_TEST_C1_PHP_VERSION: c1Only ? c1PhpVersion : undefined,
        PHP_COMPANION_TEST_C1_RUNTIME_VERSION: runtimeVersion,
        PHP_COMPANION_TEST_C1_DEBUG_PORT: c1DebugPort,
      },
    });
  } finally {
    await rm(fixture, { recursive: true, force: true });
    if (secondFixture) await rm(secondFixture, { recursive: true, force: true });
    if (runtimeFixture) await rm(runtimeFixture, { recursive: true, force: true });
  }
}

void main();
