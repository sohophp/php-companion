export type PrimitiveName = 'bool' | 'int' | 'float' | 'string' | 'array' | 'object' | 'callable' | 'iterable' | 'resource' | 'null' | 'void' | 'never' | 'mixed';
export type PhpType =
  | { kind: 'primitive'; name: PrimitiveName }
  | { kind: 'named'; name: string }
  | { kind: 'literal'; value: string | number | boolean }
  | { kind: 'integer-range'; min: number | null; max: number | null }
  | { kind: 'class-string'; of?: PhpType }
  | { kind: 'list'; valueType: PhpType; nonEmpty: boolean }
  | { kind: 'array'; keyType: PhpType; valueType: PhpType; nonEmpty: boolean }
  | { kind: 'shape'; fields: ShapeField[]; sealed: boolean }
  | { kind: 'generic'; base: PhpType; arguments: PhpType[] }
  | { kind: 'callable'; parameters: CallableParameter[]; returnType: PhpType }
  | { kind: 'union'; types: PhpType[] }
  | { kind: 'intersection'; types: PhpType[] }
  | { kind: 'unknown'; reason?: string };
export interface ShapeField { key: string | number; optional: boolean; type: PhpType; }
export interface CallableParameter { type: PhpType; optional?: boolean; variadic?: boolean; byReference?: boolean; }
export type Compatibility = 'yes' | 'no' | 'unknown';
export type GenericVariance = 'covariant' | 'contravariant' | 'invariant';
export interface TypeRelationContext {
  isSubclassOf?: (candidate: string, target: string) => boolean | undefined;
  isNamedSubtypeOfPrimitive?: (candidate: string, target: PrimitiveName) => boolean | undefined;
  genericVariance?: (baseName: string) => readonly GenericVariance[] | undefined;
  genericSupertype?: (sourceBaseName: string, sourceArguments: readonly PhpType[], targetBaseName: string) => PhpType | undefined;
  /** Maximum recursive relation comparisons before the result becomes unknown. */
  maxComparisons?: number;
}

const DEFAULT_MAX_COMPARISONS = 256;
const activeCompatibilityBudgets = new WeakMap<TypeRelationContext, { remaining: number }>();

export const primitive = (name: PrimitiveName): PhpType => ({ kind: 'primitive', name });
export const named = (name: string): PhpType => ({ kind: 'named', name: name.replace(/^\\+/, '') });
export const literal = (value: string | number | boolean): PhpType => ({ kind: 'literal', value });
export const integerRange = (min: number | null, max: number | null): PhpType => ({ kind: 'integer-range', min, max });
export const classString = (of?: PhpType): PhpType => ({ kind: 'class-string', of });
export const listType = (valueType: PhpType, nonEmpty = false): PhpType => ({ kind: 'list', valueType, nonEmpty });
export const unknown = (reason?: string): PhpType => ({ kind: 'unknown', reason });
export const arrayType = (valueType: PhpType, keyType: PhpType = union(primitive('int'), primitive('string')), nonEmpty = false): PhpType => ({ kind: 'array', keyType, valueType, nonEmpty });
export const shape = (fields: ShapeField[], sealed = true): PhpType => ({ kind: 'shape', fields, sealed });
export const generic = (base: PhpType, ...arguments_: PhpType[]): PhpType => ({ kind: 'generic', base, arguments: arguments_ });
export const callableType = (parameters: CallableParameter[], returnType: PhpType): PhpType => ({ kind: 'callable', parameters, returnType });

function key(type: PhpType): string {
  switch (type.kind) {
    case 'primitive': return type.name;
    case 'named': return `named:${type.name.toLowerCase()}`;
    case 'literal': return `${typeof type.value}:${String(type.value)}`;
    case 'integer-range': return `integer-range:${type.min ?? 'min'}:${type.max ?? 'max'}`;
    case 'class-string': return `class-string:${type.of ? key(type.of) : '*'}`;
    case 'list': return `list:${key(type.valueType)}:${type.nonEmpty}`;
    case 'unknown': return `unknown:${type.reason ?? ''}`;
    case 'array': return `array:${key(type.keyType)}:${key(type.valueType)}:${type.nonEmpty}`;
    case 'shape': return `shape:${type.sealed}:${type.fields.map((field) => `${String(field.key)}:${field.optional}:${key(field.type)}`).join(',')}`;
    case 'generic': return `generic:${key(type.base)}<${type.arguments.map(key).join(',')}>`;
    case 'callable': return `callable:(${type.parameters.map((parameter) => `${key(parameter.type)}:${Boolean(parameter.optional)}:${Boolean(parameter.variadic)}:${Boolean(parameter.byReference)}`).join(',')}):${key(type.returnType)}`;
    case 'union': return `union:${type.types.map(key).join('|')}`;
    case 'intersection': return `intersection:${type.types.map(key).join('&')}`;
  }
}

function relationKey(type: PhpType, budget: { remaining: number }): string | undefined {
  if (budget.remaining-- <= 0) return undefined;
  const child = (value: PhpType): string | undefined => relationKey(value, budget);
  const children = (values: readonly PhpType[]): string[] | undefined => {
    const resolved = values.map(child); return resolved.every((value): value is string => value !== undefined) ? resolved : undefined;
  };
  switch (type.kind) {
    case 'primitive': return type.name;
    case 'named': return `named:${type.name.toLowerCase()}`;
    case 'literal': return `${typeof type.value}:${String(type.value)}`;
    case 'integer-range': return `integer-range:${type.min ?? 'min'}:${type.max ?? 'max'}`;
    case 'unknown': return undefined;
    case 'class-string': {
      const of = type.of ? child(type.of) : '*'; return of === undefined ? undefined : `class-string:${of}`;
    }
    case 'list': {
      const value = child(type.valueType); return value === undefined ? undefined : `list:${value}:${type.nonEmpty}`;
    }
    case 'array': {
      const values = children([type.keyType, type.valueType]); return values ? `array:${values[0]}:${values[1]}:${type.nonEmpty}` : undefined;
    }
    case 'shape': {
      const values = children(type.fields.map((field) => field.type));
      return values ? `shape:${type.sealed}:${type.fields.map((field, index) => `${String(field.key)}:${field.optional}:${values[index]}`).join(',')}` : undefined;
    }
    case 'generic': {
      const values = children([type.base, ...type.arguments]); return values ? `generic:${values[0]}<${values.slice(1).join(',')}>` : undefined;
    }
    case 'callable': {
      const values = children([...type.parameters.map((parameter) => parameter.type), type.returnType]);
      return values ? `callable:(${type.parameters.map((parameter, index) => `${values[index]}:${Boolean(parameter.optional)}:${Boolean(parameter.variadic)}:${Boolean(parameter.byReference)}`).join(',')}):${values.at(-1)}` : undefined;
    }
    case 'union': case 'intersection': {
      const values = children(type.types); return values ? `${type.kind}:${values.join(type.kind === 'union' ? '|' : '&')}` : undefined;
    }
  }
}

export function union(...input: PhpType[]): PhpType {
  const flat = input.flatMap((type) => type.kind === 'union' ? type.types : [type]);
  if (flat.some((type) => type.kind === 'primitive' && type.name === 'mixed')) return primitive('mixed');
  const unique = [...new Map(flat.filter((type) => !(type.kind === 'primitive' && type.name === 'never')).map((type) => [key(type), type])).values()];
  if (unique.length === 0) return primitive('never');
  return unique.length === 1 ? unique[0]! : { kind: 'union', types: unique.sort((left, right) => key(left).localeCompare(key(right))) };
}
export function nullable(type: PhpType): PhpType { return union(type, primitive('null')); }
export function intersection(...input: PhpType[]): PhpType {
  const flat = input.flatMap((type) => type.kind === 'intersection' ? type.types : [type]);
  const unique = [...new Map(flat.map((type) => [key(type), type])).values()];
  return unique.length === 1 ? unique[0]! : { kind: 'intersection', types: unique.sort((left, right) => key(left).localeCompare(key(right))) };
}
function all(results: Compatibility[]): Compatibility { return results.includes('no') ? 'no' : results.includes('unknown') ? 'unknown' : 'yes'; }
function any(results: Compatibility[]): Compatibility { return results.includes('yes') ? 'yes' : results.includes('unknown') ? 'unknown' : 'no'; }

export function compatibility(source: PhpType, target: PhpType, context: TypeRelationContext = {}): Compatibility {
  const active = activeCompatibilityBudgets.get(context);
  const budget = active ?? { remaining: Math.max(1, context.maxComparisons ?? DEFAULT_MAX_COMPARISONS) };
  if (!active) activeCompatibilityBudgets.set(context, budget);
  try {
    if (budget.remaining-- <= 0) return 'unknown';
    return compatibilityUnchecked(source, target, context);
  } finally {
    if (!active) activeCompatibilityBudgets.delete(context);
  }
}

function compatibilityUnchecked(source: PhpType, target: PhpType, context: TypeRelationContext): Compatibility {
  if (source.kind === 'primitive' && source.name === 'never') return 'yes';
  if (target.kind === 'primitive' && target.name === 'mixed') return 'yes';
  if (source.kind === 'unknown' || target.kind === 'unknown') return 'unknown';
  const sourceKey = relationKey(source, { remaining: context.maxComparisons ?? DEFAULT_MAX_COMPARISONS });
  const targetKey = relationKey(target, { remaining: context.maxComparisons ?? DEFAULT_MAX_COMPARISONS });
  if (sourceKey === undefined || targetKey === undefined) return 'unknown';
  if (sourceKey === targetKey) return 'yes';
  if (source.kind === 'union') return all(source.types.map((item) => compatibility(item, target, context)));
  if (target.kind === 'union') return any(target.types.map((item) => compatibility(source, item, context)));
  if (target.kind === 'intersection') return all(target.types.map((item) => compatibility(source, item, context)));
  if (source.kind === 'intersection') return any(source.types.map((item) => compatibility(item, target, context)));
  if (source.kind === 'class-string' && target.kind === 'class-string') {
    if (!target.of) return 'yes';
    return source.of ? compatibility(source.of, target.of, context) : 'unknown';
  }
  if (source.kind === 'class-string' && target.kind === 'primitive' && target.name === 'string') return 'yes';
  if (source.kind === 'primitive' && source.name === 'string' && target.kind === 'class-string') return 'unknown';
  if (source.kind === 'list' && target.kind === 'list') {
    if (target.nonEmpty && !source.nonEmpty) return 'no';
    return compatibility(source.valueType, target.valueType, context);
  }
  if (source.kind === 'list' && target.kind === 'array') {
    if (target.nonEmpty && !source.nonEmpty) return 'no';
    return all([compatibility(primitive('int'), target.keyType, context), compatibility(source.valueType, target.valueType, context)]);
  }
  if (source.kind === 'array' && target.kind === 'list') return 'unknown';
  if (source.kind === 'shape' && target.kind === 'list' && source.sealed && source.fields.length === 0) return target.nonEmpty ? 'no' : 'yes';
  if (source.kind === 'array' && target.kind === 'array') {
    if (target.nonEmpty && !source.nonEmpty) return 'no';
    return all([compatibility(source.keyType, target.keyType, context), compatibility(source.valueType, target.valueType, context)]);
  }
  if ((source.kind === 'array' || source.kind === 'shape' || source.kind === 'list') && target.kind === 'primitive' && target.name === 'array') return 'yes';
  if (source.kind === 'primitive' && source.name === 'array' && (target.kind === 'array' || target.kind === 'shape' || target.kind === 'list')) return 'unknown';
  if (source.kind === 'shape' && target.kind === 'shape') {
    const results: Compatibility[] = [];
    for (const expected of target.fields) {
      const actual = source.fields.find((field) => field.key === expected.key);
      if (!actual) { results.push(expected.optional ? 'yes' : source.sealed ? 'no' : 'unknown'); continue; }
      if (!expected.optional && actual.optional) { results.push('no'); continue; }
      results.push(compatibility(actual.type, expected.type, context));
    }
    return all(results);
  }
  if (source.kind === 'shape' && target.kind === 'array') {
    if (target.nonEmpty && !source.fields.some((field) => !field.optional)) return source.sealed ? 'no' : 'unknown';
    const results = source.fields.flatMap((field) => [compatibility(literal(field.key), target.keyType, context), compatibility(field.type, target.valueType, context)]);
    return source.sealed ? all(results) : all([...results, 'unknown']);
  }
  if ((source.kind === 'array' || source.kind === 'shape' || source.kind === 'list') && target.kind === 'primitive' && target.name === 'iterable') return 'yes';
  if (source.kind === 'generic' && target.kind === 'generic') {
    const base = compatibility(source.base, target.base, context);
    if (base === 'no') return 'no';
    if (base !== 'yes') return 'unknown';
    const baseName = source.base.kind === 'named' || source.base.kind === 'primitive' ? source.base.name : displayType(source.base);
    const targetBaseName = target.base.kind === 'named' || target.base.kind === 'primitive' ? target.base.name : displayType(target.base);
    if (key(source.base) !== key(target.base)) {
      const specialized = context.genericSupertype?.(baseName, source.arguments, targetBaseName);
      return specialized ? compatibility(specialized, target, context) : 'unknown';
    }
    if (source.arguments.length !== target.arguments.length) return 'unknown';
    const variance = context.genericVariance?.(targetBaseName);
    if (!variance || variance.length !== source.arguments.length) {
      return source.arguments.every((item, index) => {
        const left = relationKey(item, { remaining: context.maxComparisons ?? DEFAULT_MAX_COMPARISONS });
        const right = relationKey(target.arguments[index]!, { remaining: context.maxComparisons ?? DEFAULT_MAX_COMPARISONS });
        return left !== undefined && left === right;
      }) ? 'yes' : 'unknown';
    }
    return all(source.arguments.map((argument, index): Compatibility => {
      const targetArgument = target.arguments[index]!;
      if (variance[index] === 'covariant') return compatibility(argument, targetArgument, context);
      if (variance[index] === 'contravariant') return compatibility(targetArgument, argument, context);
      const forward = compatibility(argument, targetArgument, context);
      const reverse = compatibility(targetArgument, argument, context);
      return forward === 'yes' && reverse === 'yes' ? 'yes' : forward === 'no' || reverse === 'no' ? 'no' : 'unknown';
    }));
  }
  if (source.kind === 'generic' && (target.kind === 'named' || target.kind === 'primitive')) return compatibility(source.base, target, context);
  if ((source.kind === 'named' || source.kind === 'primitive') && target.kind === 'generic') return compatibility(source, target.base, context) === 'no' ? 'no' : 'unknown';
  if (source.kind === 'callable' && target.kind === 'callable') {
    const sourceRequired = source.parameters.filter((parameter) => !parameter.optional && !parameter.variadic).length;
    const targetRequired = target.parameters.filter((parameter) => !parameter.optional && !parameter.variadic).length;
    if (sourceRequired > targetRequired) return 'no';
    if (source.parameters.slice(target.parameters.length).some((parameter) => !parameter.optional && !parameter.variadic)) return 'no';
    const parameters = source.parameters.slice(0, Math.min(source.parameters.length, target.parameters.length)).map((parameter, index): Compatibility => {
      const expected = target.parameters[index]!;
      if (Boolean(parameter.byReference) !== Boolean(expected.byReference) || Boolean(parameter.variadic) !== Boolean(expected.variadic)) return 'no';
      if (!expected.optional && parameter.optional) return compatibility(expected.type, parameter.type, context);
      if (expected.optional && !parameter.optional) return 'no';
      return compatibility(expected.type, parameter.type, context);
    });
    return all([...parameters, compatibility(source.returnType, target.returnType, context)]);
  }
  if (source.kind === 'callable' && target.kind === 'primitive' && target.name === 'callable') return 'yes';
  if (source.kind === 'primitive' && source.name === 'callable' && target.kind === 'callable') return 'unknown';
  if (target.kind === 'integer-range') {
    if (source.kind === 'literal' && typeof source.value === 'number' && Number.isInteger(source.value)) {
      return (target.min === null || source.value >= target.min) && (target.max === null || source.value <= target.max) ? 'yes' : 'no';
    }
    if (source.kind === 'integer-range') {
      const minimumFits = target.min === null || (source.min !== null && source.min >= target.min);
      const maximumFits = target.max === null || (source.max !== null && source.max <= target.max);
      return minimumFits && maximumFits ? 'yes' : 'no';
    }
    if (source.kind === 'primitive' && source.name === 'int') return target.min === null && target.max === null ? 'yes' : 'unknown';
    return 'no';
  }
  if (source.kind === 'integer-range') return target.kind === 'primitive' && target.name === 'int' ? 'yes' : 'no';
  if (target.kind === 'literal' && source.kind === 'primitive') {
    const literalPrimitive = typeof target.value === 'boolean' ? 'bool'
      : typeof target.value === 'number' ? (Number.isInteger(target.value) ? 'int' : 'float')
        : 'string';
    return source.name === literalPrimitive ? 'unknown' : 'no';
  }
  if (source.kind === 'literal') {
    if (target.kind === 'literal') return source.value === target.value ? 'yes' : 'no';
    if (target.kind === 'primitive') {
      const name = typeof source.value === 'boolean' ? 'bool'
        : typeof source.value === 'number' ? (Number.isInteger(source.value) ? 'int' : 'float')
          : 'string';
      return name === target.name ? 'yes' : 'no';
    }
    return 'no';
  }
  if (source.kind === 'primitive' && target.kind === 'primitive') {
    if (source.name === 'int' && target.name === 'float') return 'yes';
    if (source.name === 'array' && target.name === 'iterable') return 'yes';
    return source.name === target.name ? 'yes' : 'no';
  }
  if (source.kind === 'named' && target.kind === 'named') {
    if (source.name.toLowerCase() === target.name.toLowerCase()) return 'yes';
    const result = context.isSubclassOf?.(source.name, target.name);
    return result === undefined ? 'unknown' : result ? 'yes' : 'no';
  }
  if (source.kind === 'named' && target.kind === 'primitive') {
    if (target.name === 'object') return 'yes';
    if (target.name === 'iterable' || target.name === 'callable') {
      const result = context.isNamedSubtypeOfPrimitive?.(source.name, target.name);
      return result === undefined ? 'unknown' : result ? 'yes' : 'no';
    }
  }
  return 'no';
}

export function displayType(type: PhpType): string {
  switch (type.kind) {
    case 'primitive': case 'named': return type.name;
    case 'literal': return typeof type.value === 'string' ? `'${type.value.replaceAll("'", "\\'")}'` : String(type.value);
    case 'integer-range': return `int<${type.min ?? 'min'}, ${type.max ?? 'max'}>`;
    case 'class-string': return type.of ? `class-string<${displayType(type.of)}>` : 'class-string';
    case 'list': return `${type.nonEmpty ? 'non-empty-list' : 'list'}<${displayType(type.valueType)}>`;
    case 'unknown': return 'unknown';
    case 'array': return `${type.nonEmpty ? 'non-empty-array' : 'array'}<${displayType(type.keyType)}, ${displayType(type.valueType)}>`;
    case 'shape': return `array{${type.fields.map((field) => `${String(field.key)}${field.optional ? '?' : ''}: ${displayType(field.type)}`).join(', ')}${type.sealed ? '' : ', ...'}}`;
    case 'generic': return `${displayType(type.base)}<${type.arguments.map(displayType).join(', ')}>`;
    case 'callable': return `callable(${type.parameters.map((parameter) => `${parameter.byReference ? '&' : ''}${parameter.variadic ? '...' : ''}${displayType(parameter.type)}${parameter.optional ? '=' : ''}`).join(', ')}): ${displayType(type.returnType)}`;
    case 'union': return type.types.map((item) => item.kind === 'intersection' ? `(${displayType(item)})` : displayType(item)).join('|');
    case 'intersection': return type.types.map(displayType).join('&');
  }
}
