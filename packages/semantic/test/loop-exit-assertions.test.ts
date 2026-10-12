import { afterAll, beforeAll, expect, it } from 'vitest';
import { PhpSyntaxParser } from '@php-companion/parser';
import { SemanticWorkspace } from '../src/index.js';

let parser: PhpSyntaxParser;
beforeAll(async () => { parser = await PhpSyntaxParser.createDefault(); });
afterAll(() => parser.dispose());
const uri = 'file:///LoopExitAssertions.php';
const declarations = `<?php
class Base {} class Ready extends Base { public function onlyReady(): void {} }
class Rejected extends Base {}
/** @phpstan-assert-if-true Ready $value */ function isReady(?Base $value): bool { return true; }
/** @psalm-assert-if-false Ready $value */ function isNotReady(?Base $value): bool { return false; }
/** @phpstan-assert-if-true !(Rejected|null) $value */ function accepted(?Base $value): bool { return true; }
function needReady(Ready $value): void {} function unknown($value): void {}
`;
const cases = [
  ['foreach break', 'foreach ($items as $item) { GUARD QUERY }', 'break;', true],
  ['while break', 'while ($run) { GUARD QUERY }', 'break 1;', true],
  ['parenthesized break', 'while ($run) { GUARD QUERY }', 'break (/* level */ 1);', true],
  ['for break', 'for (;;) { GUARD QUERY }', 'break /* comment */ 0x1;', true],
  ['do break', 'do { GUARD QUERY } while ($run);', 'break 0b1;', true],
  ['foreach continue', 'foreach ($items as $item) { GUARD QUERY }', 'continue;', true],
  ['outer break', 'while ($run) { foreach ($items as $item) { GUARD QUERY } }', 'break 2;', true],
  ['outer continue', 'while ($run) { foreach ($items as $item) { GUARD QUERY } }', 'continue 2;', true],
  ['switch break', 'while ($run) { switch ($key) { default: { GUARD QUERY } } }', 'break;', true],
  ['switch continue', 'while ($run) { switch ($key) { default: { GUARD QUERY } } }', 'continue;', true],
  ['zero continue', 'while ($run) { GUARD QUERY }', 'continue 0;', false],
  ['excessive continue', 'while ($run) { GUARD QUERY }', 'continue 2;', false],
  ['dynamic continue', 'while ($run) { GUARD QUERY }', 'continue $level;', false],
  ['switch inside guard', 'while ($run) { GUARD QUERY }', 'switch ($key) { case 1: break; default: break; }', false],
  ['nested loop inside guard', 'while ($run) { GUARD QUERY }', 'while ($run) { break; }', false],
] as const;

for (const deferred of [false, true]) {
  it('preserves generic parameter assertions for arguments (deferred=' + deferred + ')', () => {
    const workspace = new SemanticWorkspace(parser);
    const source = declarations + `
      /** @template T */ class Box { /** @return T */ public function get() {} }
      /** @phpstan-assert-if-true !Box<Rejected> $value */ function acceptedBox(Box $value): bool { return true; }
      /** @param Box<Ready> $value */ function needBox(Box $value): void {}
      /** @param Box<Ready>|Box<Rejected> $item */ function run(Box $item, bool $run): void {
        while ($run) {
          if (!acceptedBox($item)) { break; } needBox($item);
          if (!acceptedBox($item)) { break; } needReady($item->get());
          if (!acceptedBox($item)) { break; } $item->get()->onlyReady();
        }
      }`;
    try {
      if (deferred) workspace.updateDeclarations(uri, source); else workspace.update(uri, source, true);
      const offset = source.lastIndexOf('onlyReady') + 4;
      expect(workspace.memberAt(uri, offset)?.fqcn).toBe('Ready::onlyReady');
      expect(workspace.incompatibleArguments(uri)).toEqual([]);
    } finally { workspace.dispose(); }
  });

  for (const assertion of ['!isReady($item)', 'isNotReady($item)', '!accepted($item)']) {
    it.each(cases)('%s with ' + assertion + ' (deferred=' + deferred + ')', (_label, body, jump, narrowed) => {
      const workspace = new SemanticWorkspace(parser);
      const source = declarations + '/** @param list<Ready|Rejected|null> $items */ '
        + 'function run(Ready|Rejected|null $item, array $items, bool $run, int $key, int $level): void { '
        + body.replace('GUARD', `if (${assertion}) { ${jump} }`)
          .replace('QUERY', '$item->onlyReady(); needReady($item);') + ' }';
      try {
        if (deferred) workspace.updateDeclarations(uri, source); else workspace.update(uri, source, true);
        const offset = source.lastIndexOf('onlyReady') + 4;
        expect(workspace.completeMembers(uri, offset).some(item => item.name === 'onlyReady')).toBe(narrowed);
        expect(workspace.memberAt(uri, offset)?.fqcn === 'Ready::onlyReady').toBe(narrowed);
        expect(workspace.incompatibleArguments(uri)).toHaveLength(narrowed ? 0 : 1);
        expect(workspace.source(uri)).toBe(source);
      } finally { workspace.dispose(); }
    });
  }

  it.each([
    ['loop exit', 'while ($run) { if (!isReady($item)) { break; } } QUERY'],
    ['mutation after guard', 'while ($run) { if (!isReady($item)) { break; } unknown($item); QUERY }'],
    ['mutation inside guard', 'while ($run) { if (!isReady($item)) { $item = new Rejected(); break; } QUERY }'],
  ])('withdraws %s (deferred=' + deferred + ')', (_label, body) => {
    const workspace = new SemanticWorkspace(parser);
    const source = declarations + 'function run(Ready|Rejected|null $item, bool $run): void { '
      + body.replace('QUERY', '$item->onlyReady();') + ' }';
    try {
      if (deferred) workspace.updateDeclarations(uri, source); else workspace.update(uri, source, true);
      const offset = source.lastIndexOf('onlyReady') + 4;
      expect(workspace.completeMembers(uri, offset).some(item => item.name === 'onlyReady')).toBe(false);
      expect(workspace.memberAt(uri, offset)?.fqcn).not.toBe('Ready::onlyReady');
    } finally { workspace.dispose(); }
  });
}
