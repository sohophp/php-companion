import { execFileSync } from 'node:child_process';
import process from 'node:process';
import { COLLATOR_CONSTANTS, COLLATOR_FUNCTION_METHODS } from '../packages/language-spec/dist/intl-collator-catalog.js';
import { builtinPhpExtensionStub } from '../packages/language-spec/dist/index.js';

const phpCommands = process.argv.slice(2);
if (!phpCommands.length) throw new Error('Usage: node scripts/audit-phpstorm-intl-collator-runtime.mjs PHP_COMMAND...');
const normalizedType = (type) => type?.replace(/^\?(.+)$/, '$1|null').split('|').sort().join('|') ?? null;
for (const php of phpCommands) {
  const output = execFileSync(php, ['-r', `
    $result = ['version' => PHP_VERSION_ID, 'enabled' => extension_loaded('intl'), 'functions' => [], 'methods' => [], 'constants' => []];
    if ($result['enabled']) {
      foreach (get_extension_funcs('intl') as $name) {
        if (strpos($name, 'collator_') !== 0) continue;
        $reflection = new ReflectionFunction($name); $params = [];
        foreach ($reflection->getParameters() as $parameter) $params[] = [$parameter->getName(), $parameter->hasType() ? (string)$parameter->getType() : null];
        $result['functions'][$name] = [$reflection->getNumberOfRequiredParameters(), $params, $reflection->hasReturnType() ? (string)$reflection->getReturnType() : null];
      }
      $class = new ReflectionClass('Collator'); $result['constants'] = $class->getConstants();
      foreach ($class->getMethods() as $method) {
        $params = []; foreach ($method->getParameters() as $parameter) $params[] = [$parameter->getName(), $parameter->hasType() ? (string)$parameter->getType() : null];
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
  const collator = stub.slice(stub.indexOf('class Collator {'));
  const failures = [];
  const entries = Object.entries(COLLATOR_FUNCTION_METHODS);
  for (const name of Object.keys(runtime.functions)) if (!(name in COLLATOR_FUNCTION_METHODS)) failures.push(`${name} unmodeled runtime function`);
  for (const name of Object.keys(runtime.methods)) if (name !== '__construct' && !entries.some(([, method]) => method === name)) failures.push(`Collator::${name} unmodeled runtime method`);
  const verifyParams = (label, text, actual) => {
    const params = text ? text.split(',').map((entry) => entry.trim()) : [];
    const required = params.filter((entry) => !entry.includes('=') && !entry.includes('...')).length;
    if (required !== actual[0] || params.length !== actual[1].length) failures.push(`${label} arity ${required}/${params.length} != ${actual[0]}/${actual[1].length}`);
    if (runtime.version >= 80000) params.forEach((parameter, index) => {
      const match = /^(.*?)\$([a-z_][a-z\d_]*)/i.exec(parameter);
      if (!match) { failures.push(`${label} unparseable parameter ${parameter}`); return; }
      const [, type, parameterName] = match;
      if (parameterName !== actual[1][index]?.[0] || normalizedType(type.replace(/&/g, '').trim() || null) !== normalizedType(actual[1][index]?.[1])) {
        failures.push(`${label} parameter ${index + 1}: ${parameter} != ${actual[1][index]?.join(':')}`);
      }
    });
  };
  for (const [name, method] of entries) {
    const functionMatch = collator.match(new RegExp(`\\bfunction ${name}\\(([^)]*)\\)(?:: ([^ ]+))?`));
    const methodMatch = collator.match(new RegExp(`/\\*\\* @return ([^ ]+) \\*/ public (?:static )?function ${method}\\(([^)]*)\\)`));
    if (!functionMatch || !methodMatch || !runtime.functions[name] || !runtime.methods[method]) {
      failures.push(`${name}/${method} missing`); continue;
    }
    verifyParams(name, functionMatch[1], runtime.functions[name]);
    verifyParams(`Collator::${method}`, methodMatch[2], runtime.methods[method]);
    if (runtime.version >= 80000 && normalizedType(functionMatch[2]) !== normalizedType(runtime.functions[name][2])) {
      failures.push(`${name} return ${functionMatch[2]} != ${runtime.functions[name][2]}`);
    }
    const methodReturn = runtime.methods[method][3] ?? runtime.methods[method][2];
    if (methodReturn && normalizedType(methodMatch[1]) !== normalizedType(methodReturn)) {
      failures.push(`Collator::${method} documented return ${methodMatch[1]} != ${methodReturn}`);
    }
  }
  const constructor = collator.match(/public function __construct\(([^)]*)\)/);
  if (!constructor) failures.push('Collator::__construct missing');
  else verifyParams('Collator::__construct', constructor[1], runtime.methods.__construct);
  const constants = Object.fromEntries([...collator.matchAll(/public const ([A-Z_]+) = (-?\d+);/g)].map((match) => [match[1], Number(match[2])]));
  for (const [name, value] of Object.entries(runtime.constants)) if (constants[name] !== value || COLLATOR_CONSTANTS[name] !== value) failures.push(`Collator::${name} value mismatch or missing`);
  for (const name of Object.keys(constants)) if (!(name in runtime.constants)) failures.push(`Collator::${name} absent from runtime`);
  if (failures.length) throw new Error(`${php} ${runtime.version}: ${failures.join('; ')}`);
  process.stdout.write(`${php} ${runtime.version}: 13 Collator function/method pairs and 24 constants match\n`);
}
