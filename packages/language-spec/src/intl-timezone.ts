import { INTL_TIMEZONE_CONSTANTS, INTL_TIMEZONE_FUNCTION_METHODS } from './intl-timezone-catalog.js';
import type { BuiltinPhpStubOptions, SupportedPhpVersion } from './index.js';

type IntlTimeZoneFunction = keyof typeof INTL_TIMEZONE_FUNCTION_METHODS;
interface Signature { parameters: string; returnType: string; isStatic?: boolean; minimumVersion?: number; proceduralMinimumVersion?: number; doc?: string }

export function auditedIntlTimeZoneStub(version: SupportedPhpVersion, options: BuiltinPhpStubOptions = {}): string {
  const target = Number(version.replace('.', ''));
  const php80 = target >= 80;
  const timezoneId = `string $timezoneId`;
  const enumeration = `${target >= 85 ? 'string|int|null ' : ''}$countryOrRawOffset = null`;
  const signatures: Record<IntlTimeZoneFunction, Signature> = {
    intltz_count_equivalent_ids: { parameters: timezoneId, returnType: 'int|false', isStatic: true },
    intltz_create_default: { parameters: '', returnType: 'IntlTimeZone', isStatic: true },
    intltz_create_enumeration: { parameters: enumeration, returnType: 'IntlIterator|false', isStatic: true },
    intltz_create_time_zone: { parameters: timezoneId, returnType: '?IntlTimeZone', isStatic: true },
    intltz_create_time_zone_id_enumeration: { parameters: `int $type, ${php80 ? '?string' : 'string'} $region = null, ${php80 ? '?int' : 'int'} $rawOffset = null`, returnType: 'IntlIterator|false', isStatic: true },
    intltz_from_date_time_zone: { parameters: 'DateTimeZone $timezone', returnType: '?IntlTimeZone', isStatic: true },
    intltz_get_canonical_id: { parameters: `${timezoneId}, &$isSystemId = null`, returnType: 'string|false', isStatic: true, doc: '@param-out bool $isSystemId' },
    intltz_get_display_name: { parameters: `bool $dst = false, int $style = IntlTimeZone::DISPLAY_LONG, ${php80 ? '?string' : 'string'} $locale = null`, returnType: 'string|false' },
    intltz_get_dst_savings: { parameters: '', returnType: 'int' },
    intltz_get_equivalent_id: { parameters: `${timezoneId}, int $offset`, returnType: 'string|false', isStatic: true },
    intltz_get_error_code: { parameters: '', returnType: 'int|false' },
    intltz_get_error_message: { parameters: '', returnType: 'string|false' },
    intltz_get_gmt: { parameters: '', returnType: 'IntlTimeZone', isStatic: true },
    intltz_get_id: { parameters: '', returnType: 'string|false' },
    intltz_get_offset: { parameters: 'float $timestamp, bool $local, &$rawOffset, &$dstOffset', returnType: 'bool', doc: '@param-out int $rawOffset @param-out int $dstOffset' },
    intltz_get_raw_offset: { parameters: '', returnType: 'int' },
    intltz_get_region: { parameters: timezoneId, returnType: 'string|false', isStatic: true },
    intltz_get_tz_data_version: { parameters: '', returnType: 'string|false', isStatic: true },
    intltz_get_unknown: { parameters: '', returnType: 'IntlTimeZone', isStatic: true },
    intltz_get_windows_id: { parameters: timezoneId, returnType: 'string|false', isStatic: true, proceduralMinimumVersion: 80 },
    intltz_get_id_for_windows_id: { parameters: `${timezoneId}, ${php80 ? '?string' : 'string'} $region = null`, returnType: 'string|false', isStatic: true, proceduralMinimumVersion: 80 },
    intltz_has_same_rules: { parameters: 'IntlTimeZone $other', returnType: 'bool' },
    intltz_to_date_time_zone: { parameters: '', returnType: 'DateTimeZone|false' },
    intltz_use_daylight_time: { parameters: '', returnType: 'bool' },
    intltz_get_iana_id: { parameters: timezoneId, returnType: 'string|false', isStatic: true, minimumVersion: 84 },
  };
  const entries = (Object.entries(INTL_TIMEZONE_FUNCTION_METHODS) as [IntlTimeZoneFunction, string][])
    .filter(([name]) => (signatures[name].minimumVersion ?? 72) <= target
      && (name !== 'intltz_get_iana_id' || !options.unavailableFunctions?.includes(name)));
  const constants = Object.entries(INTL_TIMEZONE_CONSTANTS)
    .map(([name, value]) => `  public const ${target >= 84 ? 'int ' : ''}${name} = ${value};`);
  const doc = ({ returnType, doc: parameterDoc }: Signature): string =>
    `/** ${parameterDoc ? `${php80 ? parameterDoc : parameterDoc.replace('$isSystemId', '$isSystemID')} ` : ''}@return ${returnType} */`;
  const php7MethodParameters: Partial<Record<IntlTimeZoneFunction, string>> = {
    intltz_count_equivalent_ids: 'string $zoneId',
    intltz_create_time_zone: 'string $zoneId',
    intltz_create_time_zone_id_enumeration: 'int $zoneType, string $region = null, int $rawOffset = null',
    intltz_from_date_time_zone: 'DateTimeZone $zoneId',
    intltz_get_canonical_id: 'string $zoneId, &$isSystemID = null',
    intltz_get_display_name: 'bool $isDaylight = false, int $style = IntlTimeZone::DISPLAY_LONG, string $locale = null',
    intltz_get_equivalent_id: 'string $zoneId, int $index',
    intltz_get_offset: 'float $date, bool $local, &$rawOffset, &$dstOffset',
    intltz_get_region: 'string $zoneId',
    intltz_get_windows_id: 'string $timezone',
    intltz_get_id_for_windows_id: 'string $timezone, string $region = null',
    intltz_has_same_rules: 'IntlTimeZone $otherTimeZone',
  };
  const php7FunctionParameters: Partial<Record<IntlTimeZoneFunction, string>> = {
    ...php7MethodParameters,
    intltz_from_date_time_zone: 'DateTimeZone $dateTimeZone',
  };
  const parameters = (name: IntlTimeZoneFunction, method: boolean): string =>
    (php80 ? undefined : (method ? php7MethodParameters : php7FunctionParameters)[name])
      ?? signatures[name].parameters;
  const methods = entries.map(([name, method]) => {
    const signature = signatures[name];
    if (name === 'intltz_get_iana_id') {
      return `  public static function ${method}(${parameters(name, true)}): ${signature.returnType} {}`;
    }
    return `  ${doc(signature)} public ${signature.isStatic ? 'static ' : ''}function ${method}(${parameters(name, true)}) {}`;
  });
  const functions = entries.filter(([name]) => (signatures[name].proceduralMinimumVersion ?? 72) <= target)
    .map(([name]) => {
      const signature = signatures[name];
      const functionParameters = parameters(name, false);
      const args = signature.isStatic ? functionParameters
        : `IntlTimeZone $${php80 ? 'timezone' : 'timeZone'}${functionParameters ? `, ${functionParameters}` : ''}`;
      return `${!php80 || signature.doc ? `${doc(signature)} ` : ''}function ${name}(${args})${php80 ? `: ${signature.returnType}` : ''} {}`;
    });
  return `class IntlTimeZone {
${constants.join('\n')}
  private function __construct() {}
${methods.join('\n')}
}
${functions.join('\n')}
`;
}
