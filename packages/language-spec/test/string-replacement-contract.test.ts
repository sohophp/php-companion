import { expect, it } from 'vitest';
import { builtinPhpStub, SUPPORTED_PHP_VERSIONS } from '../src/index.js';
it.each(SUPPORTED_PHP_VERSIONS)('keeps versioned replacement signatures and array output values at PHP %s', version => {
  const source = builtinPhpStub(version); const modern = Number(version.replace('.', '')) >= 80;
  const value = modern ? 'string' : 'mixed';
  for (const name of ['str_replace', 'str_ireplace']) {
    expect(source).toContain(`@return ($subject is array ? array<array-key, ${value}> : string) */ function ${name}(`);
    expect(source).toContain(`@return array<TKey, ${value}> */ function ${name}(`);
    expect(source).toContain(modern ? `function ${name}(array|string $search, array|string $replace, array|string $subject, ?int &$count = null): array|string {}` : `function ${name}($search, $replace, $subject, int &$replace_count = null) {}`);
  }
});
