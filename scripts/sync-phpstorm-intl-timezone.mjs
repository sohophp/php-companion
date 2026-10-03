import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import process from 'node:process';
import { requirePinnedPhpstormStubs } from './phpstorm-stubs-source.mjs';

const sourceIndex = process.argv.indexOf('--source');
const sourceRoot = sourceIndex >= 0 ? process.argv[sourceIndex + 1] : undefined;
if (!sourceRoot) throw new Error('Usage: node scripts/sync-phpstorm-intl-timezone.mjs --source PATH [--write]');
const revision = requirePinnedPhpstormStubs(resolve(sourceRoot));
const source = await readFile(resolve(sourceRoot, 'intl/intl.php'), 'utf8');
const classSource = source.slice(source.indexOf('class IntlTimeZone\n'), source.indexOf('function collator_create('));
if (!classSource) throw new Error('Unexpected upstream IntlTimeZone layout');
const functionMethods = {
  intltz_count_equivalent_ids: 'countEquivalentIDs', intltz_create_default: 'createDefault',
  intltz_create_enumeration: 'createEnumeration', intltz_create_time_zone: 'createTimeZone',
  intltz_create_time_zone_id_enumeration: 'createTimeZoneIDEnumeration', intltz_from_date_time_zone: 'fromDateTimeZone',
  intltz_get_canonical_id: 'getCanonicalID', intltz_get_display_name: 'getDisplayName',
  intltz_get_dst_savings: 'getDSTSavings', intltz_get_equivalent_id: 'getEquivalentID',
  intltz_get_error_code: 'getErrorCode', intltz_get_error_message: 'getErrorMessage',
  intltz_get_gmt: 'getGMT', intltz_get_id: 'getID', intltz_get_offset: 'getOffset',
  intltz_get_raw_offset: 'getRawOffset', intltz_get_region: 'getRegion',
  intltz_get_tz_data_version: 'getTZDataVersion', intltz_get_unknown: 'getUnknown',
  intltz_get_windows_id: 'getWindowsID', intltz_get_id_for_windows_id: 'getIDForWindowsID',
  intltz_has_same_rules: 'hasSameRules', intltz_to_date_time_zone: 'toDateTimeZone',
  intltz_use_daylight_time: 'useDaylightTime', intltz_get_iana_id: 'getIanaID',
};
const upstreamFunctions = [...source.matchAll(/^function (intltz_[A-Za-z_]+)\s*\(/gm)].map((match) => match[1]);
const unknown = upstreamFunctions.filter((name) => !(name in functionMethods));
if (upstreamFunctions.length !== 26 || unknown.join(',') !== 'intltz_getGMT') {
  throw new Error(`Unexpected upstream IntlTimeZone function set: ${upstreamFunctions.join(', ')}`);
}
for (const method of Object.values(functionMethods)) {
  if (!new RegExp(`\\bpublic (?:static )?function ${method}\\s*\\(`).test(classSource)) {
    throw new Error(`Missing upstream IntlTimeZone::${method}`);
  }
}
const constants = Object.fromEntries([...classSource.matchAll(/public const ([A-Z_]+) = (-?\d+);/g)]
  .map((match) => [match[1], Number(match[2])]));
if (Object.keys(constants).length !== 11) throw new Error('Unexpected upstream IntlTimeZone constant set');
const output = `// Generated from JetBrains/phpstorm-stubs at ${revision}, intl/intl.php.
// Apache-2.0. See THIRD_PARTY_NOTICES.md. Non-runtime intltz_getGMT is excluded.
export const INTL_TIMEZONE_FUNCTION_METHODS = ${JSON.stringify(functionMethods, null, 2)} as const;
export const INTL_TIMEZONE_CONSTANTS = ${JSON.stringify(constants, null, 2)} as const;
`;
const target = resolve('packages/language-spec/src/intl-timezone-catalog.ts');
if (process.argv.includes('--write')) await writeFile(target, output);
else if (await readFile(target, 'utf8') !== output) throw new Error(`${target} differs from phpstorm-stubs ${revision}`);
process.stdout.write(`IntlTimeZone: ${Object.keys(functionMethods).length} function/method pairs and ${Object.keys(constants).length} constants from ${revision}\n`);
