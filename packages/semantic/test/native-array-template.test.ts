import { afterAll, beforeAll, expect, it } from 'vitest';
import { PhpSyntaxParser } from '@php-companion/parser';
import { builtinDocumentUri, builtinPhpStub } from '@php-companion/language-spec';
import { SemanticWorkspace } from '../src/index.js';
let parser: PhpSyntaxParser;
beforeAll(async () => { parser = await PhpSyntaxParser.createDefault(); });
afterAll(() => parser.dispose());
it.each(['7.2', '7.4', '8.1', '8.5'] as const)('infers array template facts from native arrays at PHP %s', version => {
  const workspace = new SemanticWorkspace(parser); const uri = 'file:///Arrays.php';
  try {
    workspace.update(builtinDocumentUri(version), builtinPhpStub(version));
    const cases = [
      ['array_keys($input)', 'list<int|string>'], ['array_values($input)', 'list<mixed>'],
      ['array_unique($input)', 'array<int|string, mixed>'], ['array_reverse($input)', 'array<int|string, mixed>'],
      ['array_slice($input, 0)', 'array<int|string, mixed>'], ['array_filter($input)', 'array<int|string, mixed>'],
      ['array_merge($input)', 'array<int|string, mixed>'], ['array_replace($input)', 'array<int|string, mixed>'],
      ['array_chunk($input, 2)', `list<array<int, mixed>>${version.startsWith('7.') ? '|null' : ''}`],
      ['array_pad($input, 2, 0)', 'array<int|string, mixed>'], ['array_diff($input, [])', 'array<int|string, mixed>'],
      ['array_intersect($input, [])', 'array<int|string, mixed>'], ['array_flip($input)', 'array<int|string, int|string>'],
    ];
    for (const [expression, expected] of cases) {
      const source = `<?php function read(array $input): void { $result = ${expression}; }`;
      workspace.update(uri, source, true); const start = source.indexOf(expression!);
      expect(workspace.provenExpressionType(uri, start, start + expression!.length), expression).toBe(expected);
      const invalid = expression!.replace('$input', '42'); const invalidSource = `<?php $result = ${invalid};`;
      workspace.update(uri, invalidSource, true); const invalidStart = invalidSource.indexOf(invalid);
      expect(workspace.provenExpressionType(uri, invalidStart, invalidStart + invalid.length), invalid).toBeUndefined();
    }
  } finally { workspace.dispose(); }
}, 20000);
it('preserves direct templates and rejects unproved string keys', () => {
  const workspace = new SemanticWorkspace(parser); const uri = 'file:///User.php';
  const declarations = `<?php
/** @template T
 * @param T $input
 * @return T */ function identity($input) {}
/** @template K of array-key
 * @template V
 * @param array<K,V> $input
 * @return array<K,V> */ function keep(array $input) {}
/** @template K of string
 * @template V
 * @param array<K,V> $input
 * @return array<K,V> */ function strings(array $input) {}
`;
  try {
    for (const [expression, expected] of [['identity($input)', 'array'], ['keep($input)', 'array<int|string, mixed>'], ['strings($input)', undefined]]) {
      const source = `${declarations} function read(array $input): void { $result = ${expression}; }`;
      workspace.update(uri, source, true); const start = source.lastIndexOf(expression!);
      expect(workspace.provenExpressionType(uri, start, start + expression!.length), expression).toBe(expected);
    }
    const source = `${declarations}/** @param array<string, int> $input */ function read(array $input): void { $result = keep($input); }`;
    workspace.update(uri, source, true); const start = source.lastIndexOf('keep($input)');
    expect(workspace.provenExpressionType(uri, start, start + 'keep($input)'.length)).toBe('array<string, int>');
  } finally { workspace.dispose(); }
});
