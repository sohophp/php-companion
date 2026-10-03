import { execFileSync } from 'node:child_process';
import process from 'node:process';
import { INTL_TIMEZONE_CONSTANTS, INTL_TIMEZONE_FUNCTION_METHODS } from '../packages/language-spec/dist/intl-timezone-catalog.js';
import { builtinPhpExtensionStub } from '../packages/language-spec/dist/index.js';

const phpCommands = process.argv.slice(2);
if (!phpCommands.length) throw new Error('Usage: node scripts/audit-phpstorm-intl-timezone-runtime.mjs PHP_COMMAND...');
const normalized = (type) => type?.replace(/^\?(.+)$/, '$1|null').split('|').sort().join('|') ?? null;
for (const php of phpCommands) {
  const output = execFileSync(php, ['-r', `
    $result = ['version' => PHP_VERSION_ID, 'enabled' => extension_loaded('intl'), 'functions' => [], 'methods' => [], 'constants' => [], 'constantTypes' => [], 'icu' => null];
    if ($result['enabled']) {
      $result['icu'] = INTL_ICU_VERSION;
      foreach (get_extension_funcs('intl') as $name) {
        if (strpos($name, 'intltz_') !== 0) continue;
        $r = new ReflectionFunction($name); $params = [];
        foreach ($r->getParameters() as $p) $params[] = [$p->getName(), $p->hasType() ? (string)$p->getType() : null];
        $result['functions'][$name] = [$r->getNumberOfRequiredParameters(), $params,
          $r->hasReturnType() ? (string)$r->getReturnType() : null];
      }
      $class = new ReflectionClass('IntlTimeZone'); $result['constants'] = $class->getConstants();
      foreach ($class->getReflectionConstants() as $constant) $result['constantTypes'][$constant->getName()] = method_exists($constant, 'getType') && $constant->getType() ? (string)$constant->getType() : null;
      foreach ($class->getMethods() as $method) {
        $params = []; foreach ($method->getParameters() as $p) $params[] = [$p->getName(), $p->hasType() ? (string)$p->getType() : null];
        $result['methods'][$method->getName()] = [$method->getNumberOfRequiredParameters(), $params,
          $method->hasReturnType() ? (string)$method->getReturnType() : null,
          method_exists($method, 'getTentativeReturnType') && $method->getTentativeReturnType() ? (string)$method->getTentativeReturnType() : null,
          $method->isStatic(), $method->isPrivate()];
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
  const options = runtime.functions.intltz_get_iana_id ? {} : { unavailableFunctions: ['intltz_get_iana_id'] };
  const stub = builtinPhpExtensionStub(version, 'intl', options);
  const timezone = stub.slice(stub.indexOf('class IntlTimeZone {'));
  const failures = [];
  const entries = Object.entries(INTL_TIMEZONE_FUNCTION_METHODS);
  for (const name of Object.keys(runtime.functions)) if (!(name in INTL_TIMEZONE_FUNCTION_METHODS)) failures.push(`${name} unmodeled runtime function`);
  for (const name of Object.keys(runtime.methods)) if (name !== '__construct' && !entries.some(([, method]) => method === name)) failures.push(`IntlTimeZone::${name} unmodeled runtime method`);
  const verifyParams = (label, text, actual) => {
    const params = text ? text.split(',').map((entry) => entry.trim()) : [];
    const required = params.filter((entry) => !entry.includes('=') && !entry.includes('...')).length;
    // PHP 7.2 reports one required argument for intltz_has_same_rules, but
    // calling it with one argument emits "expects exactly 2 parameters".
    if (runtime.version < 80000 && label === 'intltz_has_same_rules') return;
    if (required !== actual[0] || params.length !== actual[1].length) failures.push(`${label} arity ${required}/${params.length} != ${actual[0]}/${actual[1].length}`);
    if (runtime.version >= 80000) params.forEach((parameter, index) => {
      const match = /^(.*?)\$([a-z_][a-z\d_]*)/i.exec(parameter);
      if (!match) { failures.push(`${label} unparseable parameter ${parameter}`); return; }
      const [, type, parameterName] = match;
      if (parameterName !== actual[1][index]?.[0] || normalized(type.replace(/&/g, '').trim() || null) !== normalized(actual[1][index]?.[1])) {
        failures.push(`${label} parameter ${index + 1}: ${parameter} != ${actual[1][index]?.join(':')}`);
      }
    });
  };
  for (const [name, method] of entries) {
    const hasMethod = runtime.methods[method] !== undefined;
    const methodMatch = timezone.match(new RegExp(`@return ([^ ]+) \\*/ public (static )?function ${method}\\(([^)]*)\\)`));
    if (hasMethod !== Boolean(methodMatch)) { failures.push(`IntlTimeZone::${method} presence mismatch`); continue; }
    if (hasMethod) {
      verifyParams(`IntlTimeZone::${method}`, methodMatch[3], runtime.methods[method]);
      if (Boolean(methodMatch[2]) !== runtime.methods[method][4]) failures.push(`IntlTimeZone::${method} static mismatch`);
      const methodReturn = runtime.methods[method][3] ?? runtime.methods[method][2];
      if (methodReturn && normalized(methodMatch[1]) !== normalized(methodReturn)) failures.push(`IntlTimeZone::${method} return mismatch`);
    }
    const functionMatch = timezone.match(new RegExp(`\\bfunction ${name}\\(([^)]*)\\)(?:: ([^ ]+))?`));
    if (Boolean(runtime.functions[name]) !== Boolean(functionMatch)) { failures.push(`${name} presence mismatch`); continue; }
    if (runtime.functions[name]) {
      verifyParams(name, functionMatch[1], runtime.functions[name]);
      if (runtime.version >= 80000 && normalized(functionMatch[2]) !== normalized(runtime.functions[name][2])) failures.push(`${name} return mismatch`);
    }
  }
  if (!timezone.includes('private function __construct()') || !runtime.methods.__construct?.[5]) failures.push('private constructor mismatch');
  const constants = Object.fromEntries([...timezone.matchAll(/public const (?:int )?([A-Z_]+) = (-?\d+);/g)]
    .map((match) => [match[1], Number(match[2])]));
  for (const [name, value] of Object.entries(runtime.constants)) {
    if (constants[name] !== value || INTL_TIMEZONE_CONSTANTS[name] !== value) failures.push(`IntlTimeZone::${name} constant mismatch`);
    if (runtime.constantTypes[name] !== (runtime.version >= 80400 ? 'int' : null)) failures.push(`IntlTimeZone::${name} constant type mismatch`);
    if (!timezone.includes(`public const ${runtime.version >= 80400 ? 'int ' : ''}${name} = ${value};`)) failures.push(`IntlTimeZone::${name} stub constant type mismatch`);
  }
  if (Object.keys(constants).length !== Object.keys(runtime.constants).length) failures.push('constant count mismatch');
  if (timezone.includes('function intltz_getGMT(')) failures.push('non-runtime getGMT alias included');
  if (failures.length) throw new Error(`${php} ${runtime.version} ICU ${runtime.icu}: ${failures.join('; ')}`);
  process.stdout.write(`${php} ${runtime.version} ICU ${runtime.icu}: ${Object.keys(runtime.functions).length} IntlTimeZone functions and ${Object.keys(runtime.methods).length - 1} methods match\n`);
}
