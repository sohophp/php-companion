import { afterAll, beforeAll, expect, it } from 'vitest';
import { PhpSyntaxParser } from '@php-companion/parser';
import { builtinDocumentUri, builtinPhpStub } from '@php-companion/language-spec';
import { SemanticWorkspace } from '../src/index.js';
let parser: PhpSyntaxParser;
beforeAll(async () => { parser = await PhpSyntaxParser.createDefault(); });
afterAll(() => parser.dispose());
it.each(['7.2', '7.4', '8.1', '8.5'] as const)('preserves array_flip input keys as output values at PHP %s', version => {
  const workspace = new SemanticWorkspace(parser); const uri = 'file:///Flip.php';
  try {
    workspace.update(builtinDocumentUri(version), builtinPhpStub(version));
    for (const [type, expected] of [
      ['array<string, string>', 'array<int|string, string>'],
      ['array<int, string>', 'array<int|string, int>'],
      ['array<string, int>', 'array<int, string>'],
      ['array<int, int>', 'array<int, int>'],
      ['array<string, int|string>', 'array<int|string, string>'],
      ['array<string, mixed>', 'array<int|string, string>'],
      ['array', 'array<int|string, int|string>'],
    ]) {
      const expression = 'array_flip($input)';
      const source = `<?php /** @param ${type} $input */ function read(array $input): void { $result = ${expression}; }`;
      workspace.update(uri, source, true); const start = source.indexOf(expression);
      expect(workspace.provenExpressionType(uri, start, start + expression.length), type).toBe(expected);
    }
    for (const expression of ['array_flip(42)', 'array_flip()']) {
      const source = `<?php $result = ${expression};`;
      workspace.update(uri, source, true); const start = source.indexOf(expression);
      expect(workspace.provenExpressionType(uri, start, start + expression.length), expression).toBeUndefined();
    }
    const expression = 'array_flip($input)';
    const local = `<?php namespace Local; class Result { public function localOnly(): void {} } function array_flip(array $input): Result { return new Result(); } $result = ${expression}; $result->local;`;
    workspace.update(uri, local, true);
    expect(workspace.completeMembers(uri, local.indexOf('$result->local') + '$result->local'.length).map(item => item.name)).toContain('localOnly');
    if (!version.startsWith('7.')) {
      const expression = 'array_flip(array: $input)';
      const source = `<?php /** @param array<int, string> $input */ function read(array $input): void { $result = ${expression}; }`;
      workspace.update(uri, source, true); const start = source.indexOf(expression);
      expect(workspace.provenExpressionType(uri, start, start + expression.length)).toBe('array<int|string, int>');
    }
  } finally { workspace.dispose(); }
}, 20000);
