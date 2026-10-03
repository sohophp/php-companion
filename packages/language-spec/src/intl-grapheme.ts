import { INTL_GRAPHEME_IDN_FUNCTIONS } from './intl-grapheme-catalog.js';
import type { SupportedPhpVersion } from './index.js';

type IntlFunction = typeof INTL_GRAPHEME_IDN_FUNCTIONS[number];
interface Signature { parameters: string; returnType: string }

// The pinned phpstorm-stubs revision says IDNA_DEFAULT=48; PHP 7.2–8.5 runtimes report 0.
const CONSTANTS = {
  GRAPHEME_EXTR_COUNT: 0, GRAPHEME_EXTR_MAXBYTES: 1, GRAPHEME_EXTR_MAXCHARS: 2,
  IDNA_DEFAULT: 0, IDNA_ALLOW_UNASSIGNED: 1, IDNA_USE_STD3_RULES: 2,
  IDNA_CHECK_BIDI: 4, IDNA_CHECK_CONTEXTJ: 8,
  IDNA_NONTRANSITIONAL_TO_ASCII: 16, IDNA_NONTRANSITIONAL_TO_UNICODE: 32,
  INTL_IDNA_VARIANT_UTS46: 1,
  IDNA_ERROR_EMPTY_LABEL: 1, IDNA_ERROR_LABEL_TOO_LONG: 2,
  IDNA_ERROR_DOMAIN_NAME_TOO_LONG: 4, IDNA_ERROR_LEADING_HYPHEN: 8,
  IDNA_ERROR_TRAILING_HYPHEN: 16, IDNA_ERROR_HYPHEN_3_4: 32,
  IDNA_ERROR_LEADING_COMBINING_MARK: 64, IDNA_ERROR_DISALLOWED: 128,
  IDNA_ERROR_PUNYCODE: 256, IDNA_ERROR_LABEL_HAS_DOT: 512,
  IDNA_ERROR_INVALID_ACE_LABEL: 1024, IDNA_ERROR_BIDI: 2048,
  IDNA_ERROR_CONTEXTJ: 4096,
} as const;

export function auditedIntlGraphemeStub(version: SupportedPhpVersion): string {
  const target = Number(version.replace('.', ''));
  const php80 = target >= 80;
  const search = (): Signature => ({
    parameters: `string $haystack, string $needle, int $offset = 0${target >= 85 ? ', string $locale = ""' : ''}`,
    returnType: 'int|false',
  });
  const find = (): Signature => ({
    parameters: `string $haystack, string $needle, bool $${php80 ? 'beforeNeedle' : 'before_needle'} = false${target >= 85 ? ', string $locale = ""' : ''}`,
    returnType: 'string|false',
  });
  const idn: Signature = { parameters: `string $domain, int $${php80 ? 'flags' : 'option'} = IDNA_DEFAULT, int $variant = INTL_IDNA_VARIANT_UTS46, &$${php80 ? 'idna_info' : 'idn_info'} = null`, returnType: 'string|false' };
  const signatures: Record<IntlFunction, Signature> = {
    grapheme_strlen: { parameters: 'string $string', returnType: 'int|false|null' },
    grapheme_strpos: search(), grapheme_stripos: search(),
    grapheme_strrpos: search(), grapheme_strripos: search(),
    grapheme_substr: { parameters: `string $string, int $${php80 ? 'offset' : 'start'}, ${php80 ? '?int' : 'int'} $length = null${target >= 85 ? ', string $locale = ""' : ''}`, returnType: 'string|false' },
    grapheme_strstr: find(), grapheme_stristr: find(),
    grapheme_extract: { parameters: php80
      ? 'string $haystack, int $size, int $type = GRAPHEME_EXTR_COUNT, int $offset = 0, &$next = null'
      : 'string $arg1, int $arg2, int $arg3 = GRAPHEME_EXTR_COUNT, int $arg4 = 0, &$arg5 = null', returnType: 'string|false' },
    idn_to_ascii: idn, idn_to_utf8: idn,
    grapheme_str_split: { parameters: 'string $string, int $length = 1', returnType: 'array|false' },
    grapheme_levenshtein: { parameters: 'string $string1, string $string2, int $insertion_cost = 1, int $replacement_cost = 1, int $deletion_cost = 1, string $locale = ""', returnType: 'int|false' },
  };
  const constants = Object.entries(CONSTANTS).map(([name, value]) => `const ${name} = ${value};`);
  if (target < 80) constants.push('const INTL_IDNA_VARIANT_2003 = 0;');
  const functions = INTL_GRAPHEME_IDN_FUNCTIONS
    .filter((name) => (name !== 'grapheme_str_split' || target >= 84) && (name !== 'grapheme_levenshtein' || target >= 85))
    .map((name) => {
      const { parameters, returnType } = signatures[name];
      return `${php80 ? '' : `/** @return ${returnType} */ `}function ${name}(${parameters})${php80 ? `: ${returnType}` : ''} {}`;
    });
  return `${constants.join('\n')}\n${functions.join('\n')}\n`;
}
