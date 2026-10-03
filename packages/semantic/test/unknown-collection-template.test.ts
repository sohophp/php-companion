import { afterAll, beforeAll, expect, it } from 'vitest';
import { PhpSyntaxParser } from '@php-companion/parser';
import { SemanticWorkspace } from '../src/index.js';

let parser: PhpSyntaxParser;
beforeAll(async () => { parser = await PhpSyntaxParser.createDefault(); });
afterAll(() => parser.dispose());

it.each([
  ['array<array-key, TValue>', '', 'array<int|string, mixed>'],
  ['list<TValue>', '', 'list<mixed>'],
  ['TValue[]|false', '', 'array<int|string, mixed>|false'],
  ['TValue', '', undefined],
  ['array<TValue, int>', '', undefined],
  ['array<array-key, TValue>', ' of Item', undefined],
] as const)('preserves only proven collection containers for %s%s', (returnType, bound, expected) => {
  const workspace = new SemanticWorkspace(parser); const uri = 'file:///UnknownCollection.php';
  try {
    const source = `<?php class Item {}
/** @template TValue${bound}
 * @param TValue $value
 * @return ${returnType} */
function collect($value) {}
function useUnknown($unknown): void { $result = collect($unknown); }`;
    workspace.update(uri, source, true); const start = source.indexOf('collect($unknown)');
    expect(workspace.provenExpressionType(uri, start, start + 'collect($unknown)'.length)).toBe(expected);
    const missing = source.replace('collect($unknown)', 'collect()');
    workspace.update(uri, missing, true); const missingStart = missing.indexOf('collect();');
    expect(workspace.provenExpressionType(uri, missingStart, missingStart + 'collect()'.length)).toBeUndefined();
  } finally { workspace.dispose(); }
});
