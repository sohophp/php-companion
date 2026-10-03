import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import process from 'node:process';
import { requirePinnedPhpstormStubs } from './phpstorm-stubs-source.mjs';

const sourceIndex = process.argv.indexOf('--source');
const sourceRoot = sourceIndex >= 0 ? process.argv[sourceIndex + 1] : undefined;
if (!sourceRoot) throw new Error('Usage: node scripts/sync-phpstorm-intl-grapheme.mjs --source PATH [--write]');
const revision = requirePinnedPhpstormStubs(resolve(sourceRoot));
const source = await readFile(resolve(sourceRoot, 'intl/intl.php'), 'utf8');
const names = [...source.matchAll(/^function ((?:grapheme|idn)_[a-z0-9_]+)\(/gm)].map((match) => match[1]);
if (names.length !== 14 || new Set(names).size !== 14 || !names.includes('grapheme_strrev')) {
  throw new Error('Unexpected upstream Intl grapheme/IDN function layout');
}
const runtimeNames = names.filter((name) => name !== 'grapheme_strrev');
const output = `// Generated from JetBrains/phpstorm-stubs at ${revision}, intl/intl.php.
// Apache-2.0. See THIRD_PARTY_NOTICES.md. grapheme_strrev is absent from PHP 8.5 runtime.
export const INTL_GRAPHEME_IDN_FUNCTIONS = ${JSON.stringify(runtimeNames, null, 2)} as const;
`;
const target = resolve('packages/language-spec/src/intl-grapheme-catalog.ts');
if (process.argv.includes('--write')) await writeFile(target, output);
else if (await readFile(target, 'utf8') !== output) throw new Error(`${target} differs from phpstorm-stubs ${revision}`);
process.stdout.write(`Intl grapheme/IDN: ${runtimeNames.length} functions from ${revision}\n`);
