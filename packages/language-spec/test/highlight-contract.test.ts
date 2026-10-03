import { expect, it } from 'vitest';
import { builtinPhpStub, SUPPORTED_PHP_VERSIONS } from '../src/index.js';

it.each(SUPPORTED_PHP_VERSIONS)('keeps capture-dependent highlighting types and versioned signatures at %s', version => {
  const source = builtinPhpStub(version); const target = Number(version.replace('.', ''));
  for (const name of ['highlight_file', 'show_source', 'highlight_string']) {
    const expected = name === 'highlight_string' && target >= 84
      ? '($return is true ? string : true)' : '($return is true ? string|false : bool)';
    expect(source).toContain(`/** @return ${expected} */ function ${name}(`);
  }
  if (target >= 80) {
    expect(source).toContain('function highlight_file(string $filename, bool $return = false): string|bool {}');
    expect(source).toContain(`function highlight_string(string $string, bool $return = false): string|${target >= 84 ? 'true' : 'bool'} {}`);
  } else {
    expect(source).toContain('function highlight_file($file_name, $return = false) {}');
  }
});
