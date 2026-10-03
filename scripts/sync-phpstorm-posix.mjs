import { execFileSync } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import process from 'node:process';
import { requirePinnedPhpstormStubs } from './phpstorm-stubs-source.mjs';

const sourceIndex = process.argv.indexOf('--source');
const sourceRoot = sourceIndex >= 0 ? process.argv[sourceIndex + 1] : undefined;
if (!sourceRoot) throw new Error('Usage: node scripts/sync-phpstorm-posix.mjs --source PATH [--write]');
const revision = requirePinnedPhpstormStubs(resolve(sourceRoot));
const upstream = execFileSync('git', ['-C', sourceRoot, 'show', 'HEAD:posix/posix.php'], { encoding: 'utf8' });
const names = [...upstream.matchAll(/^function (posix_\w+)\(/gm)].map((match) => match[1]);
if (names.length !== 41 || new Set(names).size !== names.length) throw new Error('Unexpected POSIX function catalog');
const constants = [...upstream.matchAll(/define\('(POSIX_[A-Z0-9_]+)'/g)].map((match) => match[1]);
if (constants.length !== 43 || new Set(constants).size !== constants.length) throw new Error('Unexpected POSIX constant catalog');
const script = `$extension = new ReflectionExtension('posix'); $functions = [];
foreach ($extension->getFunctions() as $function) {
  $parameters = [];
  foreach ($function->getParameters() as $parameter) {
    $parameters[] = ['name' => $parameter->getName(), 'type' => $parameter->hasType() ? (string) $parameter->getType() : null,
      'reference' => $parameter->isPassedByReference(), 'optional' => $parameter->isOptional(),
      'default' => $parameter->isDefaultValueAvailable() ? var_export($parameter->getDefaultValue(), true) : null];
  }
  $functions[$function->getName()] = ['parameters' => $parameters,
    'returnType' => $function->hasReturnType() ? (string) $function->getReturnType() : null];
}
echo json_encode($functions);`;
const snapshots = {};
for (const [version, command] of [['8.1', 'php81'], ['8.5', 'php85']]) {
  const functions = JSON.parse(execFileSync(command, ['-r', script], { encoding: 'utf8' }));
  const expected = names.filter((name) => version === '8.5' || !['posix_eaccess', 'posix_fpathconf', 'posix_pathconf', 'posix_sysconf'].includes(name));
  if (JSON.stringify(Object.keys(functions).sort()) !== JSON.stringify(expected.sort())) throw new Error(`POSIX names differ at ${version}`);
  snapshots[version] = functions;
}
const output = `// Generated using pinned JetBrains/phpstorm-stubs ${revision}, posix/posix.php.
// Function names audited against upstream; signatures from PHP 8.1/8.5 reflection.
// Apache-2.0. See THIRD_PARTY_NOTICES.md. Upstream description text omitted.
export const POSIX_SIGNATURE_SNAPSHOTS = ${JSON.stringify(snapshots, null, 2)} as const;
export const POSIX_KNOWN_CONSTANT_NAMES = ${JSON.stringify(constants, null, 2)} as const;
`;
const target = resolve('packages/language-spec/src/posix-catalog.ts');
if (process.argv.includes('--write')) await writeFile(target, output);
else if (await readFile(target, 'utf8') !== output) throw new Error('POSIX signature catalog differs from runtime audit');
process.stdout.write(`POSIX: 37/41 function signatures verified against two runtimes and ${revision}\n`);
