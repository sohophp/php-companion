import { expect, it } from 'vitest';
import { builtinPhpStub, SUPPORTED_PHP_VERSIONS } from '../src/index.js';

it.each(SUPPORTED_PHP_VERSIONS)('keeps array_fill_keys versioned value names and arbitrary input arrays at PHP %s', version => {
  const source = builtinPhpStub(version); const modern = Number(version.replace('.', '')) >= 80;
  expect(source).toContain('@param array<array-key, mixed> $keys\n * @param TValue $' + (modern ? 'value' : 'val')
    + '\n * @return array<array-key, TValue> */ function array_fill_keys(array $keys, ' + (modern ? 'mixed $value' : '$val') + '): array {}');
});
