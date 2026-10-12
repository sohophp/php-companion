import { afterAll, beforeAll, expect, it } from 'vitest';
import { PhpSyntaxParser } from '@php-companion/parser';
import { SUPPORTED_PHP_VERSIONS } from '@php-companion/language-spec';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { analyzePhpDocument } from '../src/analysis.js';
import { BOUNDARY_FEATURES, VERSION_BOUNDARY_FIXTURES } from '../../language-spec/test/version-boundary-fixtures.js';

let parser: PhpSyntaxParser;
beforeAll(async () => { parser = await PhpSyntaxParser.createDefault(); });
afterAll(() => parser.dispose());
it.each(SUPPORTED_PHP_VERSIONS)('publishes exact octal/list/catch boundaries at PHP %s', version => {
  for (const fixture of VERSION_BOUNDARY_FIXTURES.filter(f => f.valid)) {
    const marked = '<?php // 中文 😀\n' + fixture.source.slice(6);
    const source = marked.replace('/*@*/', ''), start = marked.indexOf('/*@*/');
    const document = TextDocument.create('file:///VersionBoundaries.php', 'php', 1, source);
    const diagnostics = analyzePhpDocument(document, parser, version).diagnostics;
    expect(diagnostics.filter(d => d.code === 'php.syntax'), fixture.name).toEqual([]);
    const matches = diagnostics.filter(d => d.code === 'php.version.unsupported' && BOUNDARY_FEATURES.some(feature => d.message.includes(feature)));
    expect(matches, fixture.name).toHaveLength(fixture.feature && Number(version) < Number(fixture.minimum) ? 1 : 0);
    if (matches.length) {
      expect(matches[0]!.range).toEqual({ start: document.positionAt(start), end: document.positionAt(start + fixture.length) });
      expect(matches[0]!.message).toContain(fixture.minimum);
    }
  }
});
