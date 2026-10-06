import { primitive, union, type PhpType, type PrimitiveName, type Compatibility } from '@php-companion/type-system';

export interface ScalarInputFact { type: PhpType; numericKind?: 'float'; }

export interface NativeScalarInput { accepted: Compatibility; type?: PhpType; }

function scalarName(type: PhpType): PrimitiveName | undefined {
  if (type.kind === 'primitive' && ['int', 'float', 'bool', 'string', 'null'].includes(type.name)) return type.name;
  if (type.kind === 'literal') return typeof type.value === 'string' ? 'string'
    : typeof type.value === 'boolean' ? 'bool' : Number.isInteger(type.value) ? 'int' : 'float';
  if (type.kind === 'class-string') return 'string';
  if (type.kind === 'integer-range') return 'int';
  return undefined;
}

function numericString(value: string, version: string | undefined): { number: number; integer: boolean; fitsInt: boolean } | undefined {
  const numeric = '[+-]?(?:[0-9]+(?:\\.[0-9]*)?|\\.[0-9]+)(?:[eE][+-]?[0-9]+)?';
  const whitespace = '[ \\t\\n\\r\\v\\f]';
  const full = new RegExp(`^${whitespace}*(${numeric})${whitespace}*$`).exec(value);
  const legacy = version !== undefined && Number(version.split('.')[0]) < 8
    ? new RegExp(`^${whitespace}*(${numeric})`).exec(value) : undefined;
  const text = (full ?? legacy)?.[1];
  if (text === undefined) return undefined;
  const number = Number(text);
  const integer = /^[+-]?[0-9]+$/.test(text);
  const fitsInt = integer ? ((): boolean => {
    const exact = BigInt(text); return exact >= -(1n << 63n) && exact < (1n << 63n);
  })() : Number.isFinite(number) && number >= -(2 ** 63) && number < 2 ** 63;
  return { number, integer: integer && fitsInt, fitsInt };
}

// This models conversion at a native parameter boundary, not a general subtype
// relation. A projected type is guaranteed only for calls that return normally.
export function nativeScalarInput(actual: PhpType, native: PhpType, strict: boolean, version: string | undefined, numericKind?: 'float'): NativeScalarInput | undefined {
  const targets = native.kind === 'union' ? native.types : [native];
  const names = targets.flatMap(type => type.kind === 'primitive'
    && ['int', 'float', 'bool', 'string', 'null'].includes(type.name) ? [type.name] : []);
  if (!names.length) return undefined;
  if (actual.kind === 'union') {
    const projected = actual.types.map(type => nativeScalarInput(type, native, strict, version));
    if (projected.some(item => !item)) return undefined;
    const all = projected as NativeScalarInput[];
    const types = all.flatMap(item => item.type ? [item.type] : []);
    return { accepted: all.every(item => item.accepted === 'yes') ? 'yes'
      : all.some(item => item.accepted === 'no') ? 'no' : 'unknown', ...(types.length ? { type: union(...types) } : {}) };
  }
  const source = numericKind === 'float' ? 'float' : scalarName(actual);
  if (!source) return undefined;
  if (names.includes(source)) return { accepted: 'yes', type: numericKind === 'float' ? primitive('float') : actual };
  if (source === 'null') return { accepted: 'no' };
  // Integer-to-float is permitted even for a strict caller.
  if (source === 'int' && names.includes('float') && (strict || !names.includes('int'))) {
    return { accepted: 'yes', type: primitive('float') };
  }
  if (strict) return { accepted: 'no' };
  // Without a target minor, a legacy numeric prefix cannot be rejected as if
  // PHP 8 had been selected. Keep both runtime possibilities conservative.
  if (version === undefined && actual.kind === 'literal' && typeof actual.value === 'string'
    && !numericString(actual.value, '8.5') && numericString(actual.value, '7.4')) {
    const legacy = nativeScalarInput(actual, native, false, '7.4');
    const modern = nativeScalarInput(actual, native, false, '8.5');
    if (!legacy || !modern) return undefined;
    const types = [legacy.type, modern.type].filter((type): type is PhpType => Boolean(type));
    return { accepted: legacy.accepted === modern.accepted ? legacy.accepted : 'unknown',
      ...(types.length ? { type: union(...types) } : {}) };
  }
  let numeric: ReturnType<typeof numericString>;
  if (source === 'string' && actual.kind === 'literal' && typeof actual.value === 'string') numeric = numericString(actual.value, version);
  const unknownString = source === 'string' && actual.kind === 'primitive';
  const intPossible = source === 'bool' || source === 'float' && (actual.kind !== 'literal'
    || typeof actual.value === 'number' && Number.isFinite(actual.value) && actual.value >= -(2 ** 63) && actual.value < 2 ** 63)
    || source === 'string' && Boolean(numeric?.fitsInt);
  const floatPossible = source === 'bool' || source === 'int' || source === 'float' || source === 'string' && Boolean(numeric);
  // Numeric strings select float when both numeric targets exist and the input
  // has decimal/exponent syntax or exceeds the native integer range.
  if (source === 'string' && names.includes('int') && names.includes('float') && numeric && !numeric.integer) {
    return { accepted: 'yes', type: primitive('float') };
  }
  if (names.includes('int') && intPossible) {
    if (actual.kind === 'primitive' && source === 'float') {
      const fallback = names.includes('string') ? primitive('string') : names.includes('bool') ? primitive('bool') : undefined;
      return { accepted: fallback ? 'yes' : 'unknown', type: fallback ? union(primitive('int'), fallback) : primitive('int') };
    }
    return { accepted: 'yes', type: primitive('int') };
  }
  if (names.includes('float') && floatPossible) return { accepted: 'yes', type: primitive('float') };
  if (unknownString) {
    const possible = names.filter(name => ['int', 'float', 'bool'].includes(name));
    if (possible.length) return { accepted: 'unknown', type: union(...possible.map(primitive)) };
  }
  if (names.includes('string')) return { accepted: 'yes', type: primitive('string') };
  if (names.includes('bool')) return { accepted: 'yes', type: primitive('bool') };
  return { accepted: 'no' };
}
