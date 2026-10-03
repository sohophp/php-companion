import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import process from 'node:process';
import { requirePinnedPhpstormStubs } from './phpstorm-stubs-source.mjs';

const sourceIndex = process.argv.indexOf('--source');
const sourceRoot = sourceIndex >= 0 ? process.argv[sourceIndex + 1] : undefined;
if (!sourceRoot) throw new Error('Usage: node scripts/sync-phpstorm-intl-locale.mjs --source PATH [--write]');
const source = resolve(sourceRoot);
const revision = requirePinnedPhpstormStubs(source);
const upstream = await readFile(resolve(source, 'intl/intl.php'), 'utf8');
const localeSource = upstream.slice(upstream.indexOf('class Locale\n'), upstream.indexOf('class MessageFormatter\n'));
const normalizerSource = upstream.slice(upstream.indexOf('class Normalizer\n'), upstream.indexOf('class Locale\n'));
if (!localeSource || !normalizerSource) throw new Error('Unexpected upstream Intl class layout');
const localeMethods = {
  locale_get_default: 'getDefault', locale_set_default: 'setDefault',
  locale_get_primary_language: 'getPrimaryLanguage', locale_get_script: 'getScript',
  locale_get_region: 'getRegion', locale_get_keywords: 'getKeywords',
  locale_get_display_script: 'getDisplayScript', locale_get_display_region: 'getDisplayRegion',
  locale_get_display_name: 'getDisplayName', locale_get_display_language: 'getDisplayLanguage',
  locale_get_display_variant: 'getDisplayVariant', locale_compose: 'composeLocale',
  locale_parse: 'parseLocale', locale_get_all_variants: 'getAllVariants',
  locale_filter_matches: 'filterMatches', locale_lookup: 'lookup',
  locale_canonicalize: 'canonicalize', locale_accept_from_http: 'acceptFromHttp',
  locale_is_right_to_left: 'isRightToLeft', locale_add_likely_subtags: 'addLikelySubtags',
  locale_minimize_subtags: 'minimizeSubtags',
};
const normalizerMethods = {
  normalizer_normalize: 'normalize', normalizer_is_normalized: 'isNormalized',
  normalizer_get_raw_decomposition: 'getRawDecomposition',
};
for (const [name, method] of Object.entries(localeMethods)) {
  if (!new RegExp(`^function ${name}\\s*\\(`, 'm').test(upstream)
    || !new RegExp(`\\bpublic static function ${method}\\s*\\(`).test(localeSource)) {
    throw new Error(`Unexpected upstream Locale pair ${name} / ${method}`);
  }
}
for (const [name, method] of Object.entries(normalizerMethods)) {
  if (!new RegExp(`^function ${name}\\s*\\(`, 'm').test(upstream)
    || !new RegExp(`\\bpublic static function ${method}\\s*\\(`).test(normalizerSource)) {
    throw new Error(`Unexpected upstream Normalizer pair ${name} / ${method}`);
  }
}
const output = `// Generated from JetBrains/phpstorm-stubs at ${revision}, intl/intl.php.
// Apache-2.0. See THIRD_PARTY_NOTICES.md. Runtime signatures and availability are audited separately.
export const LOCALE_FUNCTION_METHODS = ${JSON.stringify(localeMethods, null, 2)} as const;
export const NORMALIZER_FUNCTION_METHODS = ${JSON.stringify(normalizerMethods, null, 2)} as const;
`;
const target = resolve('packages/language-spec/src/intl-locale-catalog.ts');
if (process.argv.includes('--write')) await writeFile(target, output);
else if (await readFile(target, 'utf8') !== output) throw new Error(`${target} differs from phpstorm-stubs ${revision}`);
process.stdout.write(`Intl Locale/Normalizer: ${Object.keys(localeMethods).length + Object.keys(normalizerMethods).length} function/method pairs from ${revision}\n`);
