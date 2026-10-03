import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { basename, join, resolve } from 'node:path';
import process from 'node:process';
import { promisify } from 'node:util';

assert.equal(process.platform, 'win32', 'Run actual PHP tools with native Windows Node');
assert.ok(process.argv[2]);
const root = resolve(process.argv[2]);
assert.ok(basename(root).startsWith('sophp-windows-php-'), 'Use an owned portable runtime fixture');
const php = join(root, 'php with spaces', 'php.exe');
const ini = join(root, 'isolated ini', 'php.ini');
const fixer = join(root, 'tools', 'vendor', 'friendsofphp', 'php-cs-fixer', 'php-cs-fixer');
const phpunit = join(root, 'tools', 'vendor', 'phpunit', 'phpunit', 'phpunit');
const execute = promisify(execFile);
const project = await mkdtemp(join(root, 'cli-workflow-'));
const run = async args => {
  const result = await execute(php, ['-c', ini, ...args], { cwd: project, windowsHide: true, timeout: 30_000,
    maxBuffer: 1024 * 1024 });
  return { stdout: result.stdout.trim(), stderr: result.stderr.trim() };
};
try {
  await mkdir(join(project, 'src'));
  await writeFile(join(project, 'composer.json'), JSON.stringify({ require: { php: '>=8.5' }, autoload: { 'psr-4': { 'Fixture\\': 'src/' } } }));
  const path = join(project, 'src', 'Example.php');
  const original = '<?php\nnamespace Fixture;class Example{public function value():int{return 1234;}}\n';
  await writeFile(path, original);
  await writeFile(join(project, 'ExampleTest.php'), `<?php
require __DIR__ . '/src/Example.php';
final class ExampleTest extends PHPUnit\\Framework\\TestCase {
    public function testValue(): void { self::assertSame(1234, (new Fixture\\Example())->value()); }
    public function testType(): void { self::assertSame('int', (string) (new ReflectionMethod(Fixture\\Example::class, 'value'))->getReturnType()); }
}
`);
  const versions = { php: await run(['-v']), fixer: await run([fixer, '--version']), phpunit: await run([phpunit, '--version']) };
  assert.match(versions.php.stdout, /PHP 8\.5\./u);
  assert.match(versions.fixer.stdout, /3\.95\.27/u); assert.match(versions.phpunit.stdout, /11\.5\.56/u);
  const formatting = await run([fixer, 'fix', '--rules=@PSR12', '--using-cache=no', path]);
  const formatted = (await readFile(path, 'utf8')).replaceAll('\r\n', '\n');
  assert.notEqual(formatted, original);
  assert.ok(formatted.includes('namespace Fixture;\n\nclass Example\n{'));
  assert.ok(formatted.includes('public function value(): int\n    {\n        return 1234;\n    }'));
  const idempotence = await run([fixer, 'fix', '--dry-run', '--rules=@PSR12', '--using-cache=no', path]);
  const tests = await run([phpunit, '--no-coverage', '--colors=never', join(project, 'ExampleTest.php')]);
  assert.match(tests.stdout, /OK \(2 tests, 2 assertions\)/u);
  process.stdout.write(`${JSON.stringify({ platform: process.platform, node: process.version, versions,
    formatting, idempotence, tests, original, formatted,
    scope: 'Actual CLI formatting and PHPUnit in an independent Composer fixture; no editor or Composer execution claim' }, null, 2)}\n`);
} finally { await rm(project, { recursive: true, force: true }); }
