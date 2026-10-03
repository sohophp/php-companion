import { execFileSync } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import process from 'node:process';
import { requirePinnedPhpstormStubs } from './phpstorm-stubs-source.mjs';

const sourceIndex = process.argv.indexOf('--source');
const sourceRoot = sourceIndex >= 0 ? process.argv[sourceIndex + 1] : undefined;
if (!sourceRoot) throw new Error('Usage: node scripts/sync-phpstorm-pcntl.mjs --source PATH [--write]');
const revision = requirePinnedPhpstormStubs(resolve(sourceRoot));
const source = execFileSync('git', ['-C', sourceRoot, 'show', 'HEAD:pcntl/pcntl.php'], { encoding: 'utf8' });
const classSource = execFileSync('git', ['-C', sourceRoot, 'show', 'HEAD:pcntl/pcntl_c.php'], { encoding: 'utf8' });
const functions = [...new Set([...source.matchAll(/^function (pcntl_[a-z_]+)\s*\(/gm)].map((match) => match[1]))].sort();
const constants = Object.fromEntries([...source.matchAll(/define\('([A-Z][A-Z0-9_]*)',\s*(-?\d+)\)/g)]
  .map((match) => [match[1], Number(match[2])]).sort(([a], [b]) => a.localeCompare(b)));
if (functions.length !== 29 || Object.keys(constants).length !== 129 || !classSource.includes('enum QosClass'))
  throw new Error('Unexpected upstream PCNTL catalog');
const phpScript = `
$extension = new ReflectionExtension('pcntl');
$signatures = [];
foreach ($extension->getFunctions() as $function) {
  $parameters = [];
  foreach ($function->getParameters() as $parameter) {
    $hasDefault = $parameter->isDefaultValueAvailable();
    $parameters[] = ['name' => $parameter->getName(), 'type' => $parameter->hasType() ? (string) $parameter->getType() : null,
      'byRef' => $parameter->isPassedByReference(), 'variadic' => $parameter->isVariadic(), 'optional' => $parameter->isOptional(),
      'default' => $hasDefault ? $parameter->getDefaultValue() : null,
      'defaultConstant' => $hasDefault && $parameter->isDefaultValueConstant() ? $parameter->getDefaultValueConstantName() : null];
  }
  $signatures[$function->getName()] = ['parameters' => $parameters,
    'return' => $function->hasReturnType() ? (string) $function->getReturnType() : null];
}
echo json_encode(['version' => PHP_VERSION_ID, 'signatures' => $signatures,
  'constants' => $extension->getConstants(), 'qosClass' => function_exists('enum_exists') && enum_exists('Pcntl\\QosClass')], JSON_UNESCAPED_SLASHES);
`;
const snapshots = {};
for (const command of ['php72', 'php74', 'php81', 'php82', 'php84', 'php85']) {
  const runtime = JSON.parse(execFileSync(command, ['-r', phpScript], { encoding: 'utf8', timeout: 5_000 }));
  const version = String(Math.floor(runtime.version / 100));
  const expected = functions.filter((name) => (name !== 'pcntl_unshare' || runtime.version >= 70400)
    && (!['pcntl_waitid', 'pcntl_getcpuaffinity', 'pcntl_setcpuaffinity', 'pcntl_getcpu'].includes(name) || runtime.version >= 80400));
  if (Object.keys(runtime.signatures).length !== expected.length || expected.some((name) => !runtime.signatures[name])
    || runtime.qosClass !== (runtime.version >= 80400)) throw new Error(`PCNTL runtime mismatch: ${command}`);
  const unexpected = Object.keys(runtime.constants).filter((name) => !(name in constants));
  if (unexpected.length) throw new Error(`PCNTL runtime-only constants on ${command}: ${unexpected}`);
  snapshots[version] = Object.fromEntries(Object.entries(runtime.signatures).sort(([a], [b]) => a.localeCompare(b)));
}
const output = `// Names generated from JetBrains/phpstorm-stubs ${revision}, pcntl/.
// Signatures checked against local PHP 7.2-8.5 reflection. Apache-2.0; see THIRD_PARTY_NOTICES.md.
export const PCNTL_FUNCTION_NAMES = ${JSON.stringify(functions)} as const;
export const PCNTL_CONSTANT_NAMES = ${JSON.stringify(Object.keys(constants))} as const;
export const PCNTL_SIGNATURE_SNAPSHOTS = ${JSON.stringify(snapshots, null, 2)} as const;
`;
const target = resolve('packages/language-spec/src/pcntl-catalog.ts');
if (process.argv.includes('--write')) await writeFile(target, output);
else if (await readFile(target, 'utf8') !== output) throw new Error(`${target} differs from pinned upstream or local runtime reflection`);
process.stdout.write(`PCNTL: ${functions.length} functions, ${Object.keys(constants).length} constant names, six runtime signatures from ${revision}\n`);
