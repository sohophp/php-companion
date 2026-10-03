import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { basename, join, resolve } from 'node:path';
import process from 'node:process';
import { probePhpRuntime } from '../packages/runtime-probe/dist/index.js';

assert.equal(process.platform, 'win32', 'Use native Windows Node and a verified portable PHP directory');
const directory = resolve(process.argv[2] ?? '');
assert.ok(process.argv[2]);
const root = resolve(directory, '..');
assert.ok(basename(root).startsWith('sophp-windows-php-'), 'Use an owned portable runtime fixture');
const iniDirectory = join(root, 'isolated ini');
await mkdir(iniDirectory, { recursive: true });
const ini = join(iniDirectory, 'php.ini');
const executable = join(directory, 'php.exe');
const env = Object.fromEntries(Object.entries(process.env).filter(([key]) =>
  !['path', 'pathext', 'phprc', 'php_ini_scan_dir'].includes(key.toLowerCase())));
Object.assign(env, { Path: `"${directory}"`, PATHEXT: '.EXE;.CMD;.BAT', PHPRC: iniDirectory, PHP_INI_SCAN_DIR: iniDirectory });
await writeFile(ini, 'date.timezone=UTC\n');
const configured = await probePhpRuntime(executable, env);
assert.ok(configured, 'Real PHP execution failed');
assert.equal(configured.minor, '8.5'); assert.equal(configured.sapi, 'cli');
assert.ok(configured.path.includes(' '));
assert.equal(configured.loadedConfigurationFile?.toLowerCase(), ini.toLowerCase());
assert.ok(!configured.loadedExtensions.includes('curl'));
const discovered = await probePhpRuntime('php', env);
assert.ok(discovered);
assert.equal(discovered.path.toLowerCase(), executable.toLowerCase());
assert.equal(discovered.version, configured.version);
assert.deepEqual(discovered.availableFunctions, configured.availableFunctions);
await writeFile(ini, `date.timezone=UTC\nextension_dir="${join(directory, 'ext').replaceAll('\\', '/')}"\nextension=curl\nextension=mbstring\nextension=intl\n`);
const extended = await probePhpRuntime('php.exe', env);
assert.ok(extended, 'Probe failed after changing the isolated PHP ini');
for (const name of ['curl', 'mbstring', 'intl']) assert.ok(extended.loadedExtensions.includes(name), name);
// The probe intentionally exports a bounded set of platform-sensitive names,
// rather than a complete function inventory.
for (const name of ['curl_upkeep', 'intltz_get_iana_id']) assert.ok(extended.availableFunctions.includes(name), name);
assert.ok(!configured.availableFunctions.includes('curl_upkeep'));
assert.ok(extended.curlRuntime); assert.ok(extended.intlCharConstants);
assert.equal(await readFile(ini, 'utf8'), `date.timezone=UTC\nextension_dir="${join(directory, 'ext').replaceAll('\\', '/')}"\nextension=curl\nextension=mbstring\nextension=intl\n`);
process.stdout.write(`${JSON.stringify({ platform: process.platform, node: process.version, version: extended.version,
  path: extended.path, loadedConfigurationFile: extended.loadedConfigurationFile,
  configured: { extensions: configured.loadedExtensions, functions: configured.availableFunctions.length },
  afterIniChange: { extensions: extended.loadedExtensions, functions: extended.availableFunctions.length },
  checks: ['actual CLI execution', 'configured path with spaces', 'quoted Path discovery', 'explicit exe discovery',
    'isolated ini identity', 'extension and function facts refresh'] }, null, 2)}\n`);
