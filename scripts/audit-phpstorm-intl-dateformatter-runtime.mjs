import { execFileSync } from 'node:child_process';
import process from 'node:process';
import { DATE_FORMATTER_CONSTANTS, DATE_FORMATTER_FUNCTION_METHODS } from '../packages/language-spec/dist/intl-dateformatter-catalog.js';
import { builtinPhpExtensionStub } from '../packages/language-spec/dist/index.js';

const phpCommands = process.argv.slice(2);
if (!phpCommands.length) throw new Error('Usage: node scripts/audit-phpstorm-intl-dateformatter-runtime.mjs PHP_COMMAND...');
const normalized = (type) => type?.replace(/^\?(.+)$/, '$1|null').split('|').sort().join('|') ?? null;
for (const php of phpCommands) {
  const output = execFileSync(php, ['-r', `
    $result = ['version' => PHP_VERSION_ID, 'enabled' => extension_loaded('intl'), 'functions' => [], 'methods' => [], 'constants' => []];
    if ($result['enabled']) {
      foreach (get_extension_funcs('intl') as $name) {
        if (strpos($name, 'datefmt_') !== 0) continue;
        $reflection = new ReflectionFunction($name); $params = [];
        foreach ($reflection->getParameters() as $p) $params[] = [$p->getName(), $p->hasType() ? (string)$p->getType() : null];
        $result['functions'][$name] = [$reflection->getNumberOfRequiredParameters(), $params,
          $reflection->hasReturnType() ? (string)$reflection->getReturnType() : null];
      }
      $class = new ReflectionClass('IntlDateFormatter'); $result['constants'] = $class->getConstants();
      foreach ($class->getMethods() as $method) {
        $params = []; foreach ($method->getParameters() as $p) $params[] = [$p->getName(), $p->hasType() ? (string)$p->getType() : null];
        $result['methods'][$method->getName()] = [$method->getNumberOfRequiredParameters(), $params,
          $method->hasReturnType() ? (string)$method->getReturnType() : null,
          method_exists($method, 'getTentativeReturnType') && $method->getTentativeReturnType() ? (string)$method->getTentativeReturnType() : null];
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
  const formatter = stub.slice(stub.indexOf('class IntlDateFormatter {'));
  const failures = [];
  const entries = Object.entries(DATE_FORMATTER_FUNCTION_METHODS);
  for (const name of Object.keys(runtime.functions)) if (!(name in DATE_FORMATTER_FUNCTION_METHODS)) failures.push(`${name} unmodeled runtime function`);
  for (const name of Object.keys(runtime.methods)) if (name !== '__construct' && name !== 'parseToCalendar' && !entries.some(([, method]) => method === name)) failures.push(`IntlDateFormatter::${name} unmodeled runtime method`);
  const verifyParams = (label, text, actual) => {
    const params = text ? text.split(',').map((entry) => entry.trim()) : [];
    const required = params.filter((entry) => !entry.includes('=') && !entry.includes('...')).length;
    // PHP 7.2 arginfo falsely reports format as two optional arguments. Calling
    // it without a date fails; the usable signature requires exactly one date.
    if (runtime.version < 80000 && (/(?:^|::)(?:datefmt_format|format)$/.test(label) || label === 'datefmt_set_lenient')) return;
    if (required !== actual[0] || params.length !== actual[1].length) failures.push(`${label} arity ${required}/${params.length} != ${actual[0]}/${actual[1].length}`);
    if (runtime.version >= 80000) params.forEach((parameter, index) => {
      const match = /^(.*?)\$([a-z_][a-z\d_]*)/i.exec(parameter);
      if (!match) { failures.push(`${label} unparseable parameter ${parameter}`); return; }
      const [, type, parameterName] = match;
      // The constructor's calendar arginfo stays untyped even though create() is typed.
      if (parameterName !== actual[1][index]?.[0] || normalized(type.replace(/&/g, '').trim() || null) !== normalized(actual[1][index]?.[1])) {
        failures.push(`${label} parameter ${index + 1}: ${parameter} != ${actual[1][index]?.join(':')}`);
      }
    });
  };
  for (const [name, method] of entries) {
    const functionMatch = formatter.match(new RegExp(`\\bfunction ${name}\\(([^)]*)\\)(?:: ([^ ]+))?`));
    const methodMatch = formatter.match(new RegExp(`@return ([^ ]+) \\*/ public (?:static )?function ${method}\\(([^)]*)\\)`));
    if (!functionMatch || !methodMatch || !runtime.functions[name] || !runtime.methods[method]) {
      failures.push(`${name}/${method} missing`); continue;
    }
    verifyParams(name, functionMatch[1], runtime.functions[name]);
    verifyParams(`IntlDateFormatter::${method}`, methodMatch[2], runtime.methods[method]);
    if (runtime.version >= 80000 && normalized(functionMatch[2]) !== normalized(runtime.functions[name][2])) {
      failures.push(`${name} return ${functionMatch[2]} != ${runtime.functions[name][2]}`);
    }
    const methodReturn = runtime.methods[method][3] ?? runtime.methods[method][2];
    if (methodReturn && normalized(methodMatch[1]) !== normalized(methodReturn)) {
      failures.push(`IntlDateFormatter::${method} documented return ${methodMatch[1]} != ${methodReturn}`);
    }
  }
  const constructor = formatter.match(/public function __construct\(([^)]*)\)/);
  if (!constructor) failures.push('IntlDateFormatter::__construct missing');
  else verifyParams('IntlDateFormatter::__construct', constructor[1], runtime.methods.__construct);
  if (runtime.version >= 80400 !== formatter.includes('function parseToCalendar(')) failures.push('parseToCalendar version mismatch');
  const constants = Object.fromEntries([...formatter.matchAll(/public const ([A-Z0-9_]+) = (-?\d+);/g)].map((match) => [match[1], Number(match[2])]));
  for (const [name, value] of Object.entries(runtime.constants)) if (constants[name] !== value || DATE_FORMATTER_CONSTANTS[name] !== value) failures.push(`IntlDateFormatter::${name} value mismatch or missing`);
  for (const name of Object.keys(constants)) if (!(name in runtime.constants)) failures.push(`IntlDateFormatter::${name} absent from runtime`);
  if (formatter.includes('datefmt_set_timezone_id')) failures.push('removed datefmt_set_timezone_id is present');
  if (failures.length) throw new Error(`${php} ${runtime.version}: ${failures.join('; ')}`);
  process.stdout.write(`${php} ${runtime.version}: 20 IntlDateFormatter function/method pairs and ${Object.keys(constants).length} constants match\n`);
}
