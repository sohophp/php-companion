import { execFileSync } from 'node:child_process';
import process from 'node:process';
import { MESSAGE_FORMATTER_FUNCTION_METHODS } from '../packages/language-spec/dist/intl-messageformatter-catalog.js';
import { builtinPhpExtensionStub } from '../packages/language-spec/dist/index.js';

const phpCommands = process.argv.slice(2);
if (!phpCommands.length) throw new Error('Usage: node scripts/audit-phpstorm-intl-messageformatter-runtime.mjs PHP_COMMAND...');
const normalized = (type) => type?.replace(/^\?(.+)$/, '$1|null').split('|').sort().join('|') ?? null;
for (const php of phpCommands) {
  const output = execFileSync(php, ['-r', `
    $result = ['version' => PHP_VERSION_ID, 'enabled' => extension_loaded('intl'), 'functions' => [], 'methods' => []];
    if ($result['enabled']) {
      foreach (get_extension_funcs('intl') as $name) {
        if (strpos($name, 'msgfmt_') !== 0) continue;
        $r = new ReflectionFunction($name); $params = [];
        foreach ($r->getParameters() as $p) $params[] = [$p->getName(), $p->hasType() ? (string)$p->getType() : null];
        $result['functions'][$name] = [$r->getNumberOfRequiredParameters(), $params,
          $r->hasReturnType() ? (string)$r->getReturnType() : null];
      }
      $class = new ReflectionClass('MessageFormatter');
      foreach ($class->getMethods() as $method) {
        $params = []; foreach ($method->getParameters() as $p) $params[] = [$p->getName(), $p->hasType() ? (string)$p->getType() : null];
        $result['methods'][$method->getName()] = [$method->getNumberOfRequiredParameters(), $params,
          $method->hasReturnType() ? (string)$method->getReturnType() : null,
          method_exists($method, 'getTentativeReturnType') && $method->getTentativeReturnType() ? (string)$method->getTentativeReturnType() : null,
          $method->isStatic()];
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
  const formatter = stub.slice(stub.indexOf('class MessageFormatter {'));
  const failures = [];
  const entries = Object.entries(MESSAGE_FORMATTER_FUNCTION_METHODS);
  for (const name of Object.keys(runtime.functions)) if (!(name in MESSAGE_FORMATTER_FUNCTION_METHODS)) failures.push(`${name} unmodeled runtime function`);
  for (const name of Object.keys(runtime.methods)) if (name !== '__construct' && !entries.some(([, method]) => method === name)) failures.push(`MessageFormatter::${name} unmodeled runtime method`);
  const verifyParams = (label, text, actual) => {
    const params = text ? text.split(',').map((entry) => entry.trim()) : [];
    const required = params.filter((entry) => !entry.includes('=') && !entry.includes('...')).length;
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
    const functionMatch = formatter.match(new RegExp(`\\bfunction ${name}\\(([^)]*)\\)(?:: ([^ ]+))?`));
    const methodMatch = formatter.match(new RegExp(`@return ([^ ]+) \\*/ public (static )?function ${method}\\(([^)]*)\\)`));
    if (!functionMatch || !methodMatch || !runtime.functions[name] || !runtime.methods[method]) {
      failures.push(`${name}/${method} missing`); continue;
    }
    verifyParams(name, functionMatch[1], runtime.functions[name]);
    verifyParams(`MessageFormatter::${method}`, methodMatch[3], runtime.methods[method]);
    if (Boolean(methodMatch[2]) !== runtime.methods[method][4]) failures.push(`MessageFormatter::${method} static mismatch`);
    if (runtime.version >= 80000 && normalized(functionMatch[2]) !== normalized(runtime.functions[name][2])) {
      failures.push(`${name} return ${functionMatch[2]} != ${runtime.functions[name][2]}`);
    }
    const methodReturn = runtime.methods[method][3] ?? runtime.methods[method][2];
    if (methodReturn && normalized(methodMatch[1]) !== normalized(methodReturn)) {
      failures.push(`MessageFormatter::${method} documented return ${methodMatch[1]} != ${methodReturn}`);
    }
  }
  const constructor = formatter.match(/public function __construct\(([^)]*)\)/);
  if (!constructor) failures.push('MessageFormatter::__construct missing');
  else verifyParams('MessageFormatter::__construct', constructor[1], runtime.methods.__construct);
  if (failures.length) throw new Error(`${php} ${runtime.version}: ${failures.join('; ')}`);
  process.stdout.write(`${php} ${runtime.version}: ten MessageFormatter function/method pairs and constructor match\n`);
}
