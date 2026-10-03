import { afterAll, beforeAll, expect, it } from 'vitest';
import { PhpSyntaxParser } from '@php-companion/parser';
import { builtinDocumentUri, builtinPhpStub } from '@php-companion/language-spec';
import { SemanticWorkspace } from '../src/index.js';

let parser: PhpSyntaxParser;
beforeAll(async () => { parser = await PhpSyntaxParser.createDefault(); });
afterAll(() => parser.dispose());

it.each(['7.2', '8.3', '8.4', '8.5'] as const)('distinguishes highlighted output from returned source at PHP %s', version => {
  const workspace = new SemanticWorkspace(parser); const uri = 'file:///HighlightConsumer.php';
  try {
    workspace.update(builtinDocumentUri(version), builtinPhpStub(version));
    for (const name of ['highlight_string', 'highlight_file', 'show_source']) {
      const modernString = name === 'highlight_string' && Number(version.replace('.', '')) >= 84;
      for (const [suffix, expected] of [
        ['', modernString ? 'true' : 'bool'],
        [', false', modernString ? 'true' : 'bool'],
        [', true', modernString ? 'string' : 'false|string'],
        [', $capture', modernString ? 'string|true' : 'bool|string'],
      ]) {
        const expression = `${name}($input${suffix})`;
        const source = `<?php function read(string $input, bool $capture): void { $result = ${expression}; }`;
        workspace.update(uri, source, true); const offset = source.indexOf(expression);
        const actual = workspace.provenExpressionType(uri, offset, offset + expression.length)?.split('|') ?? [];
        const alternatives = actual.includes('bool') ? actual.filter(type => type !== 'false' && type !== 'true') : actual;
        expect(alternatives.sort(), expression).toEqual(expected.split('|').sort());
      }
      if (version !== '7.2') {
        const expression = `${name}(return: true, ${name === 'highlight_string' ? 'string' : 'filename'}: $input)`;
        const source = `<?php function read(string $input): void { $result = ${expression}; }`;
        workspace.update(uri, source, true); const offset = source.indexOf(expression);
        expect(workspace.provenExpressionType(uri, offset, offset + expression.length)).toBe(modernString ? 'string' : 'false|string');
      }
    }
  } finally { workspace.dispose(); }
}, 15_000);
