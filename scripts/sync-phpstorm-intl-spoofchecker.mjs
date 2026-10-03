import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import process from 'node:process';
import { requirePinnedPhpstormStubs } from './phpstorm-stubs-source.mjs';

const sourceIndex = process.argv.indexOf('--source');
const sourceRoot = sourceIndex >= 0 ? process.argv[sourceIndex + 1] : undefined;
if (!sourceRoot) throw new Error('Usage: node scripts/sync-phpstorm-intl-spoofchecker.mjs --source PATH [--write]');
const revision = requirePinnedPhpstormStubs(resolve(sourceRoot));
const source = await readFile(resolve(sourceRoot, 'intl/intl.php'), 'utf8');
const start = source.indexOf('class Spoofchecker\n');
const end = source.indexOf('class IntlGregorianCalendar', start);
if (start < 0 || end < 0) throw new Error('Unexpected upstream Spoofchecker layout');
const section = source.slice(start, end);
const constants = Object.fromEntries([...section.matchAll(/public const ([A-Z_]+) = (-?\d+);/g)]
  .map((match) => [match[1], Number(match[2])]));
const methods = [...section.matchAll(/\bpublic function ([A-Za-z_]+)\s*\(/g)].map((match) => match[1]);
if (Object.keys(constants).length !== 19 || methods.join(',') !== '__construct,isSuspicious,areConfusable,setAllowedLocales,setChecks,setRestrictionLevel,setAllowedChars') {
  throw new Error('Unexpected upstream Spoofchecker catalog');
}
const output = `// Generated from JetBrains/phpstorm-stubs at ${revision}, intl/intl.php.
// Apache-2.0. See THIRD_PARTY_NOTICES.md.
export const SPOOFCHECKER_CONSTANTS = ${JSON.stringify(constants, null, 2)} as const;
export const SPOOFCHECKER_METHODS = ${JSON.stringify(methods, null, 2)} as const;
`;
const target = resolve('packages/language-spec/src/intl-spoofchecker-catalog.ts');
if (process.argv.includes('--write')) await writeFile(target, output);
else if (await readFile(target, 'utf8') !== output) throw new Error(`${target} differs from pinned phpstorm-stubs`);
process.stdout.write(`Spoofchecker: ${methods.length} methods and ${Object.keys(constants).length} constants from ${revision}\n`);
