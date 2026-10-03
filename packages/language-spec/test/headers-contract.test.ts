import { expect, it } from 'vitest';
import { builtinPhpStub, SUPPORTED_PHP_VERSIONS } from '../src/index.js';

it.each(SUPPORTED_PHP_VERSIONS)('keeps versioned get_headers arguments and failure-aware value types at %s', version => {
  const source = builtinPhpStub(version);
  const modern = Number(version.replace('.', '')) >= 80;
  expect(source).toContain(`@return ($${modern ? 'associative is false' : 'format is 0'} ? list<string>|false : array<array-key, string|list<string>>|false)`);
  expect(source).toContain(modern
    ? 'function get_headers(string $url, bool $associative = false, $context = null): array|false {}'
    : 'function get_headers(string $url, int $format = 0, $context = null) {}');
});
