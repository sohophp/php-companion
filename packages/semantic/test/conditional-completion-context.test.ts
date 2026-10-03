import { afterAll, beforeAll, expect, it } from 'vitest';
import { PhpSyntaxParser } from '@php-companion/parser';
import { SemanticWorkspace } from '../src/index.js';

let parser: PhpSyntaxParser;
beforeAll(async () => { parser = await PhpSyntaxParser.createDefault(); });
afterAll(() => parser.dispose());

it.each([
  ["return $va| ? 'yes' : 'no';", '$valueFlag'],
  ["return ($va|) ? 'yes' : 'no';", '$valueFlag'],
  ["takesText($va| ? 'yes' : 'no');", '$valueFlag'],
  ["takesText(takesFlag($va|) ? 'yes' : 'no');", '$valueFlag'],
  ["takesText($valueFlag ? $va| : 'no');", '$valueText'],
  ["return $valueFlag ? $va| : 'no';", '$valueText'],
  ["return $valueFlag ? 'yes' : ($va|);", '$valueText'],
  ["return $va| ?: 'no';", '$valueText'],
  ["return $valueFlag ? ($valueFlag ? $va| : 'a') : 'b';", '$valueText'],
  ["return $valueFlag ? ($va| ? 'a' : 'b') : 'c';", '$valueFlag'],
  ["$target = 'text'; $target = $va| ? 'yes' : 'no';", '$valueFlag'],
  ["$target = 'text'; $target = $valueFlag ? $va| : 'no';", '$valueText'],
  ["$holder = new CompletionHolder(); $holder->title = $va| ? 'yes' : 'no';", '$valueFlag'],
  ["$holder = new CompletionHolder(); $holder->title = $valueFlag ? $va| : 'no';", '$valueText'],
] as const)('ranks variables in the correct conditional position: %s', (expression, expected) => {
  const project = new SemanticWorkspace(parser);
  try {
    const marked = `<?php class CompletionHolder { public string $title = ''; }
      function takesText(string $text): void {} function takesFlag(bool $flag): bool { return $flag; }
      function run(): string { $valueText = 'text'; $valueFlag = true; ${expression} }`;
    const offset = marked.indexOf('|'); const source = marked.replace('|', '');
    const uri = 'file:///ConditionalCompletion.php';
    project.update(uri, source);
    const names = project.completeVariables(uri, offset)?.names;
    expect(names).toContain('$valueText'); expect(names).toContain('$valueFlag');
    expect(names?.[0]).toBe(expected);
  } finally { project.dispose(); }
});
