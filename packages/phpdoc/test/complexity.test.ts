import { describe, expect, it } from 'vitest';
import { displayPhpDocType, parsePhpDoc, parsePhpDocType } from '../src/index.js';

const excessiveTypes = [
  ['parentheses', '('.repeat(4096) + 'Service' + ')'.repeat(4096)],
  ['generic', 'list<'.repeat(1024) + 'Service' + '>'.repeat(1024)],
  ['shape', 'array{owner:'.repeat(1024) + 'Service' + '}'.repeat(1024)],
  ['nullable', '?'.repeat(4096) + 'Service'],
  ['negated', '!'.repeat(4096) + 'Service'],
  ['conditional', 'T is int ? Service : '.repeat(2048) + 'Service'],
  ['callable return', 'callable():'.repeat(2048) + 'Service'],
  ['array suffix', 'Service' + '[]'.repeat(10000)],
  ['wide union', Array.from({ length: 10000 }, (_, index) => `Service${index}`).join('|')],
  ['wide shape', 'array{' + Array.from({ length: 10000 }, (_, index) => `key${index}: Service`).join(',') + '}'],
] as const;

describe('PHPDoc parsing complexity', () => {
  it.each(excessiveTypes)('rejects excessive %s without throwing or publishing a partial type', (_, source) => {
    const base = 37;
    const parsed = parsePhpDocType(source, base);
    expect(parsed.type).toBeUndefined();
    expect(parsed.errors.some(error => error.message.includes('parsing limit'))).toBe(true);
    expect(parsed.errors.every(error => error.start >= base && error.end <= base + source.length)).toBe(true);
    expect(parsed.consumed).toBeLessThanOrEqual(source.length);
  });

  it.each(['return', 'property', 'method', 'template'])('isolates an excessive @%s from the following valid tag', tag => {
    const type = 'list<'.repeat(1024) + 'Service' + '>'.repeat(1024);
    const body = tag === 'property' ? `${type} $owner` : tag === 'method' ? `Service find(${type} $owner)`
      : tag === 'template' ? `T of ${type}` : type;
    const source = `/** 😀\n * @${tag} ${body}\n * @return Service remaining contract\n */`;
    const parsed = parsePhpDoc(source, 37);
    expect(parsed.tags[0]?.invalid).toBe(true);
    expect(parsed.tags[1]).toMatchObject({ name: 'return', type: { kind: 'name', name: 'Service' }, description: 'remaining contract' });
    expect(parsed.tags[1]?.invalid).toBeUndefined();
    expect(parsed.errors.every(error => error.start >= 37 && error.end <= 37 + source.lastIndexOf('\n * @return'))).toBe(true);
  });

  it('retains ordinary nested types, printable ASTs and source ranges', () => {
    const source = 'array{owner: list<array{value: Service|null}>, factory: callable(bool $flag): ($flag is true ? Service : null)}';
    const parsed = parsePhpDocType(source, 19);
    expect(parsed.errors).toEqual([]);
    expect(parsed.consumed).toBe(source.length);
    expect(parsed.type).toMatchObject({ start: 19, end: 19 + source.length });
    expect(displayPhpDocType(parsed.type!)).toBe(source);
  });

  it.each([63, 64])('preserves the supported array nesting boundary at %s suffixes', suffixes => {
    const source = 'Service' + '[]'.repeat(suffixes);
    const parsed = parsePhpDocType(source);
    if (suffixes === 63) {
      expect(parsed.errors).toEqual([]);
      expect(displayPhpDocType(parsed.type!)).toBe(source);
    } else {
      expect(parsed.type).toBeUndefined();
      expect(parsed.errors.some(error => error.message.includes('parsing limit'))).toBe(true);
    }
  });

  it.each([4095, 4096])('preserves the supported union size boundary at %s members', members => {
    const source = Array.from({ length: members }, (_, index) => `Service${index}`).join('|');
    const parsed = parsePhpDocType(source);
    if (members === 4095) {
      expect(parsed.errors).toEqual([]);
      expect(displayPhpDocType(parsed.type!)).toBe(source);
    } else {
      expect(parsed.type).toBeUndefined();
      expect(parsed.errors.some(error => error.message.includes('parsing limit'))).toBe(true);
    }
  });

  it('does not inspect parentheses in a description after the parsed type', () => {
    const parsed = parsePhpDoc('/** @return Service explanation ' + '('.repeat(10000) + ' */');
    expect(parsed.errors).toEqual([]);
    expect(parsed.tags[0]?.type).toMatchObject({ kind: 'name', name: 'Service' });
  });
});
