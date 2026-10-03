import { execFileSync } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import process from 'node:process';
import { requirePinnedPhpstormStubs } from './phpstorm-stubs-source.mjs';

const sourceIndex = process.argv.indexOf('--source');
const sourceRoot = sourceIndex >= 0 ? process.argv[sourceIndex + 1] : undefined;
if (!sourceRoot) throw new Error('Usage: node scripts/sync-phpstorm-intl-char.mjs --source PATH [--write]');
const revision = requirePinnedPhpstormStubs(resolve(sourceRoot));
const source = await readFile(resolve(sourceRoot, 'intl/IntlChar.php'), 'utf8');
const constants = Object.fromEntries([...source.matchAll(/public const ([A-Za-z_][A-Za-z0-9_]*) = ('[^']*'|-?\d+(?:\.\d+)?);/g)]
  .map((match) => [match[1], match[2].startsWith("'") ? match[2].slice(1, -1) : Number(match[2])]));
const methods = [...new Set([...source.matchAll(/\bpublic static function ([A-Za-z_][A-Za-z0-9_]*)\s*\(/g)]
  .map((match) => match[1]))].sort();
if (Object.keys(constants).length !== 666 || methods.length !== 59) throw new Error('Unexpected upstream IntlChar catalog');
const phpScript = `
  $param = function($p) {
    $type = $p->hasType() ? (string)$p->getType() : '';
    $name = ($p->isPassedByReference() ? '&' : '').'$'.$p->getName();
    if ($p->isDefaultValueAvailable()) {
      $default = $p->isDefaultValueConstant() ? $p->getDefaultValueConstantName() : var_export($p->getDefaultValue(), true);
      return trim($type.' '.$name).' = '.$default;
    }
    return trim($type.' '.$name).($p->isOptional() ? ' = null' : '');
  };
  $class = new ReflectionClass('IntlChar'); $result = ['version' => PHP_VERSION_ID, 'methods' => [], 'constants' => $class->getConstants()];
  foreach ($class->getMethods() as $method) {
    $params = []; foreach ($method->getParameters() as $p) $params[] = $param($p);
    $result['methods'][$method->getName()] = [implode(', ', $params),
      $method->hasReturnType() ? (string)$method->getReturnType() : null,
      method_exists($method, 'getTentativeReturnType') && $method->getTentativeReturnType() ? (string)$method->getTentativeReturnType() : null];
  }
  echo json_encode($result, JSON_UNESCAPED_SLASHES);
`;
const runtimes = Object.fromEntries(['php72', 'php81', 'php82', 'php84', 'php85'].map((command) =>
  [command.slice(3), JSON.parse(execFileSync(command, ['-r', phpScript], { encoding: 'utf8', timeout: 5_000, maxBuffer: 1024 * 1024 }))]));
const added84 = Object.keys(constants).filter((name) => !(name in runtimes['72'].constants));
if (added84.length !== 3 || Object.keys(runtimes['84'].constants).length !== 666) {
  throw new Error('Unexpected IntlChar version-specific constants');
}
const dynamic = Object.keys(constants).filter((name) => Object.values(runtimes).some((runtime) =>
  name in runtime.constants && runtime.constants[name] !== constants[name]));
for (const runtime of Object.values(runtimes)) {
  if (methods.join(',') !== Object.keys(runtime.methods).sort().join(',')) throw new Error(`IntlChar method mismatch on ${runtime.version}`);
  const expectedNames = Object.keys(constants).filter((name) => runtime.version < 80400 ? !added84.includes(name) : true).sort();
  if (expectedNames.join(',') !== Object.keys(runtime.constants).sort().join(',')) throw new Error(`IntlChar constant-name mismatch on ${runtime.version}`);
  for (const name of expectedNames) {
    if (!dynamic.includes(name) && runtime.constants[name] !== constants[name]) throw new Error(`IntlChar stable constant ${name} mismatch on ${runtime.version}`);
  }
}
const snapshots = Object.fromEntries(Object.entries(runtimes).map(([version, runtime]) => [version, runtime.methods]));
const output = `// Generated from JetBrains/phpstorm-stubs at ${revision}, intl/IntlChar.php, and local PHP 7.2/8.1/8.2/8.4/8.5 reflection.\n// Apache-2.0. See THIRD_PARTY_NOTICES.md.\nexport const INTL_CHAR_CONSTANTS = ${JSON.stringify(constants, null, 2)} as const;\nexport const INTL_CHAR_DYNAMIC_CONSTANTS = ${JSON.stringify(dynamic)} as const;\nexport const INTL_CHAR_ADDED_84_CONSTANTS = ${JSON.stringify(added84)} as const;\nexport const INTL_CHAR_SNAPSHOTS = ${JSON.stringify(snapshots, null, 2)} as const;\n`;
const target = resolve('packages/language-spec/src/intl-char-catalog.ts');
if (process.argv.includes('--write')) await writeFile(target, output);
else if (await readFile(target, 'utf8') !== output) throw new Error(`${target} differs from pinned upstream or local runtime reflection`);
process.stdout.write(`IntlChar: ${methods.length} methods, ${Object.keys(constants).length} constants (${added84.length} added in PHP 8.4; ${dynamic.length} ICU-dependent) from ${revision}\n`);
