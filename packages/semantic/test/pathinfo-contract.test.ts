import { afterAll, beforeAll, expect, it } from 'vitest';
import { PhpSyntaxParser } from '@php-companion/parser';
import { builtinDocumentUri, builtinPhpStub } from '@php-companion/language-spec';
import { SemanticWorkspace } from '../src/index.js';

let parser: PhpSyntaxParser;
beforeAll(async () => { parser = await PhpSyntaxParser.createDefault(); });
afterAll(() => parser.dispose());
const shape = 'array{dirname?: string, basename: string, extension?: string, filename: string}';

it.each(['7.2', '8.5'] as const)('infers pathinfo contracts and key completion at PHP %s', version => {
  const workspace = new SemanticWorkspace(parser); const uri = 'file:///Pathinfo.php';
  try {
    workspace.update(builtinDocumentUri(version), builtinPhpStub(version));
    const cases: Array<[string, string]> = [
      ['pathinfo($path)', shape], ['pathinfo($path, 15)', shape],
      ['pathinfo($path, ALL)', shape], ['pathinfo($path, PATHINFO_EXTENSION)', 'string'],
      ['pathinfo($path, PATHINFO_DIRNAME)', 'string'], ['pathinfo($path, PATHINFO_BASENAME)', 'string'],
      ['pathinfo($path, PATHINFO_FILENAME)', 'string'], ['pathinfo($path, $flags)', `string|${shape}`],
    ];
    if (version === '8.5') cases.push(['pathinfo($path, PATHINFO_ALL)', shape], ['pathinfo(flags: PATHINFO_ALL, path: $path)', shape]);
    for (const [expression, expected] of cases) {
      const source = '<?php namespace PathContracts; const ALL = 15; function read(string $path, int $flags): void { $parts = ' + expression + '; }';
      workspace.update(uri, source, true);
      const start = source.indexOf(expression);
      const actual = workspace.provenExpressionType(uri, start, start + expression.length);
      if (expression.includes('$flags')) { expect(actual).toContain(shape); expect(actual).toContain('string'); }
      else expect(actual, expression).toBe(expected);
    }
    for (const flags of ['', ', 15', ', PATHINFO_EXTENSION', ', $flags']) {
      const marked = `<?php function read(string $path, int $flags): void { $parts = pathinfo($path${flags}); $parts['§']; }`;
      workspace.update(uri, marked.replace('§', ''), true);
      const keys = workspace.completeArrayAccessKeys(uri, marked.indexOf('§'))?.keys.map(item => item.name) ?? [];
      expect(keys, flags).toEqual(flags === '' || flags === ', 15' ? ['basename', 'dirname', 'extension', 'filename'] : []);
    }
    const shadow = '<?php namespace PathContracts; const PATHINFO_ALL = 4; function read(string $path): void { $parts = pathinfo($path, PATHINFO_ALL); }';
    workspace.update(uri, shadow, true);
    const start = shadow.indexOf('pathinfo(');
    expect(workspace.provenExpressionType(uri, start, shadow.indexOf(');', start) + 1)).toBe('string');
    workspace.update('file:///OverridePathinfo.php', '<?php namespace PathContracts; function pathinfo(string $path): string { return ""; }');
    const own = '<?php namespace PathContracts; function read(string $path): void { $parts = pathinfo($path); }';
    workspace.update(uri, own, true); const offset = own.indexOf('pathinfo(');
    expect(workspace.provenExpressionType(uri, offset, own.indexOf(');', offset) + 1)).toBe('string');
  } finally { workspace.dispose(); }
}, 15_000);
