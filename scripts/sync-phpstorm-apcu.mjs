import { execFileSync } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import process from 'node:process';
import { requirePinnedPhpstormStubs } from './phpstorm-stubs-source.mjs';

const sourceIndex = process.argv.indexOf('--source');
const sourceRoot = sourceIndex >= 0 ? process.argv[sourceIndex + 1] : undefined;
if (!sourceRoot || process.argv.includes('--help')) {
  process.stderr.write('Usage: node scripts/sync-phpstorm-apcu.mjs --source PATH [--write]\n');
  process.exitCode = 2;
} else {
  const source = resolve(sourceRoot);
  const revision = requirePinnedPhpstormStubs(source);
  const upstream = execFileSync('git', ['-C', source, 'show', 'HEAD:apcu/apcu.php'], { encoding: 'utf8' });
  const functions = [...upstream.matchAll(/^function (apcu_[a-z_]+)\(/gm)].map((match) => match[1]);
  const constants = [...upstream.matchAll(/define\('(APC_(?:ITER|LIST)_[A-Z0-9_]+)'/g)].map((match) => match[1]);
  if (functions.length !== 14 || new Set(functions).size !== 14
    || constants.length < 15 || constants.length > 25 || new Set(constants).size !== constants.length)
    throw new Error('Unexpected APCu catalog; review upstream before syncing');
  const output = `// Generated from JetBrains/phpstorm-stubs at ${revision}, apcu/apcu.php.
// Apache-2.0. See THIRD_PARTY_NOTICES.md. Numeric APC_ITER_* values come from the project runtime.
export const APCU_FUNCTION_NAMES = ${JSON.stringify(functions, null, 2)} as const;
export const APCU_KNOWN_CONSTANT_NAMES = ${JSON.stringify(constants, null, 2)} as const;
`;
  const target = resolve('packages/language-spec/src/apcu-catalog.ts');
  if (process.argv.includes('--write')) await writeFile(target, output);
  else if (await readFile(target, 'utf8') !== output) throw new Error(`${target} differs from phpstorm-stubs ${revision}`);
  process.stdout.write(`apcu: ${functions.length} functions, ${constants.length} constants from ${revision}\n`);
}
