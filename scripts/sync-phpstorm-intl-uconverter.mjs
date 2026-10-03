import { execFileSync } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import process from 'node:process';
import { requirePinnedPhpstormStubs } from './phpstorm-stubs-source.mjs';

const sourceIndex = process.argv.indexOf('--source');
const sourceRoot = sourceIndex >= 0 ? process.argv[sourceIndex + 1] : undefined;
if (!sourceRoot) throw new Error('Usage: node scripts/sync-phpstorm-intl-uconverter.mjs --source PATH [--write]');
const revision = requirePinnedPhpstormStubs(resolve(sourceRoot));
const source = await readFile(resolve(sourceRoot, 'intl/intl.php'), 'utf8');
const start = source.indexOf('class UConverter\n');
const end = source.indexOf('// End of intl', start);
if (start < 0 || end < 0) throw new Error('Unexpected upstream UConverter layout');
const section = source.slice(start, end);
const constants = Object.fromEntries([...section.matchAll(/public const ([A-Za-z0-9_]+) = (-?\d+);/g)]
  .map((match) => [match[1], Number(match[2])]));
const methods = [...new Set([...section.matchAll(/\bpublic (?:static )?function ([A-Za-z_][A-Za-z0-9_]*)\s*\(/g)]
  .map((match) => match[1]))].sort();
if (methods.length !== 19 || Object.keys(constants).length !== 41) throw new Error('Unexpected upstream UConverter catalog');
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
  $class = new ReflectionClass('UConverter'); $result = ['version' => PHP_VERSION_ID, 'methods' => [], 'constants' => $class->getConstants()];
  foreach ($class->getMethods() as $method) {
    $params = []; foreach ($method->getParameters() as $p) $params[] = $param($p);
    $result['methods'][$method->getName()] = [implode(', ', $params),
      $method->hasReturnType() ? (string)$method->getReturnType() : null,
      method_exists($method, 'getTentativeReturnType') && $method->getTentativeReturnType() ? (string)$method->getTentativeReturnType() : null,
      $method->isStatic()];
  }
  echo json_encode($result, JSON_UNESCAPED_SLASHES);
`;
const runtimes = Object.fromEntries(['php72', 'php81', 'php82', 'php84', 'php85'].map((command) =>
  [command.slice(3), JSON.parse(execFileSync(command, ['-r', phpScript], { encoding: 'utf8', timeout: 5_000 }))]));
for (const runtime of Object.values(runtimes)) {
  if (methods.join(',') !== Object.keys(runtime.methods).sort().join(',')) {
    throw new Error(`UConverter method mismatch on ${runtime.version}`);
  }
  if (JSON.stringify(constants) !== JSON.stringify(runtime.constants)) {
    throw new Error(`UConverter constant mismatch on ${runtime.version}`);
  }
}
const snapshots = Object.fromEntries(Object.entries(runtimes).map(([version, runtime]) => [version, runtime.methods]));
const output = `// Generated from JetBrains/phpstorm-stubs at ${revision}, intl/intl.php, and local PHP 7.2/8.1/8.2/8.4/8.5 reflection.\n// Apache-2.0. See THIRD_PARTY_NOTICES.md.\nexport const INTL_UCONVERTER_CONSTANTS = ${JSON.stringify(constants, null, 2)} as const;\nexport const INTL_UCONVERTER_SNAPSHOTS = ${JSON.stringify(snapshots, null, 2)} as const;\n`;
const target = resolve('packages/language-spec/src/intl-uconverter-catalog.ts');
if (process.argv.includes('--write')) await writeFile(target, output);
else if (await readFile(target, 'utf8') !== output) throw new Error(`${target} differs from pinned upstream or local runtime reflection`);
process.stdout.write(`UConverter: ${methods.length} methods, ${Object.keys(constants).length} constants from ${revision}\n`);
