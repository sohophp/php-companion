import { execFileSync } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import process from 'node:process';
import { requirePinnedPhpstormStubs } from './phpstorm-stubs-source.mjs';

const sourceIndex = process.argv.indexOf('--source');
const sourceRoot = sourceIndex >= 0 ? process.argv[sourceIndex + 1] : undefined;
if (!sourceRoot) throw new Error('Usage: node scripts/sync-phpstorm-random.mjs --source PATH [--write]');
const revision = requirePinnedPhpstormStubs(resolve(sourceRoot));
const source = await readFile(resolve(sourceRoot, 'random/random.php'), 'utf8');
const functions = [...new Set([...source.matchAll(/^\s*function ([a-z_][a-z0-9_]*)\s*\(/gm)].map((match) => match[1]))].sort();
const classNames = ['Random\\Engine', 'Random\\CryptoSafeEngine', 'Random\\RandomError',
  'Random\\BrokenRandomEngineError', 'Random\\RandomException', 'Random\\Engine\\Mt19937',
  'Random\\Engine\\PcgOneseq128XslRr64', 'Random\\Engine\\Xoshiro256StarStar',
  'Random\\Engine\\Secure', 'Random\\Randomizer', 'Random\\IntervalBoundary'];
if (functions.length !== 9 || classNames.some((name) => !new RegExp(`\\b(?:class|interface|enum) ${name.split('\\').at(-1)}\\b`).test(source))) {
  throw new Error('Unexpected upstream Random catalog');
}
const phpScript = `$signature = function($method) {
  $parameters = [];
  foreach ($method->getParameters() as $parameter) {
    $hasDefault = $parameter->isDefaultValueAvailable();
    $parameters[] = ['name' => $parameter->getName(), 'type' => $parameter->hasType() ? (string) $parameter->getType() : null,
      'byRef' => $parameter->isPassedByReference(), 'variadic' => $parameter->isVariadic(), 'optional' => $parameter->isOptional(),
      'default' => $hasDefault && !$parameter->isDefaultValueConstant() ? $parameter->getDefaultValue() : null,
      'defaultConstant' => $hasDefault && $parameter->isDefaultValueConstant() ? $parameter->getDefaultValueConstantName() : null];
  }
  return ['parameters' => $parameters, 'return' => $method->hasReturnType() ? (string) $method->getReturnType() : null];
};
$names = ['Random\\\\Engine', 'Random\\\\CryptoSafeEngine', 'Random\\\\RandomError',
  'Random\\\\BrokenRandomEngineError', 'Random\\\\RandomException', 'Random\\\\Engine\\\\Mt19937',
  'Random\\\\Engine\\\\PcgOneseq128XslRr64', 'Random\\\\Engine\\\\Xoshiro256StarStar',
  'Random\\\\Engine\\\\Secure', 'Random\\\\Randomizer', 'Random\\\\IntervalBoundary'];
$classes = [];
foreach ($names as $name) {
  if (!class_exists($name, false) && !interface_exists($name, false) && !enum_exists($name, false)) continue;
  $class = new ReflectionClass($name);
  $methods = [];
  foreach ($class->getMethods() as $method) if ($method->getDeclaringClass()->getName() === $name) {
    $methods[$method->getName()] = $signature($method);
  }
  $properties = [];
  foreach ($class->getProperties() as $property) if ($property->getDeclaringClass()->getName() === $name) {
    $properties[$property->getName()] = $property->hasType() ? (string) $property->getType() : null;
  }
  ksort($methods); ksort($properties);
  $classes[$name] = ['methods' => $methods, 'properties' => $properties];
}
echo json_encode(['functions' => array_values(get_extension_funcs('random') ?: []), 'classes' => $classes,
  'constants' => (new ReflectionExtension('random'))->getConstants()], JSON_UNESCAPED_SLASHES);`;
const versions = { '82': 'php82', '84': 'php84', '85': 'php85' };
const snapshots = Object.fromEntries(Object.entries(versions).map(([version, command]) =>
  [version, JSON.parse(execFileSync(command, ['-r', phpScript], { encoding: 'utf8', timeout: 5_000 }))]));
for (const [version, snapshot] of Object.entries(snapshots)) {
  if (snapshot.functions.some((name) => !functions.includes(name))) throw new Error(`PHP ${version} Random function absent upstream`);
  const actualNames = Object.keys(snapshot.classes);
  const expectedNames = Number(version) >= 84 ? classNames : classNames.filter((name) => name !== 'Random\\IntervalBoundary');
  if (actualNames.sort().join(',') !== [...expectedNames].sort().join(',')) throw new Error(`PHP ${version} Random class drift`);
  if (JSON.stringify(snapshot.constants) !== JSON.stringify({ MT_RAND_MT19937: 0, MT_RAND_PHP: 1 })) {
    throw new Error(`PHP ${version} Random constant drift`);
  }
  for (const [name, members] of Object.entries(snapshot.classes)) {
    const shortName = name.split('\\').at(-1);
    const start = new RegExp(`\\b(?:class|interface|enum) ${shortName}\\b`).exec(source)?.index ?? -1;
    const end = source.indexOf('\n    }', start);
    if (start < 0 || end < 0) throw new Error(`Unexpected Random class layout: ${name}`);
    const body = source.slice(start, end);
    for (const method of Object.keys(members.methods)) if (method !== 'cases' && !body.includes(`function ${method}(`)) {
      throw new Error(`${name}::${method} absent upstream`);
    }
  }
}
const output = `// Names from JetBrains/phpstorm-stubs ${revision}, random/random.php.\n`
  + `// Signatures and availability checked against PHP 8.2/8.4/8.5 reflection. Apache-2.0; see THIRD_PARTY_NOTICES.md.\n`
  + `export const RANDOM_FUNCTION_NAMES = ${JSON.stringify(functions)} as const;\n`
  + `export const RANDOM_CLASS_NAMES = ${JSON.stringify(classNames)} as const;\n`
  + `export const RANDOM_SNAPSHOTS = ${JSON.stringify(snapshots, null, 2)} as const;\n`;
const target = resolve('packages/language-spec/src/random-catalog.ts');
if (process.argv.includes('--write')) await writeFile(target, output);
else if (await readFile(target, 'utf8') !== output) throw new Error(`${target} differs from pinned upstream or local runtime reflection`);
process.stdout.write(`Random: ${functions.length} functions, ${classNames.length} versioned types, three runtime snapshots from ${revision}\n`);
