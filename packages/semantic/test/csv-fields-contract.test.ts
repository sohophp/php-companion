import { afterAll, beforeAll, expect, it } from 'vitest';
import { PhpSyntaxParser } from '@php-companion/parser';
import { builtinDocumentUri, builtinPhpStub } from '@php-companion/language-spec';
import { SemanticWorkspace } from '../src/index.js';

let parser: PhpSyntaxParser;
beforeAll(async () => { parser = await PhpSyntaxParser.createDefault(); });
afterAll(() => parser.dispose());

it.each(['7.2', '7.4', '8.1', '8.5'] as const)('accepts CSV field arrays without list or element restrictions at PHP %s', version => {
  const workspace = new SemanticWorkspace(parser); const uri = 'file:///Csv.php';
  try {
    workspace.update(builtinDocumentUri(version), builtinPhpStub(version));
    for (const type of ['list<string>', 'list<int|bool>', 'array<string, string>', 'array<int, float|null>', 'array<string, mixed>']) {
      for (const expression of ['fputcsv($stream, $fields)', '$file->fputcsv($fields)']) {
        const source = `<?php /** @param resource $stream
 * @param ${type} $fields */ function write($stream, SplFileObject $file, array $fields): void { $count = ${expression}; }`;
        workspace.update(uri, source, true); const start = source.indexOf(expression);
        expect(workspace.provenExpressionType(uri, start, start + expression.length), type + expression).toBe('false|int');
      }
    }
    for (const expression of ['fputcsv($stream, 42)', '$file->fputcsv(42)', 'fputcsv($stream)', '$file->fputcsv()']) {
      const source = `<?php /** @param resource $stream */ function write($stream, SplFileObject $file): void { $count = ${expression}; }`;
      workspace.update(uri, source, true); const start = source.indexOf(expression);
      expect(workspace.provenExpressionType(uri, start, start + expression.length), expression).toBeUndefined();
    }
    if (!version.startsWith('7.')) {
      for (const expression of ['fputcsv(fields: $fields, stream: $stream)', '$file->fputcsv(fields: $fields)']) {
        const source = `<?php /** @param resource $stream
 * @param array<string, mixed> $fields */ function write($stream, SplFileObject $file, array $fields): void { $count = ${expression}; }`;
        workspace.update(uri, source, true); const start = source.indexOf(expression);
        expect(workspace.provenExpressionType(uri, start, start + expression.length)).toBe('false|int');
      }
    }
  } finally { workspace.dispose(); }
}, 20000);
