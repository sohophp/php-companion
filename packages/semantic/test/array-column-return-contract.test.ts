import { afterAll, beforeAll, expect, it } from 'vitest';
import { PhpSyntaxParser } from '@php-companion/parser';
import { builtinDocumentUri, builtinPhpStub } from '@php-companion/language-spec';
import { SemanticWorkspace } from '../src/index.js';

let parser: PhpSyntaxParser;
beforeAll(async () => { parser = await PhpSyntaxParser.createDefault(); });
afterAll(() => parser.dispose());
it.each(['7.2', '7.4', '8.1', '8.5'] as const)('preserves array_column indexing for dynamic columns at PHP %s', version => {
  const workspace = new SemanticWorkspace(parser); const uri = 'file:///Column.php';
  try {
    workspace.update(builtinDocumentUri(version), builtinPhpStub(version));
    const cases = [
      ['', 'list<mixed>'], [', null', 'list<mixed>'], [", 'id'", 'array<int|string, mixed>'],
      [', $index', 'array<int|string, mixed>|list<mixed>'],
    ];
    for (const [suffix, expected] of cases) {
      const expression = `array_column($rows, $key${suffix})`;
      const source = `<?php /** @param array<string, array<string, mixed>> $rows */ function read(array $rows, string $key, ?string $index): void { $result = ${expression}; }`;
      workspace.update(uri, source, true); const start = source.indexOf(expression);
      expect(workspace.provenExpressionType(uri, start, start + expression.length), suffix).toBe(expected);
    }
    const indexed = 'array_column($rows, $key, $index)';
    const source = `<?php /** @param array<string, array<string, mixed>> $rows */ function read(array $rows, string $key, string $index): void { $result = ${indexed}; }`;
    workspace.update(uri, source, true); const start = source.indexOf(indexed);
    expect(workspace.provenExpressionType(uri, start, start + indexed.length)).toBe('array<int|string, mixed>');
    for (const expression of ['array_column(42, $key)', 'array_column($rows)', 'array_column($rows, $key, [])']) {
      const source = `<?php function read(array $rows, string $key): void { $result = ${expression}; }`;
      workspace.update(uri, source, true); const start = source.indexOf(expression);
      expect(workspace.provenExpressionType(uri, start, start + expression.length), expression).toBeUndefined();
    }
    for (const expression of ["array_column([['entry' => new Item()]], 'entry')", "array_column([['entry' => new Item(), 'id' => 'first']], 'entry', 'id')"]) {
      const source = `<?php class Item { public function itemOnly(): void {} } $result = ${expression}; foreach ($result as $item) { $item->item; }`;
      workspace.update(uri, source, true);
      expect(workspace.completeMembers(uri, source.indexOf('$item->item') + '$item->item'.length).map(item => item.name)).toContain('itemOnly');
    }
    if (!version.startsWith('7.')) {
      const expression = "array_column(index_key: 'id', column_key: $key, array: $rows)";
      const source = `<?php function read(array $rows, string $key): void { $result = ${expression}; }`;
      workspace.update(uri, source, true); const start = source.indexOf(expression);
      expect(workspace.provenExpressionType(uri, start, start + expression.length)).toBe('array<int|string, mixed>');
    }
  } finally { workspace.dispose(); }
}, 20000);
