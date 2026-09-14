import { describe, expect, it } from 'vitest';
import { displayPhpDocType, parsePhpDoc, parsePhpDocType } from '../src/index.js';

describe('PHPDoc parser', () => {
  it('preserves deprecated descriptions without treating them as types', () => {
    expect(parsePhpDoc('/** @deprecated 2.1 use replacement() */').tags).toMatchObject([
      { name: 'deprecated', description: '2.1 use replacement()' },
    ]);
  });
  it('parses nested union, intersection, generic and array types', () => {
    const result = parsePhpDocType('array<string, (App\\User&Countable)[]>|null');
    expect(result.errors).toEqual([]);
    expect(result.type && displayPhpDocType(result.type)).toBe('array<string, (App\\User&Countable)[]>|null');
  });

  it('parses signed integer generic bounds without treating them as names', () => {
    const result = parsePhpDocType('int<-10, max>');
    expect(result.errors).toEqual([]);
    expect(result.type).toMatchObject({ kind: 'generic', arguments: [{ kind: 'literal', value: -10, raw: '-10' }, { kind: 'name', name: 'max' }] });
    expect(result.type && displayPhpDocType(result.type)).toBe('int<-10, max>');
    const constant = parsePhpDocType('key-of<App\\Config::MAP>');
    expect(constant.errors).toEqual([]);
    expect(constant.type && displayPhpDocType(constant.type)).toBe('key-of<App\\Config::MAP>');
  });

  it('rejects malformed integer literal type prefixes', () => {
    for (const source of ['int<12abc, max>', 'int<1_, max>', 'int<01, max>']) {
      expect(parsePhpDocType(source).errors.length, source).toBeGreaterThan(0);
    }
  });

  it('parses typed tags and preserves absolute UTF-16 ranges', () => {
    const source = '/** 😀\n * @param list<App\\User> $users active users\n * @return array{id: int, name?: string}\n */';
    const result = parsePhpDoc(source, 20);
    expect(result.errors).toEqual([]);
    expect(result.tags.map(({ name, variable, description }) => ({ name, variable, description }))).toEqual([
      { name: 'param', variable: '$users', description: 'active users' },
      { name: 'return', variable: undefined, description: '' },
    ]);
    expect(result.tags[0]?.type && source.slice(result.tags[0].type.start - 20, result.tags[0].type.end - 20)).toBe('list<App\\User>');
  });

  it('reports an incomplete generic without inventing a type', () => {
    const result = parsePhpDoc('/** @return list< */');
    expect(result.tags[0]?.type && displayPhpDocType(result.tags[0].type)).toBe('list<>');
    expect(result.errors.map((error) => error.message)).toContain('Expected a generic type argument.');
    expect(result.errors.map((error) => error.message)).toContain('Expected >.');
  });
  it('parses callable parameter and return signatures including incomplete input', () => {
    const result = parsePhpDocType('callable(int, string=, ...bool): App\\Result|null');
    expect(result.errors).toEqual([]);
    expect(result.type).toMatchObject({ kind: 'callable', parameters: [
      { optional: false, variadic: false, type: { kind: 'name', name: 'int' } },
      { optional: true, variadic: false, type: { kind: 'name', name: 'string' } },
      { optional: false, variadic: true, type: { kind: 'name', name: 'bool' } },
    ], returnType: { kind: 'union' } });
    expect(result.type && displayPhpDocType(result.type)).toBe('callable(int, string=, ...bool): App\\Result|null');
    expect(parsePhpDocType('callable(string, ):').errors.map((error) => error.message)).toEqual(expect.arrayContaining(['Expected a callable parameter type.', 'Expected a callable return type.']));
    const closure = parsePhpDocType('Closure(App\\User): App\\View');
    expect(closure.errors).toEqual([]);
    expect(closure.type && displayPhpDocType(closure.type)).toBe('Closure(App\\User): App\\View');
    const conditional = parsePhpDocType('callable(bool $flag): ($flag is true ? App\\Ready : App\\Other)');
    expect(conditional.errors).toEqual([]);
    expect(conditional.type).toMatchObject({ kind: 'callable', returnType: { kind: 'conditional' } });
    expect(conditional.type && displayPhpDocType(conditional.type))
      .toBe('callable(bool $flag): ($flag is true ? App\\Ready : App\\Other)');
  });
  it('parses parameter and template conditional return types without flattening their branches', () => {
    const parameter = parsePhpDocType('($asObject is true ? App\\ObjectResult : App\\ArrayResult)');
    expect(parameter.errors).toEqual([]);
    expect(parameter.type).toMatchObject({ kind: 'conditional', negated: false,
      subject: { kind: 'name', name: '$asObject' }, target: { kind: 'name', name: 'true' } });
    expect(parameter.type && displayPhpDocType(parameter.type)).toBe('($asObject is true ? App\\ObjectResult : App\\ArrayResult)');
    const template = parsePhpDocType('(T is not App\\Entity ? App\\Fallback : list<T>)');
    expect(template.errors).toEqual([]);
    expect(template.type && displayPhpDocType(template.type)).toBe('(T is not App\\Entity ? App\\Fallback : list<T>)');
    expect(parsePhpDocType('($flag is true App\\Ready : App\\Other)').errors.map((error) => error.message))
      .toContain('Expected ? in a conditional type.');
  });
  it('preserves callable parameter names and both variadic spellings', () => {
    const result = parsePhpDocType('callable(int $first, string ...$rest): App\\Result');
    expect(result.errors).toEqual([]);
    expect(result.type).toMatchObject({ kind: 'callable', parameters: [
      { name: 'first', optional: false, variadic: false },
      { name: 'rest', optional: false, variadic: true },
    ] });
    expect(result.type && displayPhpDocType(result.type)).toBe('callable(int $first, ...string $rest): App\\Result');
    const prefixed = parsePhpDocType('callable(...bool $flags): App\\Result');
    expect(prefixed.errors).toEqual([]);
    expect(prefixed.type).toMatchObject({ kind: 'callable', parameters: [{ name: 'flags', variadic: true }] });
  });
  it('associates variadic and by-reference PHPDoc tags with their declared variable', () => {
    const result = parsePhpDoc(`/**
      * @param string ...$labels variadic labels
      * @param array &$state mutable state
      */`);
    expect(result.errors).toEqual([]);
    expect(result.tags.map(({ variable, description }) => ({ variable, description }))).toEqual([
      { variable: '$labels', description: 'variadic labels' },
      { variable: '$state', description: 'mutable state' },
    ]);
  });
  it('parses documented magic properties and method signatures', () => {
    const result = parsePhpDoc(`/**
      * @property App\\User $owner resolved owner
      * @property-read App\\User $createdBy immutable owner
      * @property-write App\\Input $payload accepted input
      * @method App\\Result find(int $id, string $label = 'default') lookup
      * @method static App\\Result create(...string $labels)
      * @method T resolve<T of App\\User, U = App\\Input>(class-string<T> $type, U $fallback)
      */`);
    expect(result.errors).toEqual([]);
    expect(result.tags).toMatchObject([
      { name: 'property', variable: '$owner', type: { kind: 'name', name: 'App\\User' }, description: 'resolved owner' },
      { name: 'property-read', variable: '$createdBy', type: { kind: 'name', name: 'App\\User' }, description: 'immutable owner' },
      { name: 'property-write', variable: '$payload', type: { kind: 'name', name: 'App\\Input' }, description: 'accepted input' },
      { name: 'method', variable: 'find', static: false, parameters: [
        { type: { kind: 'name', name: 'int' }, name: 'id', optional: false, variadic: false },
        { type: { kind: 'name', name: 'string' }, name: 'label', optional: true, variadic: false },
      ], description: 'lookup' },
      { name: 'method', variable: 'create', static: true, parameters: [
        { type: { kind: 'name', name: 'string' }, name: 'labels', variadic: true },
      ] },
      { name: 'method', variable: 'resolve', templates: [
        { name: 'T', bound: { kind: 'name', name: 'App\\User' } },
        { name: 'U', defaultType: { kind: 'name', name: 'App\\Input' } },
      ], parameters: [
        { type: { kind: 'generic', base: { kind: 'name', name: 'class-string' }, arguments: [{ kind: 'name', name: 'T' }] }, name: 'type' },
        { type: { kind: 'name', name: 'U' }, name: 'fallback' },
      ] },
    ]);
  });
  it('normalizes PHPStan, Psalm, variance and template inheritance tags', () => {
    const result = parsePhpDoc(`/**
      * @phpstan-template TKey of array-key
      * @template-covariant TValue
      * @template-extends IteratorAggregate<TKey, TValue>
      * @psalm-return TValue
      */`);
    expect(result.errors).toEqual([]);
    expect(result.tags.map((tag) => ({ name: tag.name, dialect: tag.dialect, variable: tag.variable, variance: tag.variance, type: tag.type && displayPhpDocType(tag.type) }))).toEqual([
      { name: 'template', dialect: 'phpstan', variable: 'TKey', variance: 'invariant', type: 'array-key' },
      { name: 'template', dialect: 'phpdoc', variable: 'TValue', variance: 'covariant', type: undefined },
      { name: 'extends', dialect: 'phpdoc', variable: undefined, variance: undefined, type: 'IteratorAggregate<TKey, TValue>' },
      { name: 'return', dialect: 'psalm', variable: undefined, variance: undefined, type: 'TValue' },
    ]);
  });
  it('parses unconditional and conditional PHPStan and Psalm assertion tags distinctly', () => {
    const result = parsePhpDoc(`/**
      * @phpstan-assert App\\Ready $value proven value
      * @psalm-assert App\\Other $other
      * @phpstan-assert-if-true App\\Ready $conditional
      * @psalm-assert-if-false App\\Other $negative
      * @phpstan-assert-if-true !null $present
      * @psalm-assert-if-false !App\\Rejected $accepted
      * @phpstan-assert-if-true !false $found
      * @psalm-assert-if-true !(App\\Rejected|App\\Other) $single
      * @phpstan-assert App\\Ready $holder->value proven property
      */`);
    expect(result.errors).toEqual([]);
    expect(result.tags.map((tag) => ({ name: tag.name, dialect: tag.dialect, variable: tag.variable, propertyPath: tag.propertyPath,
      type: tag.type && displayPhpDocType(tag.type), description: tag.description }))).toEqual([
      { name: 'assert', dialect: 'phpstan', variable: '$value', propertyPath: undefined, type: 'App\\Ready', description: 'proven value' },
      { name: 'assert', dialect: 'psalm', variable: '$other', propertyPath: undefined, type: 'App\\Other', description: '' },
      { name: 'assert-if-true', dialect: 'phpstan', variable: '$conditional', propertyPath: undefined, type: 'App\\Ready', description: '' },
      { name: 'assert-if-false', dialect: 'psalm', variable: '$negative', propertyPath: undefined, type: 'App\\Other', description: '' },
      { name: 'assert-if-true', dialect: 'phpstan', variable: '$present', propertyPath: undefined, type: '!null', description: '' },
      { name: 'assert-if-false', dialect: 'psalm', variable: '$accepted', propertyPath: undefined, type: '!App\\Rejected', description: '' },
      { name: 'assert-if-true', dialect: 'phpstan', variable: '$found', propertyPath: undefined, type: '!false', description: '' },
      { name: 'assert-if-true', dialect: 'psalm', variable: '$single', propertyPath: undefined, type: '!(App\\Rejected|App\\Other)', description: '' },
      { name: 'assert', dialect: 'phpstan', variable: '$holder', propertyPath: ['value'], type: 'App\\Ready', description: 'proven property' },
    ]);
  });
});
