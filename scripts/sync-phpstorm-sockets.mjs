import { execFileSync } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import process from 'node:process';
import { requirePinnedPhpstormStubs } from './phpstorm-stubs-source.mjs';

const sourceIndex = process.argv.indexOf('--source');
const sourceRoot = sourceIndex >= 0 ? process.argv[sourceIndex + 1] : undefined;
if (!sourceRoot) throw new Error('Usage: node scripts/sync-phpstorm-sockets.mjs --source PATH [--write]');
const revision = requirePinnedPhpstormStubs(resolve(sourceRoot));
const source = await readFile(resolve(sourceRoot, 'sockets/sockets.php'), 'utf8');
const functions = [...new Set([...source.matchAll(/^function (socket_[a-z_]+)\s*\(/gm)].map((match) => match[1]))].sort();
const constants = Object.fromEntries([...source.matchAll(/(?:define\('([A-Z][A-Z0-9_]*)',\s*(-?\d+)\)|^const\s+([A-Z][A-Z0-9_]*)\s*=\s*(-?\d+);)/gm)]
  .map((match) => [match[1] || match[3], Number(match[2] || match[4])]).sort(([a], [b]) => a.localeCompare(b)));
if (functions.length !== 40 || Object.keys(constants).length !== 271
  || !source.includes('final class Socket') || !source.includes('final class AddressInfo')) {
  throw new Error('Unexpected upstream Sockets catalog');
}
const phpScript = `
  $functions = get_extension_funcs('sockets') ?: [];
  $signatures = [];
  foreach ($functions as $name) {
    $reflection = new ReflectionFunction($name);
    $parameters = [];
    foreach ($reflection->getParameters() as $parameter) {
      $hasDefault = $parameter->isDefaultValueAvailable();
      $parameters[] = ['name' => $parameter->getName(), 'type' => $parameter->hasType() ? (string) $parameter->getType() : null,
        'byRef' => $parameter->isPassedByReference(), 'optional' => $parameter->isOptional(),
        'default' => $hasDefault ? $parameter->getDefaultValue() : null,
        'defaultConstant' => $hasDefault && $parameter->isDefaultValueConstant() ? $parameter->getDefaultValueConstantName() : null];
    }
    $signatures[$name] = ['parameters' => $parameters,
      'return' => $reflection->hasReturnType() ? (string) $reflection->getReturnType() : null];
  }
  echo json_encode(['version' => PHP_VERSION_ID, 'functions' => $functions,
    'constants' => (new ReflectionExtension('sockets'))->getConstants(),
    'socket' => class_exists('Socket'), 'addressInfo' => class_exists('AddressInfo'),
    'signatures' => $signatures], JSON_UNESCAPED_SLASHES);
`;
const runtimes = new Map();
for (const command of ['php72', 'php74', 'php81', 'php82', 'php84', 'php85']) {
  const runtime = JSON.parse(execFileSync(command, ['-r', phpScript], { encoding: 'utf8', timeout: 5_000 }));
  const expected = functions.filter((name) => !name.startsWith('socket_wsaprotocol_') && (name !== 'socket_atmark' || runtime.version >= 80300));
  if (runtime.functions.length !== expected.length || expected.some((name) => !runtime.functions.includes(name))
    || runtime.socket !== (runtime.version >= 80000) || runtime.addressInfo !== (runtime.version >= 80000)) {
    throw new Error(`Sockets function/class mismatch on ${runtime.version}`);
  }
  for (const [name, value] of Object.entries(runtime.constants)) {
    if (name in constants && constants[name] !== value) throw new Error(`Sockets constant mismatch: ${name} on ${runtime.version}`);
  }
  runtimes.set(command, runtime);
}
const modern = runtimes.get('php81').signatures;
const recent = runtimes.get('php84').signatures;
for (const command of ['php82', 'php84', 'php85']) {
  const observed = runtimes.get(command).signatures;
  for (const [name, signature] of Object.entries(modern)) {
    const expected = command === 'php82' ? signature : recent[name];
    if (JSON.stringify(observed[name]) !== JSON.stringify(expected)) throw new Error(`Unexpected ${command} signature drift: ${name}`);
  }
}
const legacy = runtimes.get('php72').signatures;
for (const [name, signature] of Object.entries(legacy)) {
  const current = modern[name];
  const expectedCount = current.parameters.length - (name === 'socket_cmsg_space' ? 1 : 0);
  if (signature.parameters.length !== expectedCount || signature.parameters.some((parameter, index) => parameter.byRef !== current.parameters[index].byRef
    || (parameter.optional !== current.parameters[index].optional && !['socket_sendmsg', 'socket_recvmsg'].includes(name)))) {
    throw new Error(`Legacy parameter mismatch: ${name}`);
  }
}
const extras = [...new Set([...runtimes.values()].flatMap((runtime) => Object.keys(runtime.constants).filter((name) => !(name in constants))))].sort();
if (extras.join(',') !== 'AI_CANONIDN,AI_IDN,AI_IDN_ALLOW_UNASSIGNED,AI_IDN_USE_STD3_ASCII_RULES') {
  throw new Error(`Unexpected runtime-only Sockets constants: ${extras}`);
}
const recentOverrides = Object.fromEntries(Object.entries(recent).filter(([name, signature]) => JSON.stringify(signature) !== JSON.stringify(modern[name])));
const output = `// Names and numeric values generated from JetBrains/phpstorm-stubs at ${revision}, sockets/sockets.php.\n// Signatures and additional runtime names are checked against local PHP 7.2-8.5 reflection. Apache-2.0; see THIRD_PARTY_NOTICES.md.\nexport const SOCKET_FUNCTIONS = ${JSON.stringify(functions)} as const;\nexport const SOCKET_CONSTANTS = ${JSON.stringify(constants, null, 2)} as const;\nexport const SOCKET_RUNTIME_EXTRA_CONSTANTS = ${JSON.stringify(extras)} as const;\nexport const SOCKET_SIGNATURES = ${JSON.stringify(Object.fromEntries(Object.entries(modern).sort(([a], [b]) => a.localeCompare(b))), null, 2)} as const;\nexport const SOCKET_SIGNATURES_84_OVERRIDES = ${JSON.stringify(recentOverrides, null, 2)} as const;\n`;
const target = resolve('packages/language-spec/src/sockets-catalog.ts');
if (process.argv.includes('--write')) await writeFile(target, output);
else if (await readFile(target, 'utf8') !== output) throw new Error(`${target} differs from pinned upstream or local runtime reflection`);
process.stdout.write(`Sockets: ${functions.length} names, ${Object.keys(constants).length} numeric constants, ${Object.keys(modern).length} runtime signatures from ${revision}\n`);
