import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import process from 'node:process';
import { requirePinnedPhpstormStubs } from './phpstorm-stubs-source.mjs';

const sourceIndex = process.argv.indexOf('--source');
const sourceRoot = sourceIndex >= 0 ? process.argv[sourceIndex + 1] : undefined;
if (!sourceRoot) throw new Error('Usage: node scripts/sync-phpstorm-intl-transliterator.mjs --source PATH [--write]');
const revision = requirePinnedPhpstormStubs(resolve(sourceRoot));
const source = await readFile(resolve(sourceRoot, 'intl/intl.php'), 'utf8');
const classSource = source.slice(source.indexOf('class Transliterator\n'), source.indexOf('class Spoofchecker\n'));
if (!classSource) throw new Error('Unexpected upstream Transliterator layout');
const functionMethods = {
  transliterator_create: 'create', transliterator_create_from_rules: 'createFromRules',
  transliterator_list_ids: 'listIDs', transliterator_create_inverse: 'createInverse',
  transliterator_transliterate: 'transliterate', transliterator_get_error_code: 'getErrorCode',
  transliterator_get_error_message: 'getErrorMessage',
};
const upstreamFunctions = [...source.matchAll(/^function (transliterator_[a-z_]+)\s*\(/gm)].map((match) => match[1]);
if (upstreamFunctions.length !== 7 || upstreamFunctions.some((name) => !(name in functionMethods))) {
  throw new Error(`Unexpected upstream Transliterator function set: ${upstreamFunctions.join(', ')}`);
}
for (const method of Object.values(functionMethods)) {
  if (!new RegExp(`\\bpublic (?:static )?function ${method}\\s*\\(`).test(classSource)) {
    throw new Error(`Missing upstream Transliterator::${method}`);
  }
}
const constants = Object.fromEntries([...classSource.matchAll(/public const ([A-Z_]+) = (-?\d+);/g)]
  .map((match) => [match[1], Number(match[2])]));
if (Object.keys(constants).length !== 2) throw new Error('Unexpected upstream Transliterator constant set');
const output = `// Generated from JetBrains/phpstorm-stubs at ${revision}, intl/intl.php.
// Apache-2.0. See THIRD_PARTY_NOTICES.md.
export const TRANSLITERATOR_FUNCTION_METHODS = ${JSON.stringify(functionMethods, null, 2)} as const;
export const TRANSLITERATOR_CONSTANTS = ${JSON.stringify(constants, null, 2)} as const;
`;
const target = resolve('packages/language-spec/src/intl-transliterator-catalog.ts');
if (process.argv.includes('--write')) await writeFile(target, output);
else if (await readFile(target, 'utf8') !== output) throw new Error(`${target} differs from phpstorm-stubs ${revision}`);
process.stdout.write(`Transliterator: ${upstreamFunctions.length} function/method pairs and ${Object.keys(constants).length} constants from ${revision}\n`);
