import { execFileSync } from 'node:child_process';
import process from 'node:process';
import { PhpSyntaxParser } from '../packages/parser/dist/index.js';
import { SUPPORTED_PHP_VERSIONS, builtinPhpStub } from '../packages/language-spec/dist/index.js';

const [version, module, phpCommand = `php${version?.replace('.', '')}`] = process.argv.slice(2);
if (!SUPPORTED_PHP_VERSIONS.includes(version) || !/^[a-z][a-z\d_]*$/i.test(module ?? ''))
  throw new Error('Usage: node scripts/audit-phpstorm-runtime-signatures.mjs VERSION MODULE [PHP_COMMAND]');
const php = `
$module = $argv[1];
if (!extension_loaded($module)) { echo json_encode(['version' => PHP_MAJOR_VERSION . '.' . PHP_MINOR_VERSION, 'available' => false]); exit; }
$functions = [];
foreach (get_extension_funcs($module) ?: [] as $name) {
  $function = new ReflectionFunction($name);
  $functions[strtolower($name)] = [
    'required' => $function->getNumberOfRequiredParameters(),
    'parameters' => array_map(function ($parameter) { return ['name' => $parameter->getName(), 'variadic' => $parameter->isVariadic(), 'byReference' => $parameter->isPassedByReference()]; }, $function->getParameters()),
  ];
}
echo json_encode(['version' => PHP_MAJOR_VERSION . '.' . PHP_MINOR_VERSION, 'available' => true, 'functions' => $functions]);`;
const runtime = JSON.parse(execFileSync(phpCommand, ['-r', php, module], { encoding: 'utf8' }));
if (runtime.version !== version) throw new Error(`Expected PHP ${version}, got ${runtime.version}`);
if (!runtime.available) throw new Error(`PHP ${version} has no ${module} extension`);
const parser = await PhpSyntaxParser.createDefault();
try {
  const parsed = parser.parse(builtinPhpStub(version));
  const callables = new Map();
  for (const item of parsed.callables) {
    if (item.kind !== 'function') continue;
    const key = item.fqcn.replace(/^\\/, '').toLowerCase();
    const list = callables.get(key) ?? [];
    list.push(item); callables.set(key, list);
  }
  const missing = []; const mismatches = []; const overloads = [];
  for (const [name, actual] of Object.entries(runtime.functions)) {
    const candidates = callables.get(name) ?? [];
    if (!candidates.length) { missing.push(name); continue; }
    const compatible = candidates.some(item => {
      const required = item.parameters.filter(parameter => !parameter.variadic && parameter.defaultValue === undefined).length;
      const exact = item.parameters.length === actual.parameters.length
        && item.parameters.every((parameter, index) => parameter.name.replace(/^\$/, '') === actual.parameters[index].name
          && parameter.variadic === actual.parameters[index].variadic
          && parameter.byReference === actual.parameters[index].byReference);
      const runtimeVariadic = actual.parameters.at(-1)?.variadic;
      const expandedVariadic = runtimeVariadic && item.parameters.length === actual.parameters.length + 1
        && item.parameters.at(-1)?.variadic
        && item.parameters.slice(0, -2).every((parameter, index) => parameter.name.replace(/^\$/, '') === actual.parameters[index].name
          && parameter.byReference === actual.parameters[index].byReference);
      const expandedReferences = !expandedVariadic || item.parameters.slice(-2).every(parameter =>
        parameter.byReference === actual.parameters.at(-1)?.byReference);
      return required === actual.required && (exact || expandedVariadic && expandedReferences);
    });
    if (!compatible) {
      const difference = { name, runtime: actual,
        stubs: candidates.map(item => ({ required: item.parameters.filter(parameter => !parameter.variadic && parameter.defaultValue === undefined).length,
          parameters: item.parameters.map(parameter => ({ name: parameter.name.replace(/^\$/, ''), variadic: parameter.variadic, byReference: parameter.byReference })) })) };
      (candidates.length > 1 ? overloads : mismatches).push(difference);
    }
  }
  process.stdout.write(`${JSON.stringify({ version, module, runtimeFunctions: Object.keys(runtime.functions).length,
    missing, mismatches, overloads }, null, 2)}\n`);
} finally { parser.dispose(); }
