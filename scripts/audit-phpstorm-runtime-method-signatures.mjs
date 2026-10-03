import { execFileSync } from 'node:child_process';
import process from 'node:process';
import { PhpSyntaxParser } from '../packages/parser/dist/index.js';
import { SUPPORTED_PHP_VERSIONS, builtinPhpStub, randomClassesPhpStub, bcmathNumberPhpStub,
  filterClassesPhpStub, pdoDriverPhpStub } from '../packages/language-spec/dist/index.js';

const [version, module, phpCommand = `php${version?.replace('.', '')}`] = process.argv.slice(2);
if (!SUPPORTED_PHP_VERSIONS.includes(version) || !/^[a-z][a-z\d_]*$/i.test(module ?? ''))
  throw new Error('Usage: node scripts/audit-phpstorm-runtime-method-signatures.mjs VERSION MODULE [PHP_COMMAND]');

const php = `
$module = $argv[1];
if (!extension_loaded($module)) { echo json_encode(['version' => PHP_MAJOR_VERSION . '.' . PHP_MINOR_VERSION, 'available' => false]); exit; }
$methods = [];
foreach ((new ReflectionExtension($module))->getClasses() as $class) {
  foreach ($class->getMethods(ReflectionMethod::IS_PUBLIC) as $method) {
    if (strcasecmp($method->getDeclaringClass()->getName(), $class->getName()) !== 0) continue;
    if (method_exists($class, 'isEnum') && $class->isEnum()
      && in_array(strtolower($method->getName()), ['cases', 'from', 'tryfrom'], true)) continue;
    $key = strtolower($class->getName() . '::' . $method->getName());
    $methods[$key] = [
      'required' => $method->getNumberOfRequiredParameters(),
      'parameters' => array_map(function ($parameter) { return ['name' => $parameter->getName(), 'variadic' => $parameter->isVariadic(), 'byReference' => $parameter->isPassedByReference()]; }, $method->getParameters()),
    ];
  }
}
echo json_encode(['version' => PHP_MAJOR_VERSION . '.' . PHP_MINOR_VERSION, 'available' => true, 'methods' => $methods]);`;
const runtime = JSON.parse(execFileSync(phpCommand, ['-r', php, module], { encoding: 'utf8' }));
if (runtime.version !== version) throw new Error(`Expected PHP ${version}, got ${runtime.version}`);
if (!runtime.available) throw new Error(`PHP ${version} has no ${module} extension`);

const parser = await PhpSyntaxParser.createDefault();
try {
  const documents = [builtinPhpStub(version), randomClassesPhpStub(version), bcmathNumberPhpStub(version),
    filterClassesPhpStub(version), pdoDriverPhpStub(version)].filter(Boolean).map((source) => parser.parse(source));
  const declarations = new Map(documents.flatMap((document) => document.declarations)
    .map((item) => [item.fqcn.replace(/^\\/, '').toLowerCase(), item]));
  const methods = new Map();
  for (const item of documents.flatMap((document) => document.callables)) {
    if (item.kind !== 'method' || item.visibility !== 'public' || !item.containerFqcn) continue;
    const key = `${item.containerFqcn.replace(/^\\/, '')}::${item.name}`.toLowerCase();
    const list = methods.get(key) ?? [];
    list.push(item); methods.set(key, list);
  }
  const methodCandidates = (name, visited = new Set()) => {
    const separator = name.lastIndexOf('::');
    if (separator < 0) return [];
    const owner = name.slice(0, separator);
    if (visited.has(owner)) return [];
    visited.add(owner);
    const own = methods.get(name);
    if (own?.length) return own;
    const declaration = declarations.get(owner);
    if (!declaration) return [];
    const namespace = owner.includes('\\') ? owner.slice(0, owner.lastIndexOf('\\') + 1) : '';
    for (const parentName of [...declaration.extendsNames, ...declaration.implementsNames, ...declaration.traitNames]) {
      const absolute = parentName.replace(/^\\/, '').toLowerCase();
      const parent = declarations.has(absolute) ? absolute : `${namespace}${absolute}`;
      const inherited = methodCandidates(`${parent}${name.slice(separator)}`, visited);
      if (inherited.length) return inherited;
    }
    return [];
  };
  const missing = []; const mismatches = []; const overloads = []; const runtimePublicButBlockedConstructors = [];
  for (const [name, actual] of Object.entries(runtime.methods)) {
    const candidates = methodCandidates(name);
    if (!candidates.length) {
      if (name === 'weakreference::__construct' || name === 'fibererror::__construct')
        runtimePublicButBlockedConstructors.push(name);
      else missing.push(name);
      continue;
    }
    const compatible = candidates.some((item) => {
      const required = item.parameters.filter((parameter) => !parameter.variadic && parameter.defaultValue === undefined).length;
      const exact = item.parameters.length === actual.parameters.length
        && item.parameters.every((parameter, index) => parameter.name.replace(/^\$/, '') === actual.parameters[index].name
          && parameter.variadic === actual.parameters[index].variadic
          && parameter.byReference === actual.parameters[index].byReference);
      const expandedVariadic = actual.parameters.at(-1)?.variadic
        && item.parameters.length === actual.parameters.length + 1
        && !item.parameters.at(-2)?.variadic && item.parameters.at(-1)?.variadic
        && item.parameters.at(-1)?.name.replace(/^\$/, '') === actual.parameters.at(-1)?.name
        && item.parameters.slice(0, -2).every((parameter, index) => parameter.name.replace(/^\$/, '') === actual.parameters[index].name
          && parameter.variadic === actual.parameters[index].variadic
          && parameter.byReference === actual.parameters[index].byReference);
      const expandedReferences = !expandedVariadic || item.parameters.slice(-2).every(parameter =>
        parameter.byReference === actual.parameters.at(-1)?.byReference);
      return required === actual.required && (exact || expandedVariadic && expandedReferences);
    });
    if (!compatible) {
      const difference = { name, runtime: actual,
        stubs: candidates.map((item) => ({
          required: item.parameters.filter((parameter) => !parameter.variadic && parameter.defaultValue === undefined).length,
          parameters: item.parameters.map((parameter) => ({ name: parameter.name.replace(/^\$/, ''), variadic: parameter.variadic, byReference: parameter.byReference })),
        })) };
      (candidates.length > 1 ? overloads : mismatches).push(difference);
    }
  }
  process.stdout.write(`${JSON.stringify({ version, module, runtimeMethods: Object.keys(runtime.methods).length,
    missing, mismatches, overloads, runtimePublicButBlockedConstructors }, null, 2)}\n`);
} finally { parser.dispose(); }
