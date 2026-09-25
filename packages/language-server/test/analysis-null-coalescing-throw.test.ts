import { afterAll, beforeAll, expect, it } from 'vitest';
import { PhpSyntaxParser } from '@php-companion/parser';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { analyzePhpDocument } from '../src/analysis.js';

let parser: PhpSyntaxParser;
beforeAll(async () => { parser = await PhpSyntaxParser.createDefault(); });
afterAll(() => parser.dispose());

it('keeps statements after conditional coalescing throws reachable', () => {
  const source = `<?php
    function guarded(?object $presentation): void {
      $presentation ??= throw new LogicException('Presentation required');
      afterAssignment($presentation);
      $presentation ?? throw new LogicException('Still required');
      afterCoalesce();
    }
    function guaranteed(): void {
      $presentation = throw new LogicException('Always throws');
      afterGuaranteedThrow();
    }`;
  const document = TextDocument.create('file:///CoalescingThrow.php', 'php', 1, source);
  const unreachable = analyzePhpDocument(document, parser).diagnostics
    .filter((item) => item.code === 'php.control-flow.unreachable')
    .map((item) => document.getText(item.range));
  expect(unreachable).toEqual(['afterGuaranteedThrow();']);
});
