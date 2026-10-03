import { expect, it } from 'vitest';
import { builtinPhpStub, SUPPORTED_PHP_VERSIONS } from '../src/index.js';

it.each(SUPPORTED_PHP_VERSIONS)('accepts arbitrary array indices for array_combine at PHP %s', version => {
  const source = builtinPhpStub(version);
  const modern = Number(version.replace('.', '')) >= 80;
  expect(source).toContain('@param array<array-key, mixed> $keys\n * @param array<array-key, TValue> $values\n * @return array<array-key, TValue>'
    + (modern ? ' */ function array_combine' : '|false */ function array_combine'));
});
