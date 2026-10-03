import { execFileSync } from 'node:child_process';
import process from 'node:process';
import { INTL_ERROR_FUNCTIONS } from '../packages/language-spec/dist/intl-errors-catalog.js';
import { builtinPhpExtensionStub } from '../packages/language-spec/dist/index.js';

const phpCommands = process.argv.slice(2);
if (!phpCommands.length) throw new Error('Usage: node scripts/audit-phpstorm-intl-errors-runtime.mjs PHP_COMMAND...');
for (const php of phpCommands) {
  const output = execFileSync(php, ['-r', `
    $names = ['intl_error_name', 'intl_get_error_code', 'intl_get_error_message', 'intl_is_failure'];
    $result = ['version' => PHP_VERSION_ID, 'enabled' => extension_loaded('intl'), 'functions' => []];
    if ($result['enabled']) foreach ($names as $name) {
      if (!function_exists($name)) continue;
      $r = new ReflectionFunction($name); $params = [];
      foreach ($r->getParameters() as $p) $params[] = [$p->getName(), $p->hasType() ? (string)$p->getType() : null];
      $result['functions'][$name] = [$r->getNumberOfRequiredParameters(), $params,
        $r->hasReturnType() ? (string)$r->getReturnType() : null];
    }
    echo json_encode($result);
  `], { encoding: 'utf8', timeout: 5_000 });
  const runtime = JSON.parse(output);
  if (!runtime.enabled) {
    process.stdout.write(`${php} ${runtime.version}: Intl unavailable; extension filtering required\n`);
    continue;
  }
  const version = `${Math.floor(runtime.version / 10_000)}.${Math.floor(runtime.version / 100) % 100}`;
  const stub = builtinPhpExtensionStub(version, 'intl');
  const expected = { intl_error_name: ['int $errorCode', 'string'], intl_get_error_code: ['', 'int'],
    intl_get_error_message: ['', 'string'], intl_is_failure: ['int $errorCode', 'bool'] };
  const failures = [];
  for (const name of INTL_ERROR_FUNCTIONS) {
    const [parameters, returnType] = expected[name];
    const declaration = `${runtime.version >= 80000 ? '' : `/** @return ${returnType} */ `}function ${name}(${parameters})${runtime.version >= 80000 ? `: ${returnType}` : ''} {}`;
    if (!stub.includes(declaration)) failures.push(`${name} declaration missing`);
    const actual = runtime.functions[name];
    if (!actual || actual[0] !== (parameters ? 1 : 0) || actual[1].length !== (parameters ? 1 : 0)) failures.push(`${name} arity mismatch`);
    if (runtime.version >= 80000 && (actual?.[2] !== returnType
      || (parameters && (actual[1][0][0] !== 'errorCode' || actual[1][0][1] !== 'int')))) failures.push(`${name} PHP 8 signature mismatch`);
  }
  if (failures.length) throw new Error(`${php} ${runtime.version}: ${failures.join('; ')}`);
  process.stdout.write(`${php} ${runtime.version}: four Intl global error functions match\n`);
}
