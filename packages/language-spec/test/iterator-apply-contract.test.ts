import { expect, it } from 'vitest';
import { builtinPhpStub, SUPPORTED_PHP_VERSIONS } from '../src/index.js';
it.each(SUPPORTED_PHP_VERSIONS)('preserves iterator_apply versioned signatures and args array contract at PHP %s', version => {
  const source = builtinPhpStub(version); const modern = Number(version.replace('.', '')) >= 80;
  const start = source.indexOf('function iterator_apply(');
  const declaration = source.slice(source.lastIndexOf('/**', start), source.indexOf('}', start) + 1);
  expect(declaration).toContain('@param array<array-key, mixed>|null $args');
  expect(declaration).toContain(modern ? 'function iterator_apply(Traversable $iterator, callable $callback, ?array $args = null): int {}' : 'function iterator_apply(Traversable $iterator, $function, ?array $args = null) {}');
});
