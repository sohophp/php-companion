import { execFileSync } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import process from 'node:process';
import { requirePinnedPhpstormStubs } from './phpstorm-stubs-source.mjs';

const sourceIndex = process.argv.indexOf('--source');
const sourceRoot = sourceIndex >= 0 ? process.argv[sourceIndex + 1] : undefined;
if (!sourceRoot) throw new Error('Usage: node scripts/sync-phpstorm-mysqli.mjs --source PATH [--write]');
const revision = requirePinnedPhpstormStubs(resolve(sourceRoot));
const source = await readFile(resolve(sourceRoot, 'mysqli/mysqli.php'), 'utf8');
const functions = [...new Set([...source.matchAll(/^function (mysqli_[a-z_0-9]+)\s*\(/gm)].map((match) => match[1]))].sort();
const upstreamConstants = Object.fromEntries([...source.matchAll(/define\('([A-Z][A-Z0-9_]*)',\s*(-?\d+)\);/gm)]
  .map((match) => [match[1], Number(match[2])]).sort(([a], [b]) => a.localeCompare(b)));
const classNames = ['mysqli_sql_exception', 'mysqli_driver', 'mysqli', 'mysqli_warning', 'mysqli_result', 'mysqli_stmt'];
if (functions.length !== 117 || Object.keys(upstreamConstants).length !== 116
  || classNames.some((name) => !new RegExp(`(?:final )?class ${name}\\b`).test(source))) {
  throw new Error('Unexpected upstream MySQLi catalog');
}
const phpScript = `
  $signature = function($reflection) {
    $parameters = [];
    foreach ($reflection->getParameters() as $parameter) {
      $hasDefault = $parameter->isDefaultValueAvailable();
      $parameters[] = ['name' => $parameter->getName(), 'type' => $parameter->hasType() ? (string) $parameter->getType() : null,
        'byRef' => $parameter->isPassedByReference(), 'variadic' => $parameter->isVariadic(), 'optional' => $parameter->isOptional(),
        'default' => $hasDefault ? $parameter->getDefaultValue() : null,
        'defaultConstant' => $hasDefault && $parameter->isDefaultValueConstant() ? $parameter->getDefaultValueConstantName() : null];
    }
    return ['parameters' => $parameters, 'return' => $reflection->hasReturnType() ? (string) $reflection->getReturnType() : null,
      'tentativeReturn' => method_exists($reflection, 'hasTentativeReturnType') && $reflection->hasTentativeReturnType()
        ? (string) $reflection->getTentativeReturnType() : null];
  };
  $functions = get_extension_funcs('mysqli') ?: [];
  $functionSignatures = [];
  foreach ($functions as $name) $functionSignatures[$name] = $signature(new ReflectionFunction($name));
  $classes = [];
  foreach (['mysqli_sql_exception', 'mysqli_driver', 'mysqli', 'mysqli_warning', 'mysqli_result', 'mysqli_stmt'] as $name) {
    $class = new ReflectionClass($name);
    $methods = [];
    foreach ($class->getMethods() as $method) if ($method->getDeclaringClass()->getName() === $name) {
      $methods[$method->getName()] = array_merge($signature($method), ['static' => $method->isStatic(),
        'visibility' => $method->isProtected() ? 'protected' : ($method->isPrivate() ? 'private' : 'public')]);
    }
    $properties = [];
    foreach ($class->getProperties() as $property) if ($property->getDeclaringClass()->getName() === $name) {
      $properties[$property->getName()] = ['type' => method_exists($property, 'hasType') && $property->hasType() ? (string) $property->getType() : null,
        'visibility' => $property->isProtected() ? 'protected' : ($property->isPrivate() ? 'private' : 'public')];
    }
    $classes[$name] = ['methods' => $methods, 'properties' => $properties,
      'interfaces' => $class->getInterfaceNames()];
  }
  echo json_encode(['version' => PHP_VERSION_ID, 'functions' => $functionSignatures,
    'constants' => (new ReflectionExtension('mysqli'))->getConstants(), 'classes' => $classes], JSON_UNESCAPED_SLASHES);
`;
const versions = { '72': 'php72', '74': 'php74', '81': 'php81', '82': 'php82', '84': 'php84', '85': 'php85' };
const snapshots = Object.fromEntries(Object.entries(versions).map(([minor, command]) =>
  [minor, JSON.parse(execFileSync(command, ['-r', phpScript], { encoding: 'utf8', timeout: 5_000, maxBuffer: 1024 * 1024 }))]));
const missingFrom85 = functions.filter((name) => !(name in snapshots['85'].functions));
if (missingFrom85.join(',') !== [
  'mysqli_bind_param', 'mysqli_bind_result', 'mysqli_client_encoding', 'mysqli_fetch',
  'mysqli_get_cache_stats', 'mysqli_get_metadata', 'mysqli_param_count', 'mysqli_quote_string',
  'mysqli_send_long_data', 'mysqli_set_local_infile_default', 'mysqli_set_local_infile_handler',
].sort().join(',')) throw new Error(`Unexpected upstream-only MySQLi functions: ${missingFrom85}`);
for (const [minor, snapshot] of Object.entries(snapshots)) {
  if (Object.keys(snapshot.functions).some((name) => !functions.includes(name))) throw new Error(`Runtime-only MySQLi function in PHP ${minor}`);
  if (Object.keys(snapshot.constants).some((name) => !(name in upstreamConstants))) throw new Error(`Runtime-only MySQLi constant in PHP ${minor}`);
  if (Object.entries(snapshot.constants).some(([name, value]) => name !== 'MYSQLI_IS_MARIADB' && upstreamConstants[name] !== value)) {
    throw new Error(`MySQLi constant value mismatch in PHP ${minor}`);
  }
  if (Object.keys(snapshot.classes).join(',') !== classNames.join(',')) throw new Error(`MySQLi class drift in PHP ${minor}`);
}
const ownClassNames = Object.fromEntries(classNames.map((name) => [name, {
  methods: [...new Set(Object.values(snapshots).flatMap((snapshot) => Object.keys(snapshot.classes[name].methods)))].sort(),
  properties: [...new Set(Object.values(snapshots).flatMap((snapshot) => Object.keys(snapshot.classes[name].properties)))].sort(),
}]));
for (const [name, members] of Object.entries(ownClassNames)) {
  const start = new RegExp(`\\bclass ${name}\\b`).exec(source)?.index ?? -1;
  const end = source.indexOf('\n}\n', start);
  if (start < 0 || end < 0) throw new Error(`Unexpected upstream class layout: ${name}`);
  const body = source.slice(start, end);
  for (const method of members.methods) if (!new RegExp(`\\bfunction ${method}\\s*\\(`).test(body)) {
    throw new Error(`Runtime method absent in upstream ${name}::${method}`);
  }
  for (const property of members.properties) if (!body.includes(`$${property};`)) {
    throw new Error(`Runtime property absent in upstream ${name}::$${property}`);
  }
}
const output = `// Names sourced from JetBrains/phpstorm-stubs at ${revision}, mysqli/mysqli.php.\n`
  + `// Signatures and availability checked against PHP 7.2/7.4/8.1/8.2/8.4/8.5 reflection. Apache-2.0; see THIRD_PARTY_NOTICES.md.\n`
  + `export const MYSQLI_FUNCTION_NAMES = ${JSON.stringify(functions)} as const;\n`
  + `export const MYSQLI_CONSTANT_NAMES = ${JSON.stringify(Object.keys(upstreamConstants).sort())} as const;\n`
  + `export const MYSQLI_CLASS_NAMES = ${JSON.stringify(classNames)} as const;\n`
  + `export const MYSQLI_CLASS_MEMBER_NAMES = ${JSON.stringify(ownClassNames, null, 2)} as const;\n`
  + `export const MYSQLI_RUNTIME_SNAPSHOTS = ${JSON.stringify(snapshots)} as const;\n`;
const target = resolve('packages/language-spec/src/mysqli-catalog.ts');
if (process.argv.includes('--write')) await writeFile(target, output);
else if (await readFile(target, 'utf8') !== output) throw new Error(`${target} differs from pinned upstream or local runtime reflection`);
process.stdout.write(`MySQLi: ${functions.length} upstream functions, ${Object.keys(upstreamConstants).length} constants, ${classNames.length} classes; six runtime snapshots from ${revision}\n`);
