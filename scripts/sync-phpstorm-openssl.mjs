import { execFileSync } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import process from 'node:process';
import { requirePinnedPhpstormStubs } from './phpstorm-stubs-source.mjs';

const sourceIndex = process.argv.indexOf('--source');
const sourceRoot = sourceIndex >= 0 ? process.argv[sourceIndex + 1] : undefined;
if (!sourceRoot) throw new Error('Usage: node scripts/sync-phpstorm-openssl.mjs --source PATH [--write]');
const revision = requirePinnedPhpstormStubs(resolve(sourceRoot));
const source = await readFile(resolve(sourceRoot, 'openssl/openssl.php'), 'utf8');
const functions = [...new Set([...source.matchAll(/^function (openssl_[a-z_0-9]+)\s*\(/gm)].map((match) => match[1]))].sort();
const numericConstants = Object.fromEntries([...source.matchAll(/define\('([A-Z][A-Z0-9_]*)',\s*(-?\d+)\);/gm)]
  .filter((match) => match[1] !== 'CURLOPT_INFILESIZE_LARGE')
  .map((match) => [match[1], Number(match[2])]).sort(([a], [b]) => a.localeCompare(b)));
if (functions.length !== 64 || Object.keys(numericConstants).length !== 70
  || !source.includes('final class OpenSSLCertificate')
  || !source.includes('final class OpenSSLCertificateSigningRequest')
  || !source.includes('final class OpenSSLAsymmetricKey')) throw new Error('Unexpected upstream OpenSSL catalog');
const phpScript = `
  $functions = get_extension_funcs('openssl') ?: [];
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
    'constants' => (new ReflectionExtension('openssl'))->getConstants(),
    'certificate' => class_exists('OpenSSLCertificate'),
    'request' => class_exists('OpenSSLCertificateSigningRequest'),
    'key' => class_exists('OpenSSLAsymmetricKey'),
    'signatures' => $signatures], JSON_UNESCAPED_SLASHES);
`;
const runtimes = new Map();
for (const command of ['php72', 'php74', 'php81', 'php82', 'php84', 'php85']) {
  const runtime = JSON.parse(execFileSync(command, ['-r', phpScript], { encoding: 'utf8', timeout: 5_000 }));
  const expected = functions.filter((name) => (name !== 'openssl_pkey_derive' || runtime.version >= 70300)
    && (name !== 'openssl_x509_verify' || runtime.version >= 70400)
    && (!name.startsWith('openssl_cms_') || runtime.version >= 80000)
    && (name !== 'openssl_cipher_key_length' || runtime.version >= 80200));
  if (runtime.functions.length !== expected.length || expected.some((name) => !runtime.functions.includes(name))
    || [runtime.certificate, runtime.request, runtime.key].some((present) => present !== (runtime.version >= 80000))) {
    throw new Error(`OpenSSL function/class mismatch on ${runtime.version}`);
  }
  for (const [name, value] of Object.entries(runtime.constants)) {
    if (name in numericConstants && name !== 'OPENSSL_VERSION_NUMBER' && numericConstants[name] !== value) {
      throw new Error(`OpenSSL constant mismatch: ${name} on ${runtime.version}`);
    }
  }
  if (typeof runtime.constants.OPENSSL_VERSION_TEXT !== 'string'
    || typeof runtime.constants.OPENSSL_VERSION_NUMBER !== 'number'
    || typeof runtime.constants.OPENSSL_DEFAULT_STREAM_CIPHERS !== 'string') {
    throw new Error(`OpenSSL dynamic constants unavailable on ${runtime.version}`);
  }
  runtimes.set(command, runtime);
}
const base = runtimes.get('php81').signatures;
const overrides = (command, baseline) => Object.fromEntries(Object.entries(runtimes.get(command).signatures)
  .filter(([name, signature]) => JSON.stringify(signature) !== JSON.stringify(baseline[name]))
  .sort(([a], [b]) => a.localeCompare(b)));
const changes82 = overrides('php82', base);
const snapshot82 = { ...base, ...changes82 };
const changes84 = overrides('php84', snapshot82);
const snapshot84 = { ...snapshot82, ...changes84 };
const changes85 = overrides('php85', snapshot84);
if (Object.keys(changes82).length !== 2 || Object.keys(changes84).length !== 1 || Object.keys(changes85).length !== 5) {
  throw new Error('Unexpected OpenSSL signature drift');
}
const legacy = Object.fromEntries(Object.entries(runtimes.get('php72').signatures).map(([name, signature]) =>
  [name, signature.parameters.map(({ name: parameter, byRef, optional }) => ({ name: parameter, byRef, optional }))]));
const legacyAdditions = Object.fromEntries(Object.entries(runtimes.get('php74').signatures)
  .filter(([name]) => !(name in legacy))
  .map(([name, signature]) => [name, signature.parameters.map(({ name: parameter, byRef, optional }) => ({ name: parameter, byRef, optional }))]));
if (Object.keys(legacyAdditions).sort().join(',') !== 'openssl_pkey_derive,openssl_x509_verify') {
  throw new Error('Unexpected PHP 7 OpenSSL additions');
}
const runtimeOnlyNames = [...new Set([...runtimes.values()].flatMap((runtime) => Object.keys(runtime.constants)
  .filter((name) => !(name in numericConstants))))].sort();
if (runtimeOnlyNames.join(',') !== 'OPENSSL_DEFAULT_STREAM_CIPHERS,OPENSSL_VERSION_TEXT,PKCS7_NOSMIMECAP') {
  throw new Error(`Unexpected OpenSSL runtime-only constants: ${runtimeOnlyNames}`);
}
const output = `// Names and numeric values generated from JetBrains/phpstorm-stubs at ${revision}, openssl/openssl.php.\n// Signatures and dynamic constants are checked against local PHP 7.2-8.5 reflection. Apache-2.0; see THIRD_PARTY_NOTICES.md.\nexport const OPENSSL_FUNCTIONS = ${JSON.stringify(functions)} as const;\nexport const OPENSSL_NUMERIC_CONSTANTS = ${JSON.stringify(numericConstants, null, 2)} as const;\nexport const OPENSSL_RUNTIME_ONLY_CONSTANT_NAMES = ${JSON.stringify(runtimeOnlyNames)} as const;\nexport const OPENSSL_LEGACY_PARAMETERS = ${JSON.stringify(legacy, null, 2)} as const;\nexport const OPENSSL_LEGACY_ADDITIONS = ${JSON.stringify(legacyAdditions, null, 2)} as const;\nexport const OPENSSL_SIGNATURES = ${JSON.stringify(Object.fromEntries(Object.entries(base).sort(([a], [b]) => a.localeCompare(b))), null, 2)} as const;\nexport const OPENSSL_SIGNATURES_82_OVERRIDES = ${JSON.stringify(changes82, null, 2)} as const;\nexport const OPENSSL_SIGNATURES_84_OVERRIDES = ${JSON.stringify(changes84, null, 2)} as const;\nexport const OPENSSL_SIGNATURES_85_OVERRIDES = ${JSON.stringify(changes85, null, 2)} as const;\n`;
const target = resolve('packages/language-spec/src/openssl-catalog.ts');
if (process.argv.includes('--write')) await writeFile(target, output);
else if (await readFile(target, 'utf8') !== output) throw new Error(`${target} differs from pinned upstream or local runtime reflection`);
process.stdout.write(`OpenSSL: ${functions.length} names, ${Object.keys(numericConstants).length} numeric constants, ${Object.keys(base).length} baseline signatures from ${revision}\n`);
