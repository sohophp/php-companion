import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createIncrementalEdit, PhpSyntaxParser } from '../src/index.js';

describe('errors alongside healthy declarations', () => {
  let parser: PhpSyntaxParser;
  beforeAll(async () => { parser = await PhpSyntaxParser.createDefault(); });
  afterAll(() => parser.dispose());

  const fixtures = [
    { tail: 'function broken(: void {}', start: 16, end: 17 },
    { tail: 'function broken(int $a {return $a;} echo 2;', start: 22, end: 23 },
    { tail: '$a=[1,2; echo $a;', start: 7, end: 8 },
    { tail: '#[A(1] class Broken {}', start: 5, end: 6 },
    { tail: 'function unfinished(', start: 0, end: 20 },
    { tail: 'class Broken {public function __con', start: 0, end: 35 },
  ];
  for (const eol of ['\n', '\r\n']) it.each(fixtures)(
    `preserves error ranges, healthy facts and recovery with ${JSON.stringify(eol)}: $tail`,
    ({ tail, start, end }) => {
      const uri = 'file:///Errors.php';
      const prefix = `<?php${eol}/*🙂 中文*/ class Healthy {public const NAME="ok"; public function value(int $input):int{return $input;}}${eol}`;
      const source = prefix + tail;
      const parsed = parser.parse(source, undefined, uri);
      try {
        expect(parsed.errors).toEqual([{ start: prefix.length + start, end: prefix.length + end }]);
        expect(parsed.declarations[0]!.name).toBe('Healthy');
        expect(parsed.constants[0]!.name).toBe('NAME');
        expect(parsed.callables[0]!.parameters.map(parameter => parameter.name)).toEqual(['input']);
        expect(parsed.returns.map(item => source.slice(item.start, item.end))).toEqual(
          expect.arrayContaining(['return $input;']),
        );
        const good = parser.parse(prefix);
        let expected;
        try { const { tree, ...facts } = good; expect(tree.rootNode.text).toBe(prefix); expected = facts; }
        finally { good.tree.delete(); }
        parsed.tree.edit(createIncrementalEdit(source, prefix));
        const repaired = parser.parse(prefix, parsed.tree, uri);
        try {
          const { tree, ...facts } = repaired;
          expect(tree.rootNode.text).toBe(prefix);
          expect(facts).toEqual(expected);
          expect(repaired.errors).toEqual([]);
        } finally { repaired.tree.delete(); }
        // Restoring the same malformed buffer must not reuse the repaired facts.
        const restored = parser.parse(source, undefined, uri);
        try { expect(restored.errors).toEqual(parsed.errors); }
        finally { restored.tree.delete(); }
      } finally { parsed.tree.delete(); }
    },
  );
});
