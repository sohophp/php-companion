import { afterAll, beforeAll, expect, it } from 'vitest';
import { PhpSyntaxParser } from '@php-companion/parser';
import { builtinDocumentUri, builtinPhpStub } from '@php-companion/language-spec';
import { SemanticWorkspace } from '../src/index.js';

let parser: PhpSyntaxParser;
beforeAll(async () => { parser = await PhpSyntaxParser.createDefault(); });
afterAll(() => parser.dispose());

it.each(['\n', '\r\n'] as const)('keeps local expression identity after wide siblings and Unicode with %j', eol => {
  const workspace = new SemanticWorkspace(parser); const uri = 'file:///LocalRanges.php';
  try {
    workspace.update(builtinDocumentUri('8.5'), builtinPhpStub('8.5'));
    const prefix = '<?php\n// 中文 😀\n' + Array.from({ length: 1000 }, (_, index) => `class Noise${index} {}`).join('\n')
      + '\nclass First { public function memberFirst(): void {} } class Second { public function memberSecond(): void {} }\n';
    for (const type of ['First', 'Second', 'First']) {
      const expression = `array_fill_keys(['label' => 'one'], new ${type}())`;
      const source = (prefix + `$earlier = array_fill_keys(['label' => 'one'], new Second());\n$values = ${expression};\nforeach ($values as $value) { $value->member; }`).replaceAll('\n', eol);
      workspace.update(uri, source, true); const start = source.lastIndexOf(expression);
      expect(workspace.provenExpressionType(uri, start, start + expression.length)).toBe(`array<int|string, ${type}>`);
      const offset = source.indexOf('$value->member') + '$value->member'.length;
      expect(workspace.completeMembers(uri, offset).map(member => member.name)).toEqual(['member' + type]);
    }
  } finally { workspace.dispose(); }
}, 20_000);
