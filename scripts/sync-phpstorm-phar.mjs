import { execFileSync } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import process from 'node:process';
import { requirePinnedPhpstormStubs } from './phpstorm-stubs-source.mjs';

const sourceIndex = process.argv.indexOf('--source');
const sourceRoot = sourceIndex >= 0 ? process.argv[sourceIndex + 1] : undefined;
if (!sourceRoot) throw new Error('Usage: node scripts/sync-phpstorm-phar.mjs --source PATH [--write]');
const revision = requirePinnedPhpstormStubs(resolve(sourceRoot));
const source = await readFile(resolve(sourceRoot, 'Phar/Phar.php'), 'utf8');
const classNames = ['PharException', 'Phar', 'PharData', 'PharFileInfo'];
// Phar overrides SplFileInfo::getPath at runtime; the pinned upstream declares it only on PharData.
const runtimeOnlyMethods = new Set(['Phar::getPath']);
for (const name of classNames) if (!new RegExp(`\\bclass ${name}\\b`).test(source)) throw new Error(`Missing upstream ${name}`);
const phpScript = `$classes = [];
foreach (['PharException', 'Phar', 'PharData', 'PharFileInfo'] as $name) {
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
      'static' => $method->isStatic(), 'final' => $method->isFinal(),
      'visibility' => $method->isProtected() ? 'protected' : ($method->isPrivate() ? 'private' : 'public')];
  }
  ksort($methods);
  $constants = [];
  foreach ($class->getReflectionConstants() as $constant) if ($constant->getDeclaringClass()->getName() === $name) {
    $constants[$constant->getName()] = $constant->getValue();
  }
  ksort($constants);
  $classes[$name] = ['methods' => $methods, 'constants' => $constants];
}
echo json_encode(['classes' => $classes], JSON_UNESCAPED_SLASHES);`;
const versions = { '72': 'php72', '74': 'php74', '81': 'php81', '82': 'php82', '84': 'php84', '85': 'php85' };
const snapshots = Object.fromEntries(Object.entries(versions).map(([minor, command]) =>
  [minor, JSON.parse(execFileSync(command, ['-r', phpScript], { encoding: 'utf8', timeout: 5_000, maxBuffer: 1024 * 1024 }))]));
const methodCount = Object.values(snapshots['85'].classes).reduce((count, item) => count + Object.keys(item.methods).length, 0);
if (methodCount !== 127 || Object.keys(snapshots['85'].classes.Phar.constants).length !== 16) {
  throw new Error('Unexpected Phar runtime member count');
}
for (const [minor, snapshot] of Object.entries(snapshots)) {
  if (Object.keys(snapshot.classes).join(',') !== classNames.join(',')) throw new Error(`Phar class drift in ${minor}`);
  for (const [name, members] of Object.entries(snapshot.classes)) {
    const start = new RegExp(`\\bclass ${name}\\b`).exec(source)?.index ?? -1;
    const end = source.indexOf('\n}', start);
    const body = source.slice(start, end);
    if (start < 0 || end < 0) throw new Error(`Unexpected upstream class layout: ${name}`);
    for (const method of Object.keys(members.methods)) if (!runtimeOnlyMethods.has(`${name}::${method}`)
      && !new RegExp(`\\bfunction ${method}\\s*\\(`).test(body)) {
      throw new Error(`Runtime method absent upstream: ${name}::${method}`);
    }
    for (const constant of Object.keys(members.constants)) if (!new RegExp(`\\bconst ${constant}\\b`).test(body)) {
      throw new Error(`Runtime class constant absent upstream: ${name}::${constant}`);
    }
  }
}
const output = `// Names sourced from JetBrains/phpstorm-stubs ${revision}, Phar/Phar.php.\n`
  + `// Signatures and availability checked against PHP 7.2/7.4/8.1/8.2/8.4/8.5 reflection. Apache-2.0; see THIRD_PARTY_NOTICES.md.\n`
  + `export const PHAR_CLASS_NAMES = ${JSON.stringify(classNames)} as const;\n`
  + `export const PHAR_SNAPSHOTS = ${JSON.stringify(snapshots)} as const;\n`;
const target = resolve('packages/language-spec/src/phar-catalog.ts');
if (process.argv.includes('--write')) await writeFile(target, output);
else if (await readFile(target, 'utf8') !== output) throw new Error(`${target} differs from pinned upstream or local runtime reflection`);
process.stdout.write(`Phar: ${classNames.length} classes, ${methodCount} own methods, six runtime snapshots from ${revision}\n`);
