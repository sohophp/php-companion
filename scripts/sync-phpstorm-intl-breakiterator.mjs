import { execFileSync } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import process from 'node:process';
import { requirePinnedPhpstormStubs } from './phpstorm-stubs-source.mjs';

const sourceIndex = process.argv.indexOf('--source');
const sourceRoot = sourceIndex >= 0 ? process.argv[sourceIndex + 1] : undefined;
if (!sourceRoot) throw new Error('Usage: node scripts/sync-phpstorm-intl-breakiterator.mjs --source PATH [--write]');
const revision = requirePinnedPhpstormStubs(resolve(sourceRoot));
const source = await readFile(resolve(sourceRoot, 'intl/intl.php'), 'utf8');
const classNames = ['IntlBreakIterator', 'IntlRuleBasedBreakIterator', 'IntlPartsIterator', 'IntlCodePointBreakIterator'];
const starts = classNames.map((name) => source.indexOf(`class ${name} `));
const end = source.indexOf('class UConverter\n', starts[3]);
if (starts.some((at) => at < 0) || end < 0 || starts.some((at, index) => index > 0 && at < starts[index - 1])) {
  throw new Error('Unexpected upstream IntlBreakIterator layout');
}
const sections = Object.fromEntries(classNames.map((name, index) => [name,
  source.slice(starts[index], index === classNames.length - 1 ? end : starts[index + 1]) ]));
const constants = (text) => Object.fromEntries([...text.matchAll(/public const ([A-Z_]+) = (-?\d+);/g)]
  .map((match) => [match[1], Number(match[2])]));
const methods = (text) => [...new Set([...text.matchAll(/\b(?:public|private) (?:static )?function ([A-Za-z_][A-Za-z0-9_]*)\s*\(/g)]
  .map((match) => match[1]))];
const breakConstants = constants(sections.IntlBreakIterator);
const partsConstants = constants(sections.IntlPartsIterator);
if (Object.keys(breakConstants).length !== 19 || Object.keys(partsConstants).length !== 3) {
  throw new Error('Unexpected upstream IntlBreakIterator constants');
}
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
  $result = ['version' => PHP_VERSION_ID, 'enabled' => extension_loaded('intl'), 'classes' => [], 'constants' => []];
  if ($result['enabled']) {
    foreach (['IntlBreakIterator', 'IntlRuleBasedBreakIterator', 'IntlPartsIterator', 'IntlCodePointBreakIterator'] as $name) {
      $class = new ReflectionClass($name); $result['classes'][$name] = [];
      foreach ($class->getMethods() as $method) {
        if ($method->getDeclaringClass()->getName() !== $name) continue;
        $params = []; foreach ($method->getParameters() as $p) $params[] = $param($p);
        $result['classes'][$name][$method->getName()] = [implode(', ', $params),
          $method->hasReturnType() ? (string)$method->getReturnType() : null,
          method_exists($method, 'getTentativeReturnType') && $method->getTentativeReturnType() ? (string)$method->getTentativeReturnType() : null,
          $method->isStatic(), $method->isPrivate()];
      }
      if ($name === 'IntlBreakIterator' || $name === 'IntlPartsIterator') $result['constants'][$name] = $class->getConstants();
    }
  }
  echo json_encode($result, JSON_UNESCAPED_SLASHES);
`;
const runtimes = Object.fromEntries(['php72', 'php81', 'php82', 'php84', 'php85'].map((command) => {
  const result = JSON.parse(execFileSync(command, ['-r', phpScript], { encoding: 'utf8', timeout: 5_000, maxBuffer: 1024 * 1024 }));
  if (!result.enabled) throw new Error(`${command} has no Intl extension`);
  return [command.slice(3), result];
}));
for (const name of classNames) {
  const upstream = methods(sections[name]).sort();
  const runtime = Object.keys(runtimes['85'].classes[name]).sort();
  if (upstream.join(',') !== runtime.join(',')) throw new Error(`${name} upstream/runtime method mismatch: upstream=${upstream} runtime=${runtime}`);
}
for (const [name, upstream] of [['IntlBreakIterator', breakConstants], ['IntlPartsIterator', partsConstants]]) {
  for (const runtime of Object.values(runtimes)) {
    if (JSON.stringify(runtime.constants[name]) !== JSON.stringify(upstream)) throw new Error(`${name} constant mismatch on ${runtime.version}`);
  }
}
const snapshots = Object.fromEntries(Object.entries(runtimes).map(([version, runtime]) => [version, runtime.classes]));
const output = `// Generated from JetBrains/phpstorm-stubs at ${revision}, intl/intl.php, and local PHP 7.2/8.1/8.2/8.4/8.5 reflection.
// Apache-2.0. See THIRD_PARTY_NOTICES.md.
export const INTL_BREAK_CONSTANTS = ${JSON.stringify(breakConstants, null, 2)} as const;
export const INTL_PARTS_CONSTANTS = ${JSON.stringify(partsConstants, null, 2)} as const;
export const INTL_BREAK_SNAPSHOTS = ${JSON.stringify(snapshots, null, 2)} as const;
`;
const target = resolve('packages/language-spec/src/intl-breakiterator-catalog.ts');
if (process.argv.includes('--write')) await writeFile(target, output);
else if (await readFile(target, 'utf8') !== output) throw new Error(`${target} differs from pinned upstream or local runtime reflection`);
process.stdout.write(`Intl break iterators: ${classNames.map((name) => `${name}=${Object.keys(runtimes['85'].classes[name]).length}`).join(', ')}, ${Object.keys(breakConstants).length + Object.keys(partsConstants).length} constants from ${revision}\n`);
