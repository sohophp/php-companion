import { afterAll, beforeAll, expect, it } from 'vitest';
import { PhpSyntaxParser } from '@php-companion/parser';
import { SemanticWorkspace } from '../src/index.js';
let parser: PhpSyntaxParser;
beforeAll(async () => { parser = await PhpSyntaxParser.createDefault(); });
afterAll(() => parser.dispose());
it.each([
 ["takesText(!$va|);", '$valueFlag'],
 ["takesText($va| === true);", '$valueFlag'],
 ["takesText(true === $va|);", '$valueFlag'],
 ["takesText(($va| === true));", '$valueFlag'],
 ["takesText((int) $va|);", '$valueFlag'],
 ["takesText($va| + 1);", '$valueFlag'],
 ["takesText(!takesText($va|));", '$valueText'],
 ["takesText($va| ?? 'fallback');", '$valueText'],
 ["return $va|;", '$valueText'],
] as const)('keeps operand completion separate from result contract: %s', (expression, expected) => {
 const project = new SemanticWorkspace(parser);
 try {
  const marked = `<?php function takesText(string $text): string { return $text; }
   function run(): string { $valueText='text'; $valueFlag=true; $valueNumber=1; ${expression} }`;
  const offset=marked.indexOf('|'); const uri='file:///OperandCompletion.php';
  project.update(uri,marked.replace('|',''));
  const names=project.completeVariables(uri,offset)?.names;
  expect(names).toContain('$valueText'); expect(names).toContain('$valueFlag'); expect(names).toContain('$valueNumber');
  expect(names?.[0]).toBe(expected);
 } finally { project.dispose(); }
});
