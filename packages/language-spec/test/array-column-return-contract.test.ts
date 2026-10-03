import { expect, it } from 'vitest';
import { builtinPhpStub, SUPPORTED_PHP_VERSIONS } from '../src/index.js';
it.each(SUPPORTED_PHP_VERSIONS)('documents indexed and list array_column returns at PHP %s', version => {
  const source = builtinPhpStub(version); const start = source.indexOf('function array_column(');
  const declaration = source.slice(source.lastIndexOf('/**', start), source.indexOf('}', start) + 1);
  expect(declaration).toContain('@return ($index_key is null ? list<mixed> : array<array-key, mixed>)');
  expect(declaration).toContain(Number(version.replace('.', '')) >= 80 ? 'array_column(array $array, int|string|null $column_key, int|string|null $index_key = null): array {}' : 'array_column(array $arg, $column_key, $index_key = null): array {}');
});
