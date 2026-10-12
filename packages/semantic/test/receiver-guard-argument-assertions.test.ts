import { afterAll, beforeAll, expect, it } from 'vitest';
import { PhpSyntaxParser } from '@php-companion/parser';
import { SemanticWorkspace } from '../src/index.js';

let parser: PhpSyntaxParser;
beforeAll(async () => { parser = await PhpSyntaxParser.createDefault(); });
afterAll(() => parser.dispose());
const uri = 'file:///ReceiverGuardArguments.php';
const declarations = `<?php
class Base {
  /** @phpstan-assert-if-true Ready $this */ public function isReady(): bool { return true; }
  /** @psalm-assert-if-false Ready $this */ public function isNotReady(): bool { return false; }
}
class Ready extends Base { public function onlyReady(): void {} }
class Rejected extends Base {}
function needReady(Ready $value): void {}
function unknown($value): void {}
`;
const cases = [
  ['early return', 'Base $item', 'if (!$item->isReady()) { return; } QUERY', true],
  ['false assertion', 'Base $item', 'if ($item->isNotReady()) { return; } QUERY', true],
  ['loop break', 'Base $item', 'while ($run) { if (!$item->isReady()) { break; } QUERY }', true],
  ['loop continue', 'Base $item', 'while ($run) { if (!$item->isReady()) { continue; } QUERY }', true],
  ['outer loop exit', 'Base $item', 'while ($run) { while ($run) { if (!$item->isReady()) { break 2; } QUERY } }', true],
  ['exited loop', 'Base $item', 'while ($run) { if (!$item->isReady()) { break; } } QUERY', false],
  ['non-exiting guard', 'Base $item', 'if (!$item->isReady()) { $run = false; } QUERY', false],
  ['reassignment', 'Base $item', 'if (!$item->isReady()) { return; } $item = new Rejected(); QUERY', false],
  ['unknown mutation', 'Base $item', 'if (!$item->isReady()) { return; } unknown($item); QUERY', false],
  ['reference binding', 'Base $item', 'if (!$item->isReady()) { return; } $alias =& $item; QUERY', false],
  ['reference parameter', 'Base &$item', 'if (!$item->isReady()) { return; } QUERY', false],
  ['nullsafe receiver', '?Base $item', 'if (!$item?->isReady()) { return; } QUERY', false],
] as const;

for (const deferred of [false, true]) {
  it.each(cases)('%s (deferred=' + deferred + ')', (_name, parameter, body, narrowed) => {
    const workspace = new SemanticWorkspace(parser);
    const source = declarations + `function run(${parameter}, bool $run): void { `
      + body.replace('QUERY', '$item->onlyReady(); needReady($item);') + ' }';
    try {
      if (deferred) workspace.updateDeclarations(uri, source); else workspace.update(uri, source, true);
      expect(workspace.incompatibleArguments(uri)).toHaveLength(narrowed ? 0 : 1);
      expect(workspace.source(uri)).toBe(source);
    } finally { workspace.dispose(); }
  });
}
