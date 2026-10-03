import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import process from 'node:process';
import { requirePinnedPhpstormStubs } from './phpstorm-stubs-source.mjs';

const sourceIndex = process.argv.indexOf('--source');
const sourceRoot = sourceIndex >= 0 ? process.argv[sourceIndex + 1] : undefined;
if (!sourceRoot) throw new Error('Usage: node scripts/sync-phpstorm-intl-collator.mjs --source PATH [--write]');
const revision = requirePinnedPhpstormStubs(resolve(sourceRoot));
const source = await readFile(resolve(sourceRoot, 'intl/intl.php'), 'utf8');
const classSource = source.slice(source.indexOf('class Collator\n'), source.indexOf('class NumberFormatter\n'));
if (!classSource) throw new Error('Unexpected upstream Collator layout');
const functionMethods = {
  collator_create: 'create', collator_compare: 'compare',
  collator_get_attribute: 'getAttribute', collator_set_attribute: 'setAttribute',
  collator_get_strength: 'getStrength', collator_set_strength: 'setStrength',
  collator_sort: 'sort', collator_sort_with_sort_keys: 'sortWithSortKeys',
  collator_asort: 'asort', collator_get_locale: 'getLocale',
  collator_get_error_code: 'getErrorCode', collator_get_error_message: 'getErrorMessage',
  collator_get_sort_key: 'getSortKey',
};
const upstreamFunctions = [...source.matchAll(/^function (collator_[a-z_]+)\s*\(/gm)].map((match) => match[1]);
if (upstreamFunctions.length !== 13 || upstreamFunctions.some((name) => !(name in functionMethods))) {
  throw new Error(`Unexpected upstream Collator function set: ${upstreamFunctions.join(', ')}`);
}
for (const method of Object.values(functionMethods)) {
  if (!new RegExp(`\\bpublic (?:static )?function ${method}\\s*\\(`).test(classSource)) {
    throw new Error(`Missing upstream Collator::${method}`);
  }
}
const constants = Object.fromEntries([...classSource.matchAll(/public const ([A-Z_]+) = (-?\d+);/g)]
  .map((match) => [match[1], Number(match[2])]));
if (Object.keys(constants).length !== 24) throw new Error('Unexpected upstream Collator constant set');
const output = `// Generated from JetBrains/phpstorm-stubs at ${revision}, intl/intl.php.
// Apache-2.0. See THIRD_PARTY_NOTICES.md. Runtime signatures are audited separately.
export const COLLATOR_FUNCTION_METHODS = ${JSON.stringify(functionMethods, null, 2)} as const;
export const COLLATOR_CONSTANTS = ${JSON.stringify(constants, null, 2)} as const;
`;
const target = resolve('packages/language-spec/src/intl-collator-catalog.ts');
if (process.argv.includes('--write')) await writeFile(target, output);
else if (await readFile(target, 'utf8') !== output) throw new Error(`${target} differs from phpstorm-stubs ${revision}`);
process.stdout.write(`Intl Collator: ${upstreamFunctions.length} function/method pairs and ${Object.keys(constants).length} constants from ${revision}\n`);
