import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import process from 'node:process';
import { requirePinnedPhpstormStubs } from './phpstorm-stubs-source.mjs';

const sourceIndex = process.argv.indexOf('--source');
const sourceRoot = sourceIndex >= 0 ? process.argv[sourceIndex + 1] : undefined;
if (!sourceRoot) throw new Error('Usage: node scripts/sync-phpstorm-bcmath.mjs --source PATH [--write]');
const source = resolve(sourceRoot);
const revision = requirePinnedPhpstormStubs(source);
const upstream = await readFile(resolve(source, 'bcmath/bcmath.php'), 'utf8');
const names = [...new Set([...upstream.matchAll(/^\s*function\s+(bc[a-z]+)\s*\(/gm)].map((match) => match[1]))];
if (names.length !== 14) throw new Error('Unexpected BCMath catalog; review upstream before syncing');
const output = `// Generated from JetBrains/phpstorm-stubs at ${revision}, bcmath/bcmath.php.
// Apache-2.0. See THIRD_PARTY_NOTICES.md. Runtime signatures are audited separately.
export const BCMATH_FUNCTIONS = ${JSON.stringify(names, null, 2)} as const;
`;
const target = resolve('packages/language-spec/src/bcmath-catalog.ts');
if (process.argv.includes('--write')) await writeFile(target, output);
else if (await readFile(target, 'utf8') !== output) throw new Error(`${target} differs from phpstorm-stubs ${revision}`);
process.stdout.write(`bcmath: ${names.length} functions from ${revision}\n`);
