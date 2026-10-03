import { expect, it } from 'vitest';
import { builtinPhpStub, SUPPORTED_PHP_VERSIONS } from '../src/index.js';

it.each(SUPPORTED_PHP_VERSIONS)('separates generic tags for adjacent array builtins at PHP %s', version => {
  const source = builtinPhpStub(version);
  for (const name of ['array_reverse', 'array_unique', 'array_slice', 'array_chunk', 'array_fill', 'array_fill_keys',
    'array_rand', 'array_intersect', 'array_diff', 'array_intersect_key', 'array_diff_key']) {
    const start = source.indexOf(`function ${name}(`); expect(start).toBeGreaterThan(0);
    const doc = source.slice(source.lastIndexOf('/**', start), start);
    expect(doc, name).toContain('@template'); expect(doc, name).toContain('@return');
    expect(doc.split('\n').every(line => (line.match(/@(template|param|return)\b/g)?.length ?? 0) <= 1), name).toBe(true);
  }
});
