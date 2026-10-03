import { execFileSync } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import process from 'node:process';
import { requirePinnedPhpstormStubs } from './phpstorm-stubs-source.mjs';

const sourceIndex = process.argv.indexOf('--source');
const sourceRoot = sourceIndex >= 0 ? process.argv[sourceIndex + 1] : undefined;
if (!sourceRoot) throw new Error('Usage: node scripts/sync-phpstorm-zip.mjs --source PATH [--write]');
const revision = requirePinnedPhpstormStubs(resolve(sourceRoot));
const source = await readFile(resolve(sourceRoot, 'zip/zip.php'), 'utf8');
const classStart = source.indexOf('class ZipArchive implements Countable');
const classEnd = source.indexOf('\n}\n', classStart);
if (classStart < 0 || classEnd < 0) throw new Error('Unexpected upstream ZipArchive layout');
const classBody = source.slice(classStart, classEnd);
const futureMethods = ['__serialize', '__unserialize', 'closeString', 'openString'];
const sourceMethods = [...new Set([...classBody.matchAll(/public (?:static )?function ([A-Za-z_][A-Za-z0-9_]*)\s*\(/g)]
  .map((match) => match[1]))].sort();
const methods = sourceMethods.filter((name) => !futureMethods.includes(name));
const functions = [...new Set([...source.matchAll(/^function (zip_[a-z_]+)\s*\(/gm)]
  .map((match) => match[1]))].sort();
const sourceConstants = Object.fromEntries([...classBody.matchAll(/public const ([A-Z_0-9]+) = ([^;]+);/g)]
  .map((match) => [match[1], match[2].replace(/^'(.*)'$/, '$1')]));
const sourceProperties = [...new Set([...classBody.matchAll(/public \$([A-Za-z_][A-Za-z0-9_]*)\s*;/g)]
  .map((match) => match[1]))].sort();
if (sourceMethods.length !== 56 || methods.length !== 52 || functions.length !== 10
  || Object.keys(sourceConstants).length !== 110 || sourceProperties.length !== 6) {
  throw new Error('Unexpected upstream Zip catalog');
}
const phpScript = `
  $class = new ReflectionClass('ZipArchive');
  $signatures = [];
  foreach ($class->getMethods() as $method) {
    $parameters = [];
    foreach ($method->getParameters() as $parameter) {
      $parameters[] = ['name' => $parameter->getName(), 'type' => $parameter->hasType() ? (string)$parameter->getType() : '',
        'optional' => $parameter->isOptional(), 'byRef' => $parameter->isPassedByReference(),
        'default' => $parameter->isDefaultValueAvailable() ? $parameter->getDefaultValue() : null];
    }
    $signatures[$method->getName()] = ['static' => $method->isStatic(), 'params' => $parameters,
      'return' => $method->hasReturnType() ? (string)$method->getReturnType() : '',
      'tentative' => method_exists($method, 'hasTentativeReturnType') && $method->hasTentativeReturnType()
        ? (string)$method->getTentativeReturnType() : ''];
  }
  echo json_encode(['version' => PHP_VERSION_ID,
    'methods' => array_map(function($item) { return $item->getName(); }, $class->getMethods()),
    'properties' => array_map(function($item) { return $item->getName(); }, $class->getProperties()),
    'constants' => $class->getConstants(), 'functions' => get_extension_funcs('zip'), 'signatures' => $signatures], JSON_UNESCAPED_SLASHES);
`;
const runtimes = {};
for (const command of ['php72', 'php74', 'php81', 'php82', 'php84', 'php85']) {
  const runtime = JSON.parse(execFileSync(command, ['-r', phpScript], { encoding: 'utf8', timeout: 5_000 }));
  runtimes[command] = runtime;
  if (methods.join(',') !== [...runtime.methods].sort().join(',')
    || sourceProperties.join(',') !== [...runtime.properties].sort().join(',')
    || functions.join(',') !== [...runtime.functions].sort().join(',')) {
    throw new Error(`Zip method/property/function mismatch on ${runtime.version}`);
  }
  const expectedNames = Object.keys(sourceConstants).filter((name) => name !== 'OPSYS_Z_CPM' || runtime.version < 80000);
  if (Object.keys(runtime.constants).filter((name) => name !== 'ER_TRUNCATED_ZIP').sort().join(',') !== expectedNames.sort().join(',')) {
    throw new Error(`Zip constant availability mismatch on ${runtime.version}`);
  }
  if (runtime.constants.ER_TRUNCATED_ZIP !== 35) throw new Error(`Unexpected Zip runtime-only constant on ${runtime.version}`);
  for (const [name, value] of Object.entries(runtime.constants)) {
    if (name === 'LIBZIP_VERSION' || name === 'ER_TRUNCATED_ZIP') continue;
    if (String(value) !== sourceConstants[name]) throw new Error(`Zip constant value mismatch for ${name} on ${runtime.version}`);
  }
}
const constants = Object.fromEntries(Object.entries(sourceConstants)
  .filter(([name]) => name !== 'LIBZIP_VERSION')
  .map(([name, value]) => [name, Number(value)]));
const signatures = Object.fromEntries(methods.map((name) => [name, {
  ...runtimes.php85.signatures[name],
  legacyNames: runtimes.php72.signatures[name].params.map((parameter) => parameter.name),
}]));
for (const [name, signature] of Object.entries(signatures)) {
  if (signature.params.length !== signature.legacyNames.length) throw new Error(`Zip signature arity mismatch for ${name}`);
  for (const [command, runtime] of Object.entries(runtimes)) {
    const actual = runtime.signatures[name];
    if (actual.params.length !== signature.params.length || actual.static !== signature.static
      || actual.params.some((parameter, index) => parameter.byRef !== signature.params[index].byRef)) {
      throw new Error(`Zip signature shape mismatch for ${name} on ${command}`);
    }
  }
}
const output = `// Names and stable values generated from JetBrains/phpstorm-stubs at ${revision}, zip/zip.php.\n// Signatures checked against PHP 7.2 and 8.5 reflection; LIBZIP_VERSION and ER_TRUNCATED_ZIP require runtime facts. Four upstream PHP 8.6 methods are excluded. Apache-2.0; see THIRD_PARTY_NOTICES.md.\nexport const ZIP_FUNCTIONS = ${JSON.stringify(functions)} as const;\nexport const ZIP_METHODS = ${JSON.stringify(methods)} as const;\nexport const ZIP_PROPERTIES = ${JSON.stringify(sourceProperties)} as const;\nexport const ZIP_CONSTANTS = ${JSON.stringify(constants, null, 2)} as const;\nexport const ZIP_METHOD_SIGNATURES = ${JSON.stringify(signatures, null, 2)} as const;\n`;
const target = resolve('packages/language-spec/src/zip-catalog.ts');
if (process.argv.includes('--write')) await writeFile(target, output);
else if (await readFile(target, 'utf8') !== output) throw new Error(`${target} differs from pinned upstream or local runtime reflection`);
process.stdout.write(`Zip: ${functions.length} functions, ${methods.length} methods, ${Object.keys(constants).length} stable constants from ${revision}\n`);
