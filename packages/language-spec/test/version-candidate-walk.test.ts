import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { Node } from 'web-tree-sitter';
import { createIncrementalEdit, PhpSyntaxParser } from '@php-companion/parser';
import { SUPPORTED_PHP_VERSIONS, unsupportedSyntax, type SyntaxNodeLike } from '../src/index.js';

let parser: PhpSyntaxParser;
beforeAll(async () => { parser = await PhpSyntaxParser.createDefault(); });
afterAll(() => parser.dispose());

function recursiveRoot(node: Node): SyntaxNodeLike & Pick<Node, 'childForFieldName'> {
  return {
    type: node.type, text: node.text, startIndex: node.startIndex, endIndex: node.endIndex,
    namedChildren: node.namedChildren, children: node.children, parent: node.parent,
    childForFieldName: node.childForFieldName.bind(node),
  };
}

function compareVersions(node: Node, source: string): void {
  const recursive = recursiveRoot(node);
  for (const version of SUPPORTED_PHP_VERSIONS) {
    expect(unsupportedSyntax(node, version, source)).toEqual(unsupportedSyntax(recursive, version, source));
  }
}

describe('version feature candidate walk', () => {
  it('bounds node enumeration in large ordinary assignment bodies', () => {
    const source = '<?php function f(){' + Array.from({ length: 500 }, (_, i) => `$v${i}=${i};`).join('') + '}';
    const tree = parser.parseTree(source);
    const original = Object.getOwnPropertyDescriptor(Node.prototype, 'namedChildren')!.get!;
    let reads = 0;
    const spy = vi.spyOn(Node.prototype, 'namedChildren', 'get').mockImplementation(function (this: Node) {
      reads++;
      return original.call(this) as Node[];
    });
    try {
      expect(unsupportedSyntax(tree.rootNode, '7.2', source)).toEqual([]);
      expect(reads).toBeLessThan(30);
    } finally { spy.mockRestore(); tree.delete(); }
  });

  for (const [name, source] of [
    ['mixed feature order', '<?php #[A] enum E:string {case A="a";} class C { public private(set) string $p; public const string K="k"; function f(A|B $x):static{return $x?->g(a:1,);} } $x=clone($y,["p"=>2]); $z=new C()->f(); $v=match($x){1=>2};'],
    ['unfinished modern declarations', '<?php // 中文 😀\n readonly class C { public string $p { get; } function f(false|null $x,?false $y,true $z):never{} } $a=C::{$name}; $x??=1_000; $z=fn()=>foo(...); function unfinished(A|'],
    ['void recovery and inert text', '<?php /* (void) comment */ $s="(void)"; ( VoId )foo(); for((void)foo();$x;(void)bar()){}'],
  ] as const) {
    it(`preserves feature contents, ranges and order: ${name}`, () => {
      const tree = parser.parseTree(source);
      try { compareVersions(tree.rootNode, source); }
      finally { tree.delete(); }
    });
  }

  it('includes a feature root exactly once', () => {
    const source = '<?php function f(A|B $x){}';
    const tree = parser.parseTree(source);
    try {
      const union = tree.rootNode.descendantsOfType('union_type')[0]!;
      expect(unsupportedSyntax(union, '7.2', source)).toEqual([
        { feature: 'union type', minimumVersion: '8.0', start: union.startIndex, end: union.endIndex },
      ]);
    } finally { tree.delete(); }
  });

  it('retains source-less and structural callers', () => {
    const source = '<?php function f(A|B $x){return $x?->g(a:1,);}';
    const tree = parser.parseTree(source);
    try {
      for (const version of SUPPORTED_PHP_VERSIONS) {
        expect(unsupportedSyntax(tree.rootNode, version)).toEqual(unsupportedSyntax(recursiveRoot(tree.rootNode), version));
      }
    } finally { tree.delete(); }
    const node = { type: 'enum_declaration', text: 'enum E{}', startIndex: 0, endIndex: 8, namedChildren: [] };
    expect(unsupportedSyntax(node, '7.2', node.text)).toEqual([
      { feature: 'enum', minimumVersion: '8.1', start: 0, end: 8 },
    ]);
  });

  it('preserves incremental edits, Unicode positions and recovery', () => {
    let previous = '', tree: ReturnType<PhpSyntaxParser['parseTree']> | undefined;
    try {
      for (const source of [
        '<?php // 中文 😀\nnamespace A; class C {public int $x;}',
        '<?php // 中文 😀\nnamespace B; enum E:string {case A="a";} function incomplete(',
        '<?php // 中文 😀\nnamespace A; class C {public int $x;}',
      ]) {
        tree?.edit(createIncrementalEdit(previous, source));
        const next = parser.parseTree(source, tree);
        tree?.delete(); tree = next;
        compareVersions(tree.rootNode, source);
        previous = source;
      }
    } finally { tree?.delete(); }
  });

  it('keeps the newest-version early return and generic void recovery', () => {
    const source = '<?php ( \nVoId\t )foo();';
    const tree = parser.parseTree(source);
    const spy = vi.spyOn(Node.prototype, 'descendantsOfType');
    try {
      expect(unsupportedSyntax(tree.rootNode, '8.5', source)).toEqual([]);
      compareVersions(tree.rootNode, source);
      expect(spy).not.toHaveBeenCalled();
    } finally { spy.mockRestore(); tree.delete(); }
  });
});
