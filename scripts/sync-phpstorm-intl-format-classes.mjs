import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import process from 'node:process';
import { requirePinnedPhpstormStubs } from './phpstorm-stubs-source.mjs';

const sourceIndex = process.argv.indexOf('--source');
const sourceRoot = sourceIndex >= 0 ? process.argv[sourceIndex + 1] : undefined;
if (!sourceRoot) throw new Error('Usage: node scripts/sync-phpstorm-intl-format-classes.mjs --source PATH [--write]');
const revision = requirePinnedPhpstormStubs(resolve(sourceRoot));
const list = await readFile(resolve(sourceRoot, 'intl/IntlListFormatter.php'), 'utf8');
const pattern = await readFile(resolve(sourceRoot, 'intl/IntlDatePatternGenerator.php'), 'utf8');
const methods = (source) => [...source.matchAll(/\bpublic (?:static )?function ([A-Za-z_][A-Za-z0-9_]*)\s*\(/g)].map((match) => match[1]);
const listMethods = methods(list);
const patternMethods = methods(pattern);
const listConstants = Object.fromEntries([...list.matchAll(/public const int ([A-Z_]+) = (-?\d+);/g)]
  .map((match) => [match[1], Number(match[2])]));
if (listMethods.join(',') !== '__construct,format,getErrorCode,getErrorMessage'
  || patternMethods.join(',') !== '__construct,create,getBestPattern'
  || Object.keys(listConstants).length !== 6) throw new Error('Unexpected upstream Intl formatter catalog');
const output = `// Generated from JetBrains/phpstorm-stubs at ${revision}, intl/IntlListFormatter.php and IntlDatePatternGenerator.php.
// Apache-2.0. See THIRD_PARTY_NOTICES.md.
export const INTL_LIST_FORMATTER_METHODS = ${JSON.stringify(listMethods, null, 2)} as const;
export const INTL_LIST_FORMATTER_CONSTANTS = ${JSON.stringify(listConstants, null, 2)} as const;
export const INTL_DATE_PATTERN_GENERATOR_METHODS = ${JSON.stringify(patternMethods, null, 2)} as const;
`;
const target = resolve('packages/language-spec/src/intl-format-classes-catalog.ts');
if (process.argv.includes('--write')) await writeFile(target, output);
else if (await readFile(target, 'utf8') !== output) throw new Error(`${target} differs from pinned phpstorm-stubs`);
process.stdout.write(`IntlListFormatter: ${listMethods.length} methods and ${Object.keys(listConstants).length} constants; IntlDatePatternGenerator: ${patternMethods.length} methods from ${revision}\n`);
