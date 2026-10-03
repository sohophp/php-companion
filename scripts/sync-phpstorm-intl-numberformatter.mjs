import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import process from 'node:process';
import { requirePinnedPhpstormStubs } from './phpstorm-stubs-source.mjs';

const sourceIndex = process.argv.indexOf('--source');
const sourceRoot = sourceIndex >= 0 ? process.argv[sourceIndex + 1] : undefined;
if (!sourceRoot) throw new Error('Usage: node scripts/sync-phpstorm-intl-numberformatter.mjs --source PATH [--write]');
const revision = requirePinnedPhpstormStubs(resolve(sourceRoot));
const source = await readFile(resolve(sourceRoot, 'intl/intl.php'), 'utf8');
const classSource = source.slice(source.indexOf('class NumberFormatter\n'), source.indexOf('class Normalizer\n'));
if (!classSource) throw new Error('Unexpected upstream NumberFormatter layout');
const functionMethods = {
  numfmt_create: 'create', numfmt_format: 'format', numfmt_parse: 'parse',
  numfmt_format_currency: 'formatCurrency', numfmt_parse_currency: 'parseCurrency',
  numfmt_set_attribute: 'setAttribute', numfmt_get_attribute: 'getAttribute',
  numfmt_set_text_attribute: 'setTextAttribute', numfmt_get_text_attribute: 'getTextAttribute',
  numfmt_set_symbol: 'setSymbol', numfmt_get_symbol: 'getSymbol',
  numfmt_set_pattern: 'setPattern', numfmt_get_pattern: 'getPattern',
  numfmt_get_locale: 'getLocale', numfmt_get_error_code: 'getErrorCode',
  numfmt_get_error_message: 'getErrorMessage',
};
const upstreamFunctions = [...source.matchAll(/^function (numfmt_[a-z_]+)\s*\(/gm)].map((match) => match[1]);
if (upstreamFunctions.length !== 16 || upstreamFunctions.some((name) => !(name in functionMethods))) {
  throw new Error(`Unexpected upstream NumberFormatter function set: ${upstreamFunctions.join(', ')}`);
}
for (const method of Object.values(functionMethods)) {
  if (!new RegExp(`\\bpublic (?:static )?function ${method}\\s*\\(`).test(classSource)) {
    throw new Error(`Missing upstream NumberFormatter::${method}`);
  }
}
const constants = Object.fromEntries([...classSource.matchAll(/public const ([A-Z0-9_]+) = (-?\d+);/g)]
  .map((match) => [match[1], Number(match[2])]));
if (Object.keys(constants).length !== 83) throw new Error('Unexpected upstream NumberFormatter constant set');
const output = `// Generated from JetBrains/phpstorm-stubs at ${revision}, intl/intl.php.
// Apache-2.0. See THIRD_PARTY_NOTICES.md. Runtime signatures and availability are audited separately.
export const NUMBER_FORMATTER_FUNCTION_METHODS = ${JSON.stringify(functionMethods, null, 2)} as const;
export const NUMBER_FORMATTER_CONSTANTS = ${JSON.stringify(constants, null, 2)} as const;
`;
const target = resolve('packages/language-spec/src/intl-numberformatter-catalog.ts');
if (process.argv.includes('--write')) await writeFile(target, output);
else if (await readFile(target, 'utf8') !== output) throw new Error(`${target} differs from phpstorm-stubs ${revision}`);
process.stdout.write(`Intl NumberFormatter: ${upstreamFunctions.length} function/method pairs and ${Object.keys(constants).length} constants from ${revision}\n`);
