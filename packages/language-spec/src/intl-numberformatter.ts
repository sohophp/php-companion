import { NUMBER_FORMATTER_CONSTANTS, NUMBER_FORMATTER_FUNCTION_METHODS } from './intl-numberformatter-catalog.js';
import type { SupportedPhpVersion } from './index.js';

type NumberFormatterFunction = keyof typeof NUMBER_FORMATTER_FUNCTION_METHODS;
interface Signature { parameters: string; returnType: string; doc?: string }

const PHP84_CONSTANTS = new Set(['ROUND_TOWARD_ZERO', 'ROUND_AWAY_FROM_ZERO', 'ROUND_HALFODD']);
const PHP85_CONSTANTS = new Set(['DECIMAL_COMPACT_SHORT', 'DECIMAL_COMPACT_LONG', 'CURRENCY_ISO', 'CURRENCY_PLURAL', 'CASH_CURRENCY', 'CURRENCY_STANDARD']);

export function auditedIntlNumberFormatterStub(version: SupportedPhpVersion, currencyAccountingAvailable?: boolean): string {
  const target = Number(version.replace('.', ''));
  const php80 = target >= 80;
  const pattern = `${php80 ? '?string' : 'string'} $pattern = null`;
  const signatures: Record<NumberFormatterFunction, Signature> = {
    numfmt_create: { parameters: `string $locale, int $style, ${pattern}`, returnType: '?NumberFormatter' },
    numfmt_format: { parameters: `${php80 ? 'int|float ' : ''}$num, int $type = NumberFormatter::TYPE_DEFAULT`, returnType: 'string|false', doc: '@param int|float $num' },
    numfmt_parse: { parameters: 'string $string, int $type = NumberFormatter::TYPE_DOUBLE, &$offset = null', returnType: 'int|float|false' },
    numfmt_format_currency: { parameters: 'float $amount, string $currency', returnType: 'string|false' },
    numfmt_parse_currency: { parameters: 'string $string, &$currency, &$offset = null', returnType: 'float|false' },
    numfmt_set_attribute: { parameters: `int $attribute, ${php80 ? 'int|float ' : ''}$value`, returnType: 'bool', doc: '@param int|float $value' },
    numfmt_get_attribute: { parameters: 'int $attribute', returnType: 'int|float|false' },
    numfmt_set_text_attribute: { parameters: 'int $attribute, string $value', returnType: 'bool' },
    numfmt_get_text_attribute: { parameters: 'int $attribute', returnType: 'string|false' },
    numfmt_set_symbol: { parameters: 'int $symbol, string $value', returnType: 'bool' },
    numfmt_get_symbol: { parameters: 'int $symbol', returnType: 'string|false' },
    numfmt_set_pattern: { parameters: 'string $pattern', returnType: 'bool' },
    numfmt_get_pattern: { parameters: '', returnType: 'string|false' },
    numfmt_get_locale: { parameters: 'int $type = 0', returnType: 'string|false' },
    numfmt_get_error_code: { parameters: '', returnType: 'int' },
    numfmt_get_error_message: { parameters: '', returnType: 'string' },
  };
  const legacyParameters: Partial<Record<NumberFormatterFunction, string>> = {
    numfmt_parse: 'string $string, int $type = NumberFormatter::TYPE_DOUBLE, &$position = null',
    numfmt_format_currency: 'float $num, string $currency',
    numfmt_parse_currency: 'string $string, &$currency, &$position = null',
    numfmt_set_attribute: 'int $attr, $value',
    numfmt_get_attribute: 'int $attr',
    numfmt_set_text_attribute: 'int $attr, string $value',
    numfmt_get_text_attribute: 'int $attr',
    numfmt_set_symbol: 'int $attr, string $symbol',
    numfmt_get_symbol: 'int $attr',
  };
  const entries = Object.entries(NUMBER_FORMATTER_FUNCTION_METHODS) as [NumberFormatterFunction, string][];
  const constants = Object.entries(NUMBER_FORMATTER_CONSTANTS)
    // PHP 7.4.0 and ICU builds below 53 lack this constant; use the target runtime when known.
    .filter(([name]) => (name !== 'CURRENCY_ACCOUNTING' || (currencyAccountingAvailable ?? target >= 80))
      && (!PHP84_CONSTANTS.has(name) || target >= 84) && (!PHP85_CONSTANTS.has(name) || target >= 85))
    .map(([name, value]) => `  ${name === 'TYPE_CURRENCY' && target >= 83 ? '/** @deprecated PHP 8.3 */ ' : ''}public const ${name} = ${value};`);
  const doc = ({ returnType, doc: parameterDoc }: Signature): string =>
    `/** ${parameterDoc ? `${parameterDoc} ` : ''}@return ${returnType} */`;
  const methods = entries.map(([name, method]) => {
    const signature = signatures[name];
    return `  ${doc(signature)} public ${name === 'numfmt_create' ? 'static ' : ''}function ${method}(${php80 ? signature.parameters : legacyParameters[name] ?? signature.parameters}) {}`;
  });
  const functions = entries.map(([name]) => {
    const signature = signatures[name];
    const parameters = php80 ? signature.parameters : legacyParameters[name] ?? signature.parameters;
    const formatter = !php80 && name !== 'numfmt_parse' && name !== 'numfmt_parse_currency' ? 'nf' : 'formatter';
    const args = name === 'numfmt_create' ? parameters : `NumberFormatter $${formatter}${parameters ? `, ${parameters}` : ''}`;
    return `${!php80 || signature.doc ? `${doc(signature)} ` : ''}function ${name}(${args})${php80 ? `: ${signature.returnType}` : ''} {}`;
  });
  return `class NumberFormatter {
${constants.join('\n')}
  public function __construct(string $locale, int $style, ${pattern}) {}
${methods.join('\n')}
}
${functions.join('\n')}
`;
}
