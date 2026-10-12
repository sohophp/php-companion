import { afterAll, beforeAll, expect, it, vi } from 'vitest';
import { Node } from 'web-tree-sitter';
import { createIncrementalEdit, PhpSyntaxParser } from '../src/index.js';
let parser: PhpSyntaxParser;
beforeAll(async () => { parser = await PhpSyntaxParser.createDefault(); });
afterAll(() => parser.dispose());

it.each(['0o', '0O', '0o_7', '0O_7', '0o8', '0o__'])('rejects malformed explicit octal %s with its complete range', literal => {
  const source = '<?php // 中文 😀\n$value=' + literal + '; class C {}', parsed = parser.parse(source);
  try {
    const start = source.indexOf(literal);
    expect(parsed.errors).toEqual([{ start, end: start + literal.length }]);
    expect(parsed.declarations.map(d => d.name)).toEqual(['C']);
  } finally { parsed.tree.delete(); }
});

it('keeps valid octal and inert prefixes out of error facts', () => {
  const source = '0o outside PHP <?php /* 0o 0o_7 */ $s="0O"; $a=0o755; $b=0O7_55; $c=0755;';
  const parsed = parser.parse(source);
  try { expect(parsed.errors).toEqual([]); } finally { parsed.tree.delete(); }
});

it('retains both malformed numbers and independent unfinished declarations in source order', () => {
  const source = '<?php $value=0o; function unfinished(', parsed = parser.parse(source);
  try { expect(parsed.errors).toEqual([{ start: source.indexOf('0o'), end: source.indexOf('0o') + 2 }, { start: source.indexOf('function unfinished'), end: source.length }]); }
  finally { parsed.tree.delete(); }
});

it('refreshes octal errors across retained-tree edits and Unicode ranges', () => {
  let previous = '', tree: ReturnType<PhpSyntaxParser['parseTree']> | undefined;
  try {
    for (const literal of ['0o', '0o755', '0O_7', '0O7_55', '0o']) {
      const source = '<?php // 中文 😀\n$value=' + literal + ';';
      tree?.edit(createIncrementalEdit(previous, source));
      const parsed = parser.parse(source, tree); tree?.delete(); tree = parsed.tree;
      const start = source.indexOf(literal);
      expect(parsed.errors).toEqual(['0o', '0O_7'].includes(literal) ? [{ start, end: start + literal.length }] : []);
      previous = source;
    }
  } finally { tree?.delete(); }
});

it('avoids an integer candidate query in ordinary or valid-prefix source', () => {
  const spy = vi.spyOn(Node.prototype, 'descendantsOfType');
  try {
    const parsed = parser.parse('<?php $x=1; $octal=0o755;');
    try {
      expect(parsed.errors).toEqual([]);
      expect(spy.mock.calls.some(([types]) => types === 'integer' || Array.isArray(types) && types.length === 1 && types[0] === 'integer')).toBe(false);
    } finally { parsed.tree.delete(); }
  } finally { spy.mockRestore(); }
});
