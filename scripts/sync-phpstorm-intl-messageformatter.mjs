import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import process from 'node:process';
import { requirePinnedPhpstormStubs } from './phpstorm-stubs-source.mjs';

const sourceIndex = process.argv.indexOf('--source');
const sourceRoot = sourceIndex >= 0 ? process.argv[sourceIndex + 1] : undefined;
if (!sourceRoot) throw new Error('Usage: node scripts/sync-phpstorm-intl-messageformatter.mjs --source PATH [--write]');
const revision = requirePinnedPhpstormStubs(resolve(sourceRoot));
const source = await readFile(resolve(sourceRoot, 'intl/intl.php'), 'utf8');
const classSource = source.slice(source.indexOf('class MessageFormatter\n'), source.indexOf('class IntlDateFormatter\n'));
if (!classSource) throw new Error('Unexpected upstream MessageFormatter layout');
const functionMethods = {
  msgfmt_create: 'create', msgfmt_format: 'format', msgfmt_format_message: 'formatMessage',
  msgfmt_parse: 'parse', msgfmt_parse_message: 'parseMessage', msgfmt_set_pattern: 'setPattern',
  msgfmt_get_pattern: 'getPattern', msgfmt_get_locale: 'getLocale',
  msgfmt_get_error_code: 'getErrorCode', msgfmt_get_error_message: 'getErrorMessage',
};
const upstreamFunctions = [...source.matchAll(/^function (msgfmt_[a-z_]+)\s*\(/gm)].map((match) => match[1]);
if (upstreamFunctions.length !== 10 || upstreamFunctions.some((name) => !(name in functionMethods))) {
  throw new Error(`Unexpected upstream MessageFormatter function set: ${upstreamFunctions.join(', ')}`);
}
for (const method of Object.values(functionMethods)) {
  if (!new RegExp(`\\bpublic (?:static )?function ${method}\\s*\\(`).test(classSource)) {
    throw new Error(`Missing upstream MessageFormatter::${method}`);
  }
}
const output = `// Generated from JetBrains/phpstorm-stubs at ${revision}, intl/intl.php.
// Apache-2.0. See THIRD_PARTY_NOTICES.md.
export const MESSAGE_FORMATTER_FUNCTION_METHODS = ${JSON.stringify(functionMethods, null, 2)} as const;
`;
const target = resolve('packages/language-spec/src/intl-messageformatter-catalog.ts');
if (process.argv.includes('--write')) await writeFile(target, output);
else if (await readFile(target, 'utf8') !== output) throw new Error(`${target} differs from phpstorm-stubs ${revision}`);
process.stdout.write(`MessageFormatter: ${upstreamFunctions.length} function/method pairs from ${revision}\n`);
