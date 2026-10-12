import { afterAll, beforeAll, expect, it } from 'vitest';
import { PhpSyntaxParser } from '@php-companion/parser';
import { SemanticWorkspace } from '../src/index.js';
let parser: PhpSyntaxParser;
beforeAll(async () => { parser = await PhpSyntaxParser.createDefault(); });
afterAll(() => parser.dispose());
const uri = 'file:///UnreachableGuard.php';
const declarations = `<?php
class Base {} class Ready extends Base { public function onlyReady(): void {} }
/** @phpstan-assert-if-true Ready $value */ function ready(Base $value): bool { return true; }
function needReady(Ready $value): void {} function unknown(): void {}
`;
const cases = [
  ["return before unreachable call", "if (!ready($item)) { return; unknown(); } QUERY", true],
  ["return before unreachable assignment", "if (!ready($item)) { return; $run = false; } QUERY", true],
  ["throw before unreachable call", "if (!ready($item)) { throw new \\RuntimeException(); unknown(); } QUERY", true],
  ["loop break before unreachable call", "while ($run) { if (!ready($item)) { break; unknown(); } QUERY }", true],
  ["loop continue before unreachable call", "while ($run) { if (!ready($item)) { continue; unknown(); } QUERY }", true],
  ["all branches return before unreachable calls", "if (!ready($item)) { if ($run) { return; unknown(); } else { return; unknown(); } } QUERY", true],
  ["finally return before unreachable call", "if (!ready($item)) { try { unknown(); } finally { return; unknown(); } } QUERY", true],
  ["try and catch return before unreachable calls", "if (!ready($item)) { try { unknown(); return; unknown(); } catch (\\Throwable $e) { return; unknown(); } } QUERY", true],
  ["nonterminating body", "if (!ready($item)) { $run = false; unknown(); } QUERY", false],
  ["conditional return only", "if (!ready($item)) { if ($run) { return; } unknown(); } QUERY", false],
  ["nested confined break", "while ($run) { if (!ready($item)) { while ($run) { break; unknown(); } } QUERY }", false],
  ["continuing catch", "if (!ready($item)) { try { unknown(); return; unknown(); } catch (\\Throwable $e) { unknown(); } } QUERY", false],
  ["return control", "if (!ready($item)) { return; } QUERY", true],
  ["break control", "while ($run) { if (!ready($item)) { break; } QUERY }", true],
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
