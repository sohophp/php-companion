import { afterAll, beforeAll, expect, it } from 'vitest';
import { PhpSyntaxParser } from '../src/index.js';

let parser: PhpSyntaxParser;
beforeAll(async () => { parser = await PhpSyntaxParser.createDefault(); });
afterAll(() => { parser.dispose(); });
it.each(['𐐀get', '😀get'])('preserves the original %s token and UTF-16 ranges through recovery and cache copies', name => {
  const source = `<?php interface Contract { public function ${name}(): void; } function run(Contract $target): void { $target->${name}(); }`;
  const parsed = parser.parse(source, undefined, name);
  const copy = parser.parse(source, undefined, name);
  try {
    expect(parsed.errors).toEqual([]); expect(copy.errors).toEqual([]);
    const start = source.indexOf(`->${name}`) + 2;
    expect(parsed.memberAccesses).toContainEqual({ start, end: start + name.length, name, kind: 'method', static: false });
    expect(copy.memberAccesses).toEqual(parsed.memberAccesses);
    for (const tree of [parsed.tree, copy.tree]) {
      const node = tree.rootNode.descendantsOfType('name').find(node => node.startIndex === start);
      expect(node?.text).toBe(name); expect(node?.endIndex).toBe(start + name.length);
    }
    const changed = parser.parse(source.replace(`$target->${name}();`, ''), parsed.tree, name);
    try { expect(changed.errors).toEqual([]); expect(changed.memberAccesses).toEqual([]); }
    finally { changed.tree.delete(); }
  } finally { parsed.tree.delete(); copy.tree.delete(); }
});

it('keeps string/comment supplementary text and unrelated syntax errors unchanged', () => {
  const source = '<?php // 😀 is a comment\n$text = "😀"; function broken( {';
  const parsed = parser.parse(source);
  try { expect(parsed.errors.length).toBeGreaterThan(0); expect(parsed.tree.rootNode.text).toBe(source); }
  finally { parsed.tree.delete(); }
});
