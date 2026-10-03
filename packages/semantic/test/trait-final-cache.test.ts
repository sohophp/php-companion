import { afterAll, beforeAll, expect, it } from 'vitest';
import { PhpSyntaxParser } from '@php-companion/parser';
import { SemanticWorkspace } from '../src/index.js';
let parser: PhpSyntaxParser;
beforeAll(async () => { parser = await PhpSyntaxParser.createDefault(); });
afterAll(() => parser.dispose());
const parentUri = 'file:///FinalParent.php';
const childUri = 'file:///FinalChild.php';
const parent = '<?php trait Methods { public function seed(){} } class Base { use Methods { seed as final __construct; } }';
const child = '<?php class Child extends Base { public function __(){} }';
const position = child.indexOf('function __') + 'function __'.length;
const modes = ['restore', 'restoreDeclaration', 'restoreSourceDeclaration'] as const;
it.each(modes)('preserves final aliases and replaces warmed facts through %s', mode => {
  const donor = new SemanticWorkspace(parser); const restored = new SemanticWorkspace(parser);
  try {
    const snapshotFor = (source: string): unknown => {
      donor.update(parentUri, source, true);
      return mode === 'restoreSourceDeclaration' ? donor.sourceDeclarationSnapshot(parentUri) : donor.snapshot(parentUri);
    };
    const finalSnapshot = snapshotFor(parent);
    const ordinarySnapshot = snapshotFor(parent.replace('as final', 'as'));
    restored.update(parentUri, parent.replace('as final', 'as')); restored.update(childUri, child, true);
    const finals = (): string[] => (restored.phpDeclarationNameCompletionContext(childUri, position)?.inheritedFinalMethods ?? []).map(item => item.name);
    expect(finals()).toEqual([]);
    expect(restored[mode](finalSnapshot, parentUri)).toBe(true);
    expect(finals()).toEqual(['__construct']); expect(finals()).toEqual(['__construct']);
    expect(restored[mode](ordinarySnapshot, parentUri)).toBe(true);
    expect(finals()).toEqual([]);
    expect(restored[mode](finalSnapshot, parentUri)).toBe(true);
    expect(finals()).toEqual(['__construct']);
  } finally { donor.dispose(); restored.dispose(); }
});
it.each(modes)('rejects missing and malformed alias final facts through %s without changing live facts', mode => {
  const donor = new SemanticWorkspace(parser); const restored = new SemanticWorkspace(parser);
  try {
    donor.update(parentUri, parent);
    const snapshot = mode === 'restoreSourceDeclaration' ? donor.sourceDeclarationSnapshot(parentUri)! : donor.snapshot(parentUri)!;
    restored.update(parentUri, parent); restored.update(childUri, child, true);
    for (const flag of [undefined, 'true', null, 1]) {
      const invalid = structuredClone(snapshot);
      const adaptation = invalid.declaration.declarations.find(item => item.name === 'Base')!.traitAdaptations[0]!;
      if (adaptation.kind !== 'alias') throw new Error('Expected alias');
      if (flag === undefined) delete adaptation.final;
      else (adaptation as { final?: unknown }).final = flag;
      expect(restored[mode](invalid, parentUri), String(flag)).toBe(false);
      expect(restored.phpDeclarationNameCompletionContext(childUri, position)?.inheritedFinalMethods).toEqual([{ name: '__construct', visibility: 'public' }]);
    }
    // The previous format could omit entire unsupported adaptation clauses.
    const legacy = structuredClone(snapshot);
    (legacy as { schema: number }).schema = mode === 'restoreSourceDeclaration' ? 1 : 82;
    legacy.declaration.declarations.find(item => item.name === 'Base')!.traitAdaptations = [];
    expect(restored[mode](legacy, parentUri)).toBe(false);
  } finally { donor.dispose(); restored.dispose(); }
});
it.each([
  ['trait alias', parent, parent.replace('as final', 'as')],
  ['native method', '<?php class Base { final public function __construct(){} }', '<?php class Base { public function __construct(){} }'],
])('classifies a changed %s final contract as a declaration change', (_label, before, after) => {
  const workspace = new SemanticWorkspace(parser);
  try {
    workspace.update(parentUri, before, true); workspace.update(childUri, child, true);
    expect(workspace.phpDeclarationNameCompletionContext(childUri, position)?.inheritedFinalMethods?.map(item => item.name)).toEqual(['__construct']);
    expect(workspace.update(parentUri, after, true)).toMatchObject({ kind: 'declaration', changedTypes: ['base'] });
    expect(workspace.phpDeclarationNameCompletionContext(childUri, position)?.inheritedFinalMethods ?? []).toEqual([]);
    expect(workspace.update(parentUri, before, true)).toMatchObject({ kind: 'declaration', changedTypes: ['base'] });
    expect(workspace.phpDeclarationNameCompletionContext(childUri, position)?.inheritedFinalMethods?.map(item => item.name)).toEqual(['__construct']);
  } finally { workspace.dispose(); }
});
