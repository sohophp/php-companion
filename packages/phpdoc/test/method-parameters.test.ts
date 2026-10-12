import { expect, it } from 'vitest';
import { parsePhpDoc, parsePhpDocType } from '../src/index.js';

it.each([
  "'a,b){}'", '"say\\"hello"', 'null', 'FALSE', '-12', '+3.14', '1_000', '0xFF', '0b1010', '0o77',
  'App\\Defaults::LABEL', '\\App\\Defaults::LABEL', 'GLOBAL_DEFAULT',
  "['x,y' => [null, false], 'other' => array(1, 2,)]", 'array(1, [2], App\\Defaults::LABEL,)',
])('preserves following magic method parameters after default %s', defaultValue => {
  const source = `/**\r\n * @method Row run(string $first = ${defaultValue}, Row $second = null, ...string $rest) description\r\n */`;
  const base = 37, result = parsePhpDoc(source, base), tag = result.tags[0]!;
  expect(result.errors).toEqual([]);
  expect(tag.invalid).toBeUndefined();
  expect(tag.description).toBe('description');
  expect(tag.parameters?.map(({ name, optional, variadic }) => ({ name, optional, variadic }))).toEqual([
    { name: 'first', optional: true, variadic: false },
    { name: 'second', optional: true, variadic: false },
    { name: 'rest', optional: false, variadic: true },
  ]);
  expect(tag.parameters?.[0]).toMatchObject({ defaultValue });
  expect(tag.parameters?.[1]).toMatchObject({ defaultValue: 'null' });
  expect(tag.parameters?.[1]?.type).toMatchObject({ start: base + source.indexOf('Row $second'), end: base + source.indexOf('Row $second') + 3 });
  expect(source.slice(tag.parameters![0]!.start - base, tag.parameters![0]!.end - base)).toBe(`string $first = ${defaultValue}`);
});

it.each([
  'array{owner: Row $input', 'list<Row $input', 'string $input =',
  "array $input = ['key' =>]", "array $input = ['x',)", 'string $input = null rubbish',
  'string $input = factory()', 'int $input = 0xG', 'float $input = 1._2', 'array $input = array',
])('marks malformed magic method parameter %s invalid without damaging the next tag', parameter => {
  const source = `/**\n * @method Row run(${parameter})\n * @property string $label\n */`;
  const result = parsePhpDoc(source, 17);
  expect(result.errors.length).toBeGreaterThan(0);
  expect(result.tags[0]).toMatchObject({ name: 'method', invalid: true });
  expect(result.tags[1]).toMatchObject({ name: 'property', variable: '$label' });
  expect(result.tags[1]?.invalid).toBeUndefined();
  expect(result.errors.every(error => error.start >= 17 + source.indexOf('@method') && error.end <= 17 + source.indexOf('@property'))).toBe(true);
});

it('keeps Callable optional markers separate from concrete magic method defaults', () => {
  const result = parsePhpDoc('/** @method void run(callable(int=, string $label=): Row $callback, string $label = "x", int $count = 2) */');
  expect(result.errors).toEqual([]);
  expect(result.tags[0]?.parameters?.map(parameter => parameter.name)).toEqual(['callback', 'label', 'count']);
  expect(result.tags[0]?.parameters?.[0]?.type).toMatchObject({ kind: 'callable', parameters: [{ optional: true }, { name: 'label', optional: true }] });
  const callable = parsePhpDocType('callable(int=, string $label=): Row');
  expect(callable.errors).toEqual([]);
  expect(callable.type).toMatchObject({ kind: 'callable', parameters: [{ optional: true }, { optional: true }] });
});
