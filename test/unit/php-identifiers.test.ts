import { describe, expect, it } from 'vitest';
import { validPhpNamespaceSegment, validPhpTypeName } from '../../src/generation/phpIdentifiers.js';

describe('PHP type generation identifiers', () => {
  it('rejects reserved type names while keeping contextual names and Unicode', () => {
    for (const version of ['7.2', '7.4', '8.0', '8.1', '8.5']) {
      for (const name of ['class', 'CLASS', 'self', 'string', 'return', '__CLASS__', '0Bad', 'Bad.Name']) {
        expect(validPhpTypeName(name, version), `${name} on ${version}`).toBe(false);
      }
      for (const name of ['Widget', '测试类', 'enum', 'resource']) {
        expect(validPhpTypeName(name, version), `${name} on ${version}`).toBe(true);
      }
    }
  });

  it('tracks names reserved by later PHP versions', () => {
    expect(validPhpTypeName('fn', '7.2')).toBe(true);
    expect(validPhpTypeName('fn', '7.4')).toBe(false);
    for (const name of ['match', 'mixed']) {
      expect(validPhpTypeName(name, '7.4')).toBe(true);
      expect(validPhpTypeName(name, '8.0')).toBe(false);
    }
    for (const name of ['readonly', 'never']) {
      expect(validPhpTypeName(name, '8.0')).toBe(true);
      expect(validPhpTypeName(name, '8.1')).toBe(false);
    }
    expect(validPhpTypeName('__PROPERTY__', '8.2')).toBe(true);
    expect(validPhpTypeName('__PROPERTY__', '8.4')).toBe(false);
  });

  it('checks PHP 7 namespace segments without rejecting PHP 8 qualified keywords', () => {
    expect(validPhpNamespaceSegment('class', '7.4')).toBe(false);
    expect(validPhpNamespaceSegment('fn', '7.2')).toBe(true);
    expect(validPhpNamespaceSegment('fn', '7.4')).toBe(false);
    expect(validPhpNamespaceSegment('class', '8.0')).toBe(true);
    expect(validPhpNamespaceSegment('match', '8.5')).toBe(true);
    expect(validPhpNamespaceSegment('Bad.Name', '8.5')).toBe(false);
  });
});
