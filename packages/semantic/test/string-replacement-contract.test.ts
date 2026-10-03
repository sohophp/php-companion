import { afterAll, beforeAll, expect, it } from 'vitest';
import { PhpSyntaxParser } from '@php-companion/parser';
import { builtinDocumentUri, builtinPhpStub } from '@php-companion/language-spec';
import { SemanticWorkspace } from '../src/index.js';
let parser: PhpSyntaxParser;
beforeAll(async () => { parser = await PhpSyntaxParser.createDefault(); });
afterAll(() => parser.dispose());
it.each(['7.2', '7.4', '8.1', '8.5'] as const)('retains string replacement subject and array key types at PHP %s', version => {
  const workspace = new SemanticWorkspace(parser); const uri = 'file:///Replace.php';
  const value = version.startsWith('7.') ? 'mixed' : 'string';
  try {
    workspace.update(builtinDocumentUri(version), builtinPhpStub(version));
    const cases = [['string', 'string'], ['list<mixed>', `array<int, ${value}>`],
      ['array<string, mixed>', `array<string, ${value}>`], ['array<int, int|bool|null>', `array<int, ${value}>`],
      ['array|string', `array<int|string, ${value}>|string`]];
    for (const name of ['str_replace', 'str_ireplace']) {
      for (const [type, expected] of cases) {
        for (const withCount of [false, true]) {
          const expression = `${name}('A', 'Z', $subject${withCount ? ', $count' : ''})`;
          const source = `<?php /** @param ${type} $subject */ function read($subject): void { $count = 0; $result = ${expression}; }`;
          workspace.update(uri, source, true); const start = source.indexOf(expression);
          expect(workspace.provenExpressionType(uri, start, start + expression.length), name + type + withCount).toBe(expected);
        }
      }
      const expression = `${name}('A', 'Z')`;
      const source = `<?php $result = ${expression};`;
      workspace.update(uri, source, true); const start = source.indexOf(expression);
      expect(workspace.provenExpressionType(uri, start, start + expression.length)).toBeUndefined();
      if (!version.startsWith('7.')) {
        const expression = `${name}(subject: $subject, replace: 'Z', search: 'A')`;
        const source = `<?php /** @param array<string, mixed> $subject */ function read(array $subject): void { $result = ${expression}; }`;
        workspace.update(uri, source, true); const start = source.indexOf(expression);
        expect(workspace.provenExpressionType(uri, start, start + expression.length)).toBe('array<string, string>');
      }
    }
    const expression = "str_replace('A', 'Z', $subject)";
    const source = `<?php namespace Local; class LocalResult {} function str_replace($search, $replace, $subject): LocalResult { return new LocalResult(); } function read(string $subject): void { $result = ${expression}; }`;
    workspace.update(uri, source, true); const start = source.lastIndexOf(expression);
    expect(workspace.provenExpressionType(uri, start, start + expression.length)).toBe('Local\\LocalResult');
  } finally { workspace.dispose(); }
}, 20000);
