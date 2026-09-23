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
});
