import { execFileSync } from 'node:child_process';
import process from 'node:process';
import { LOCALE_FUNCTION_METHODS, NORMALIZER_FUNCTION_METHODS } from '../packages/language-spec/dist/intl-locale-catalog.js';
import { builtinPhpExtensionStub } from '../packages/language-spec/dist/index.js';

const phpCommands = process.argv.slice(2);
if (!phpCommands.length) throw new Error('Usage: node scripts/audit-phpstorm-intl-locale-runtime.mjs PHP_COMMAND...');
const pairs = { ...LOCALE_FUNCTION_METHODS, ...NORMALIZER_FUNCTION_METHODS };
const normalizedType = (type) => type?.replace(/^\?(.+)$/, '$1|null').split('|').sort().join('|') ?? null;
for (const php of phpCommands) {
  const output = execFileSync(php, ['-r', `
    $result = ['version' => PHP_VERSION_ID, 'enabled' => extension_loaded('intl'), 'functions' => [], 'classes' => []];
    if ($result['enabled']) {
      foreach (get_extension_funcs('intl') as $name) {
        if (strpos($name, 'locale_') !== 0 && strpos($name, 'normalizer_') !== 0) continue;
        $reflection = new ReflectionFunction($name);
        $params = []; foreach ($reflection->getParameters() as $parameter) $params[] = [$parameter->getName(), $parameter->hasType() ? (string)$parameter->getType() : null];
        $result['functions'][$name] = [$reflection->getNumberOfRequiredParameters(), $params, $reflection->hasReturnType() ? (string)$reflection->getReturnType() : null];
      }
      foreach (['Locale', 'Normalizer'] as $name) {
        $class = new ReflectionClass($name);
        $result['classes'][$name] = ['constants' => $class->getConstants(), 'methods' => []];
        foreach ($class->getMethods() as $method) {
          $params = []; foreach ($method->getParameters() as $parameter) $params[] = [$parameter->getName(), $parameter->hasType() ? (string)$parameter->getType() : null];
          $result['classes'][$name]['methods'][$method->getName()] = [$method->getNumberOfRequiredParameters(), $params, $method->hasReturnType() ? (string)$method->getReturnType() : null];
        }
      }
    }
    echo json_encode($result);
  `], { encoding: 'utf8', timeout: 5_000, maxBuffer: 512 * 1024 });
  const runtime = JSON.parse(output);
  if (!runtime.enabled) {
    process.stdout.write(`${php} ${runtime.version}: Intl unavailable; extension filtering required\n`);
    continue;
  }
  const version = `${Math.floor(runtime.version / 10_000)}.${Math.floor(runtime.version / 100) % 100}`;
  const stub = builtinPhpExtensionStub(version, 'intl');
  const failures = [];
  for (const name of Object.keys(runtime.functions)) if (!(name in pairs)) failures.push(`${name} unmodeled runtime function`);
  for (const className of ['Locale', 'Normalizer']) {
    const known = new Set(Object.entries(pairs).filter(([name]) => name.startsWith(className === 'Locale' ? 'locale_' : 'normalizer_')).map(([, method]) => method));
    for (const name of Object.keys(runtime.classes[className].methods)) if (!known.has(name)) failures.push(`${className}::${name} unmodeled runtime method`);
  }
  for (const [name, method] of Object.entries(pairs)) {
    const expected = runtime.functions[name];
    const className = name.startsWith('locale_') ? 'Locale' : 'Normalizer';
    const runtimeMethod = runtime.classes[className].methods[method];
    const procedural = stub.match(new RegExp(`\\bfunction ${name}\\(([^)]*)\\)(?:: ([^ ]+))?`));
    const staticMethod = stub.match(new RegExp(`public static function ${method}\\(([^)]*)\\)(?:: ([^ ]+))?`));
    if (!expected || !runtimeMethod) {
      if (procedural || staticMethod) failures.push(`${name} present in stub but absent in runtime`);
      continue;
    }
    if (!procedural || !staticMethod) { failures.push(`${name}/${method} missing from stub`); continue; }
    for (const [label, found, actual] of [['function', procedural, expected], ['method', staticMethod, runtimeMethod]]) {
      const params = found[1] ? found[1].split(',').map((entry) => entry.trim()) : [];
      const required = params.filter((entry) => !entry.includes('=') && !entry.includes('...')).length;
      if (required !== actual[0] || params.length !== actual[1].length) failures.push(`${name} ${label} arity ${required}/${params.length} != ${actual[0]}/${actual[1].length}`);
      if (runtime.version >= 80000 && normalizedType(found[2]) !== normalizedType(actual[2])) failures.push(`${name} ${label} return ${found[2]} != ${actual[2]}`);
      if (runtime.version >= 80000) params.forEach((parameter, index) => {
        const match = /^(.*?)\$([a-z_][a-z\d_]*)/i.exec(parameter);
        if (!match) { failures.push(`${name} ${label} unparseable parameter ${parameter}`); return; }
        const [, type, parameterName] = match;
        if (parameterName !== actual[1][index]?.[0] || normalizedType(type.trim()) !== normalizedType(actual[1][index]?.[1])) {
          failures.push(`${name} ${label} parameter ${index + 1}: ${parameter} != ${actual[1][index]?.join(':')}`);
        }
      });
    }
  }
  const classConstants = [...stub.matchAll(/public const (\w+) = ([^;]+);/g)];
  const localeText = stub.slice(stub.indexOf('class Locale {'), stub.indexOf('class Normalizer {'));
  const normalizerText = stub.slice(stub.indexOf('class Normalizer {'), stub.indexOf('function locale_get_default('));
  for (const [className, text] of [['Locale', localeText], ['Normalizer', normalizerText]]) {
    const declared = Object.fromEntries([...text.matchAll(/public const (\w+) = ([^;]+);/g)].map((match) => [match[1], JSON.parse(match[2])]));
    const actual = runtime.classes[className].constants;
    for (const [name, value] of Object.entries(declared)) if (actual[name] !== value) failures.push(`${className}::${name} value mismatch`);
    for (const name of Object.keys(actual)) if (!(name in declared)) failures.push(`${className}::${name} missing from stub`);
  }
  if (classConstants.length === 0) failures.push('no class constants');
  if (failures.length) throw new Error(`${php} ${runtime.version}: ${failures.join('; ')}`);
  process.stdout.write(`${php} ${runtime.version}: ${Object.keys(runtime.functions).length} Locale/Normalizer functions, methods and constants match\n`);
}
