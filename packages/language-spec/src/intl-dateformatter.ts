import { DATE_FORMATTER_CONSTANTS, DATE_FORMATTER_FUNCTION_METHODS } from './intl-dateformatter-catalog.js';
import type { SupportedPhpVersion } from './index.js';

type DateFormatterFunction = keyof typeof DATE_FORMATTER_FUNCTION_METHODS;
interface Signature { parameters: string; returnType: string; doc?: string }

const RELATIVE_CONSTANTS = new Set(['RELATIVE_FULL', 'RELATIVE_LONG', 'RELATIVE_MEDIUM', 'RELATIVE_SHORT']);

export function auditedIntlDateFormatterStub(version: SupportedPhpVersion): string {
  const target = Number(version.replace('.', ''));
  const php80 = target >= 80;
  const timezone = `${target >= 85 ? 'IntlTimeZone|DateTimeZone|string|null ' : ''}$timezone`;
  const calendar = `${php80 ? 'IntlCalendar|int|null ' : ''}$calendar`;
  const dateStyles = php80
    ? '?string $locale, int $dateType = IntlDateFormatter::FULL, int $timeType = IntlDateFormatter::FULL'
    : 'string $locale, int $datetype, int $timetype';
  const constructor = `${dateStyles}, ${timezone} = null, $calendar = null, ${php80 ? '?string' : 'string'} $pattern = null`;
  const create = `${dateStyles}, ${timezone} = null, ${calendar} = null, ${php80 ? '?string' : 'string'} $pattern = null`;
  const signatures: Record<DateFormatterFunction, Signature> = {
    datefmt_create: { parameters: create, returnType: '?IntlDateFormatter' },
    datefmt_get_datetype: { parameters: '', returnType: 'int|false' },
    datefmt_get_timetype: { parameters: '', returnType: 'int|false' },
    datefmt_get_calendar: { parameters: '', returnType: 'int|false' },
    datefmt_set_calendar: { parameters: calendar, returnType: 'bool' },
    datefmt_get_locale: { parameters: php80 ? 'int $type = ULOC_ACTUAL_LOCALE' : '', returnType: 'string|false' },
    datefmt_get_timezone_id: { parameters: '', returnType: 'string|false' },
    datefmt_get_calendar_object: { parameters: '', returnType: 'IntlCalendar|false|null' },
    datefmt_get_timezone: { parameters: '', returnType: 'IntlTimeZone|false' },
    datefmt_set_timezone: { parameters: timezone, returnType: target >= 83 ? 'bool' : 'bool|null' },
    datefmt_get_pattern: { parameters: '', returnType: 'string|false' },
    datefmt_set_pattern: { parameters: 'string $pattern', returnType: 'bool' },
    datefmt_is_lenient: { parameters: '', returnType: 'bool' },
    datefmt_set_lenient: { parameters: 'bool $lenient', returnType: 'void' },
    // PHP 7.2 Reflection lists two optional parameters, but a call without a date fails.
    datefmt_format: { parameters: '$datetime', returnType: 'string|false', doc: '@param IntlCalendar|DateTimeInterface|array|string|int|float $datetime' },
    datefmt_format_object: { parameters: `$${php80 ? 'datetime' : 'object'}, $format = null, ${php80 ? '?string' : 'string'} $locale = null`, returnType: 'string|false', doc: `@param IntlCalendar|DateTimeInterface $${php80 ? 'datetime' : 'object'} @param array|int|string|null $format` },
    datefmt_parse: { parameters: `string $string, &$${php80 ? 'offset' : 'position'} = null`, returnType: 'int|float|false' },
    datefmt_localtime: { parameters: `string $string, &$${php80 ? 'offset' : 'position'} = null`, returnType: 'array|false' },
    datefmt_get_error_code: { parameters: '', returnType: 'int' },
    datefmt_get_error_message: { parameters: '', returnType: 'string' },
  };
  const entries = Object.entries(DATE_FORMATTER_FUNCTION_METHODS) as [DateFormatterFunction, string][];
  const constants = Object.entries(DATE_FORMATTER_CONSTANTS)
    .filter(([name]) => (!RELATIVE_CONSTANTS.has(name) || target >= 80) && (name !== 'PATTERN' || target >= 84))
    .map(([name, value]) => `  public const ${name} = ${value};`);
  const doc = ({ returnType, doc: parameterDoc }: Signature): string =>
    `/** ${parameterDoc ? `${parameterDoc} ` : ''}@return ${returnType} */`;
  const php7MethodParameters: Partial<Record<DateFormatterFunction, string>> = {
    datefmt_set_calendar: '$which',
    datefmt_set_timezone: '$zone',
  };
  const methodParameters = (name: DateFormatterFunction): string =>
    (php80 ? undefined : php7MethodParameters[name]) ?? signatures[name].parameters;
  const functionParameters = (name: DateFormatterFunction): string => {
    if (php80) return signatures[name].parameters;
    if (name === 'datefmt_create') return create
      .replace('$datetype', '$date_type')
      .replace('$timetype', '$time_type')
      .replace('$timezone', '$timezone_str');
    return signatures[name].parameters;
  };
  const php7FormatterName = (name: DateFormatterFunction): string =>
    name === 'datefmt_get_error_code' ? 'nf'
      : name === 'datefmt_get_error_message' ? 'coll'
        : name === 'datefmt_parse' || name === 'datefmt_localtime' || name === 'datefmt_format'
          ? 'formatter' : 'mf';
  const methods = entries.map(([name, method]) => {
    const signature = signatures[name];
    return `  ${doc(signature)} public ${name === 'datefmt_create' || name === 'datefmt_format_object' ? 'static ' : ''}function ${method}(${methodParameters(name)}) {}`;
  });
  if (target >= 84) methods.push('  public function parseToCalendar(string $string, &$offset = null): int|float|false {}');
  const functions = entries.map(([name]) => {
    const signature = signatures[name];
    const parameters = functionParameters(name);
    const args = name === 'datefmt_create' || name === 'datefmt_format_object'
      ? parameters : `IntlDateFormatter $${php80 ? 'formatter' : php7FormatterName(name)}${parameters ? `, ${parameters}` : ''}`;
    return `${!php80 || signature.doc ? `${doc(signature)} ` : ''}function ${name}(${args})${php80 ? `: ${signature.returnType}` : ''} {}`;
  });
  return `class IntlDateFormatter {
${constants.join('\n')}
  public function __construct(${constructor}) {}
${methods.join('\n')}
}
${functions.join('\n')}
`;
}
