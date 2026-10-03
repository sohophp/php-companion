import { expect, it } from 'vitest';
import { builtinPhpStub, SUPPORTED_PHP_VERSIONS } from '../src/index.js';
it.each(SUPPORTED_PHP_VERSIONS)('documents array_flip converted keys and original key values at PHP %s', version => {
  const source = builtinPhpStub(version);
  const parameter = Number(version.replace('.', '')) >= 80 ? 'array' : 'arg';
  expect(source).toContain(`/** @return array<array-key, array-key> */ function array_flip(array $${parameter}): array {}`);
  expect(source).toContain(`/** @template TInputKey of array-key
 * @param array<TInputKey, mixed> $${parameter}
 * @return ($${parameter} is array<array-key, int> ? array<int, TInputKey> : array<array-key, TInputKey>) */ function array_flip(array $${parameter}): array {}`);
});
