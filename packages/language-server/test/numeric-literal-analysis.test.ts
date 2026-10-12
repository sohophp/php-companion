import { afterAll, beforeAll, expect, it } from 'vitest';
import { PhpSyntaxParser } from '@php-companion/parser';
import { SUPPORTED_PHP_VERSIONS } from '@php-companion/language-spec';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { analyzePhpDocument } from '../src/analysis.js';

let parser: PhpSyntaxParser;
beforeAll(async () => { parser = await PhpSyntaxParser.createDefault(); });
afterAll(() => parser.dispose());
it.each(SUPPORTED_PHP_VERSIONS)('publishes exact float separator ranges and retains syntax recovery at PHP %s', version => {
  const source = '<?php // 中文 😀\n$a=1_000.5; $b=6.674_083e-11; $c=1e1_0; $d=1_2e3; /* 1_000.5 */ $s="1_000.5";';
  for (const incomplete of [false, true]) {
    const document = TextDocument.create('file:///NumericSeparators.php', 'php', 1, source + (incomplete ? 'function incomplete(' : ''));
    const diagnostics = analyzePhpDocument(document, parser, version).diagnostics;
    expect(diagnostics.filter(d => d.code === 'php.syntax')).toHaveLength(incomplete ? 1 : 0);
    const versions = diagnostics.filter(d => d.code === 'php.version.unsupported');
    expect(versions.map(d => document.getText(d.range))).toEqual(Number(version) < 7.4 ? ['1_000.5', '6.674_083e-11', '1e1_0', '1_2e3'] : []);
  }
});
