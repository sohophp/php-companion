import { describe, expect, it } from 'vitest';
import { mayNeedPhpImportResolution, potentialPhpTypeNames } from '../../src/paste/pasteText.js';

describe('PHP import paste text preflight', () => {
  it('skips version numbers and ordinary scalar values', () => {
    expect(mayNeedPhpImportResolution('20260814113000')).toBe(false);
    expect(mayNeedPhpImportResolution("'20260814113000'")).toBe(false);
    expect(mayNeedPhpImportResolution('true 42 null')).toBe(false);
  });

  it('keeps class-like PHP names eligible for import resolution', () => {
    expect(mayNeedPhpImportResolution('new ProductSearchSettings()')).toBe(true);
    expect([...potentialPhpTypeNames('Runner|Service $value')]).toEqual(['Runner', 'Service']);
  });
});
