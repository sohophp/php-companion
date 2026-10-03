import { afterAll, beforeAll, expect, it } from 'vitest';
import { PhpSyntaxParser } from '@php-companion/parser';
import { builtinDocumentUri, builtinPhpStub } from '@php-companion/language-spec';
import { SemanticWorkspace } from '../src/index.js';

let parser: PhpSyntaxParser;
beforeAll(async () => { parser = await PhpSyntaxParser.createDefault(); });
afterAll(() => parser.dispose());

it.each(['7.2', '7.4', '8.1', '8.5'] as const)('consumes adjacent array generic contracts at PHP %s', version => {
  const workspace = new SemanticWorkspace(parser); const uri = 'file:///ArrayConsumer.php';
  try {
    workspace.update(builtinDocumentUri(version), builtinPhpStub(version));
    const cases: Array<[string, string]> = [
      ['array_reverse($items)', 'array<string, Item>'],
      ['array_slice($items, 0)', 'array<string, Item>'],
      ['array_chunk($items, 2)', 'list<array<int, Item>>' + (version.startsWith('7.') ? '|null' : '')],
      ['array_fill(0, 2, $item)', 'array<int, Item>' + (version.startsWith('7.') ? '|false' : '')],
      ['array_unique($items)', 'array<string, Item>'],
      ...['array_intersect', 'array_diff', 'array_intersect_key', 'array_diff_key'].map(name => [`${name}($items, $items)`, 'array<string, Item>'] as [string, string]),
      ['array_rand($items, 1)', version.startsWith('7.') ? 'list<string>|null|string' : 'string'],
    ];
    const actual: unknown[] = [];
    for (const [expression] of cases) {
      const source = `<?php class Item {}
/** @param non-empty-array<string, Item> $items */
function read(array $items, Item $item): void { $result = ${expression}; }`;
      workspace.update(uri, source, true); const start = source.indexOf(expression);
      actual.push([expression, workspace.provenExpressionType(uri, start, start + expression.length)]);
    }
    expect(actual).toEqual(cases);
  } finally { workspace.dispose(); }
}, 20_000);
