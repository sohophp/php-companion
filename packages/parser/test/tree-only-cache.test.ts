import { describe, expect, it, vi } from 'vitest';
import { PhpSyntaxParser, createIncrementalEdit } from '../src/index.js';
import type { Tree } from 'web-tree-sitter';

describe('independently owned syntax-only document trees', () => {
  it('uses an existing document tree without parsing or copying mutable facts', async () => {
    const parser = await PhpSyntaxParser.createDefault();
    const source = '<?php class Example { public function run(): int { return 1; } }';
    const uri = 'file:///TreeOnly.php';
    const first = parser.parse(source, undefined, uri);
    first.declarations[0]!.name = 'ChangedByConsumer';
    first.tree.delete();
    const native = (parser as unknown as { parser: { parse: (...args: unknown[]) => Tree } }).parser;
    const parse = vi.spyOn(native, 'parse').mockImplementation(() => { throw new Error('Unexpected native reparse'); });
    const clone = vi.spyOn(globalThis, 'structuredClone').mockImplementation(() => { throw new Error('Unexpected fact copy'); });
    try {
      const tree = parser.parseTree(source, undefined, uri);
      try {
        expect(tree.rootNode.text).toBe(source);
        tree.edit(createIncrementalEdit(source, source.replace('return 1', 'return 2')));
      } finally { tree.delete(); }
      const another = parser.parseTree(source, undefined, uri);
      try { expect(another.rootNode.text).toBe(source); expect(another.rootNode.hasError).toBe(false); }
      finally { another.delete(); }
      expect(parse).not.toHaveBeenCalled(); expect(clone).not.toHaveBeenCalled();
    } finally { parse.mockRestore(); clone.mockRestore(); }
    try {
      const again = parser.parse(source, undefined, uri);
      try { expect(again.declarations[0]!.name).toBe('Example'); expect(again.tree.rootNode.text).toBe(source); }
      finally { again.tree.delete(); }
    } finally { parser.dispose(); }
  });

  it('checks both source and identity and leaves the full-fact cache intact on a miss', async () => {
    const parser = await PhpSyntaxParser.createDefault();
    const source = '<?php class Original {}'; const uri = 'file:///Original.php';
    parser.parse(source, undefined, uri).tree.delete();
    const native = (parser as unknown as { parser: { parse: (...args: unknown[]) => Tree } }).parser;
    const parse = vi.spyOn(native, 'parse');
    try {
      for (const [text, identity] of [[source, 'file:///Other.php'], ['<?php class Changed {}', uri], [source, '']]) {
        const before = parse.mock.calls.length;
        const tree = parser.parseTree(text!, undefined, identity);
        try { expect(tree.rootNode.text).toBe(text); expect(parse.mock.calls.length).toBeGreaterThan(before); }
        finally { tree.delete(); }
      }
      const before = parse.mock.calls.length;
      const cached = parser.parseTree(source, undefined, uri);
      try { expect(cached.rootNode.text).toBe(source); expect(parse.mock.calls.length).toBe(before); }
      finally { cached.delete(); }
    } finally { parse.mockRestore(); parser.dispose(); }
  });

  it.each([
    '<?php class mixed {}',
    '<?php trait A { function select() {} } trait B { function select() {} } class C { use A, B { A::select insteadof B; } }',
    '<?php /* 🙂 */ $next = clone($old, ["name" => "new"]);',
    '<?php class Broken { public function unfinished(',
  ])('keeps recovered and unfinished syntax identical to full parsing: %s', async source => {
    const parser = await PhpSyntaxParser.createDefault(); const uri = 'file:///Recovery.php';
    const parsed = parser.parse(source, undefined, uri); const expected = parsed.tree.rootNode.toString();
    parsed.tree.delete();
    const tree = parser.parseTree(source, undefined, uri);
    try {
      expect(tree.rootNode.toString()).toBe(expected);
      const next = source.replace('mixed', 'never') + '\n';
      tree.edit(createIncrementalEdit(source, next));
      const edited = parser.parseTree(next, tree, uri);
      const fresh = parser.parseTree(next);
      try { expect(edited.rootNode.toString()).toBe(fresh.rootNode.toString()); }
      finally { edited.delete(); fresh.delete(); }
    } finally { tree.delete(); parser.dispose(); }
  });
});
