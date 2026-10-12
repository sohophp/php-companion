import { describe, expect, it } from 'vitest';
import { displayPhpDocType, parsePhpDoc } from '../src/index.js';

describe('multiline PHPDoc tags', () => {
  it.each(['\n', '\r\n', '\r'])('preserves nested shapes, variables and absolute ranges with %j', newline => {
    const source = ['/** 😀', ' * @param array{', ' *   owner: App\\User,', ' *   labels?: list<string>', ' * } $input input description', ' * @return App\\User result description', ' */'].join(newline);
    const base = 37, parsed = parsePhpDoc(source, base);
    expect(parsed.errors).toEqual([]);
    expect(parsed.tags.map(({ name, variable, description }) => ({ name, variable, description }))).toEqual([
      { name: 'param', variable: '$input', description: 'input description' },
      { name: 'return', variable: undefined, description: 'result description' },
    ]);
    const type = parsed.tags[0]!.type!;
    expect(displayPhpDocType(type)).toBe('array{owner: App\\User, labels?: list<string>}');
    expect(source.slice(type.start - base, type.end - base)).toBe(source.slice(source.indexOf('array{'), source.indexOf('} $input') + 1));
    expect(type.kind).toBe('shape');
    if (type.kind !== 'shape') throw new Error('Expected shape');
    expect(source.slice(type.fields[0]!.type.start - base, type.fields[0]!.type.end - base)).toBe('App\\User');
    expect(source.slice(parsed.tags[0]!.start - base, parsed.tags[0]!.end - base)).toBe(source.slice(source.indexOf('@param'), source.indexOf('input description') + 'input description'.length));
  });

  it('parses multiline Callable and conditional return types without consuming the parameter description', () => {
    const source = `/**
 * @param callable(
 *   bool $flag,
 *   list<App\\User> $users
 * ): (
 *   $flag is true ? App\\User : null
 * ) $factory documented factory
 * @return int
 */`;
    const parsed = parsePhpDoc(source);
    expect(parsed.errors).toEqual([]);
    expect(parsed.tags[0]).toMatchObject({ name: 'param', variable: '$factory', description: 'documented factory',
      type: { kind: 'callable', parameters: [{ name: 'flag' }, { name: 'users' }], returnType: { kind: 'conditional' } } });
    expect(displayPhpDocType(parsed.tags[0]!.type!)).toBe('callable(bool $flag, list<App\\User> $users): ($flag is true ? App\\User : null)');
    expect(parsed.tags[1]?.type).toMatchObject({ kind: 'name', name: 'int' });
  });

  it('keeps multiline template bounds and class relations separate from descriptions', () => {
    const parsed = parsePhpDoc(`/**
 * @template T of array<
 *   string,
 *   list<App\\User>
 * > constrained input
 * @extends Collection<
 *   T
 * > parent relation
 */`);
    expect(parsed.errors).toEqual([]);
    expect(parsed.tags.map(({ name, variable, description, type }) => ({ name, variable, description, type: type && displayPhpDocType(type) }))).toEqual([
      { name: 'template', variable: 'T', description: 'constrained input', type: 'array<string, list<App\\User>>' },
      { name: 'extends', variable: undefined, description: 'parent relation', type: 'Collection<T>' },
    ]);
  });

  it('preserves absolute parameter ranges for multiline magic method signatures', () => {
    const source = `/** 😀
 * @method array{
 *   owner: App\\User
 * } resolve(
 *   App\\User $user,
 *   list<string> $labels
 * ) resolve owner
 */`;
    const base = 91, parsed = parsePhpDoc(source, base);
    expect(parsed.errors).toEqual([]);
    const tag = parsed.tags[0]!;
    expect(tag).toMatchObject({ name: 'method', variable: 'resolve', description: 'resolve owner', parameters: [{ name: 'user' }, { name: 'labels' }] });
    expect(displayPhpDocType(tag.type!)).toBe('array{owner: App\\User}');
    for (const parameter of tag.parameters!) {
      expect(source.slice(parameter.type.start - base, parameter.type.end - base)).toBe(parameter.name === 'user' ? 'App\\User' : 'list<string>');
    }
  });

  it.each(['return', 'param-out-extra'])('stops an incomplete type before the following @%s tag', next => {
    const source = `/**
 * @param array{
 *   owner: App\\User,
 * @${next} int remaining tag
 */`;
    const parsed = parsePhpDoc(source, 15);
    expect(parsed.errors.length).toBeGreaterThan(0);
    expect(parsed.tags[0]?.invalid).toBe(true);
    expect(parsed.tags[0]?.variable).toBeUndefined();
    expect(parsed.tags[0]?.type).toMatchObject({ kind: 'shape', fields: [{ type: { kind: 'name', name: 'App\\User' } }] });
    expect(parsed.errors.every(error => error.start <= 15 + source.indexOf(`@${next}`))).toBe(true);
    expect(parsed.tags.slice(1).map(tag => tag.name)).toEqual(next === 'return' ? ['return'] : []);
    if (next === 'return') {
      expect(parsed.tags[1]?.type).toMatchObject({ name: 'int' });
      expect(parsed.tags[1]?.invalid).toBeUndefined();
    }
  });

  it('does not treat tag text inside quoted shape fields as a separate tag', () => {
    const parsed = parsePhpDoc(`/**
 * @return array{
 *   '@param bogus': '@return quoted',
 *   name: string
 * }
 */`);
    expect(parsed.errors).toEqual([]);
    expect(parsed.tags).toHaveLength(1);
    expect(displayPhpDocType(parsed.tags[0]!.type!)).toBe("array{'@param bogus': '@return quoted', name: string}");
  });

  it('does not interpret prose brackets as a continuation of a completed type', () => {
    const parsed = parsePhpDoc(`/**
 * @return int an explanation containing array< and (punctuation
 * @param string $label valid label
 */`);
    expect(parsed.errors).toEqual([]);
    expect(parsed.tags[0]).toMatchObject({ type: { kind: 'name', name: 'int' }, description: 'an explanation containing array< and (punctuation' });
    expect(parsed.tags[1]).toMatchObject({ variable: '$label', description: 'valid label' });
  });

  it('allows line breaks around union and intersection operators', () => {
    const parsed = parsePhpDoc(`/**
 * @return (App\\Readable
 *   & App\\Writable)
 *   | null
 */`);
    expect(parsed.errors).toEqual([]);
    expect(displayPhpDocType(parsed.tags[0]!.type!)).toBe('App\\Readable&App\\Writable|null');
  });

  it('keeps single-line magic method parameter types at their original absolute locations', () => {
    const source = '/** 😀 @method string find(int $count, string $label) lookup */', base = 19;
    const parsed = parsePhpDoc(source, base);
    expect(parsed.errors).toEqual([]);
    const parameters = parsed.tags[0]!.parameters!;
    expect(parameters.map(parameter => source.slice(parameter.type.start - base, parameter.type.end - base)))
      .toEqual(['int', 'string']);
  });
});
