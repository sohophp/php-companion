import { execFileSync } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import process from 'node:process';
import { requirePinnedPhpstormStubs } from './phpstorm-stubs-source.mjs';

const sourceIndex = process.argv.indexOf('--source');
const sourceRoot = sourceIndex >= 0 ? process.argv[sourceIndex + 1] : undefined;
if (!sourceRoot) throw new Error('Usage: node scripts/sync-phpstorm-pgsql.mjs --source PATH [--write]');
const revision = requirePinnedPhpstormStubs(resolve(sourceRoot));
const source = execFileSync('git', ['-C', sourceRoot, 'show', 'HEAD:pgsql/pgsql.php'], { encoding: 'utf8' });
const classSource = execFileSync('git', ['-C', sourceRoot, 'show', 'HEAD:pgsql/pgsql_c.php'], { encoding: 'utf8' });
const functions = [...new Set([...source.matchAll(/^function (pg_[a-z_]+)\s*\(/gm)].map((match) => match[1]))].sort();
const constants = [...new Set([
  ...[...source.matchAll(/define\('?(PGSQL_[A-Z0-9_]+)'?,/g)].map((match) => match[1]),
  ...[...source.matchAll(/^const (PGSQL_[A-Z0-9_]+)\s*=/gm)].map((match) => match[1]),
])].sort();
if (functions.length !== 127 || constants.length !== 81
  || !['Connection', 'Result', 'Lob'].every((name) => classSource.includes(`final class ${name}`)))
  throw new Error('Unexpected upstream PgSQL catalog');

// Official PHP 8.4/8.5 pgsql.stub.php confirms these conditional declarations.
// Other upstream-only pipeline functions are not present in those PHP stubs.
const buildDependent = {};
for (const [name, since] of [['pg_set_chunked_rows_size', 84], ['pg_close_stmt', 85]]) {
  const match = source.match(new RegExp(`^function ${name}\\(([^)]*)\\): ([^\\n{]+) \\{\\}`, 'm'));
  if (!match) throw new Error(`Missing conditional PgSQL signature: ${name}`);
  const parameters = match[1].split(', ').map(parameter => {
    const parts = /^([A-Za-z\\\\]+) \$([a-z_]+)$/.exec(parameter);
    if (!parts) throw new Error(`Review conditional PgSQL parameter: ${parameter}`);
    return { name: parts[2], type: parts[1], byRef: false, variadic: false, optional: false, default: null, defaultConstant: null };
  });
  buildDependent[name] = { since, signature: { parameters, return: match[2].trim() } };
}

const phpScript = `
$extension = new ReflectionExtension('pgsql');
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
echo json_encode(['version' => PHP_VERSION_ID, 'signatures' => $signatures, 'constants' => $extension->getConstants()], JSON_UNESCAPED_SLASHES);
`;
const snapshots = {};
const runtimeConstants = {};
for (const command of ['php81', 'php82', 'php84', 'php85']) {
  const runtime = JSON.parse(execFileSync(command, ['-r', phpScript], { encoding: 'utf8', timeout: 5_000 }));
  const version = String(Math.floor(runtime.version / 100));
  if (!Object.keys(runtime.signatures).every((name) => functions.includes(name))
    || !Object.keys(runtime.constants).every((name) => constants.includes(name)))
    throw new Error(`PgSQL runtime has names missing from upstream: ${command}`);
  snapshots[version] = Object.fromEntries(Object.entries(runtime.signatures).sort(([a], [b]) => a.localeCompare(b)));
  runtimeConstants[version] = Object.fromEntries(Object.entries(runtime.constants).sort(([a], [b]) => a.localeCompare(b)));
}
const output = `// Names from JetBrains/phpstorm-stubs ${revision}, pgsql/.
// PHP 8.1/8.2/8.4/8.5 signatures and constants checked against local reflection.
// Apache-2.0; see THIRD_PARTY_NOTICES.md.
export const PGSQL_FUNCTION_NAMES = ${JSON.stringify(functions)} as const;
export const PGSQL_CONSTANT_NAMES = ${JSON.stringify(constants)} as const;
export const PGSQL_SIGNATURE_SNAPSHOTS = ${JSON.stringify(snapshots, null, 2)} as const;
export const PGSQL_CONSTANT_SNAPSHOTS = ${JSON.stringify(runtimeConstants, null, 2)} as const;
// Conditional signatures checked against official PHP source, not local reflection.
export const PGSQL_BUILD_DEPENDENT_SIGNATURES = ${JSON.stringify(buildDependent, null, 2)} as const;
`;
const target = resolve('packages/language-spec/src/pgsql-catalog.ts');
if (process.argv.includes('--write')) await writeFile(target, output);
else if (await readFile(target, 'utf8') !== output) throw new Error(`${target} differs from pinned upstream or local runtime reflection`);
process.stdout.write(`PgSQL: ${functions.length} functions, ${constants.length} constant names, four runtime snapshots from ${revision}\n`);
