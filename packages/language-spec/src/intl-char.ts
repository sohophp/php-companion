import {
  INTL_CHAR_ADDED_84_CONSTANTS, INTL_CHAR_CONSTANTS, INTL_CHAR_DYNAMIC_CONSTANTS, INTL_CHAR_SNAPSHOTS,
} from './intl-char-catalog.js';
import type { SupportedPhpVersion } from './index.js';

export type IntlCharDynamicConstant = typeof INTL_CHAR_DYNAMIC_CONSTANTS[number];
export type IntlCharRuntimeConstants = Partial<Record<IntlCharDynamicConstant, string | number>>;
type MethodSignature = readonly [parameters: string, returnType: string | null, tentativeReturnType: string | null];
type Snapshot = Record<string, MethodSignature>;

const dynamicNames = new Set<string>(INTL_CHAR_DYNAMIC_CONSTANTS);
const added84Names = new Set<string>(INTL_CHAR_ADDED_84_CONSTANTS);

export function normalizeIntlCharRuntimeConstants(value: unknown): IntlCharRuntimeConstants | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  const entries = Object.entries(value);
  if (entries.length > INTL_CHAR_DYNAMIC_CONSTANTS.length) return undefined;
  const result: IntlCharRuntimeConstants = {};
  for (const [name, item] of entries) {
    if (!dynamicNames.has(name)) return undefined;
    if (name === 'UNICODE_VERSION') {
      if (typeof item !== 'string' || !/^\d{1,3}(?:\.\d{1,3}){1,3}$/.test(item)) return undefined;
    } else if (typeof item !== 'number' || !Number.isSafeInteger(item) || item < 0 || item > 1_000_000) return undefined;
    result[name as IntlCharDynamicConstant] = item;
  }
  return Object.fromEntries(Object.entries(result).sort(([left], [right]) => left.localeCompare(right))) as IntlCharRuntimeConstants;
}

export function auditedIntlCharStub(version: SupportedPhpVersion, runtimeConstants?: IntlCharRuntimeConstants): string {
  const target = Number(version.replace('.', ''));
  const snapshotVersion = target < 80 ? '72' : target < 82 ? '81' : target < 84 ? '82' : target === 84 ? '84' : '85';
  const snapshot = INTL_CHAR_SNAPSHOTS[snapshotVersion as keyof typeof INTL_CHAR_SNAPSHOTS] as Snapshot;
  const fallback = INTL_CHAR_SNAPSHOTS['81'] as Snapshot;
  const constants = Object.entries(INTL_CHAR_CONSTANTS).flatMap(([name, pinnedValue]) => {
    if (target < 84 && added84Names.has(name)) return [];
    const value = dynamicNames.has(name) ? runtimeConstants?.[name as IntlCharDynamicConstant] : pinnedValue;
    if (value === undefined) return [];
    const type = name === 'NO_NUMERIC_VALUE' ? 'float' : typeof value === 'string' ? 'string' : 'int';
    const literal = type === 'float' ? `${value}.0` : JSON.stringify(value);
    return [`  public const ${target >= 84 ? `${type} ` : ''}${name} = ${literal};`];
  }).join('\n');
  const php7Defaults: Record<string, string> = {
    charName: '$codepoint, $nameChoice = IntlChar::UNICODE_CHAR_NAME',
    charFromName: '$characterName, $nameChoice = IntlChar::UNICODE_CHAR_NAME',
    enumCharNames: '$start, $limit, $callback, $nameChoice = IntlChar::UNICODE_CHAR_NAME',
    getPropertyName: '$property, $nameChoice = IntlChar::LONG_PROPERTY_NAME',
    getPropertyValueName: '$property, $value, $nameChoice = IntlChar::LONG_PROPERTY_NAME',
    foldCase: '$codepoint, $options = IntlChar::FOLD_CASE_DEFAULT',
    digit: '$codepoint, $radix = 10',
    forDigit: '$digit, $radix = 10',
  };
  const methods = Object.entries(snapshot).map(([name, [parameters, nativeReturn, tentativeReturn]]) => {
    const renderedParameters = target < 80 ? php7Defaults[name] ?? parameters : parameters.replace(/\bNULL\b/g, 'null');
    const returnType = name === 'enumCharNames' && target === 83 ? 'bool'
      : nativeReturn ?? tentativeReturn ?? fallback[name]?.[1] ?? fallback[name]?.[2];
    return `  ${returnType ? `/** @return ${returnType} */ ` : ''}public static function ${name}(${renderedParameters})${nativeReturn ? `: ${nativeReturn}` : ''} {}`;
  }).join('\n');
  return `class IntlChar {
${constants}
${methods}
}
`;
}
