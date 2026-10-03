import { LOCALE_FUNCTION_METHODS, NORMALIZER_FUNCTION_METHODS } from './intl-locale-catalog.js';
import type { SupportedPhpVersion } from './index.js';

type LocaleFunction = keyof typeof LOCALE_FUNCTION_METHODS;
type NormalizerFunction = keyof typeof NORMALIZER_FUNCTION_METHODS;
interface Signature { parameters: string; returnType: string }

const LOCALE_CONSTANTS = {
  ACTUAL_LOCALE: 0, VALID_LOCALE: 1, DEFAULT_LOCALE: null,
  LANG_TAG: 'language', EXTLANG_TAG: 'extlang', SCRIPT_TAG: 'script',
  REGION_TAG: 'region', VARIANT_TAG: 'variant',
  GRANDFATHERED_LANG_TAG: 'grandfathered', PRIVATE_TAG: 'private',
} as const;

const NORMALIZER_PHP7_CONSTANTS = {
  NONE: 1, FORM_D: 2, NFD: 2, FORM_KD: 3, NFKD: 3,
  FORM_C: 4, NFC: 4, FORM_KC: 5, NFKC: 5,
} as const;

const NORMALIZER_PHP8_CONSTANTS = {
  FORM_D: 4, NFD: 4, FORM_KD: 8, NFKD: 8,
  FORM_C: 16, NFC: 16, FORM_KC: 32, NFKC: 32,
  FORM_KC_CF: 48, NFKC_CF: 48,
} as const;

const literal = (value: string | number | null): string => value === null ? 'null' : JSON.stringify(value);
const classConstants = (constants: Record<string, string | number | null>): string =>
  Object.entries(constants).map(([name, value]) => `  public const ${name} = ${literal(value)};`).join('\n');

export function auditedIntlLocaleStub(version: SupportedPhpVersion): string {
  const target = Number(version.replace('.', ''));
  const php80 = target >= 80;
  const declaration = (name: string, parameters: string, returnType: string, method = false): string => {
    const nativeReturn = php80 && (!method || (target >= 85 && ['isRightToLeft', 'addLikelySubtags', 'minimizeSubtags'].includes(name)));
    return `${nativeReturn ? '' : `/** @return ${returnType} */ `}${method ? 'public static ' : ''}function ${name}(${parameters})${nativeReturn ? `: ${returnType}` : ''} {}`;
  };
  const display: Signature = { parameters: 'string $locale, ?string $displayLocale = null', returnType: 'string|false' };
  const localeSignatures: Record<LocaleFunction, Signature> = {
    locale_get_default: { parameters: '', returnType: 'string' },
    locale_set_default: { parameters: 'string $locale', returnType: target >= 84 ? 'true' : 'bool' },
    locale_get_primary_language: { parameters: 'string $locale', returnType: '?string' },
    locale_get_script: { parameters: 'string $locale', returnType: '?string' },
    locale_get_region: { parameters: 'string $locale', returnType: '?string' },
    locale_get_keywords: { parameters: 'string $locale', returnType: 'array|false|null' },
    locale_get_display_script: display,
    locale_get_display_region: display,
    locale_get_display_name: display,
    locale_get_display_language: display,
    locale_get_display_variant: display,
    locale_compose: { parameters: 'array $subtags', returnType: 'string|false' },
    locale_parse: { parameters: 'string $locale', returnType: '?array' },
    locale_get_all_variants: { parameters: 'string $locale', returnType: '?array' },
    locale_filter_matches: { parameters: 'string $languageTag, string $locale, bool $canonicalize = false', returnType: '?bool' },
    locale_lookup: { parameters: 'array $languageTag, string $locale, bool $canonicalize = false, ?string $defaultLocale = null', returnType: '?string' },
    locale_canonicalize: { parameters: 'string $locale', returnType: '?string' },
    locale_accept_from_http: { parameters: 'string $header', returnType: 'string|false' },
    locale_is_right_to_left: { parameters: 'string $locale', returnType: 'bool' },
    locale_add_likely_subtags: { parameters: 'string $locale', returnType: 'string|false' },
    locale_minimize_subtags: { parameters: 'string $locale', returnType: 'string|false' },
  };
  const normalizerSignatures: Record<NormalizerFunction, Signature> = {
    normalizer_normalize: { parameters: 'string $string, int $form = Normalizer::FORM_C', returnType: 'string|false' },
    normalizer_is_normalized: { parameters: 'string $string, int $form = Normalizer::FORM_C', returnType: 'bool' },
    normalizer_get_raw_decomposition: { parameters: target >= 80 ? 'string $string, int $form = Normalizer::FORM_C' : 'string $string', returnType: '?string' },
  };
  const php7LocaleMethodParameters: Partial<Record<LocaleFunction, string>> = {
    locale_get_display_script: 'string $locale, ?string $in_locale = null',
    locale_get_display_region: 'string $locale, ?string $in_locale = null',
    locale_get_display_name: 'string $locale, ?string $in_locale = null',
    locale_get_display_language: 'string $locale, ?string $in_locale = null',
    locale_get_display_variant: 'string $locale, ?string $in_locale = null',
    locale_filter_matches: 'string $langtag, string $locale, bool $canonicalize = false',
    locale_lookup: 'array $langtag, string $locale, bool $canonicalize = false, ?string $default = null',
  };
  const php7LocaleFunctionParameters: Partial<Record<LocaleFunction, string>> = {
    locale_set_default: 'string $arg1',
    locale_get_primary_language: 'string $arg1',
    locale_get_script: 'string $arg1',
    locale_get_region: 'string $arg1',
    locale_get_keywords: 'string $arg1',
    locale_get_display_script: 'string $locale, ?string $in_locale = null',
    locale_get_display_region: 'string $locale, ?string $in_locale = null',
    locale_get_display_name: 'string $locale, ?string $in_locale = null',
    locale_get_display_language: 'string $locale, ?string $in_locale = null',
    locale_get_display_variant: 'string $locale, ?string $in_locale = null',
    locale_compose: 'array $arg1',
    locale_parse: 'string $arg1',
    locale_get_all_variants: 'string $arg1',
    locale_filter_matches: 'string $langtag, string $locale, bool $canonicalize = false',
    locale_canonicalize: 'string $arg1',
    locale_lookup: 'array $langtag, string $locale, bool $canonicalize = false, ?string $def = null',
    locale_accept_from_http: 'string $arg1',
  };
  const localeParameters = (name: LocaleFunction, method: boolean): string =>
    php80 ? localeSignatures[name].parameters
      : (method ? php7LocaleMethodParameters[name] : php7LocaleFunctionParameters[name])
        ?? localeSignatures[name].parameters;
  const normalizerParameters = (name: NormalizerFunction): string =>
    !php80 && name !== 'normalizer_get_raw_decomposition'
      ? 'string $input, int $form = Normalizer::FORM_C'
      : normalizerSignatures[name].parameters;
  const localeFunctions = Object.entries(LOCALE_FUNCTION_METHODS)
    .filter(([name]) => target >= 85 || !['locale_is_right_to_left', 'locale_add_likely_subtags', 'locale_minimize_subtags'].includes(name));
  const normalizerFunctions = Object.entries(NORMALIZER_FUNCTION_METHODS)
    .filter(([name]) => target >= 73 || name !== 'normalizer_get_raw_decomposition');
  const localeClass = `class Locale {
${classConstants(LOCALE_CONSTANTS)}
${localeFunctions.map(([name, method]) => `  ${declaration(method, localeParameters(name as LocaleFunction, true), localeSignatures[name as LocaleFunction].returnType, true)}`).join('\n')}
}`;
  const normalizerClass = `class Normalizer {
${classConstants(php80 ? NORMALIZER_PHP8_CONSTANTS : NORMALIZER_PHP7_CONSTANTS)}
${normalizerFunctions.map(([name, method]) => `  ${declaration(method, normalizerParameters(name as NormalizerFunction), normalizerSignatures[name as NormalizerFunction].returnType, true)}`).join('\n')}
}`;
  const functions = [
    ...localeFunctions.map(([name]) => declaration(name, localeParameters(name as LocaleFunction, false), localeSignatures[name as LocaleFunction].returnType)),
    ...normalizerFunctions.map(([name]) => declaration(name, normalizerParameters(name as NormalizerFunction), normalizerSignatures[name as NormalizerFunction].returnType)),
  ].join('\n');
  return `${localeClass}\n${normalizerClass}\n${functions}\n`;
}
