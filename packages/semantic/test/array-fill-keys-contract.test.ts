import { afterAll, beforeAll, expect, it } from 'vitest';
import { PhpSyntaxParser } from '@php-companion/parser';
import { builtinDocumentUri, builtinPhpStub } from '@php-companion/language-spec';
import { SemanticWorkspace } from '../src/index.js';

let parser: PhpSyntaxParser;
beforeAll(async () => { parser = await PhpSyntaxParser.createDefault(); });
afterAll(() => parser.dispose());

it.each(['7.2', '7.4', '8.1', '8.5'] as const)('retains array_fill_keys filled object values from arbitrary input array keys at PHP %s', version => {
  const workspace = new SemanticWorkspace(parser); const uri = 'file:///FillKeys.php';
  try {
    workspace.update(builtinDocumentUri(version), builtinPhpStub(version));
    for (const keyType of ['array<string, string>', 'array<int, int>', 'array<string, float|bool|null>'])
    for (const valueType of ['Item', 'Other']) {
      const expression = 'array_fill_keys($keys, $value)';
      const source = `<?php class Item { public function itemOnly(): void {} } class Other { public function otherOnly(): void {} }
/** @param ${keyType} $keys
 * @param ${valueType} $value */
function read(array $keys, ${valueType} $value): void { $result = ${expression}; if ($result !== false) { foreach ($result as $item) { $item->; } } }`;
      workspace.update(uri, source, true); const start = source.indexOf(expression);
      expect(workspace.provenExpressionType(uri, start, start + expression.length), valueType).toBe(
        `array<int|string, ${valueType}>`);
      expect(workspace.completeMembers(uri, source.indexOf('$item->') + '$item->'.length).map(item => item.name)).toContain(valueType === 'Item' ? 'itemOnly' : 'otherOnly');
    }
    const expression = 'array_fill_keys($keys, $value)';
    const source = `<?php /** @param array<string, string> $keys */ function read(array $keys, $value): void { $result = ${expression}; }`;
    workspace.update(uri, source, true); const start = source.indexOf(expression);
    expect(workspace.provenExpressionType(uri, start, start + expression.length)).toBe('array<int|string, mixed>');
  } finally { workspace.dispose(); }
}, 15_000);
