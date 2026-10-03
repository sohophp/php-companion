import { afterAll, beforeAll, expect, it } from 'vitest';
import { PhpSyntaxParser } from '../src/index.js';
let parser: PhpSyntaxParser;
beforeAll(async () => { parser = await PhpSyntaxParser.createDefault(); });
afterAll(() => parser.dispose());
it.each([
  ['seed as final __construct', 'seed', '__construct'],
  ['__construct as final', '__construct', undefined],
  ['Methods::seed as FINAL __invoke', 'seed', '__invoke'],
  ['seed /* a */ as /* b */ final /* c */ __construct', 'seed', '__construct'],
  ['seed中文 as final __construct', 'seed中文', '__construct'],
])('preserves final trait adaptation facts and ranges for %s', (clause, method, alias) => {
  const source = `<?php trait Methods { public function seed(){} public function seed中文(){} public function __construct(){} } class Base { use Methods { ${clause}; } }`;
  const parsed = parser.parse(source);
  try {
    expect(parsed.tree.rootNode.hasError).toBe(false);
    const adaptations = parsed.declarations.find(item => item.name === 'Base')!.traitAdaptations;
    expect(adaptations).toHaveLength(1);
    expect(adaptations[0]).toMatchObject({ kind: 'alias', method, final: true });
    if (adaptations[0]!.kind === 'alias') expect(adaptations[0].alias).toBe(alias);
    expect(source.slice(adaptations[0]!.start, adaptations[0]!.end)).toBe(clause);
  } finally { parsed.tree.delete(); }
});
it('does not recover invalid modifier combinations or change string contents', () => {
  for (const clause of ['seed as protected final __construct', 'seed as final protected __construct']) {
    const source = `<?php trait Methods { public function seed(){} } class Base { use Methods { ${clause}; } }`;
    const parsed = parser.parse(source); try { expect(parsed.tree.rootNode.hasError).toBe(true); } finally { parsed.tree.delete(); }
  }
  const source = "<?php $text = 'use Methods { seed as final __construct; }'; // seed as final __construct\n";
  const parsed = parser.parse(source); try { expect(parsed.tree.rootNode.hasError).toBe(false); expect(parsed.declarations).toEqual([]); } finally { parsed.tree.delete(); }
});
it('reparses recovered final trait syntax after an edit', () => {
  const source = '<?php trait Methods { public function seed(){} } class Base { use Methods { seed as final __construct; } }';
  const oldTree = parser.parseTree(source);
  const updated = source.replace('as final __construct', 'as __construct');
  const nextTree = parser.parseTree(updated, oldTree);
  try { expect(nextTree.rootNode.hasError).toBe(false); } finally { nextTree.delete(); oldTree.delete(); }
  const parsed = parser.parse(updated); try { expect(parsed.declarations.find(item => item.name === 'Base')!.traitAdaptations[0]).toHaveProperty('final', false); } finally { parsed.tree.delete(); }
});
