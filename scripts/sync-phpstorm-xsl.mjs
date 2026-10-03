import { execFileSync } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import process from 'node:process';
import { requirePinnedPhpstormStubs } from './phpstorm-stubs-source.mjs';

const sourceIndex = process.argv.indexOf('--source');
const sourceRoot = sourceIndex >= 0 ? process.argv[sourceIndex + 1] : undefined;
if (!sourceRoot) throw new Error('Usage: node scripts/sync-phpstorm-xsl.mjs --source PATH [--write]');
const revision = requirePinnedPhpstormStubs(resolve(sourceRoot));
const source = execFileSync('git', ['-C', sourceRoot, 'show', 'HEAD:xsl/xsl.php'], { encoding: 'utf8' });
const methods = [...new Set([...source.matchAll(/public function ([A-Za-z][A-Za-z0-9_]*)\s*\(/g)].map((match) => match[1]))].sort();
const properties = [...new Set([...source.matchAll(/public (?:bool|int) \$([A-Za-z][A-Za-z0-9_]*)/g)].map((match) => match[1]))].sort();
const constants = [...new Set([...source.matchAll(/define\('([A-Z][A-Z0-9_]*)',/g)].map((match) => match[1]))].sort();
if (methods.length !== 13 || properties.length !== 4 || constants.length !== 14 || !source.includes('class XSLTProcessor'))
  throw new Error('Unexpected upstream XSL catalog');

const phpScript = `
$extension = new ReflectionExtension('xsl');
$class = new ReflectionClass('XSLTProcessor');
$methods = [];
foreach ($class->getMethods() as $method) {
  $parameters = [];
  foreach ($method->getParameters() as $parameter) {
    $hasDefault = $parameter->isDefaultValueAvailable();
    $parameters[] = ['name' => $parameter->getName(), 'type' => $parameter->hasType() ? (string) $parameter->getType() : null,
      'byRef' => $parameter->isPassedByReference(), 'variadic' => $parameter->isVariadic(), 'optional' => $parameter->isOptional(),
      'default' => $hasDefault ? $parameter->getDefaultValue() : null,
      'defaultConstant' => $hasDefault && $parameter->isDefaultValueConstant() ? $parameter->getDefaultValueConstantName() : null];
  }
  $tentative = method_exists($method, 'getTentativeReturnType') ? $method->getTentativeReturnType() : null;
  $methods[$method->getName()] = ['parameters' => $parameters,
    'return' => $method->hasReturnType() ? (string) $method->getReturnType() : null,
    'tentative' => $tentative ? (string) $tentative : null];
}
$properties = [];
foreach ($class->getProperties() as $property) $properties[$property->getName()] = $property->hasType() ? (string) $property->getType() : null;
echo json_encode(['version' => PHP_VERSION_ID, 'methods' => $methods, 'properties' => $properties,
  'constants' => $extension->getConstants()], JSON_UNESCAPED_SLASHES);
`;
const snapshots = {};
for (const command of ['php72', 'php74', 'php81', 'php82', 'php84', 'php85']) {
  const runtime = JSON.parse(execFileSync(command, ['-r', phpScript], { encoding: 'utf8', timeout: 5_000 }));
  const version = String(Math.floor(runtime.version / 100));
  if (Object.keys(runtime.methods).length !== (runtime.version >= 80400 ? 13 : 12)
    || Object.keys(runtime.properties).length !== (runtime.version >= 80400 ? 4 : 0)
    || Object.keys(runtime.constants).length !== 14
    || Object.keys(runtime.methods).some((name) => !methods.includes(name))
    || Object.keys(runtime.properties).some((name) => !properties.includes(name))
    || Object.keys(runtime.constants).some((name) => !constants.includes(name)))
    throw new Error(`XSL runtime mismatch: ${command}`);
  snapshots[version] = {
    methods: Object.fromEntries(Object.entries(runtime.methods).sort(([a], [b]) => a.localeCompare(b))),
    properties: Object.fromEntries(Object.entries(runtime.properties).sort(([a], [b]) => a.localeCompare(b))),
    constants: Object.fromEntries(Object.entries(runtime.constants).sort(([a], [b]) => a.localeCompare(b))),
  };
}
const output = `// Names from JetBrains/phpstorm-stubs ${revision}, xsl/xsl.php.
// Six PHP runtime snapshots checked by reflection. Apache-2.0; see THIRD_PARTY_NOTICES.md.
export const XSL_METHOD_NAMES = ${JSON.stringify(methods)} as const;
export const XSL_PROPERTY_NAMES = ${JSON.stringify(properties)} as const;
export const XSL_CONSTANT_NAMES = ${JSON.stringify(constants)} as const;
export const XSL_SNAPSHOTS = ${JSON.stringify(snapshots, null, 2)} as const;
`;
const target = resolve('packages/language-spec/src/xsl-catalog.ts');
if (process.argv.includes('--write')) await writeFile(target, output);
else if (await readFile(target, 'utf8') !== output) throw new Error(`${target} differs from pinned upstream or local runtime reflection`);
process.stdout.write(`XSL: ${methods.length} methods, ${properties.length} properties, ${constants.length} constants, six runtime snapshots from ${revision}\n`);
