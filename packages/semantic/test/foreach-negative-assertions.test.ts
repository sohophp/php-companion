import { afterAll, beforeAll, expect, it } from 'vitest';
import { PhpSyntaxParser } from '@php-companion/parser';
import { SemanticWorkspace } from '../src/index.js';

let parser: PhpSyntaxParser;
beforeAll(async () => { parser = await PhpSyntaxParser.createDefault(); });
afterAll(() => parser.dispose());
const uri = 'file:///ForeachNegativeAssertions.php';
const declarations = `<?php namespace Data {
class Base {} class Ready extends Base { public function onlyReady(): void {} }
class Other extends Base {} class Rejected extends Base {} class RejectedChild extends Rejected {}
/** @template T of object */ class Box { /** @return T */ public function get() {} }
/** @template-covariant T of object */ class Producer { /** @return T */ public function get() {} }
/** @phpstan-assert !null $value */ function present($value): void {}
/** @phpstan-assert-if-true !null $value */ function isPresent($value): bool { return true; }
/** @psalm-assert-if-false !null $value */ function isAbsent($value): bool { return false; }
/** @phpstan-assert !Rejected $value */ function accepted($value): void {}
/** @phpstan-assert !false $value */ function notFalse($value): void {}
/** @phpstan-assert !true $value */ function notTrue($value): void {}
/** @phpstan-assert !bool $value */ function notBoolean($value): void {}
/** @phpstan-assert !(Rejected|Other) $value */ function onlyAccepted($value): void {}
/** @phpstan-assert !Box<Other> $value */ function notOtherBox($value): void {}
/** @phpstan-assert !Producer<Rejected> $value */ function notRejectedProducer($value): void {}
/**
 * @template T of Base
 * @param class-string<T> $type
 * @phpstan-assert !T $value
 */ function notType(string $type, $value): void {}
function needReady(Ready $value): void {} function unknown($value): void {}
} namespace Consumer {
use Data\\Base; use Data\\Ready; use Data\\Other; use Data\\Rejected; use Data\\RejectedChild;
use Data\\Box; use Data\\Producer;
use function Data\\present; use function Data\\isPresent; use function Data\\isAbsent;
use function Data\\accepted; use function Data\\notFalse; use function Data\\notTrue;
use function Data\\notBoolean; use function Data\\onlyAccepted; use function Data\\notOtherBox;
use function Data\\notRejectedProducer; use function Data\\notType; use function Data\\needReady;
use function Data\\unknown;
`;
const cases = [
  ['nullable standalone', 'Ready|null', 'present($item); QUERY', true],
  ['true branch', 'Ready|null', 'if (isPresent($item)) { QUERY }', true],
  ['false branch', 'Ready|null', 'if (!isAbsent($item)) { QUERY }', true],
  ['named argument', 'Ready|null', 'present(value: $item); QUERY', true],
  ['terminating guard', 'Ready|null', 'if (!isPresent($item)) { return; } QUERY', true],
  ['inherited rejected alternative', 'Ready|RejectedChild', 'accepted($item); QUERY', true],
  ['false literal', 'Ready|false', 'notFalse($item); QUERY', true],
  ['true literal', 'Ready|true', 'notTrue($item); QUERY', true],
  ['boolean', 'Ready|bool', 'notBoolean($item); QUERY', true],
  ['union exclusion', 'Ready|Rejected|Other', 'onlyAccepted($item); QUERY', true],
  ['template witness', 'Ready|RejectedChild', 'notType(Rejected::class, $item); QUERY', true],
  ['ambiguous remainder', 'Ready|Rejected|Other', 'accepted($item); QUERY', false],
  ['mixed input', 'mixed', 'present($item); QUERY', false],
  ['reassignment', 'Ready|Rejected', 'accepted($item); $item = new Other(); QUERY', false],
  ['reference alias', 'Ready|Rejected', 'accepted($item); $alias =& $item; QUERY', false],
  ['unknown call', 'Ready|Rejected', 'accepted($item); unknown($item); QUERY', false],
  ['outside conditional', 'Ready|null', 'if (isPresent($item)) {} QUERY', false],
  ['inner shadow', 'Ready|Rejected', 'accepted($item); foreach ($items as $item) { QUERY }', false],
] as const;

for (const deferred of [false, true]) {
  it.each(cases)('%s (deferred=' + deferred + ')', (_label, element, body, narrowed) => {
    const workspace = new SemanticWorkspace(parser);
    const source = declarations + `/** @param list<${element}> $items */ function run(array $items): void {
      foreach ($items as $item) { ${body.replace('QUERY', '$item->onlyReady();')} }
    } }`;
    try {
      if (deferred) workspace.updateDeclarations(uri, source); else workspace.update(uri, source, true);
      const offset = source.lastIndexOf('onlyReady') + 4;
      expect(workspace.completeMembers(uri, offset).some(item => item.name === 'onlyReady')).toBe(narrowed);
      expect(workspace.memberAt(uri, offset)?.fqcn === 'Data\\Ready::onlyReady').toBe(narrowed);
      expect(workspace.source(uri)).toBe(source);
    } finally { workspace.dispose(); }
  });

  it.each([
    ['Box<Ready>|null', 'present($item)'],
    ['Box<Ready>|Box<Other>', 'notOtherBox($item)'],
    ['Producer<Ready>|Producer<RejectedChild>', 'notRejectedProducer($item)'],
  ])('retains generic %s (deferred=' + deferred + ')', (element, assertion) => {
    const workspace = new SemanticWorkspace(parser);
    const source = declarations + `/** @param list<${element}> $items */ function run(array $items): void {
      foreach ($items as $item) { ${assertion}; $item->get()->onlyReady(); needReady($item->get()); }
    } }`;
    try {
      if (deferred) workspace.updateDeclarations(uri, source); else workspace.update(uri, source, true);
      const offset = source.lastIndexOf('onlyReady') + 4;
      expect(workspace.completeMembers(uri, offset).some(item => item.name === 'onlyReady')).toBe(true);
      expect(workspace.memberAt(uri, offset)?.fqcn).toBe('Data\\Ready::onlyReady');
      expect(workspace.incompatibleArguments(uri)).toEqual([]);
    } finally { workspace.dispose(); }
  });

  it('uses rebound elements for member and argument types (deferred=' + deferred + ')', () => {
    const workspace = new SemanticWorkspace(parser);
    const source = declarations + `/** @param list<Ready|null> $items */ function run(?Rejected $item, array $items): void {
      foreach ($items as $item) { present($item); $item->onlyReady(); needReady($item); }
    } }`;
    try {
      if (deferred) workspace.updateDeclarations(uri, source); else workspace.update(uri, source, true);
      const offset = source.lastIndexOf('onlyReady') + 4;
      expect(workspace.memberAt(uri, offset)?.fqcn).toBe('Data\\Ready::onlyReady');
      expect(workspace.incompatibleArguments(uri)).toEqual([]);
    } finally { workspace.dispose(); }
  });

  it.each([
    ['reference iteration', 'foreach ($items as &$item) { accepted($item); QUERY }'],
    ['loop exit', 'foreach ($items as $item) { accepted($item); } QUERY'],
    ['earlier assertion', 'accepted($item); foreach ($items as $item) { QUERY }'],
    ['key variable', 'foreach ($items as $item => $value) { accepted($item); QUERY }'],
  ])('withdraws %s (deferred=' + deferred + ')', (_label, body) => {
    const workspace = new SemanticWorkspace(parser);
    const source = declarations + `/** @param list<Ready|Rejected> $items */ function run(array $items): void {
      ${body.replace('QUERY', '$item->onlyReady();')}
    } }`;
    try {
      if (deferred) workspace.updateDeclarations(uri, source); else workspace.update(uri, source, true);
      const offset = source.lastIndexOf('onlyReady') + 4;
      expect(workspace.completeMembers(uri, offset).some(item => item.name === 'onlyReady')).toBe(false);
      expect(workspace.memberAt(uri, offset)?.fqcn).not.toBe('Data\\Ready::onlyReady');
    } finally { workspace.dispose(); }
  });
}
