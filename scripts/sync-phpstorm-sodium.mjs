import { execFileSync } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import process from 'node:process';
import { requirePinnedPhpstormStubs } from './phpstorm-stubs-source.mjs';

const sourceIndex = process.argv.indexOf('--source');
const sourceRoot = sourceIndex >= 0 ? process.argv[sourceIndex + 1] : undefined;
if (!sourceRoot) throw new Error('Usage: node scripts/sync-phpstorm-sodium.mjs --source PATH [--write]');
const revision = requirePinnedPhpstormStubs(resolve(sourceRoot));
const source = await readFile(resolve(sourceRoot, 'sodium/sodium.php'), 'utf8');
const names = [...new Set([...source.matchAll(/^function (sodium_[a-z0-9_]+)\s*\(/gm)].map((match) => match[1]))].sort();
const legacyUnavailable = [...source.matchAll(/#\[PhpStormStubsElementAvailable\('8\.1'\)\]\s*function (sodium_[a-z0-9_]+)\s*\(/g)]
  .map((match) => match[1]).sort();
const php82Only = [...source.matchAll(/#\[PhpStormStubsElementAvailable\('8\.2'\)\]\s*function (sodium_[a-z0-9_]+)\s*\(/g)]
  .map((match) => match[1]).sort();
const upstreamConstants = Object.fromEntries([...source.matchAll(/^const (SODIUM_[A-Z0-9_]+)\s*=\s*([^;]+);/gm)]
  .map((match) => [match[1], match[2].trim()]));
if (names.length !== 141 || legacyUnavailable.length !== 18 || php82Only.length !== 1
  || !source.includes('class SodiumException extends Exception') || Object.keys(upstreamConstants).length < 100) {
  throw new Error('Unexpected upstream Sodium catalog');
}
const phpScript = `$functions = [];
foreach (get_extension_funcs('sodium') ?: [] as $name) {
  $function = new ReflectionFunction($name);
  $parameters = [];
  foreach ($function->getParameters() as $parameter) {
    $hasDefault = $parameter->isDefaultValueAvailable();
    $parameters[] = ['name' => $parameter->getName(), 'type' => $parameter->hasType() ? (string) $parameter->getType() : null,
      'byRef' => $parameter->isPassedByReference(), 'variadic' => $parameter->isVariadic(), 'optional' => $parameter->isOptional(),
      'default' => $hasDefault && !$parameter->isDefaultValueConstant() ? $parameter->getDefaultValue() : null,
      'defaultConstant' => $hasDefault && $parameter->isDefaultValueConstant() ? $parameter->getDefaultValueConstantName() : null];
  }
  $functions[$name] = ['parameters' => $parameters, 'return' => $function->hasReturnType() ? (string) $function->getReturnType() : null];
}
ksort($functions);
$constants = (new ReflectionExtension('sodium'))->getConstants(); ksort($constants);
echo json_encode(['functions' => $functions, 'constants' => $constants,
  'exception' => class_exists('SodiumException', false)], JSON_UNESCAPED_SLASHES);`;
const versions = { '81': 'php81', '82': 'php82', '84': 'php84', '85': 'php85' };
const snapshots = Object.fromEntries(Object.entries(versions).map(([minor, command]) =>
  [minor, JSON.parse(execFileSync(command, ['-r', phpScript], { encoding: 'utf8', timeout: 5_000, maxBuffer: 1024 * 1024 }))]));
for (const [minor, snapshot] of Object.entries(snapshots)) {
  if (Object.keys(snapshot.functions).some((name) => !names.includes(name))) throw new Error(`Runtime-only Sodium function in ${minor}`);
  if (Object.keys(snapshot.constants).filter((name) => name.startsWith('SODIUM_'))
    .some((name) => !(name in upstreamConstants))) throw new Error(`Runtime-only Sodium constant in ${minor}`);
  if (!snapshot.exception) throw new Error(`SodiumException absent in ${minor}`);
}
const output = `// Names sourced from JetBrains/phpstorm-stubs ${revision}, sodium/sodium.php.\n`
  + `// Signatures and values checked against PHP 8.1/8.2/8.4/8.5 reflection; PHP 7 availability follows upstream annotations. Apache-2.0.\n`
  + `export const SODIUM_FUNCTION_NAMES = ${JSON.stringify(names)} as const;\n`
  + `export const SODIUM_LEGACY_UNAVAILABLE = ${JSON.stringify(legacyUnavailable)} as const;\n`
  + `export const SODIUM_PHP82_ONLY = ${JSON.stringify(php82Only)} as const;\n`
  + `export const SODIUM_SNAPSHOTS = ${JSON.stringify(snapshots)} as const;\n`;
const target = resolve('packages/language-spec/src/sodium-catalog.ts');
if (process.argv.includes('--write')) await writeFile(target, output);
else if (await readFile(target, 'utf8') !== output) throw new Error(`${target} differs from pinned upstream or local runtime reflection`);
process.stdout.write(`Sodium: ${names.length} upstream functions, ${Object.keys(snapshots['85'].functions).length} runtime functions, four snapshots from ${revision}\n`);
