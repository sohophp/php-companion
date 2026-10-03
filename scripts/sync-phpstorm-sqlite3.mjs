import { execFileSync } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import process from 'node:process';
import { requirePinnedPhpstormStubs } from './phpstorm-stubs-source.mjs';

const sourceIndex = process.argv.indexOf('--source');
const sourceRoot = sourceIndex >= 0 ? process.argv[sourceIndex + 1] : undefined;
if (!sourceRoot) throw new Error('Usage: node scripts/sync-phpstorm-sqlite3.mjs --source PATH [--write]');
const revision = requirePinnedPhpstormStubs(resolve(sourceRoot));
const source = await readFile(resolve(sourceRoot, 'sqlite3/sqlite3.php'), 'utf8');
const classNames = ['SQLite3', 'SQLite3Stmt', 'SQLite3Result', 'SQLite3Exception'];
for (const name of classNames) if (!new RegExp(`\\bclass ${name}\\b`).test(source)) throw new Error(`Missing upstream ${name}`);
const phpScript = `$classes = [];
foreach (['SQLite3', 'SQLite3Stmt', 'SQLite3Result', 'SQLite3Exception'] as $name) {
  if (!class_exists($name, false)) continue;
  $class = new ReflectionClass($name);
  $methods = [];
  foreach ($class->getMethods() as $method) if ($method->getDeclaringClass()->getName() === $name) {
    $parameters = [];
    foreach ($method->getParameters() as $parameter) {
      $hasDefault = $parameter->isDefaultValueAvailable();
      $parameters[] = ['name' => $parameter->getName(), 'type' => $parameter->hasType() ? (string) $parameter->getType() : null,
        'byRef' => $parameter->isPassedByReference(), 'variadic' => $parameter->isVariadic(), 'optional' => $parameter->isOptional(),
        'default' => $hasDefault && !$parameter->isDefaultValueConstant() ? $parameter->getDefaultValue() : null,
        'defaultConstant' => $hasDefault && $parameter->isDefaultValueConstant() ? $parameter->getDefaultValueConstantName() : null];
    }
    $methods[$method->getName()] = ['parameters' => $parameters,
      'return' => $method->hasReturnType() ? (string) $method->getReturnType() : null,
      'tentativeReturn' => method_exists($method, 'hasTentativeReturnType') && $method->hasTentativeReturnType()
        ? (string) $method->getTentativeReturnType() : null,
      'static' => $method->isStatic(), 'visibility' => $method->isProtected() ? 'protected' : ($method->isPrivate() ? 'private' : 'public')];
  }
  ksort($methods);
  $constants = [];
  foreach ($class->getReflectionConstants() as $constant) if ($constant->getDeclaringClass()->getName() === $name) {
    $constants[$constant->getName()] = $constant->getValue();
  }
  ksort($constants);
  $classes[$name] = ['methods' => $methods, 'constants' => $constants];
}
ksort($classes);
$constants = (new ReflectionExtension('sqlite3'))->getConstants(); ksort($constants);
echo json_encode(['classes' => $classes, 'constants' => $constants], JSON_UNESCAPED_SLASHES);`;
const versions = { '72': 'php72', '74': 'php74', '81': 'php81', '82': 'php82', '84': 'php84', '85': 'php85' };
const snapshots = Object.fromEntries(Object.entries(versions).map(([minor, command]) =>
  [minor, JSON.parse(execFileSync(command, ['-r', phpScript], { encoding: 'utf8', timeout: 5_000 }))]));
const names = [...new Set(Object.values(snapshots).flatMap((snapshot) => Object.keys(snapshot.classes)))];
if (names.sort().join(',') !== [...classNames].sort().join(',')) throw new Error('SQLite3 runtime class drift');
const constants = Object.keys(snapshots['85'].constants);
for (const [minor, snapshot] of Object.entries(snapshots)) {
  if (JSON.stringify(snapshot.constants) !== JSON.stringify(snapshots['85'].constants)) throw new Error(`SQLite3 constants drift in ${minor}`);
  for (const [name, members] of Object.entries(snapshot.classes)) {
    const start = new RegExp(`\\bclass ${name}\\b`).exec(source)?.index ?? -1;
    const end = source.indexOf('\n}', start);
    const body = source.slice(start, end);
    if (start < 0 || end < 0) throw new Error(`Unexpected upstream class layout: ${name}`);
    for (const method of Object.keys(members.methods)) if (!new RegExp(`\\bfunction ${method}\\s*\\(`).test(body)) {
      throw new Error(`Runtime method absent upstream: ${name}::${method}`);
    }
    for (const constant of Object.keys(members.constants)) if (!new RegExp(`\\bconst ${constant}\\b`).test(body)) {
      throw new Error(`Runtime class constant absent upstream: ${name}::${constant}`);
    }
  }
}
for (const name of constants) if (!source.includes(name)) throw new Error(`Runtime constant absent upstream: ${name}`);
const output = `// Names sourced from JetBrains/phpstorm-stubs ${revision}, sqlite3/sqlite3.php.\n`
  + `// Signatures and availability checked against PHP 7.2/7.4/8.1/8.2/8.4/8.5 reflection. Apache-2.0; see THIRD_PARTY_NOTICES.md.\n`
  + `export const SQLITE3_CLASS_NAMES = ${JSON.stringify(classNames)} as const;\n`
  + `export const SQLITE3_SNAPSHOTS = ${JSON.stringify(snapshots)} as const;\n`;
const target = resolve('packages/language-spec/src/sqlite3-catalog.ts');
if (process.argv.includes('--write')) await writeFile(target, output);
else if (await readFile(target, 'utf8') !== output) throw new Error(`${target} differs from pinned upstream or local runtime reflection`);
process.stdout.write(`SQLite3: ${classNames.length} classes, ${constants.length} constants, six runtime snapshots from ${revision}\n`);
