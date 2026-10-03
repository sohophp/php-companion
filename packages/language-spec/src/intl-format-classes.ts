import { INTL_DATE_PATTERN_GENERATOR_METHODS, INTL_LIST_FORMATTER_CONSTANTS,
  INTL_LIST_FORMATTER_METHODS } from './intl-format-classes-catalog.js';
import type { SupportedPhpVersion } from './index.js';

type ListMethod = typeof INTL_LIST_FORMATTER_METHODS[number];
type PatternMethod = typeof INTL_DATE_PATTERN_GENERATOR_METHODS[number];

export function auditedIntlFormatClassesStub(version: SupportedPhpVersion): string {
  const target = Number(version.replace('.', ''));
  const list = target >= 85 ? ((): string => {
    const constants = Object.entries(INTL_LIST_FORMATTER_CONSTANTS)
      .map(([name, value]) => `  public const int ${name} = ${value};`);
    const declarations: Record<ListMethod, string> = {
      __construct: '/** @throws IntlException when the locale or ICU version is unsupported */ public function __construct(string $locale, int $type = IntlListFormatter::TYPE_AND, int $width = IntlListFormatter::WIDTH_WIDE) {}',
      format: 'public function format(array $strings): string|false {}',
      getErrorCode: 'public function getErrorCode(): int {}',
      getErrorMessage: 'public function getErrorMessage(): string {}',
    };
    return `final class IntlListFormatter {
${constants.join('\n')}
${INTL_LIST_FORMATTER_METHODS.map((name) => `  ${declarations[name]}`).join('\n')}
}
`;
  })() : '';
  const pattern = target >= 81 ? ((): string => {
    const declarations: Record<PatternMethod, string> = {
      __construct: 'public function __construct(?string $locale = null) {}',
      create: 'public static function create(?string $locale = null): ?IntlDatePatternGenerator {}',
      getBestPattern: 'public function getBestPattern(string $skeleton): string|false {}',
    };
    return `class IntlDatePatternGenerator {
${INTL_DATE_PATTERN_GENERATOR_METHODS.map((name) => `  ${declarations[name]}`).join('\n')}
}
`;
  })() : '';
  return pattern + list;
}
