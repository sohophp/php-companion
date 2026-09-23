import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PhpSyntaxParser } from '@php-companion/parser';
import { SemanticWorkspace } from '../src/index.js';

const fixture = (name: string): string => readFileSync(new URL(`./fixtures/acceptance/${name}.php`, import.meta.url), 'utf8');

describe('F04 method and function References acceptance fixtures', () => {
  let parser: PhpSyntaxParser;
  beforeAll(async () => { parser = await PhpSyntaxParser.createDefault(); });
  afterAll(() => parser.dispose());

  for (const [id, file, expectedCalls, hasError] of [
    ['F04-REF-01', 'f04-references-valid', true, false],
    ['F04-REF-02', 'f04-references-counterexample', false, false],
    ['F04-REF-03', 'f04-references-incomplete', true, true],
  ] as const) {
    it(`${id} returns only real calls and preserves declaration options`, () => {
      const source = fixture(file); const uri = `file:///workspace/${file}.php`;
      const parsed = parser.parse(source);
      expect(parsed.errors.length > 0).toBe(hasError);
      parsed.tree.delete();
      const workspace = new SemanticWorkspace(parser);
      try {
        workspace.update(uri, source, true);
        for (const [declaration, call] of [['function render', '$printer->render()'], ['function emit', 'emit();']] as const) {
          const name = declaration.slice('function '.length);
          const declarationStart = source.indexOf(declaration) + 'function '.length;
          const callStart = expectedCalls ? source.lastIndexOf(call) + call.indexOf(name) : -1;
          const calls = expectedCalls ? [{ uri, start: callStart, end: callStart + name.length }] : [];
          expect(workspace.references(uri, declarationStart, false)).toEqual(calls);
          expect(workspace.references(uri, declarationStart, true)).toEqual([
            { uri, start: declarationStart, end: declarationStart + name.length }, ...calls,
          ]);
        }
      } finally { workspace.dispose(); }
    });
  }

  it('F04-REF-04 keeps top-level assignments separate from later and nested receivers', () => {
    const source = fixture('f04-references-global'); const uri = 'file:///workspace/f04-references-global.php';
    const parsed = parser.parse(source);
    expect(parsed.errors).toEqual([]);
    expect(parsed.assignments.filter((item) => item.variable === '$printer').map((item) => item.scopeId))
      .toEqual(['@global', '@global']);
    expect(parsed.assignments.find((item) => item.variable === '$closure')?.scopeId).toBe('@global');
    parsed.tree.delete();
    const workspace = new SemanticWorkspace(parser);
    try {
      workspace.update(uri, source, true);
      const declarationStart = source.indexOf('function render') + 'function '.length;
      const firstCallStart = source.indexOf('$printer->render()') + '$printer->'.length;
      expect(workspace.references(uri, declarationStart, false)).toEqual([
        { uri, start: firstCallStart, end: firstCallStart + 'render'.length },
      ]);
      const conditionalCall = source.indexOf('$maybe->render()') + '$maybe->'.length;
      expect(workspace.memberAt(uri, conditionalCall + 1)).toBeUndefined();
      const snapshot = workspace.snapshot(uri)!;
      expect(workspace.restore({ ...snapshot, schema: 81 }, uri)).toBe(false);
      workspace.remove(uri);
      expect(workspace.restore(snapshot, uri)).toBe(true);
      expect(workspace.references(uri, declarationStart, false)).toEqual([
        { uri, start: firstCallStart, end: firstCallStart + 'render'.length },
      ]);
    } finally { workspace.dispose(); }
  });
});
