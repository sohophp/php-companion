import { execFileSync } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import process from 'node:process';
import { requirePinnedPhpstormStubs } from './phpstorm-stubs-source.mjs';

const sourceIndex = process.argv.indexOf('--source');
const sourceRoot = sourceIndex >= 0 ? process.argv[sourceIndex + 1] : undefined;
if (!sourceRoot) throw new Error('Usage: node scripts/sync-phpstorm-pdo.mjs --source PATH [--write]');
const revision = requirePinnedPhpstormStubs(resolve(sourceRoot));
const source = await readFile(resolve(sourceRoot, 'PDO/PDO.php'), 'utf8');
const pdoStart = source.indexOf('    class PDO\n');
const statementStart = source.indexOf('    class PDOStatement ', pdoStart);
if (pdoStart < 0 || statementStart < 0 || !source.includes('final class PDORow') || !source.includes('function pdo_drivers(')) {
  throw new Error('Unexpected upstream PDO layout');
}
const pdoSource = source.slice(pdoStart, statementStart);
const upstreamConstants = new Set([...pdoSource.matchAll(/\bpublic const (?:int|string )?([A-Z][A-Z0-9_]*)\s*=/g)].map((match) => match[1]));
const driverPrefix = /^(?:MYSQL|PGSQL|SQLITE|FIREBIRD|ODBC|DBLIB|OCI|CUBRID|IBM|INFORMIX|SQLSRV)/;
const phpScript = `$class = new ReflectionClass('PDO'); $constants = [];
foreach ($class->getConstants() as $name => $value) {
  if (!preg_match('/^(MYSQL|PGSQL|SQLITE|FIREBIRD|ODBC|DBLIB|OCI|CUBRID|IBM|INFORMIX|SQLSRV)/', $name)) $constants[$name] = $value;
}
ksort($constants);
echo json_encode($constants, JSON_UNESCAPED_SLASHES);`;
const versions = { '72': 'php72', '74': 'php74', '81': 'php81', '82': 'php82', '84': 'php84', '85': 'php85' };
const snapshots = Object.fromEntries(Object.entries(versions).map(([version, command]) =>
  [version, JSON.parse(execFileSync(command, ['-r', phpScript], { encoding: 'utf8', timeout: 5_000 }))]));
const valueMismatches = new Set();
for (const [version, constants] of Object.entries(snapshots)) {
  for (const [name, value] of Object.entries(constants)) {
    if (!upstreamConstants.has(name) || driverPrefix.test(name) || (typeof value !== 'number' && typeof value !== 'string')) {
      throw new Error(`PHP ${version} PDO::${name} absent from upstream core catalog`);
    }
    const match = new RegExp(`\\bpublic const (?:int|string )?${name}\\s*=\\s*('(?:[^']*)'|-?\\d+)\\s*;`).exec(pdoSource);
    if (!match) throw new Error(`PDO::${name} has no literal upstream value`);
    if ((match[1].startsWith("'") ? match[1].slice(1, -1) : Number(match[1])) !== value) valueMismatches.add(name);
  }
}
if ([...valueMismatches].sort().join(',') !== ['FETCH_CLASSTYPE', 'FETCH_GROUP', 'FETCH_PROPS_LATE', 'FETCH_SERIALIZE', 'FETCH_UNIQUE'].join(',')) {
  throw new Error(`Unexpected PDO constant value differences: ${[...valueMismatches].sort()}`);
}
const output = `// Core PDO constant names and values from JetBrains/phpstorm-stubs ${revision}, PDO/PDO.php.\n`
  + `// Availability checked against PHP 7.2/7.4/8.1/8.2/8.4/8.5 reflection. Apache-2.0; see THIRD_PARTY_NOTICES.md.\n`
  + `export const PDO_CORE_CONSTANTS = ${JSON.stringify(snapshots, null, 2)} as const;\n`;
const target = resolve('packages/language-spec/src/pdo-catalog.ts');
if (process.argv.includes('--write')) await writeFile(target, output);
else if (await readFile(target, 'utf8') !== output) throw new Error(`${target} differs from pinned upstream or local runtime reflection`);
process.stdout.write(`PDO: ${upstreamConstants.size} upstream constants, ${Object.keys(snapshots['85']).length} PHP 8.5 core constants; six runtime snapshots from ${revision}\n`);

const driverClassNames = ['Pdo\\Mysql', 'Pdo\\Pgsql', 'Pdo\\Sqlite'];
const driverPhpScript = `$signature = function($method) {
  $parameters = [];
  foreach ($method->getParameters() as $parameter) {
    $hasDefault = $parameter->isDefaultValueAvailable();
    $parameters[] = ['name' => $parameter->getName(), 'type' => $parameter->hasType() ? (string) $parameter->getType() : null,
      'byRef' => $parameter->isPassedByReference(), 'variadic' => $parameter->isVariadic(), 'optional' => $parameter->isOptional(),
      'default' => $hasDefault ? $parameter->getDefaultValue() : null,
      'defaultConstant' => $hasDefault && $parameter->isDefaultValueConstant() ? $parameter->getDefaultValueConstantName() : null];
  }
  return ['parameters' => $parameters, 'return' => $method->hasReturnType() ? (string) $method->getReturnType() : null,
    'tentativeReturn' => method_exists($method, 'hasTentativeReturnType') && $method->hasTentativeReturnType()
      ? (string) $method->getTentativeReturnType() : null];
};
$constants = [];
foreach ((new ReflectionClass('PDO'))->getConstants() as $name => $value) {
  if (preg_match('/^(MYSQL|PGSQL|SQLITE)_/', $name)) $constants[$name] = $value;
}
ksort($constants);
$classes = [];
foreach (['Pdo\\\\Mysql', 'Pdo\\\\Pgsql', 'Pdo\\\\Sqlite'] as $name) {
  if (!class_exists($name, false)) continue;
  $class = new ReflectionClass($name);
  $methods = [];
  foreach ($class->getMethods() as $method) if ($method->getDeclaringClass()->getName() === $name) {
    $methods[$method->getName()] = $signature($method);
  }
  $classConstants = [];
  foreach ($class->getReflectionConstants() as $constant) if ($constant->getDeclaringClass()->getName() === $name) {
    $classConstants[$constant->getName()] = $constant->getValue();
  }
  ksort($methods); ksort($classConstants);
  $classes[$name] = ['methods' => $methods, 'constants' => $classConstants];
}
echo json_encode(['constants' => $constants, 'classes' => $classes], JSON_UNESCAPED_SLASHES);`;
const driverSnapshots = Object.fromEntries(Object.entries(versions).map(([version, command]) =>
  [version, JSON.parse(execFileSync(command, ['-r', driverPhpScript], { encoding: 'utf8', timeout: 5_000 }))]));
for (const [version, snapshot] of Object.entries(driverSnapshots)) {
  if (Number(version) < 84 && Object.keys(snapshot.classes).length) throw new Error(`PDO driver class before PHP 8.4: ${version}`);
  if (Number(version) >= 84 && Object.keys(snapshot.classes).sort().join(',') !== [...driverClassNames].sort().join(',')) {
    throw new Error(`PDO driver class drift in PHP ${version}`);
  }
  for (const name of Object.keys(snapshot.constants)) if (!upstreamConstants.has(name)) {
    throw new Error(`PDO::${name} absent from upstream catalog`);
  }
  for (const [className, members] of Object.entries(snapshot.classes)) {
    const shortName = className.slice('Pdo\\'.length);
    const start = source.indexOf(`    class ${shortName} extends PDO`);
    const end = source.indexOf('\n    }', start);
    if (start < 0 || end < 0) throw new Error(`Unexpected upstream PDO driver class: ${className}`);
    const body = source.slice(start, end);
    for (const method of Object.keys(members.methods)) if (!body.includes(`function ${method}(`)) {
      throw new Error(`${className}::${method} absent from upstream`);
    }
    for (const constant of Object.keys(members.constants)) if (!new RegExp(`\\bconst (?:(?:int|string)\\s+)?${constant}\\s*=`).test(body)) {
      throw new Error(`${className}::${constant} absent from upstream`);
    }
  }
}
const driverOutput = `// PDO driver names from JetBrains/phpstorm-stubs ${revision}, PDO/PDO.php.\n`
  + `// Signatures and availability checked against PHP 7.2/7.4/8.1/8.2/8.4/8.5 reflection. Apache-2.0; see THIRD_PARTY_NOTICES.md.\n`
  + `export const PDO_DRIVER_CLASS_NAMES = ${JSON.stringify(driverClassNames)} as const;\n`
  + `export const PDO_DRIVER_SNAPSHOTS = ${JSON.stringify(driverSnapshots, null, 2)} as const;\n`;
const driverTarget = resolve('packages/language-spec/src/pdo-driver-catalog.ts');
if (process.argv.includes('--write')) await writeFile(driverTarget, driverOutput);
else if (await readFile(driverTarget, 'utf8') !== driverOutput) throw new Error(`${driverTarget} differs from pinned upstream or local runtime reflection`);
process.stdout.write(`PDO drivers: ${Object.keys(driverSnapshots['85'].constants).length} legacy constants, ${driverClassNames.length} PHP 8.4+ classes\n`);
