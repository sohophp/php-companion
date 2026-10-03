import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { basename, join, resolve } from 'node:path';
import process from 'node:process';
import { promisify } from 'node:util';

assert.equal(process.platform, 'win32');
assert.ok(process.argv[2]);
const root = resolve(process.argv[2]);
assert.ok(basename(root).startsWith('sophp-windows-php-'));
const project = await mkdtemp(join(root, 'composer project with spaces-'));
const execute = promisify(execFile);
const php = join(root, 'php with spaces', 'php.exe');
const ini = join(root, 'isolated ini', 'php.ini');
const composer = join(root, 'composer.phar');
const run = async args => {
  const result = await execute(php, ['-c', ini, '-d', `extension=${join(root, 'php with spaces', 'ext', 'php_openssl.dll')}`, ...args], { cwd: project, windowsHide: true,
    timeout: 30_000, maxBuffer: 1024 * 1024,
    env: { ...process.env, COMPOSER_HOME: join(project, 'composer home'),
      COMPOSER_CACHE_DIR: join(project, 'composer cache'), COMPOSER_DISABLE_NETWORK: '1' } });
  return { stdout: result.stdout.trim(), stderr: result.stderr.trim() };
};
try {
  const dependency = join(project, 'local dependency');
  await mkdir(join(dependency, 'src'), { recursive: true });
  await mkdir(join(project, 'src'));
  await writeFile(join(dependency, 'composer.json'), JSON.stringify({ name: 'fixture/dependency', version: '1.0.0',
    type: 'library', license: 'MIT', autoload: { 'psr-4': { 'Dependency\\': 'src/' } } }));
  await writeFile(join(dependency, 'src', 'Value.php'), '<?php\nnamespace Dependency; final class Value { public function get(): int { return 1234; } }\n');
  await writeFile(join(project, 'composer.json'), JSON.stringify({ name: 'fixture/windows-project',
    description: 'Isolated native Windows Composer execution fixture',
    type: 'project', license: 'MIT', require: { php: '>=8.5', 'fixture/dependency': '^1.0' },
    repositories: [{ type: 'path', url: './local dependency', options: { symlink: false } }, { 'packagist.org': false }],
    autoload: { 'psr-4': { 'Project\\': 'src/' } } }));
  await writeFile(join(project, 'src', 'Example.php'), '<?php\nnamespace Project; final class Example { public function get(): int { return (new \\Dependency\\Value())->get(); } }\n');
  const version = await run([composer, '--version']);
  assert.match(version.stdout, /Composer version 2\.10\.2/u);
  const install = await run([composer, 'install', '--no-interaction', '--no-plugins', '--no-scripts', '--no-progress']);
  const lock = JSON.parse(await readFile(join(project, 'composer.lock'), 'utf8'));
  assert.equal(lock.packages.length, 1);
  assert.equal(lock.packages[0].name, 'fixture/dependency');
  assert.equal(lock.packages[0].version, '1.0.0');
  const lockBytes = await readFile(join(project, 'composer.lock'));
  const dump = await run([composer, 'dump-autoload', '--optimize', '--strict-psr', '--no-interaction', '--no-plugins', '--no-scripts']);
  assert.deepEqual(await readFile(join(project, 'composer.lock')), lockBytes);
  const validate = await run([composer, 'validate', '--strict', '--no-interaction', '--no-plugins']);
  const platform = await run([composer, 'check-platform-reqs', '--no-interaction', '--no-plugins']);
  await writeFile(join(project, 'run.php'), "<?php\nrequire __DIR__ . '/vendor/autoload.php'; echo json_encode(['value' => (new Project\\Example())->get(), 'cwd' => getcwd(), 'dependency' => (new ReflectionClass(Dependency\\Value::class))->getFileName()]);\n");
  const actual = JSON.parse((await run([join(project, 'run.php')])).stdout);
  assert.equal(actual.value, 1234);
  assert.equal(actual.cwd.toLowerCase(), project.toLowerCase());
  assert.ok(actual.dependency.toLowerCase().startsWith(join(project, 'vendor', 'fixture', 'dependency').toLowerCase()));
  const repeat = await run([composer, 'install', '--no-interaction', '--no-plugins', '--no-scripts', '--no-progress']);
  assert.deepEqual(await readFile(join(project, 'composer.lock')), lockBytes);
  assert.match(repeat.stderr, /Nothing to install, update or remove/u);
  process.stdout.write(`${JSON.stringify({ platform: process.platform, node: process.version, version, install, dump,
    validate, platformRequirements: platform, repeat, value: actual.value, workingDirectoryMatches: true,
    vendorAutoloadExecuted: true, lockUnchanged: true, networkDisabled: true,
    scope: 'Actual Composer CLI install of a local path dependency and optimized PSR-4 autoload; no remote downloads or editor command claim' }, null, 2)}\n`);
} finally { await rm(project, { recursive: true, force: true }); }
