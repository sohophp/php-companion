import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { chmod, cp, mkdtemp, mkdir, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, isAbsolute, join, resolve } from 'node:path';
import { downloadAndUnzipVSCode, runTests, runVSCodeCommand } from '@vscode/test-electron';

async function testExecutablePath(): Promise<string | undefined> {
  const version = process.env.PHP_COMPANION_TEST_VSCODE_VERSION;
  if (process.platform !== 'darwin' && !version) return undefined;
  const expected = await downloadAndUnzipVSCode(version);
  if (process.platform !== 'darwin') return expected;
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

function resolvePhpScriptCommand(command: string): string {
  let candidates: string[];
  if (isAbsolute(command)) candidates = [command];
  else {
    const locator = process.platform === 'win32' ? 'where.exe' : 'which';
    candidates = execFileSync(locator, [command], { encoding: 'utf8' }).split(/\r?\n/u).map((line) => line.trim()).filter(Boolean);
  }
  for (const candidate of candidates) {
    try {
      if (readFileSync(candidate, 'utf8').slice(0, 512).includes('<?php')) return candidate;
    } catch { /* Continue past shell launchers and unreadable PATH entries. */ }
  }
  throw new Error(`Unable to resolve ${command} to a PHP script from PATH.`);
}

async function main(): Promise<void> {
  const repository = resolve(__dirname, '..');
  const vsix = process.env.PHP_COMPANION_TEST_CORE_VSIX ? resolve(process.env.PHP_COMPANION_TEST_CORE_VSIX)
    : join(repository, 'php-companion-0.4.5.vsix');
  const symfonyVsix = process.env.PHP_COMPANION_TEST_SYMFONY_VSIX ? resolve(process.env.PHP_COMPANION_TEST_SYMFONY_VSIX)
    : join(repository, 'packages', 'php-companion-symfony', 'php-companion-symfony-0.4.5.vsix');
  const twigVsix = process.env.PHP_COMPANION_TWIG_VSIX ? resolve(process.env.PHP_COMPANION_TWIG_VSIX) : undefined;
  await stat(vsix);
  await stat(symfonyVsix);
  if (twigVsix) await stat(twigVsix);
  // macOS limits Unix-domain socket paths to roughly 104 bytes. GitHub's
  // per-user tmpdir is already long enough that VS Code's profile socket can
  // exceed that limit before the tests start.
  const temporary = await mkdtemp(join(process.platform === 'darwin' ? '/tmp' : tmpdir(), 'php-companion-packaged-'));
  const fixture = join(temporary, 'workspace');
  const extracted = join(temporary, 'vsix');
  const symfonyExtracted = join(temporary, 'symfony-vsix');
  const twigExtracted = join(temporary, 'twig-vsix');
  const profile = join(temporary, 'profile');
  const externalExtensions = process.env.PHP_COMPANION_TEST_EXTENSIONS_DIR;
  const extensionsDirectory = externalExtensions ?? join(profile, 'extensions');
  let formatterExecutable = process.env.PHP_COMPANION_FORMATTER_EXECUTABLE;
  let phpunitExecutable = process.env.PHP_COMPANION_PHPUNIT_EXECUTABLE;
  if (externalExtensions && !formatterExecutable && process.env.PHP_COMPANION_PHP_EXECUTABLE && process.env.PHP_COMPANION_PHP_CS_FIXER) {
    formatterExecutable = join(profile, 'tools', 'php-cs-fixer');
    await mkdir(join(profile, 'tools'), { recursive: true });
    const quote = (value: string): string => `'${value.replaceAll("'", "'\\''")}'`;
    await writeFile(formatterExecutable, `#!/usr/bin/env bash\nexec ${quote(process.env.PHP_COMPANION_PHP_EXECUTABLE)} ${quote(process.env.PHP_COMPANION_PHP_CS_FIXER)} "$@"\n`);
    await chmod(formatterExecutable, 0o755);
  }
  if (externalExtensions && phpunitExecutable) {
    const proxy = join(profile, 'tools', 'phpunit-proxy.php');
    await mkdir(join(profile, 'tools'), { recursive: true });
    const encodedCommand = Buffer.from(resolvePhpScriptCommand(phpunitExecutable)).toString('base64');
    await writeFile(proxy, `<?php
$command = base64_decode('${encodedCommand}');
$arguments = array_map('escapeshellarg', array_slice($argv, 1));
passthru(escapeshellarg(PHP_BINARY) . ' ' . escapeshellarg($command) . ' ' . implode(' ', $arguments), $status);
exit($status);
`);
    phpunitExecutable = proxy;
  }
  if (externalExtensions) await stat(externalExtensions);
  try {
    const userSettingsDirectory = join(profile, 'user-data', 'User');
    await mkdir(userSettingsDirectory, { recursive: true });
    await writeFile(join(userSettingsDirectory, 'settings.json'), JSON.stringify({
      'extensions.autoCheckUpdates': false,
      'extensions.autoUpdate': false,
      'update.mode': 'none',
      ...(process.env.PHP_COMPANION_TEST_LEGACY_PROFILE === '1' ? {
        'phpCompanion.rename.syncFileName': 'never',
        'phpCompanion.pasteImports.mode': 'off',
      } : {}),
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
    if (twigVsix && !externalExtensions) {
      const routesPath = join(fixture, 'config', 'routes.yaml');
      await writeFile(routesPath, `${await readFile(routesPath, 'utf8')}\nprofile_route_attribute:\n  path: /profile/attribute\n  controller: App\\Controller\\ProfileRoute::url\n`);
      await writeFile(join(fixture, 'src', 'Controller', 'ProfileRoute.php'), `<?php
namespace App\\Controller;
use Symfony\\Bundle\\FrameworkBundle\\Controller\\AbstractController;
final class ProfileRoute extends AbstractController {
    public function url(): string { return $this->generateUrl('profile_route_attribute'); }
}
namespace Symfony\\Bundle\\FrameworkBundle\\Controller;
abstract class AbstractController { public function generateUrl(string $route, array $parameters = []): string { return ''; } }
`);
    }
    await writeFile(settingsPath, JSON.stringify(settings, null, 2));
    await mkdir(extracted, { recursive: true });
    await mkdir(symfonyExtracted, { recursive: true });
    if (twigVsix) await mkdir(twigExtracted, { recursive: true });
    execFileSync('unzip', ['-q', vsix, '-d', extracted], { stdio: 'inherit' });
    execFileSync('unzip', ['-q', symfonyVsix, '-d', symfonyExtracted], { stdio: 'inherit' });
    if (twigVsix) execFileSync('unzip', ['-q', twigVsix, '-d', twigExtracted], { stdio: 'inherit' });
    if (process.env.PHP_COMPANION_TEST_LOCALE === 'zh-cn') {
      await mkdir(extensionsDirectory, { recursive: true });
      const languagePackInstall = await runVSCodeCommand(['--install-extension', 'ms-ceintl.vscode-language-pack-zh-hans', '--force',
        `--extensions-dir=${extensionsDirectory}`, `--user-data-dir=${join(profile, 'user-data')}`], {
        version: process.env.PHP_COMPANION_TEST_VSCODE_VERSION ?? '1.138.0',
        spawn: { env: { ...process.env, VSCODE_IPC_HOOK_CLI: undefined, VSCODE_NLS_CONFIG: undefined, DONT_PROMPT_WSL_INSTALL: '1' } },
      });
      process.stdout.write(languagePackInstall.stdout);
      const packs = (await readdir(extensionsDirectory)).filter((name) => name.startsWith('ms-ceintl.vscode-language-pack-zh-hans-'));
      if (packs.length !== 1) throw new Error(`Expected one Simplified Chinese language pack, found ${packs.length}.`);
      const messages = join(extensionsDirectory, packs[0]!, 'translations', 'main.i18n.json');
      await stat(messages);
      // The first isolated window needs a language pack index in its own user-data directory.
      await writeFile(join(profile, 'user-data', 'languagepacks.json'), JSON.stringify({
        'zh-cn': { hash: 'sophp-isolated-zh-cn', translations: { vscode: messages } },
      }));
    }
    await runTests({
      vscodeExecutablePath: await testExecutablePath(),
      extensionDevelopmentPath: [join(extracted, 'extension'), join(symfonyExtracted, 'extension'),
        ...(twigVsix ? [join(twigExtracted, 'extension')] : [])],
      extensionTestsPath: resolve(__dirname, 'suite', 'index'),
      launchArgs: [
        ...(process.env.PHP_COMPANION_TEST_LOCALE ? ['--locale', process.env.PHP_COMPANION_TEST_LOCALE] : []),
        fixture,
        ...(externalExtensions || process.env.PHP_COMPANION_TEST_LOCALE ? [] : ['--disable-extensions']),
        '--disable-gpu',
        '--disable-workspace-trust',
        '--skip-welcome',
        '--skip-release-notes',
        `--user-data-dir=${join(profile, 'user-data')}`,
        `--extensions-dir=${extensionsDirectory}`,
      ],
      extensionTestsEnv: {
        ELECTRON_RUN_AS_NODE: undefined,
        VSCODE_ESM_ENTRYPOINT: undefined,
        VSCODE_NLS_CONFIG: process.env.PHP_COMPANION_TEST_LOCALE ? undefined : process.env.VSCODE_NLS_CONFIG,
        PHP_COMPANION_PACKAGED_TEST: '1',
        PHP_COMPANION_TEST_LOCALE: process.env.PHP_COMPANION_TEST_LOCALE,
        PHP_COMPANION_TEST_LEGACY_PROFILE: process.env.PHP_COMPANION_TEST_LEGACY_PROFILE,
        PHP_COMPANION_OPEN_SOURCE_PROFILE: externalExtensions ? '1' : undefined,
        PHP_COMPANION_FORMATTER_EXECUTABLE: formatterExecutable,
        PHP_COMPANION_PHP_EXECUTABLE: process.env.PHP_COMPANION_PHP_EXECUTABLE,
        PHP_COMPANION_PHPUNIT_EXECUTABLE: phpunitExecutable,
        PHP_COMPANION_TWIG_ROUTE_RENAME: twigVsix ? '1' : undefined,
      },
    });
    console.log(process.env.PHP_COMPANION_TEST_LEGACY_PROFILE === '1'
      ? `Verified legacy Profile Rename and Paste settings in packaged PHP Companion VSIX: ${vsix}`
      : process.env.PHP_COMPANION_TEST_LOCALE === 'zh-cn'
        ? `Verified Simplified Chinese manifest text in packaged PHP Companion VSIX: ${vsix}`
        : `Verified packaged PHP Companion VSIX in ${externalExtensions ? 'the Open Source Profile' : 'an isolated profile'}: ${vsix}`);
  } finally {
    if (process.env.PHP_COMPANION_TEST_LOG_DIR) {
      await cp(join(profile, 'user-data', 'logs'), resolve(process.env.PHP_COMPANION_TEST_LOG_DIR), { recursive: true }).catch(() => undefined);
    }
    await rm(temporary, { recursive: true, force: true });
  }
}

void main();
