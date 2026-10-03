import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import process from 'node:process';
import { requirePinnedPhpstormStubs } from './phpstorm-stubs-source.mjs';

const sourceIndex = process.argv.indexOf('--source');
const sourceRoot = sourceIndex >= 0 ? process.argv[sourceIndex + 1] : undefined;
if (!sourceRoot) throw new Error('Usage: node scripts/sync-phpstorm-intl-dateformatter.mjs --source PATH [--write]');
const revision = requirePinnedPhpstormStubs(resolve(sourceRoot));
const source = await readFile(resolve(sourceRoot, 'intl/intl.php'), 'utf8');
const classSource = source.slice(source.indexOf('class IntlDateFormatter\n'), source.indexOf('class ResourceBundle implements'));
if (!classSource) throw new Error('Unexpected upstream IntlDateFormatter layout');
const functionMethods = {
  datefmt_create: 'create', datefmt_get_datetype: 'getDateType',
  datefmt_get_timetype: 'getTimeType', datefmt_get_calendar: 'getCalendar',
  datefmt_set_calendar: 'setCalendar', datefmt_get_locale: 'getLocale',
  datefmt_get_timezone_id: 'getTimeZoneId', datefmt_get_calendar_object: 'getCalendarObject',
  datefmt_get_timezone: 'getTimeZone', datefmt_set_timezone: 'setTimeZone',
  datefmt_get_pattern: 'getPattern', datefmt_set_pattern: 'setPattern',
  datefmt_is_lenient: 'isLenient', datefmt_set_lenient: 'setLenient',
  datefmt_format: 'format', datefmt_format_object: 'formatObject',
  datefmt_parse: 'parse', datefmt_localtime: 'localtime',
  datefmt_get_error_code: 'getErrorCode', datefmt_get_error_message: 'getErrorMessage',
};
const upstreamFunctions = [...source.matchAll(/^function (datefmt_[a-z_]+)\s*\(/gm)].map((match) => match[1]);
if (upstreamFunctions.length !== 21 || upstreamFunctions.filter((name) => !(name in functionMethods)).join(',') !== 'datefmt_set_timezone_id') {
  throw new Error(`Unexpected upstream IntlDateFormatter function set: ${upstreamFunctions.join(', ')}`);
}
for (const method of Object.values(functionMethods)) {
  if (!new RegExp(`\\bpublic (?:static )?function ${method}\\s*\\(`).test(classSource)) {
    throw new Error(`Missing upstream IntlDateFormatter::${method}`);
  }
}
if (!/public function parseToCalendar\s*\(/.test(classSource)) throw new Error('Missing upstream IntlDateFormatter::parseToCalendar');
const constants = Object.fromEntries([...classSource.matchAll(/public const ([A-Z0-9_]+) = (-?\d+);/g)]
  .map((match) => [match[1], Number(match[2])]));
if (Object.keys(constants).length !== 12) throw new Error('Unexpected upstream IntlDateFormatter constant set');
const output = `// Generated from JetBrains/phpstorm-stubs at ${revision}, intl/intl.php.
// Apache-2.0. See THIRD_PARTY_NOTICES.md. Removed datefmt_set_timezone_id is excluded.
export const DATE_FORMATTER_FUNCTION_METHODS = ${JSON.stringify(functionMethods, null, 2)} as const;
export const DATE_FORMATTER_CONSTANTS = ${JSON.stringify(constants, null, 2)} as const;
`;
const target = resolve('packages/language-spec/src/intl-dateformatter-catalog.ts');
if (process.argv.includes('--write')) await writeFile(target, output);
else if (await readFile(target, 'utf8') !== output) throw new Error(`${target} differs from phpstorm-stubs ${revision}`);
process.stdout.write(`IntlDateFormatter: ${Object.keys(functionMethods).length} function/method pairs and ${Object.keys(constants).length} constants from ${revision}\n`);
