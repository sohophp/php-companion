import { afterAll, beforeAll, expect, it } from 'vitest';
import { PhpSyntaxParser } from '@php-companion/parser';
import { SemanticWorkspace } from '../src/index.js';

let parser: PhpSyntaxParser;
beforeAll(async () => { parser = await PhpSyntaxParser.createDefault(); });
afterAll(() => parser.dispose());

for (const retained of [true, false]) {
  it.each([
    ['class Host { const bool FLAG = tr§; }', ['true']],
    ['class Host { const bool FLAG = /* value */ tr§; }', ['true']],
    ['class Host { const ?bool FLAG = nu§; }', ['null']],
    ['class Host { const bool FIRST = false, SECOND = tr§; }', ['true']],
    ['class Host { const bool FLAG = !tr§; }', []],
    ['class Host { const FLAG = tr§; }', []],
    ['const FLAG = tr§;', []],
    ['enum State: string { case Ready = tr§; }', []],
  ] as const)(`uses only the initializer's native contract with retained tree=${retained}: %s`, (tail, labels) => {
    const workspace = new SemanticWorkspace(parser), uri = 'file:///Constants.php';
    try {
      const marked = '<?php ' + tail, offset = marked.indexOf('§');
      workspace.update(uri, marked.replace('§', ''), retained);
      expect(workspace.completeExpectedValues(uri, offset).map(item => item.label)).toEqual(labels);
    } finally { workspace.dispose(); }
  });

  it.each([
    ['class Host { const bool VALUE = PICK_§; }', { PICK_BOOL: 0, PICK_INT: 2, PICK_TEXT: 2 }],
    ['class Host { const string VALUE = PICK_§; }', { PICK_BOOL: 2, PICK_INT: 2, PICK_TEXT: 0 }],
    ['enum State: int { case Ready = PICK_§; }', { PICK_BOOL: 2, PICK_INT: 0, PICK_TEXT: 2 }],
    ['enum State: string { case Ready = PICK_§; }', { PICK_BOOL: 2, PICK_INT: 2, PICK_TEXT: 0 }],
  ] as const)(`ranks constant values by the scalar initializer type with retained tree=${retained}: %s`, (tail, ranks) => {
    const workspace = new SemanticWorkspace(parser), uri = 'file:///Constants.php';
    try {
      const marked = '<?php const PICK_BOOL = true, PICK_INT = 1, PICK_TEXT = "ready"; ' + tail;
      const offset = marked.indexOf('§'); workspace.update(uri, marked.replace('§', ''), retained);
      expect(Object.fromEntries(workspace.completeConstants(uri, offset).map(item => [item.name, item.compatibilityRank]))).toEqual(ranks);
    } finally { workspace.dispose(); }
  });
}
