import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { Node } from 'web-tree-sitter';
import { createIncrementalEdit, PhpSyntaxParser } from '../src/index.js';

let parser: PhpSyntaxParser;
beforeAll(async () => { parser = await PhpSyntaxParser.createDefault(); });
afterAll(() => parser.dispose());

describe('fact filtering during syntax recovery', () => {
  it.each(['function unfinished(', '$x = ; function tail() { return 1; }'])('keeps valid constants without walking inert integer children: %s', suffix => {
    const source = '<?php class Bulk {' + Array.from({ length: 100 }, (_, i) => `/** doc ${i} */ const K${i}=${i};`).join('') + '}\n' + suffix;
    const getter = Object.getOwnPropertyDescriptor(Node.prototype, 'namedChildren')!.get!;
    let inertIntegerReads = 0;
    const spy = vi.spyOn(Node.prototype, 'namedChildren', 'get').mockImplementation(function (this: Node): Node['namedChildren'] {
      if (this.type === 'integer') inertIntegerReads++;
      return getter.call(this) as Node['namedChildren'];
    });
    try {
      const parsed = parser.parse(source, undefined, 'file:///Bulk.php');
      try {
        expect(parsed.tree.rootNode.hasError).toBe(true);
        expect(parsed.constants.map(item => [item.name, item.containerFqcn, item.value])).toEqual(Array.from({ length: 100 }, (_, i) => [`K${i}`, 'Bulk', String(i)]));
        expect(inertIntegerReads).toBe(0);
      } finally { parsed.tree.delete(); }
    } finally { spy.mockRestore(); }
  });

  it.each([
    '<?php function f($x) { foo($x; } class C { const K=1; }',
    '<?php function f(){ return [1,2; } class C { const K=1; }',
  ])('retains missing punctuation inside the source and adjacent declarations: %s', source => {
    const parsed = parser.parse(source, undefined, 'file:///Punctuation.php');
    try {
      const missing = source.indexOf(';');
      expect(parsed.errors).toEqual([{ start: missing, end: missing + 1 }]);
      expect(parsed.callables.map(item => [item.name, item.fqcn])).toEqual([['f', 'f']]);
      expect(parsed.constants.map(item => [item.name, item.containerFqcn, item.value])).toEqual([['K', 'C', '1']]);
    } finally { parsed.tree.delete(); }
  });

  it('preserves an unfinished declaration error and Unicode source ranges', () => {
    const source = '<?php // 中文 😀\nnamespace A; class C { const K=1; } function unfinished(';
    const parsed = parser.parse(source, undefined, 'file:///Unicode.php');
    try {
      expect(parsed.errors).toEqual([{ start: source.indexOf('function unfinished'), end: source.length }]);
      expect(parsed.constants.map(item => [item.name, item.containerFqcn, item.value])).toEqual([['K', 'A\\C', '1']]);
      expect(parsed.callables).toEqual([]);
    } finally { parsed.tree.delete(); }
  });

  it('refreshes missing-token errors and namespace facts after retained-tree edits', () => {
    const sources = [
      '<?php // 中文 😀\nnamespace A; class C { const K=1; } function f($x) { foo($x; }',
      '<?php // 中文 😀\nnamespace B; class C { const K=2; } function f($x) { foo($x); }',
      '<?php // 文 😀\nnamespace A; class C { const K=3; } function f($x) { foo($x; }',
    ];
    let tree: ReturnType<PhpSyntaxParser['parse']>['tree'] | undefined;
    let previous: string | undefined;
    try {
      for (const [index, source] of sources.entries()) {
        if (previous !== undefined) tree?.edit(createIncrementalEdit(previous, source));
        const parsed = parser.parse(source, tree, 'file:///Edited.php');
        tree?.delete(); tree = parsed.tree;
        const missing = source.indexOf('; }', source.indexOf('foo('));
        expect(parsed.errors).toEqual(index === 1 ? [] : [{ start: missing, end: missing + 1 }]);
        expect(parsed.constants.map(item => [item.containerFqcn, item.value])).toEqual([[index === 1 ? 'B\\C' : 'A\\C', String(index + 1)]]);
        expect(parsed.callables.map(item => item.fqcn)).toEqual([index === 1 ? 'B\\f' : 'A\\f']);
        previous = source;
      }
    } finally { tree?.delete(); }
  });
});
