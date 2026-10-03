import { execFileSync } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import process from 'node:process';
import { requirePinnedPhpstormStubs } from './phpstorm-stubs-source.mjs';

const sourceIndex = process.argv.indexOf('--source');
const sourceRoot = sourceIndex >= 0 ? process.argv[sourceIndex + 1] : undefined;
if (!sourceRoot) throw new Error('Usage: node scripts/sync-phpstorm-intl-calendar.mjs --source PATH [--write]');
const revision = requirePinnedPhpstormStubs(resolve(sourceRoot));
const source = await readFile(resolve(sourceRoot, 'intl/intl.php'), 'utf8');
const classStart = source.indexOf('class IntlCalendar\n');
const classEnd = source.indexOf('class IntlIterator implements Iterator', classStart);
if (classStart < 0 || classEnd < 0) throw new Error('Unexpected upstream IntlCalendar layout');
const calendarSource = source.slice(classStart, classEnd);
const gregorianStart = source.indexOf('class IntlGregorianCalendar extends IntlCalendar');
if (gregorianStart < 0 || gregorianStart >= classStart) throw new Error('Unexpected upstream IntlGregorianCalendar layout');
const gregorianSource = source.slice(gregorianStart, classStart);
const classMethodNames = (text) => [...new Set([...text.matchAll(/\b(?:public|private)\s+(?:static\s+)?function\s+(\w+)\s*\(/g)]
  .map((match) => match[1].replace(/^PS_UNRESERVE_PREFIX_/, '')))].sort();
const constants = Object.fromEntries([...calendarSource.matchAll(/public const ([A-Z_]+) = (-?\d+);/g)]
  .map((match) => [match[1], Number(match[2])]));
if (Object.keys(constants).length !== 39) throw new Error('Unexpected upstream IntlCalendar constant set');
const upstreamNames = [...source.matchAll(/^function ((?:intlcal_|intlgregcal_|intcal_)[a-z_]+)\s*\(/gm)].map((match) => match[1]);
const upstreamTypos = ['intcal_get_maximum', 'intlcal_greates_minimum'];
const phpScript = `
  $param = function($p) {
    $type = $p->hasType() ? (string)$p->getType() : '';
    $name = ($p->isPassedByReference() ? '&' : '').'$'.$p->getName();
    if ($p->isDefaultValueAvailable()) {
      if ($p->isDefaultValueConstant()) $default = $p->getDefaultValueConstantName();
      else $default = var_export($p->getDefaultValue(), true);
      return trim($type.' '.$name).' = '.$default;
    }
    return trim($type.' '.$name).($p->isOptional() ? ' = null' : '');
  };
  $signature = function($item) use ($param) {
    $params = []; foreach ($item->getParameters() as $p) $params[] = $param($p);
    $return = $item->hasReturnType() ? (string)$item->getReturnType() : null;
    $tentative = method_exists($item, 'getTentativeReturnType') && $item->getTentativeReturnType() ? (string)$item->getTentativeReturnType() : null;
    return [implode(', ', $params), $return, $tentative];
  };
  $result = ['version' => PHP_VERSION_ID, 'enabled' => extension_loaded('intl'), 'functions' => [], 'calendar' => [], 'gregorian' => [], 'constants' => []];
  if ($result['enabled']) {
    foreach (get_extension_funcs('intl') as $name) {
      if (strpos($name, 'intlcal_') !== 0 && strpos($name, 'intlgregcal_') !== 0) continue;
      $result['functions'][$name] = $signature(new ReflectionFunction($name));
    }
    foreach (['IntlCalendar' => 'calendar', 'IntlGregorianCalendar' => 'gregorian'] as $className => $key) {
      $class = new ReflectionClass($className);
      foreach ($class->getMethods() as $method) {
        if ($method->getDeclaringClass()->getName() !== $className) continue;
        $result[$key][$method->getName()] = array_merge($signature($method), [$method->isStatic(), $method->isPrivate()]);
      }
      if ($key === 'calendar') $result['constants'] = $class->getConstants();
    }
  }
  echo json_encode($result, JSON_UNESCAPED_SLASHES);
`;
const runtimes = Object.fromEntries(['php72', 'php81', 'php82', 'php84', 'php85'].map((command) => {
  const result = JSON.parse(execFileSync(command, ['-r', phpScript], { encoding: 'utf8', timeout: 5_000, maxBuffer: 1024 * 1024 }));
  if (!result.enabled) throw new Error(`${command} has no Intl extension`);
  return [command.slice(3), result];
}));
const runtimeNames = Object.keys(runtimes['85'].functions).sort();
for (const [label, upstream, actual] of [
  ['IntlCalendar', classMethodNames(calendarSource), Object.keys(runtimes['85'].calendar).sort()],
  ['IntlGregorianCalendar', classMethodNames(gregorianSource), Object.keys(runtimes['85'].gregorian).sort()],
]) {
  if (upstream.join(',') !== actual.join(',')) throw new Error(`${label} upstream/runtime method mismatch: upstream=${upstream} runtime=${actual}`);
}
const missing = upstreamNames.filter((name) => !runtimeNames.includes(name));
const extra = runtimeNames.filter((name) => !upstreamNames.includes(name));
if (upstreamNames.length !== 51 || runtimeNames.length !== 49
  || missing.sort().join(',') !== upstreamTypos.sort().join(',') || extra.length) {
  throw new Error(`Unexpected IntlCalendar function catalog: missing=${missing} extra=${extra}`);
}
for (const runtime of Object.values(runtimes)) {
  if (Object.keys(runtime.functions).sort().join(',') !== runtimeNames.join(',')) throw new Error('IntlCalendar functions vary across audited runtimes');
  const differences = Object.keys(constants).filter((name) => runtime.constants[name] !== constants[name]);
  if (differences.some((name) => name !== 'FIELD_FIELD_COUNT') || Object.keys(runtime.constants).length !== Object.keys(constants).length) {
    throw new Error(`IntlCalendar constants disagree with phpstorm-stubs on ${runtime.version}: ${differences}`);
  }
}
const snapshots = Object.fromEntries(Object.entries(runtimes).map(([version, runtime]) => [version, {
  functions: runtime.functions, calendar: runtime.calendar, gregorian: runtime.gregorian,
  fieldCount: runtime.constants.FIELD_FIELD_COUNT,
}]));
const output = `// Generated from JetBrains/phpstorm-stubs at ${revision}, intl/intl.php, and local PHP 7.2/8.1/8.2/8.4/8.5 reflection.
// Apache-2.0. See THIRD_PARTY_NOTICES.md. Non-runtime upstream typos are excluded.
export const INTL_CALENDAR_CONSTANTS = ${JSON.stringify(constants, null, 2)} as const;
export const INTL_CALENDAR_SNAPSHOTS = ${JSON.stringify(snapshots, null, 2)} as const;
`;
const target = resolve('packages/language-spec/src/intl-calendar-catalog.ts');
if (process.argv.includes('--write')) await writeFile(target, output);
else if (await readFile(target, 'utf8') !== output) throw new Error(`${target} differs from pinned upstream or local runtime reflection`);
process.stdout.write(`IntlCalendar: ${runtimeNames.length} procedural functions, ${Object.keys(runtimes['85'].calendar).length} calendar methods, ${Object.keys(runtimes['85'].gregorian).length} Gregorian methods, ${Object.keys(constants).length} constants from ${revision}\n`);
