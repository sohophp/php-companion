import { afterAll, beforeAll, expect, it } from 'vitest';
import { PhpSyntaxParser } from '@php-companion/parser';
import { SemanticWorkspace } from '../src/index.js';

let parser: PhpSyntaxParser;
beforeAll(async () => { parser = await PhpSyntaxParser.createDefault(); });
afterAll(() => parser.dispose());
const uri = 'file:///ForeachAssertions.php';
const declarations = `<?php
class Base {}
class Ready extends Base { public function onlyReady(): void {} }
/** @phpstan-assert Ready $value */ function requireReady(Base $value): void {}
/** @phpstan-assert-if-true Ready $value */ function isReady(Base $value): bool { return true; }
/** @psalm-assert-if-false Ready $value */ function isNotReady(Base $value): bool { return false; }
function needReady(Ready $value): void {}
function unknown($value): void {}
`;
const cases = [
  ['standalone', 'foreach ($items as $item) { requireReady($item); QUERY }', true],
  ['key and value', 'foreach ($items as $key => $item) { requireReady($item); QUERY }', true],
  ['true branch', 'foreach ($items as $item) { if (isReady($item)) { QUERY } }', true],
  ['false branch', 'foreach ($items as $item) { if (!isNotReady($item)) { QUERY } }', true],
  ['named assertion argument', 'foreach ($items as $item) { requireReady(value: $item); QUERY }', true],
  ['terminating guard', 'foreach ($items as $item) { if (!isReady($item)) { return; } QUERY }', true],
  ['reference iteration', 'foreach ($items as &$item) { requireReady($item); QUERY }', false],
  ['reassigned after assertion', 'foreach ($items as $item) { requireReady($item); $item = new Base(); QUERY }', false],
  ['passed to another call', 'foreach ($items as $item) { requireReady($item); unknown($item); QUERY }', false],
  ['outside conditional branch', 'foreach ($items as $item) { if (isReady($item)) {} QUERY }', false],
  ['after loop exit', 'foreach ($items as $item) { requireReady($item); } QUERY', false],
  ['shadowed in inner iteration', 'foreach ($items as $item) { requireReady($item); foreach ($items as $item) { QUERY } }', false],
] as const;
it.each(cases.flatMap(row => [false, true].map(deferred => ({ row, deferred, label: row[0] }))))(
  '$label (deferred=$deferred)', ({ row, deferred }) => {
    const workspace = new SemanticWorkspace(parser);
    const [label, body, narrowed] = row;
    const source = declarations + '/** @param list<Base> $items */ function run(array $items): void { '
      + body.replace('QUERY', '$item->onlyReady();') + ' }';
    try {
      if (deferred) workspace.updateDeclarations(uri, source); else workspace.update(uri, source, true);
      const offset = source.lastIndexOf('onlyReady') + 4;
      expect(workspace.completeMembers(uri, offset).some(item => item.name === 'onlyReady'), label).toBe(narrowed);
      expect(workspace.memberAt(uri, offset)?.fqcn === 'Ready::onlyReady', label).toBe(narrowed);
      expect(workspace.source(uri)).toBe(source);
    } finally { workspace.dispose(); }
  });
it.each([false, true])('uses foreach assertions for argument diagnostics (deferred=%s)', deferred => {
  const workspace = new SemanticWorkspace(parser);
  const source = declarations + '/** @param list<Base> $items */ function run(array $items): void { foreach ($items as $item) { requireReady($item); needReady($item); } }';
  try {
    if (deferred) workspace.updateDeclarations(uri, source); else workspace.update(uri, source, true);
    expect(workspace.incompatibleArguments(uri)).toEqual([]);
  } finally { workspace.dispose(); }
});
it.each([false, true])('retains asserted generic elements across namespaces (deferred=%s)', deferred => {
  const workspace = new SemanticWorkspace(parser);
  const source = `<?php namespace Data {
    class Base {} class Ready extends Base { public function onlyReady(): void {} }
    /** @template T */ class Box { /** @return T */ public function get() {} }
    /** @phpstan-assert Box<Ready> $value */ function requireBox(Box $value): void {}
  } namespace Consumer {
    use Data\\Base; use Data\\Box; use function Data\\requireBox;
    /** @param list<Box<Base>> $items */ function run(array $items): void {
      foreach ($items as $item) { requireBox($item); $item->get()->onlyReady(); }
    }
  }`;
  try {
    if (deferred) workspace.updateDeclarations(uri, source); else workspace.update(uri, source, true);
    const offset = source.lastIndexOf('onlyReady') + 4;
    expect(workspace.completeMembers(uri, offset).some(item => item.name === 'onlyReady')).toBe(true);
    expect(workspace.memberAt(uri, offset)?.fqcn).toBe('Data\\Ready::onlyReady');
    expect(workspace.incompatibleArguments(uri)).toEqual([]);
  } finally { workspace.dispose(); }
});
it.each([false, true])('discards an assertion made before a parameter is rebound by foreach (deferred=%s)', deferred => {
  const workspace = new SemanticWorkspace(parser);
  const source = declarations + '/** @param list<Base> $items */ function run(Base $item, array $items): void { requireReady($item); foreach ($items as $item) { $item->onlyReady(); } }';
  try {
    if (deferred) workspace.updateDeclarations(uri, source); else workspace.update(uri, source, true);
    const offset = source.lastIndexOf('onlyReady') + 4;
    expect(workspace.completeMembers(uri, offset).some(item => item.name === 'onlyReady')).toBe(false);
    expect(workspace.memberAt(uri, offset)?.fqcn).not.toBe('Ready::onlyReady');
  } finally { workspace.dispose(); }
});
