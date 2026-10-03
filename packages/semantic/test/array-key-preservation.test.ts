import { afterAll, beforeAll, expect, it } from 'vitest';
import { PhpSyntaxParser } from '@php-companion/parser';
import { builtinDocumentUri, builtinPhpStub } from '@php-companion/language-spec';
import { SemanticWorkspace } from '../src/index.js';
let parser: PhpSyntaxParser;
beforeAll(async () => { parser = await PhpSyntaxParser.createDefault(); });
afterAll(() => parser.dispose());
it.each(['7.2', '7.4', '8.1', '8.5'] as const)('retains key domains across array ordering and partition functions at PHP %s', version => {
  const workspace = new SemanticWorkspace(parser); const uri = 'file:///ArrayKeyPreservation.php';
  try {
    workspace.update(builtinDocumentUri(version), builtinPhpStub(version));
    for (const [type, keys] of [['array<int, string>', 'int'], ['array<string, string>', 'string'], ['array<array-key, string>', 'int|string'], ['array', 'int|string']]) {
      for (const flag of ['', ', false', ', true', ', $keep']) {
        for (const [expression, nested] of [
          [`array_reverse($input${flag})`, false],
          [`array_slice($input, 0, null${flag})`, false],
          [`array_chunk($input, 2${flag})`, true],
        ] as const) {
          const source = `<?php /** @param ${type} $input */ function read(array $input, bool $keep): void { $result = ${expression}; }`;
          workspace.update(uri, source, true); const start = source.indexOf(expression);
          const element = type === 'array' ? 'mixed' : 'string';
          const branch = `list<array<${keys}, ${element}>>`;
          const indexed = `list<array<int, ${element}>>`;
          const chunk = flag === ', true' ? branch : flag === ', $keep' && branch !== indexed ? `${indexed}|${branch}` : indexed;
          const expected = nested ? `${chunk}${version.startsWith('7.') ? '|null' : ''}` : `array<${keys}, ${element}>`;
          expect(workspace.provenExpressionType(uri, start, start + expression.length), `${type}: ${expression}`).toBe(expected);
        }
      }
    }
    for (const expression of ['array_reverse(42)', 'array_slice(42, 0)', 'array_chunk(42, 2)', 'array_reverse()', 'array_slice($input)', 'array_chunk($input)']) {
      const source = `<?php function read(array $input): void { $result = ${expression}; }`;
      workspace.update(uri, source, true); const start = source.indexOf(expression);
      expect(workspace.provenExpressionType(uri, start, start + expression.length), expression).toBeUndefined();
    }
    if (!version.startsWith('7.')) {
      const expression = 'array_chunk(preserve_keys: true, length: 2, array: $input)';
      const source = `<?php /** @param array<string, string> $input */ function read(array $input): void { $result = ${expression}; }`;
      workspace.update(uri, source, true); const start = source.indexOf(expression);
      expect(workspace.provenExpressionType(uri, start, start + expression.length)).toBe('list<array<string, string>>');
    }
    const local = '<?php namespace Local; class Result { public function localOnly(): void {} } function array_reverse(array $input): Result { return new Result(); } $result = array_reverse([]); $result->local;';
    workspace.update(uri, local, true);
    expect(workspace.completeMembers(uri, local.indexOf('$result->local') + '$result->local'.length).map(item => item.name)).toContain('localOnly');
  } finally { workspace.dispose(); }
}, 30000);
