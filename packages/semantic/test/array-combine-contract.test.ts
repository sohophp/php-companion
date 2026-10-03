import { afterAll, beforeAll, expect, it } from 'vitest';
import { PhpSyntaxParser } from '@php-companion/parser';
import { builtinDocumentUri, builtinPhpStub } from '@php-companion/language-spec';
import { SemanticWorkspace } from '../src/index.js';

let parser: PhpSyntaxParser;
beforeAll(async () => { parser = await PhpSyntaxParser.createDefault(); });
afterAll(() => parser.dispose());

it.each(['7.2', '7.4', '8.1', '8.5'] as const)('retains array_combine object values from arbitrary array keys at PHP %s', version => {
  const workspace = new SemanticWorkspace(parser); const uri = 'file:///Combine.php';
  try {
    workspace.update(builtinDocumentUri(version), builtinPhpStub(version));
    for (const keyType of ['array<string, string>', 'array<int, int>', 'array<string, float|bool|null>'])
    for (const valueType of ['list<Item>', 'array<string, Item>', 'array<int, Item>']) {
      const expression = 'array_combine($keys, $values)';
      const source = `<?php class Item { public function itemOnly(): void {} }
/** @param ${keyType} $keys
 * @param ${valueType} $values */
function read(array $keys, array $values): void { $result = ${expression}; if ($result !== false) { foreach ($result as $item) { $item->item; } } }`;
      workspace.update(uri, source, true); const start = source.indexOf(expression);
      expect(workspace.provenExpressionType(uri, start, start + expression.length), valueType).toBe(
        'array<int|string, Item>' + (version.startsWith('7.') ? '|false' : ''));
      expect(workspace.completeMembers(uri, source.indexOf('$item->item') + '$item->item'.length).map(item => item.name)).toContain('itemOnly');
    }
  } finally { workspace.dispose(); }
}, 15_000);
