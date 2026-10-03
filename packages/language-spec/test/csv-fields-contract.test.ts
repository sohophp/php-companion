import { expect, it } from 'vitest';
import { builtinPhpStub, SUPPORTED_PHP_VERSIONS } from '../src/index.js';

it.each(SUPPORTED_PHP_VERSIONS)('retains versioned CSV signatures with arbitrary field array keys at PHP %s', version => {
  const source = builtinPhpStub(version); const modern = Number(version.replace('.', '')) >= 80;
  for (const declaration of ['function fputcsv(', 'public function fputcsv(']) {
    const start = declaration.startsWith('public') ? source.indexOf(declaration) : source.indexOf('*/ function fputcsv(') + 3;
    expect(start).toBeGreaterThan(0);
    const signature = source.slice(source.lastIndexOf('/**', start), source.indexOf('}', start) + 1);
    expect(signature).toContain('@param array<array-key, mixed> $fields');
    expect(signature).toContain(modern ? '$separator' : '$delimiter');
    expect(signature.includes('$eol')).toBe(Number(version.replace('.', '')) >= 81);
    expect(signature).toContain(declaration.includes('public') && !modern ? 'fputcsv($fields' : 'array $fields');
  }
});
