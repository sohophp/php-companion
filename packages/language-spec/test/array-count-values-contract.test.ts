import { expect, it } from 'vitest';
import { builtinPhpStub, SUPPORTED_PHP_VERSIONS } from '../src/index.js';
it.each(SUPPORTED_PHP_VERSIONS)('documents array_count_values integer counts at PHP %s', version => {
  const source = builtinPhpStub(version); const php80 = Number(version.replace('.', '')) >= 80;
  const declaration = `function array_count_values(array $${php80 ? 'array' : 'arg'})${php80 ? ': array' : ''} {}`;
  expect(source).toContain(`/** @return array<array-key, int> */\n${declaration}`);
  expect(source).toContain(`/** @param array<array-key, int> $${php80 ? 'array' : 'arg'}\n * @return array<int, int> */\n${declaration}`);
});
