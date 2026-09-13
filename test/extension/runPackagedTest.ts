import { execFileSync } from 'node:child_process';
import { chmod, cp, mkdtemp, mkdir, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { downloadAndUnzipVSCode, runTests } from '@vscode/test-electron';

async function macOSExecutablePath(): Promise<string | undefined> {
  if (process.platform !== 'darwin') return undefined;
  const expected = await downloadAndUnzipVSCode();
  try {
    await stat(expected);
    return expected;
  } catch {
    const directory = dirname(expected);
    const candidates = (await readdir(directory, { withFileTypes: true }))
      .filter((entry) => entry.isFile())
      .map((entry) => join(directory, entry.name))
      .sort();
    if (candidates.length === 1) return candidates[0];
    throw new Error(`Unable to resolve the downloaded VS Code executable. Expected ${expected}; found ${candidates.join(', ') || 'no files'}.`);
  }
}

async function main(): Promise<void> {
  const repository = resolve(__dirname, '..');
  const vsix = join(repository, 'php-companion-0.4.5.vsix');
  await stat(vsix);
  const temporary = await mkdtemp(join(tmpdir(), 'php-companion-packaged-'));
  const fixture = join(temporary, 'workspace');
  const extracted = join(temporary, 'vsix');
  const profile = join(temporary, 'profile');
  const externalExtensions = process.env.PHP_COMPANION_TEST_EXTENSIONS_DIR;
  let formatterExecutable = process.env.PHP_COMPANION_FORMATTER_EXECUTABLE;
  if (externalExtensions && !formatterExecutable && process.env.PHP_COMPANION_PHP_EXECUTABLE && process.env.PHP_COMPANION_PHP_CS_FIXER) {
    formatterExecutable = join(profile, 'tools', 'php-cs-fixer');
    await mkdir(join(profile, 'tools'), { recursive: true });
    const quote = (value: string): string => `'${value.replaceAll("'", "'\\''")}'`;
    await writeFile(formatterExecutable, `#!/usr/bin/env bash\nexec ${quote(process.env.PHP_COMPANION_PHP_EXECUTABLE)} ${quote(process.env.PHP_COMPANION_PHP_CS_FIXER)} "$@"\n`);
    await chmod(formatterExecutable, 0o755);
  }
  if (externalExtensions) await stat(externalExtensions);
  try {
    const userSettingsDirectory = join(profile, 'user-data', 'User');
    await mkdir(userSettingsDirectory, { recursive: true });
    await writeFile(join(userSettingsDirectory, 'settings.json'), JSON.stringify({
      'extensions.autoCheckUpdates': false,
      'extensions.autoUpdate': false,
      'update.mode': 'none',
    }, null, 2));
    await cp(join(repository, 'test', 'extension', 'baseline'), fixture, { recursive: true });
    const settingsPath = join(fixture, '.vscode', 'settings.json');
    const settings = JSON.parse(await readFile(settingsPath, 'utf8')) as Record<string, unknown>;
    // Packaged tests must exercise the extension manifest default rather than
    // inheriting the explicit development-fixture opt-in.
    delete settings['phpCompanion.languageServer.enabled'];
    if (externalExtensions) {
      if (process.env.PHP_COMPANION_PHP_EXECUTABLE) settings['symfonyLsp.phpCommand'] = [process.env.PHP_COMPANION_PHP_EXECUTABLE];
      settings['symfonyLsp.runtimeIndexing'] = false;
      settings['symfonyLsp.releaseMetadata'] = false;
      await writeFile(join(fixture, 'composer.json'), JSON.stringify({
        require: { php: '>=7.2', 'symfony/framework-bundle': '^7.4' },
        autoload: { 'psr-4': { 'App\\': 'src/' } },
      }));
      await mkdir(join(fixture, 'tests'), { recursive: true });
      await writeFile(join(fixture, 'phpunit.xml'), '<?xml version="1.0"?>\n<phpunit><testsuites><testsuite name="Profile"><directory suffix="Test.php">tests</directory></testsuite></testsuites></phpunit>\n');
      await mkdir(join(fixture, 'bin'), { recursive: true });
      await writeFile(join(fixture, 'bin', 'console'), '<?php throw new \\RuntimeException("Static profile must not execute the kernel");\n');
      await writeFile(join(fixture, 'config', 'routes.yaml'), 'profile_route_home:\n  path: /profile/home\n  controller: App\\Controller\\ProfileRoute::url\ncontrollers:\n  resource: ../src/Controller/**/*.php\n  type: attribute\n  exclude: ../src/Controller/Excluded*.php\nmapped:\n  resource: {path: ../src/Mapped, namespace: App\\Mapped}\n  type: attribute\n  name_prefix: profile_route_\n');
      await mkdir(join(fixture, 'src', 'Mapped'), { recursive: true });
      await writeFile(join(fixture, 'src', 'Mapped', 'Implicit.php'), String.raw`<?php
namespace App\Mapped;
class Implicit { #[\Symfony\Component\Routing\Attribute\Route('/profile/implicit')] public function indexAction() {} }
class Extra { #[\Symfony\Component\Routing\Attribute\Route('/wrong', name: 'wrong')] public function run() {} }
`);
      await writeFile(join(fixture, 'src', 'Controller', 'ExcludedRoute.php'), String.raw`<?php
namespace App\Controller;
class ExcludedRoute { #[\Symfony\Component\Routing\Attribute\Route('/excluded', name: 'profile_route_excluded')] public function run() {} }
`);
      await writeFile(join(fixture, 'src', 'Controller', 'ProfileRoute.php'), `<?php
namespace App\\Controller;
use Symfony\\Bundle\\FrameworkBundle\\Controller\\AbstractController;
final class ProfileRoute extends AbstractController {
    #[\\Symfony\\Component\\Routing\\Attribute\\Route('/profile/attribute', name: 'profile_route_attribute')]
    public function url(): string { return $this->generateUrl('profile_route_attribute'); }
    public function yamlUrl(): string { return $this->generateUrl(parameters: [], route: 'profile_route_home'); }
}
namespace Symfony\\Bundle\\FrameworkBundle\\Controller;
abstract class AbstractController { public function generateUrl(string $route, array $parameters = []): string { return ''; } }
`);
    }
    await writeFile(settingsPath, JSON.stringify(settings, null, 2));
    await mkdir(extracted, { recursive: true });
    execFileSync('unzip', ['-q', vsix, '-d', extracted], { stdio: 'inherit' });
    await runTests({
      vscodeExecutablePath: await macOSExecutablePath(),
      extensionDevelopmentPath: join(extracted, 'extension'),
      extensionTestsPath: resolve(__dirname, 'suite', 'index'),
      launchArgs: [
        fixture,
        ...(externalExtensions ? [] : ['--disable-extensions']),
        '--disable-gpu',
        '--disable-workspace-trust',
        '--skip-welcome',
        '--skip-release-notes',
        `--user-data-dir=${join(profile, 'user-data')}`,
        `--extensions-dir=${externalExtensions ?? join(profile, 'extensions')}`,
      ],
      extensionTestsEnv: {
        ELECTRON_RUN_AS_NODE: undefined,
        VSCODE_ESM_ENTRYPOINT: undefined,
        PHP_COMPANION_PACKAGED_TEST: '1',
        PHP_COMPANION_OPEN_SOURCE_PROFILE: externalExtensions ? '1' : undefined,
        PHP_COMPANION_FORMATTER_EXECUTABLE: formatterExecutable,
        PHP_COMPANION_PHP_EXECUTABLE: process.env.PHP_COMPANION_PHP_EXECUTABLE,
        PHP_COMPANION_PHPUNIT_EXECUTABLE: process.env.PHP_COMPANION_PHPUNIT_EXECUTABLE,
      },
    });
    console.log(`Verified packaged PHP Companion VSIX in ${externalExtensions ? 'the Open Source Profile' : 'an isolated profile'}: ${vsix}`);
  } finally {
    if (process.env.PHP_COMPANION_TEST_LOG_DIR) {
      await cp(join(profile, 'user-data', 'logs'), resolve(process.env.PHP_COMPANION_TEST_LOG_DIR), { recursive: true }).catch(() => undefined);
    }
    await rm(temporary, { recursive: true, force: true });
  }
}

void main();
