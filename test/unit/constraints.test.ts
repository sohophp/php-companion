import { describe, expect, it } from 'vitest';
import { lowestSupportedVersion } from '../../src/php-version/constraints.js';

describe('Composer PHP constraints', () => {
  it.each([
    ['^7.2', '7.2'],
    ['>=7.4 <8.0', '7.4'],
    ['^7.2 || ^8.1', '7.2'],
    ['8.1.*', '8.1'],
    ['~8.2.0', '8.2'],
    ['>=8.3', '8.3'],
  ])('selects the lowest supported minor for %s', (constraint, expected) => {
    expect(lowestSupportedVersion(constraint)).toBe(expected);
  });

  it('returns undefined for invalid or unsupported constraints', () => {
    expect(lowestSupportedVersion('not-a-version')).toBeUndefined();
    expect(lowestSupportedVersion('<7.2')).toBeUndefined();
  });
});
