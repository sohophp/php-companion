import { afterAll, beforeAll, expect, it } from 'vitest';
import { PhpSyntaxParser } from '@php-companion/parser';
import { SemanticWorkspace } from '../src/index.js';
let parser: PhpSyntaxParser;
beforeAll(async () => { parser = await PhpSyntaxParser.createDefault(); });
afterAll(() => parser.dispose());
const uri = 'file:///UnreachableCallEffects.php';
const declarations = `<?php
class Base {} class Ready extends Base { public function onlyReady(): void {} }
/** @phpstan-assert-if-true Ready $item */ function ready(Base $item): bool { return true; }
function needReady(Ready $item): void {} function unknown($item): void {}
function mutate(Base &$item): void {}
`;
const cases = [
  ['return tail', 'if (!ready($item)) { return; unknown($item); } QUERY', true],
  ['throw tail', 'if (!ready($item)) { throw new \\RuntimeException(); unknown($item); } QUERY', true],
  ['reference call tail', 'if (!ready($item)) { return; mutate($item); } QUERY', true],
  ['nested block tail', 'if (!ready($item)) { return; if ($run) { unknown($item); } } QUERY', true],
  ['continuing call', 'if (!ready($item)) { return; } unknown($item); QUERY', false],
  ['conditional return', 'if (!ready($item)) { if ($run) { return; } unknown($item); } QUERY', false],
  ['live finally', 'try { if (!ready($item)) { return; } } finally { unknown($item); } QUERY', false],
  ['goto reentry', 'if (!ready($item)) { goto target; return; target: unknown($item); return; } QUERY', false],
] as const;
for (const deferred of [false, true]) {
  it.each(cases)('%s (deferred=' + deferred + ')', (_name, body, narrowed) => {
    const workspace = new SemanticWorkspace(parser);
    const source = declarations + 'function run(Base $item, bool $run): void { '
      + body.replace('QUERY', '$item->onlyReady(); needReady($item);') + ' }';
    try {
      if (deferred) workspace.updateDeclarations(uri, source); else workspace.update(uri, source, true);
      const offset = source.lastIndexOf('onlyReady') + 1;
      expect(workspace.completeMembers(uri, offset).some(item => item.name === 'onlyReady')).toBe(narrowed);
      expect(workspace.memberAt(uri, offset)?.fqcn === 'Ready::onlyReady').toBe(narrowed);
      expect(workspace.incompatibleArguments(uri)).toHaveLength(narrowed ? 0 : 1);
      expect(workspace.source(uri)).toBe(source);
    } finally { workspace.dispose(); }
  });
}
