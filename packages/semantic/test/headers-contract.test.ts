import { afterAll, beforeAll, expect, it } from 'vitest';
import { PhpSyntaxParser } from '@php-companion/parser';
import { builtinDocumentUri, builtinPhpStub } from '@php-companion/language-spec';
import { SemanticWorkspace } from '../src/index.js';

let parser: PhpSyntaxParser;
beforeAll(async () => { parser = await PhpSyntaxParser.createDefault(); });
afterAll(() => parser.dispose());

it.each(['7.2', '7.4', '8.1', '8.5'] as const)('preserves response header value contracts at PHP %s', version => {
  const workspace = new SemanticWorkspace(parser); const uri = 'file:///Headers.php';
  const indexed = 'false|list<string>';
  const associative = 'array<int|string, list<string>|string>|false';
  try {
    workspace.update(builtinDocumentUri(version), builtinPhpStub(version));
    for (const [suffix, expected] of [
      ['', indexed], [version.startsWith('7.') ? ', 0' : ', false', indexed],
      [version.startsWith('7.') ? ', 1' : ', true', associative],
    ]) {
      const expression = `get_headers($url${suffix})`;
      const source = `<?php function read(string $url): void { $result = ${expression}; }`;
      workspace.update(uri, source, true); const offset = source.indexOf(expression);
      expect(workspace.provenExpressionType(uri, offset, offset + expression.length), expression).toBe(expected);
    }
    if (!version.startsWith('7.')) {
      const expression = 'get_headers(associative: true, url: $url)';
      const source = `<?php function read(string $url): void { $result = ${expression}; }`;
      workspace.update(uri, source, true); const offset = source.indexOf(expression);
      expect(workspace.provenExpressionType(uri, offset, offset + expression.length)).toBe(associative);
    }
    const expression = 'get_headers($url, $mode)';
    const source = `<?php function read(string $url, ${version.startsWith('7.') ? 'int' : 'bool'} $mode): void { $result = ${expression}; }`;
    workspace.update(uri, source, true); const offset = source.indexOf(expression);
    const actual = workspace.provenExpressionType(uri, offset, offset + expression.length);
    expect(actual).toContain('list<string>'); expect(actual).toContain('array<int|string, list<string>|string>'); expect(actual).toContain('false');
    for (const [mode, expected] of [[version.startsWith('7.') ? '0' : 'false', 'string'],
      [version.startsWith('7.') ? '1' : 'true', 'list<string>|string']]) {
      const read = '$result[0]';
      const guarded = `<?php function read(string $url): void { $result = get_headers($url, ${mode}); if ($result !== false) { $value = ${read}; } }`;
      workspace.update(uri, guarded, true); const start = guarded.indexOf(read);
      expect(workspace.provenExpressionType(uri, start, start + read.length)).toBe(expected);
    }
    workspace.update('file:///LocalHeaders.php', '<?php namespace LocalHeaders; function get_headers(string $url): int { return 1; }');
    const local = '<?php namespace LocalHeaders; $value = get_headers("http://example.invalid");';
    workspace.update(uri, local, true); const start = local.indexOf('get_headers(');
    expect(workspace.provenExpressionType(uri, start, local.indexOf(';', start))).toBe('int');
  } finally { workspace.dispose(); }
}, 15_000);
