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
  const realVendorNoise = Number(process.env.PHP_COMPANION_TEST_C1_REAL_VENDOR_NOISE ?? 0);
  if (!Number.isSafeInteger(realVendorNoise) || realVendorNoise < 0 || realVendorNoise > 60_000) {
    throw new Error('PHP_COMPANION_TEST_C1_REAL_VENDOR_NOISE must be an integer from 0 to 60,000.');
  }
  const coldWarmRounds = Number(process.env.PHP_COMPANION_TEST_C1_COLD_WARM_ROUNDS ?? 0);
  if (!Number.isSafeInteger(coldWarmRounds) || coldWarmRounds < 0 || coldWarmRounds > 200) {
    throw new Error('PHP_COMPANION_TEST_C1_COLD_WARM_ROUNDS must be an integer from 0 to 200.');
  }
  const withIntelephense = process.env.PHP_COMPANION_TEST_WITH_INTELEPHENSE === '1';
  const c1Only = process.env.PHP_COMPANION_TEST_C1_ONLY === '1';
  const c2Only = process.env.PHP_COMPANION_TEST_C2_ONLY === '1';
  const c3Only = process.env.PHP_COMPANION_TEST_C3_ONLY === '1';
  const c3OpenSourceProfile = c3Only && process.env.PHP_COMPANION_TEST_C3_OPEN_SOURCE_PROFILE === '1';
  const c3PhpunitPairProfile = c3Only && process.env.PHP_COMPANION_TEST_C3_PHPUNIT_PAIR_PROFILE === '1';
  const docblockerOnly = process.env.PHP_COMPANION_TEST_DOCBLOCKER_ONLY === '1';
  const docblockerExtensionsDir = process.env.PHP_COMPANION_TEST_DOCBLOCKER_EXTENSIONS_DIR;
  const docblockerUserDataDir = process.env.PHP_COMPANION_TEST_DOCBLOCKER_USER_DATA_DIR;
  if (docblockerOnly && (!docblockerExtensionsDir || !docblockerUserDataDir)) {
    throw new Error('DocBlocker profile test requires isolated extensions and user data directories.');
  }
  if ((c3OpenSourceProfile || c3PhpunitPairProfile) && !process.env.PHP_COMPANION_TEST_EXTENSIONS_DIR) {
    throw new Error('C3 Open Source Profile test requires PHP_COMPANION_TEST_EXTENSIONS_DIR.');
  }
  if (realVendorNoise && (!c1Only || process.env.PHP_COMPANION_TEST_C1_REAL_VENDOR !== '1')) {
    throw new Error('Real vendor noise needs C1 mode and PHP_COMPANION_TEST_C1_REAL_VENDOR=1.');
  }
  const fixture = await mkdtemp(join(tmpdir(), 'php-companion-extension-'));
  await cp(sourceFixture, fixture, { recursive: true });
  if (c3OpenSourceProfile || c3PhpunitPairProfile) {
    await mkdir(join(fixture, 'tests'), { recursive: true });
    const composerPath = join(fixture, 'composer.json');
    const composer = JSON.parse(await readFile(composerPath, 'utf8')) as Record<string, unknown>;
    composer['autoload-dev'] = { 'psr-4': { 'App\\Tests\\': 'tests/' } };
    await writeFile(composerPath, JSON.stringify(composer, null, 2));
    await writeFile(join(fixture, 'phpunit.xml'),
      '<?xml version="1.0"?>\n<phpunit><testsuites><testsuite name="Profile"><directory suffix="Test.php">tests</directory></testsuite></testsuites></phpunit>\n');
    await writeFile(join(fixture, 'tests', 'ProfileTest.php'),
      '<?php\nfinal class ProfileTest extends \\PHPUnit\\Framework\\TestCase { public function testReady(): void { self::assertTrue(true); } }\n');
    await writeFile(join(fixture, 'tests', 'C3ConfiguredTest.php'),
      '<?php\nnamespace App\\Tests;\nfinal class C3ConfiguredTest extends \\PHPUnit\\Framework\\TestCase { public function testReady(): void { self::assertTrue(true); } }\n');
  }
  const coreOnly = c1Only || c2Only || process.env.PHP_COMPANION_TEST_CORE_ONLY === '1';
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
  const runtimeDiscover = c1Only && !c1PhpVersion && process.env.PHP_COMPANION_TEST_C1_RUNTIME_DISCOVER === '1';
  const runtimeVersion = runtimePhp || runtimeDiscover
    ? execFileSync(runtimePhp ?? 'php', ['-r', 'echo PHP_VERSION;'], { encoding: 'utf8', timeout: 3_000 }).trim() : undefined;
  if (runtimeVersion && !/^(?:7\.[234]|8\.[0-5])\./u.test(runtimeVersion)) {
    throw new Error(`C1 runtime probe needs PHP 7.2–8.5, received ${runtimeVersion}.`);
  }
  const secondFixture = c1Only ? await mkdtemp(join(tmpdir(), 'php-companion-extension-second-')) : undefined;
  if (secondFixture) await cp(sourceFixture, secondFixture, { recursive: true });
  const runtimeFixture = runtimeVersion ? await mkdtemp(join(tmpdir(), 'php-companion-extension-runtime-')) : undefined;
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
    if (runtimePhp) settings['phpCompanion.phpExecutablePath'] = runtimePhp;
    await writeFile(settingsPath, JSON.stringify(settings, null, 2));
  }
  const realVendorFixture = c1Only && process.env.PHP_COMPANION_TEST_C1_REAL_VENDOR === '1'
    ? await mkdtemp(join(tmpdir(), 'php-companion-extension-real-vendor-')) : undefined;
  if (realVendorFixture) {
    await cp(resolve(__dirname, '..', 'test', 'extension', 'real-vendor'), realVendorFixture, { recursive: true });
    if (realVendorNoise) {
      const noise = join(realVendorFixture, 'src', 'Noise');
      await mkdir(noise, { recursive: true });
      for (let start = 0; start < realVendorNoise; start += 100) {
        await Promise.all(Array.from({ length: Math.min(100, realVendorNoise - start) }, (_, offset) => {
          const index = start + offset;
          return writeFile(join(noise, `Unrelated${index}.php`),
            `<?php namespace App\\C1\\Noise; final class Unrelated${index} { public function item${index}(): int { return ${index}; } }`);
        }));
      }
    }
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
  if (!c1Only) {
    const settingsPath = join(fixture, '.vscode', 'settings.json');
    const settings = JSON.parse(await readFile(settingsPath, 'utf8')) as Record<string, unknown>;
    settings['phpCompanion.phpVersion'] = docblockerOnly ? process.env.PHP_COMPANION_TEST_DOCBLOCKER_PHP_VERSION ?? '8.5' : '8.5';
    if (c2Only || docblockerOnly) settings['phpCompanion.indexing.mode'] = 'onDemand';
    await writeFile(settingsPath, JSON.stringify(settings, null, 2));
  }

  if (c3OpenSourceProfile || c3PhpunitPairProfile) {
    const userSettingsDirectory = join(fixture, 'profile-user-data', 'User');
    await mkdir(userSettingsDirectory, { recursive: true });
    await writeFile(join(userSettingsDirectory, 'settings.json'), JSON.stringify({
      'extensions.autoCheckUpdates': false,
      'extensions.autoUpdate': false,
      'update.mode': 'none',
    }, null, 2));
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
      ...(realVendorFixture ? [{ path: realVendorFixture, name: 'real-vendor' }] : []),
    ] }));
    await runTests({
      extensionDevelopmentPath: coreOnly ? resolve(__dirname, '..')
        : [resolve(__dirname, '..'), resolve(__dirname, '..', 'packages', 'php-companion-symfony'),
          ...(docblockerOnly || c3OpenSourceProfile ? [resolve(__dirname, '..', 'packages', 'php-companion-extension-pack')] : [])],
      extensionTestsPath: resolve(__dirname, 'suite', c1Only ? 'c1' : c2Only ? 'c2' : c3Only ? 'c3' : docblockerOnly ? 'docblocker' : 'index'),
      launchArgs: [workspaceFile ?? fixture, ...(withIntelephense || docblockerOnly || c3OpenSourceProfile || c3PhpunitPairProfile ? [] : ['--disable-extensions']),
        ...(docblockerOnly ? [
          `--extensions-dir=${resolve(docblockerExtensionsDir!)}`,
          `--user-data-dir=${resolve(docblockerUserDataDir!)}`,
        ] : []),
        ...(c3OpenSourceProfile || c3PhpunitPairProfile ? [
          `--extensions-dir=${resolve(process.env.PHP_COMPANION_TEST_EXTENSIONS_DIR!)}`,
          `--user-data-dir=${join(fixture, 'profile-user-data')}`,
        ] : []),
        ...(c1DebugPort ? [`--remote-debugging-port=${c1DebugPort}`] : [])],
      extensionTestsEnv: {
        ELECTRON_RUN_AS_NODE: undefined,
        VSCODE_ESM_ENTRYPOINT: undefined,
        PHP_COMPANION_TEST_WITH_INTELEPHENSE: withIntelephense ? '1' : undefined,
        PHP_COMPANION_TEST_CORE_ONLY: coreOnly ? '1' : undefined,
        PHP_COMPANION_TEST_C3_OPEN_SOURCE_PROFILE: c3OpenSourceProfile ? '1' : undefined,
        PHP_COMPANION_TEST_C3_PHPUNIT_PAIR_PROFILE: c3PhpunitPairProfile ? '1' : undefined,
        PHP_COMPANION_TEST_C3_PHPUNIT_CHURN: c3OpenSourceProfile || c3PhpunitPairProfile ? process.env.PHP_COMPANION_TEST_C3_PHPUNIT_CHURN : undefined,
        PHP_COMPANION_TEST_C3_REDO_PROBE: c3Only ? process.env.PHP_COMPANION_TEST_C3_REDO_PROBE : undefined,
        PHP_COMPANION_TEST_C1_ONLY: c1Only ? '1' : undefined,
        PHP_COMPANION_TEST_C1_PHP_VERSION: c1Only ? c1PhpVersion : undefined,
        PHP_COMPANION_TEST_C1_RUNTIME_VERSION: runtimeVersion,
        PHP_COMPANION_TEST_C1_RUNTIME_DISCOVER: runtimeDiscover ? '1' : undefined,
        PHP_COMPANION_TEST_C1_REAL_VENDOR: realVendorFixture ? '1' : undefined,
        PHP_COMPANION_TEST_C1_REAL_VENDOR_NOISE: realVendorNoise ? String(realVendorNoise) : undefined,
        PHP_COMPANION_TEST_C1_COLD_QUERY: c1Only ? process.env.PHP_COMPANION_TEST_C1_COLD_QUERY : undefined,
        PHP_COMPANION_TEST_C1_COLD_WARM_ROUNDS: c1Only ? String(coldWarmRounds) : undefined,
        PHP_COMPANION_TEST_C1_CHAIN_ROUNDS: c1Only ? process.env.PHP_COMPANION_TEST_C1_CHAIN_ROUNDS : undefined,
        PHP_COMPANION_TEST_C1_DEBUG_PORT: c1DebugPort,
        PHP_COMPANION_TEST_DOCBLOCKER_PHP_VERSION: docblockerOnly ? process.env.PHP_COMPANION_TEST_DOCBLOCKER_PHP_VERSION ?? '8.5' : undefined,
      },
    });
  } finally {
    await rm(fixture, { recursive: true, force: true });
    if (secondFixture) await rm(secondFixture, { recursive: true, force: true });
    if (realVendorFixture) await rm(realVendorFixture, { recursive: true, force: true });
    if (runtimeFixture) await rm(runtimeFixture, { recursive: true, force: true });
  }
}

void main();
