import { describe, expect, it } from 'vitest';
import { arrayType, callableType, classString, compatibility, displayType, generic, integerRange, intersection, listType, literal, named, nullable, primitive, shape, union, unknown, type GenericVariance, type PhpType } from '../src/index.js';
describe('PHP type algebra', () => {
  it('normalizes unions without losing nullability', () => {
    expect(displayType(nullable(named('App\\User')))).toBe('App\\User|null');
    expect(displayType(union(primitive('never'), primitive('string'), primitive('string')))).toBe('string');
    expect(displayType(union(primitive('mixed'), primitive('string')))).toBe('mixed');
  });
  it('keeps unknown relations distinct from incompatibility', () => {
    expect(compatibility(unknown('dynamic'), primitive('string'))).toBe('unknown');
    expect(compatibility(named('Child'), named('Parent'))).toBe('unknown');
    expect(compatibility(primitive('int'), primitive('string'))).toBe('no');
  });
  it('keeps mixed, unknown, never, void, and null boundaries distinct', () => {
    expect(compatibility(primitive('never'), primitive('string'))).toBe('yes');
    expect(compatibility(primitive('never'), primitive('void'))).toBe('yes');
    expect(compatibility(primitive('string'), primitive('mixed'))).toBe('yes');
    expect(compatibility(unknown('unresolved expression'), primitive('mixed'))).toBe('yes');
    expect(compatibility(primitive('mixed'), primitive('string'))).toBe('no');
    expect(compatibility(primitive('void'), primitive('void'))).toBe('yes');
    expect(compatibility(primitive('void'), primitive('null'))).toBe('no');
    expect(compatibility(primitive('null'), nullable(named('User')))).toBe('yes');
    expect(compatibility(unknown('unresolved expression'), primitive('null'))).toBe('unknown');
  });
  it('checks literals, unions and class relations conservatively', () => {
    expect(compatibility(literal(1), primitive('int'))).toBe('yes');
    expect(compatibility(primitive('string'), literal('draft'))).toBe('unknown');
    expect(compatibility(primitive('int'), literal('draft'))).toBe('no');
    expect(compatibility(nullable(named('Child')), nullable(named('Parent')), { isSubclassOf: () => true })).toBe('yes');
    expect(compatibility(union(primitive('int'), unknown()), primitive('int'))).toBe('unknown');
  });
  it('models keyed arrays and sealed or open shapes', () => {
    const values = arrayType(primitive('string'));
    expect(displayType(values)).toBe('array<int|string, string>');
    expect(compatibility(arrayType(primitive('string'), primitive('int'), true), arrayType(primitive('string'), primitive('int')))).toBe('yes');
    expect(compatibility(arrayType(primitive('string'), primitive('int')), arrayType(primitive('string'), primitive('int'), true))).toBe('no');
    const record = shape([{ key: 'id', optional: false, type: primitive('int') }, { key: 'label', optional: true, type: primitive('string') }]);
    expect(displayType(record)).toBe('array{id: int, label?: string}');
    expect(compatibility(record, shape([{ key: 'id', optional: false, type: primitive('int') }]))).toBe('yes');
    expect(compatibility(shape([], false), shape([{ key: 'id', optional: false, type: primitive('int') }]))).toBe('unknown');
    expect(compatibility(record, primitive('array'))).toBe('yes');
    expect(compatibility(primitive('array'), record)).toBe('unknown');
    expect(compatibility(record, primitive('iterable'))).toBe('yes');
    expect(compatibility(values, primitive('iterable'))).toBe('yes');
    const requiredStrings = arrayType(primitive('int'), primitive('string'), true);
    expect(compatibility(shape([]), requiredStrings)).toBe('no');
    expect(compatibility(shape([{ key: 'id', optional: true, type: primitive('int') }]), requiredStrings)).toBe('no');
    expect(compatibility(shape([{ key: 'id', optional: false, type: primitive('int') }]), requiredStrings)).toBe('yes');
    expect(compatibility(shape([], false), requiredStrings)).toBe('unknown');
  });
  it('models PHP native widening from int to float', () => {
    expect(compatibility(primitive('int'), primitive('float'))).toBe('yes');
    expect(compatibility(primitive('float'), primitive('int'))).toBe('no');
  });
  it('models bounded and open integer ranges', () => {
    const zeroToTen = integerRange(0, 10);
    expect(displayType(zeroToTen)).toBe('int<0, 10>');
    expect(compatibility(literal(0), zeroToTen)).toBe('yes');
    expect(compatibility(literal(11), zeroToTen)).toBe('no');
    expect(compatibility(integerRange(2, 8), zeroToTen)).toBe('yes');
    expect(compatibility(integerRange(-1, 8), zeroToTen)).toBe('no');
    expect(compatibility(integerRange(null, -1), primitive('int'))).toBe('yes');
    expect(compatibility(primitive('int'), zeroToTen)).toBe('unknown');
  });
  it('models sequential lists and non-empty constraints', () => {
    expect(displayType(listType(primitive('string')))).toBe('list<string>');
    expect(displayType(listType(named('User'), true))).toBe('non-empty-list<User>');
    expect(compatibility(listType(primitive('string'), true), listType(primitive('string')))).toBe('yes');
    expect(compatibility(listType(primitive('string')), listType(primitive('string'), true))).toBe('no');
    expect(compatibility(listType(primitive('string')), arrayType(primitive('string'), primitive('int')))).toBe('yes');
    expect(compatibility(arrayType(primitive('string'), primitive('int')), listType(primitive('string')))).toBe('unknown');
    expect(compatibility(listType(primitive('int')), primitive('array'))).toBe('yes');
    expect(compatibility(listType(primitive('int')), primitive('iterable'))).toBe('yes');
    expect(compatibility(shape([]), listType(primitive('int')))).toBe('yes');
    expect(compatibility(shape([]), listType(primitive('int'), true))).toBe('no');
  });
  it('keeps generic arguments invariant until variance is declared', () => {
    const child = generic(named('Collection'), named('Child'));
    expect(compatibility(child, generic(named('Collection'), named('Child')))).toBe('yes');
    expect(compatibility(child, generic(named('Collection'), named('Parent')), { isSubclassOf: () => true })).toBe('unknown');
    expect(compatibility(child, named('Collection'))).toBe('yes');
    expect(displayType(child)).toBe('Collection<Child>');
  });
  it('applies explicitly declared generic covariance, contravariance, and invariance', () => {
    const hierarchy = (candidate: string, target: string): boolean => candidate === 'Child' && target === 'Parent';
    const context = {
      isSubclassOf: hierarchy,
      genericVariance: (base: string): readonly GenericVariance[] | undefined => ({ Producer: ['covariant'], Consumer: ['contravariant'], Box: ['invariant'] } as const)[base as 'Producer' | 'Consumer' | 'Box'],
    };
    const childProducer = generic(named('Producer'), named('Child'));
    const parentProducer = generic(named('Producer'), named('Parent'));
    expect(compatibility(childProducer, parentProducer, context)).toBe('yes');
    expect(compatibility(parentProducer, childProducer, context)).toBe('no');
    expect(compatibility(generic(named('Consumer'), named('Parent')), generic(named('Consumer'), named('Child')), context)).toBe('yes');
    expect(compatibility(generic(named('Consumer'), named('Child')), generic(named('Consumer'), named('Parent')), context)).toBe('no');
    expect(compatibility(generic(named('Box'), named('Child')), generic(named('Box'), named('Parent')), context)).toBe('no');
    expect(compatibility(generic(named('Box'), named('Child')), generic(named('Box'), named('Child')), context)).toBe('yes');
  });
  it('requires explicit generic supertype substitution when generic bases differ', () => {
    const relation = (candidate: string, target: string): boolean => candidate === 'Reversed' && target === 'Pair'
      || candidate === 'Child' && target === 'Parent';
    const target = generic(named('Pair'), named('Parent'), named('Child'));
    const source = generic(named('Reversed'), named('Child'), named('Child'));
    expect(compatibility(source, target, { isSubclassOf: relation, genericVariance: () => ['covariant', 'covariant'] })).toBe('unknown');
    const context = {
      isSubclassOf: relation,
      genericVariance: (base: string): readonly GenericVariance[] | undefined => base === 'Pair' ? ['covariant', 'covariant'] : undefined,
      genericSupertype: (base: string, arguments_: readonly PhpType[], targetBase: string): PhpType | undefined => base === 'Reversed' && targetBase === 'Pair'
        ? generic(named('Pair'), arguments_[1]!, arguments_[0]!) : undefined,
    };
    expect(compatibility(source, target, context)).toBe('yes');
    expect(compatibility(generic(named('Reversed'), named('Parent'), named('Child')), target, context)).toBe('no');
  });
  it('specializes a generic supertype before comparing different template arities', () => {
    const target = generic(named('Pair'), named('Child'), named('Parent'));
    const context = {
      isSubclassOf: (candidate: string, expected: string): boolean => candidate === 'Recursive' && expected === 'Pair',
      genericVariance: (base: string): readonly GenericVariance[] | undefined => base === 'Pair' ? ['covariant', 'covariant'] : undefined,
      genericSupertype: (base: string, arguments_: readonly PhpType[], targetBase: string): PhpType | undefined => base === 'Recursive' && targetBase === 'Pair'
        ? generic(named('Pair'), named('Child'), arguments_[0]!) : undefined,
    };
    expect(compatibility(generic(named('Recursive'), named('Parent')), target, context)).toBe('yes');
    expect(compatibility(generic(named('Recursive'), named('Other')), target, context)).toBe('no');
  });
  it('checks callable parameters contravariantly and returns covariantly', () => {
    const source = callableType([{ type: named('Parent') }], named('Child'));
    const target = callableType([{ type: named('Child') }], named('Parent'));
    const context = { isSubclassOf: (candidate: string, expected: string): boolean => candidate === 'Child' && expected === 'Parent' };
    expect(compatibility(source, target, context)).toBe('yes');
    expect(compatibility(target, source, context)).toBe('no');
    expect(compatibility(callableType([{ type: named('Parent') }], named('Child')),
      callableType([{ type: named('Child') }, { type: primitive('string') }], named('Parent')), context)).toBe('yes');
    expect(compatibility(callableType([{ type: named('Parent') }, { type: primitive('string') }], named('Child')),
      callableType([{ type: named('Child') }], named('Parent')), context)).toBe('no');
    expect(compatibility(callableType([{ type: named('Parent') }, { type: primitive('string'), optional: true }], named('Child')),
      callableType([{ type: named('Child') }], named('Parent')), context)).toBe('yes');
    expect(compatibility(source, primitive('callable'))).toBe('yes');
    expect(displayType(source)).toBe('callable(Parent): Child');
  });
  it('models class-string constraints covariantly without treating arbitrary strings as class names', () => {
    const relation = { isSubclassOf: (candidate: string, target: string): boolean => candidate === 'Child' && target === 'Parent' };
    expect(displayType(classString(named('Child')))).toBe('class-string<Child>');
    expect(compatibility(classString(named('Child')), classString(named('Parent')), relation)).toBe('yes');
    expect(compatibility(classString(named('Parent')), classString(named('Child')), relation)).toBe('no');
    expect(compatibility(classString(named('Child')), classString(), relation)).toBe('yes');
    expect(compatibility(classString(), classString(named('Parent')), relation)).toBe('unknown');
    expect(compatibility(classString(named('Child')), primitive('string'), relation)).toBe('yes');
    expect(compatibility(primitive('string'), classString(named('Parent')), relation)).toBe('unknown');
  });
  it('normalizes intersections and treats them as subtypes of each component', () => {
    const both = intersection(named('Countable'), named('Iterator'));
    expect(displayType(both)).toBe('Countable&Iterator');
    expect(compatibility(both, named('Countable'))).toBe('yes');
  });
  it('preserves DNF parentheses and compares complete intersection branches', () => {
    const relation = { isSubclassOf: (candidate: string, target: string): boolean => candidate === target };
    const countableIterator = intersection(named('Countable'), named('Iterator'));
    const stronger = intersection(named('Countable'), named('Iterator'), named('Traversable'));
    const dnf = union(countableIterator, named('Stringable'));
    expect(displayType(dnf)).toBe('(Countable&Iterator)|Stringable');
    expect(compatibility(stronger, countableIterator, relation)).toBe('yes');
    expect(compatibility(named('Countable'), dnf, relation)).toBe('no');
    expect(compatibility(countableIterator, dnf, relation)).toBe('yes');
  });
  it('returns unknown when recursive relation work exceeds its explicit budget', () => {
    let source: PhpType = primitive('string'); let target: PhpType = primitive('string');
    for (let depth = 0; depth < 40; depth += 1) {
      source = generic(named('Box'), source); target = generic(named('Box'), target);
    }
    expect(compatibility(source, target, { maxComparisons: 16 })).toBe('unknown');
    expect(compatibility(source, target, { maxComparisons: 256 })).toBe('yes');
  });
  it('delegates named iterable and callable relations without guessing', () => {
    expect(compatibility(named('Collection'), primitive('iterable'))).toBe('unknown');
    expect(compatibility(named('Handler'), primitive('callable'))).toBe('unknown');
    const context = { isNamedSubtypeOfPrimitive: (candidate: string, target: string): boolean =>
      candidate === 'Collection' && target === 'iterable' || candidate === 'Handler' && target === 'callable' };
    expect(compatibility(named('Collection'), primitive('iterable'), context)).toBe('yes');
    expect(compatibility(named('Handler'), primitive('callable'), context)).toBe('yes');
    expect(compatibility(named('Plain'), primitive('iterable'), context)).toBe('no');
  });
});
