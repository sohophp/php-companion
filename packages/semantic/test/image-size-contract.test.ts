import { afterAll, beforeAll, expect, it } from 'vitest';
import { PhpSyntaxParser } from '@php-companion/parser';
import { builtinDocumentUri, builtinPhpStub } from '@php-companion/language-spec';
import { SemanticWorkspace } from '../src/index.js';

let parser: PhpSyntaxParser;
beforeAll(async () => { parser = await PhpSyntaxParser.createDefault(); });
afterAll(() => parser.dispose());

it.each(['7.2', '8.5'] as const)('offers image metadata keys after success guards and retains failure at PHP %s', version => {
  const workspace = new SemanticWorkspace(parser); const uri = 'file:///ImageConsumer.php';
  try {
    workspace.update(builtinDocumentUri(version, { disabledExtensions: ['gd'] }), builtinPhpStub(version, { disabledExtensions: ['gd'] }));
    for (const name of ['getimagesize', 'getimagesizefromstring']) {
      const expression = `${name}($input)`;
      const source = `<?php function read(string $input): void { $metadata = ${expression}; }`;
      workspace.update(uri, source, true); const start = source.indexOf(expression);
      const type = workspace.provenExpressionType(uri, start, start + expression.length);
      expect(type).toContain('false'); expect(type).toContain('bits?: int'); expect(type).toContain('channels?: int');
      expect(type?.includes('width_unit: string')).toBe(version === '8.5');
      expect(type).toContain(version === '8.5' ? '3?: string' : '3: string');
      for (const guard of ['', 'if ($metadata === false) return;', 'if (!is_array($metadata)) return;']) {
        for (const prefix of ['mi', 'bi', 'ch', 'wi']) {
          const marked = `<?php function read(string $input): void { $metadata = ${expression}; ${guard} $metadata['${prefix}§']; }`;
          workspace.update(uri, marked.replace('§', ''), true);
          expect(workspace.completeArrayAccessKeys(uri, marked.indexOf('§'))?.keys.map(item => item.name) ?? [])
            .toEqual(guard && (prefix !== 'wi' || version === '8.5')
              ? [{ mi: 'mime', bi: 'bits', ch: 'channels', wi: 'width_unit' }[prefix]] : []);
        }
      }
      const narrowed = `<?php function read(string $input): void { $metadata = ${expression}; if ($metadata === false) return; $metadata[0]; }`;
      workspace.update(uri, narrowed, true); const offset = narrowed.indexOf('$metadata[0]');
      expect(workspace.provenExpressionType(uri, offset, offset + '$metadata[0]'.length)).toBe('int');
      const optional = narrowed.replace('$metadata[0]', '$metadata[3]');
      workspace.update(uri, optional, true); const optionalOffset = optional.indexOf('$metadata[3]');
      expect(workspace.provenExpressionType(uri, optionalOffset, optionalOffset + '$metadata[3]'.length))
        .toBe(version === '8.5' ? 'null|string' : 'string');
    }
  } finally { workspace.dispose(); }
}, 15_000);
