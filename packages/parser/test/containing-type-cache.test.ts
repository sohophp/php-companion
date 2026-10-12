import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { Node } from 'web-tree-sitter';
import { createIncrementalEdit, PhpSyntaxParser } from '../src/index.js';

let parser: PhpSyntaxParser;
beforeAll(async () => { parser = await PhpSyntaxParser.createDefault(); });
afterAll(() => parser.dispose());

describe.each([false, true])('containing type cache (declarations=%s)', declarations => {
  it('bounds repeated owner-name reads across constant siblings', () => {
    const source = '<?php namespace Owner; class C {' + Array.from({ length: 100 }, (_, i) => `/** doc ${i} */ const K${i}=${i};`).join('') + '}';
    const original = Node.prototype.childForFieldName;
    let ownerNameReads = 0;
    const spy = vi.spyOn(Node.prototype, 'childForFieldName').mockImplementation(function (this: Node, field: string): ReturnType<Node['childForFieldName']> {
      if (field === 'name' && this.type === 'class_declaration') ownerNameReads++;
      return original.call(this, field);
    });
    try {
      const parsed = declarations ? parser.parseDeclarations(source, 'file:///Siblings.php') : parser.parse(source, undefined, 'file:///Siblings.php');
      try {
        expect(parsed.constants.map(item => [item.name, item.containerFqcn, item.value])).toEqual(
          Array.from({ length: 100 }, (_, i) => [`K${i}`, 'Owner\\C', String(i)]));
        expect(ownerNameReads).toBeLessThanOrEqual(3);
      } finally { parsed.tree.delete(); }
    } finally { spy.mockRestore(); }
  });

  it('preserves namespaces, declaration case and the first exact duplicate owner', () => {
    const source = '<?php namespace A { class C { public int $first; } readonly class C { public int $duplicate; } readonly class c { public int $lower; } } namespace B { readonly class C { public int $other; } }';
    const parsed = declarations ? parser.parseDeclarations(source, 'file:///Names.php') : parser.parse(source, undefined, 'file:///Names.php');
    try {
      expect(parsed.properties.map(item => [item.name, item.containerFqcn, item.readonly])).toEqual([
        ['first', 'A\\C', false], ['duplicate', 'A\\C', false], ['lower', 'A\\c', true], ['other', 'B\\C', true],
      ]);
    } finally { parsed.tree.delete(); }
  });

  it('keeps nested anonymous owners and document identities separate', () => {
    const source = '<?php // 中文 😀\nnamespace A; class C { const ROOT=1; function f() { return new class { const CHILD=2; function g() { return new class { const LEAF=3; }; } }; } }';
    for (const uri of ['file:///First.php', 'file:///Second.php']) {
      const parsed = declarations ? parser.parseDeclarations(source, uri) : parser.parse(source, undefined, uri);
      try {
        const anonymous = parsed.declarations.filter(item => item.anonymous);
        expect(anonymous).toHaveLength(2);
        expect(anonymous.map(item => item.fqcn)).toEqual([
          `A\\@anonymous:${encodeURIComponent(uri)}:${source.indexOf('class { const CHILD')}`,
          `A\\@anonymous:${encodeURIComponent(uri)}:${source.indexOf('class { const LEAF')}`,
        ]);
        expect(parsed.constants.map(item => [item.name, item.containerFqcn])).toEqual([
          ['ROOT', 'A\\C'], ['CHILD', anonymous[0]!.fqcn], ['LEAF', anonymous[1]!.fqcn],
        ]);
      } finally { parsed.tree.delete(); }
    }
  });

  it('recomputes owner state after edits and incomplete-source recovery', () => {
    const sources = [
      { text: '<?php namespace A; class C { public int $p; const K=1; }', fqcn: 'A\\C', readonly: false },
      { text: '<?php namespace B; readonly class C { public int $p; const K=2; } function unfinished(', fqcn: 'B\\C', readonly: true },
      { text: '<?php namespace A; class C { public int $p; const K=3; }', fqcn: 'A\\C', readonly: false },
    ];
    let previous: string | undefined;
    let tree: ReturnType<PhpSyntaxParser['parse']>['tree'] | undefined;
    try {
      for (const [index, item] of sources.entries()) {
        if (!declarations && previous !== undefined) tree?.edit(createIncrementalEdit(previous, item.text));
        const parsed = declarations ? parser.parseDeclarations(item.text, 'file:///Edited.php') : parser.parse(item.text, tree, 'file:///Edited.php');
        tree?.delete(); tree = parsed.tree;
        expect(parsed.properties.map(property => [property.containerFqcn, property.readonly])).toEqual([[item.fqcn, item.readonly]]);
        expect(parsed.constants.map(constant => [constant.containerFqcn, constant.value])).toEqual([[item.fqcn, String(index + 1)]]);
        previous = item.text;
      }
    } finally { tree?.delete(); }
  });
});
