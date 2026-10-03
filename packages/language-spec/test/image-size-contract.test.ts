import { expect, it } from 'vitest';
import { builtinPhpStub, SUPPORTED_PHP_VERSIONS } from '../src/index.js';

it.each(SUPPORTED_PHP_VERSIONS)('keeps image-size shapes independent of GD and gates PHP 8.5 fields at %s', version => {
  const source = builtinPhpStub(version, { disabledExtensions: ['gd'] });
  for (const name of ['getimagesize', 'getimagesizefromstring']) {
    const doc = new RegExp('/\\*\\* @return ([^\\n]+) \\*/ function ' + name + '\\(').exec(source)?.[1];
    expect(doc).toContain('bits?:int'); expect(doc).toContain('channels?:int'); expect(doc).toContain('mime:string');
    expect(doc).toContain('|false'); expect(doc?.includes('width_unit:string')).toBe(version === '8.5');
    expect(doc).toContain(version === '8.5' ? '3?:string' : '3:string');
  }
});
