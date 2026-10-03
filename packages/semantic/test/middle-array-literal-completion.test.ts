import { afterAll, beforeAll, expect, it } from 'vitest';
import { PhpSyntaxParser } from '@php-companion/parser';
import { SemanticWorkspace } from '../src/index.js';
import { unfinishedShapeContexts, unfinishedShapeSource, unfinishedShapeTail } from '../../../test/extension/suite/unfinishedShapeFixture.js';

let parser: PhpSyntaxParser;
beforeAll(async () => { parser = await PhpSyntaxParser.createDefault(); });
afterAll(() => parser.dispose());
const cases = unfinishedShapeContexts.flatMap(context => (['key', 'value'] as const)
  .flatMap(part => ["'", '"'].map(quote => ({ context, part, quote }))));

it.each(cases)('recovers middle $context $part with $quote without changing the source', ({ context, part, quote }) => {
  const workspace = new SemanticWorkspace(parser), uri = 'file:///MiddleLiteral.php';
  try {
    for (const [key, value, expected] of [['mode', 'create', true], ['other', 'refresh', false], ['mode', 'create', true]] as const) {
      const prefix = unfinishedShapeSource('choose', key, value, context, part)
        .replace(part === 'key' ? `['${key.slice(0, 2)}` : `['${key}'=>'${value.slice(0, 2)}`,
          part === 'key' ? `[${quote}mo` : `['${key}'=>${quote}cr`);
      const offset = prefix.length, source = prefix + unfinishedShapeTail(context);
      workspace.update(uri, source, true);
      const revision = workspace.revision(), snapshot = JSON.stringify(workspace.snapshot(uri));
      const result = workspace.completionContext(uri, offset);
      if (part === 'key') {
        expect(result.kind === 'shape-key' ? result.shapeKeys.keys.map(field => field.name) : [])
          .toEqual(expected ? ['mode'] : []);
        if (expected && result.kind === 'shape-key') {
          expect(result.shapeKeys.end).toBe(offset);
          expect(source.slice(result.shapeKeys.start, result.shapeKeys.end)).toBe(`${quote}mo`);
          const accepted = source.slice(0, result.shapeKeys.start) + `${quote}mode${quote} => null` + source.slice(offset);
          expect(accepted.endsWith(unfinishedShapeTail(context))).toBe(true);
          expect(parser.parse(accepted).errors).toEqual([]);
        }
      } else {
        expect(result.kind === 'general' ? result.expectedValues.map(item => item.label) : [])
          .toEqual(expected ? [`${quote}create${quote}`] : []);
        if (expected && result.kind === 'general') {
          expect(result.expectedValues[0]!.end).toBe(offset);
          expect(source.slice(result.expectedValues[0]!.start, offset)).toBe(`${quote}cr`);
          const accepted = source.slice(0, result.expectedValues[0]!.start)
            + result.expectedValues[0]!.insertText + source.slice(offset);
          expect(accepted.endsWith(unfinishedShapeTail(context))).toBe(true);
          expect(parser.parse(accepted).errors).toEqual([]);
        }
      }
      expect(workspace.source(uri)).toBe(source);
      expect(workspace.revision()).toBe(revision);
      expect(JSON.stringify(workspace.snapshot(uri))).toBe(snapshot);
    }
  } finally { workspace.dispose(); }
});

const declaration = "<?php /** @param array{mode:'create'} $options */ function choose(array $options):void{} ";
it.each([
  ['unknown call', declaration + "unknown(['mo§]); echo 'done';"],
  ['unknown nested call', declaration + "choose(unknown(['mo§])); echo 'done';"],
  ['unknown shape', declaration.replace("array{mode:'create'}", 'array') + "choose(['mo§]); echo 'done';"],
  ['mixed shape', declaration.replace("array{mode:'create'}", "array{mode:'create'}|array") + "choose(['mo§]); echo 'done';"],
  ['comment', declaration + "// choose(['mo§]); echo 'done';"],
  ['HTML', declaration + "?>choose(['mo§]); echo 'done';"],
  ['remaining syntax error', declaration + "choose(['mo§]); echo 'done'; class {"],
  ['nonarray contract', declaration.replace("array{mode:'create'}", 'string') + "choose(['mo§]); echo 'done';"],
] as const)('does not invent middle array facts: %s', (_, marked) => {
  const workspace = new SemanticWorkspace(parser), uri = 'file:///UnknownMiddleLiteral.php';
  try {
    for (const part of ['key', 'value']) {
      const input = part === 'key' ? marked : marked.replace("'mo§", "'mode'=>'cr§");
      const offset = input.indexOf('§');
      workspace.update(uri, input.replace('§', ''), true);
      expect(workspace.completeArrayShapeKeys(uri, offset)?.keys ?? []).toEqual([]);
      expect(workspace.completeExpectedValues(uri, offset)).toEqual([]);
    }
  } finally { workspace.dispose(); }
});
