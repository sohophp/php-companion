import { afterAll, beforeAll, expect, it } from 'vitest';
import { builtinDocumentUri, builtinPhpStub } from '@php-companion/language-spec';
import { PhpSyntaxParser } from '@php-companion/parser';
import { SemanticWorkspace } from '../src/index.js';

let parser: PhpSyntaxParser;
beforeAll(async () => { parser = await PhpSyntaxParser.createDefault(); });
afterAll(() => parser.dispose());

const cases = [
  ['map arrow', 'array_map(fn($item) => $item->only|, $items);', ['onlyItem']],
  ['map closure', 'array_map(function ($item) { $item->only|; return $item; }, $items);', ['onlyItem']],
  ['map equal arrays', 'array_map(fn($item, $label) => $item->only|, [new Item()], ["a"]);', ['onlyItem']],
  ['map padded array', 'array_map(fn($item, $label) => $item->only|, [new Item()], ["a", "b"]);', []],
  ['map guarded padded array', 'array_map(function ($item, $label) { if ($item !== null) { $item->only|; } }, [new Item()], ["a", "b"]);', ['onlyItem']],
  ['filter value', 'array_filter($items, fn($item) => $item->only|);', ['onlyItem']],
  ['filter both value', 'array_filter($items, fn($item, $key) => $item->only|, ARRAY_FILTER_USE_BOTH);', ['onlyItem']],
  ['filter key is not an object', 'array_filter($items, fn($key) => $key->only|, ARRAY_FILTER_USE_KEY);', []],
  ['filter unknown mode', 'array_filter($items, fn($item) => $item->only|, $mode);', []],
  ['reduce value', 'array_reduce($items, fn($carry, $item) => $item->only|, new Carry());', ['onlyItem']],
  ['reduce stable carry', 'array_reduce($items, function ($carry, $item) { $carry->only|; return $carry; }, new Carry());', ['onlyCarry']],
  ['reduce receiver call', 'array_reduce($items, function ($carry, $item) { $carry->onlyCarry(); $carry->only|; return $carry; }, new Carry());', ['onlyCarry']],
  ['reduce reassignment', 'array_reduce($items, function ($carry, $item) { $carry->only|; $carry = $item; return $carry; }, new Carry());', []],
  ['reduce unknown reference effect', 'array_reduce($items, function ($carry, $item) { $carry->only|; unknown($carry); return $carry; }, new Carry());', []],
  ['reduce local extraction', 'array_reduce([["carry" => null]], function ($carry, $item) { $carry->only|; extract($item); return $carry; }, new Carry());', []],
  ['reduce legacy local parsing', 'array_reduce($items, function ($carry, $item) { $carry->only|; parse_str("carry=changed"); return $carry; }, new Carry());', []],
  ['reduce alias escape', 'array_reduce($items, function ($carry, $item) { $carry->only|; $alias =& $carry; return $carry; }, new Carry());', []],
  ['reduce dynamic mutation', 'array_reduce($items, function ($carry, $item) { $carry->only|; eval("$carry = null;"); return $carry; }, new Carry());', []],
  ['reduce unset', 'array_reduce($items, function ($carry, $item) { $carry->only|; unset($carry); return $carry; }, new Carry());', []],
  ['reduce shared parameter', 'array_reduce($items, function (&$carry, $item) { $carry->only|; return $carry; }, new Carry());', []],
  ['reduce closure escape', 'array_reduce($items, function ($carry, $item) { $carry->only|; register(fn() => $carry); return $carry; }, new Carry());', []],
  ['reduce changing carry', 'array_reduce($items, function ($carry, $item) { $carry->only|; return $item; }, new Carry());', []],
  ['reduce omitted initial', 'array_reduce($items, function ($carry, $item) { $carry->only|; return $item; });', []],
  ['explicit callback type', 'array_map(fn(Carry $item) => $item->only|, $items);', ['onlyCarry']],
] as const;

it.each(['7.2', '8.5'] as const)('uses shipped PHP %s stubs for callback member completion', version => {
  for (const retainTree of [false, true]) {
    const workspace = new SemanticWorkspace(parser);
    try {
      workspace.update(builtinDocumentUri(version), builtinPhpStub(version));
      for (const [name, expression, expected] of cases) {
        const marked = `<?php
class Item { public function onlyItem(): bool { return true; } }
class Carry { public function onlyCarry(): void {} }
function run(int $mode): void {
  $items = ['first' => new Item()];
  ${expression}
}`;
        const offset = marked.indexOf('|');
        const uri = 'file:///ArrayCallback.php';
        workspace.update(uri, marked.replace('|', ''), retainTree);
        expect(workspace.completeMembers(uri, offset).map(item => item.name), `${name}; retained=${retainTree}`).toEqual(expected);
      }
    } finally { workspace.dispose(); }
  }
}, 20000);

it.each(['restore', 'restoreDeclaration', 'restoreSourceDeclaration'] as const)('retains reducer binding checks after %s', mode => {
  const donor = new SemanticWorkspace(parser); const restored = new SemanticWorkspace(parser);
  const uri = 'file:///CachedReducer.php';
  try {
    restored.update(builtinDocumentUri('8.5'), builtinPhpStub('8.5'));
    for (const [name, expression, expected] of cases.filter(([name]) => name.startsWith('reduce'))) {
      const marked = `<?php class Item { public function onlyItem(): bool {} }
class Carry { public function onlyCarry(): void {} }
function run(): void { $items = [new Item()]; ${expression} }`;
      donor.update(uri, marked.replace('|', ''));
      const snapshot = mode === 'restoreSourceDeclaration' ? donor.sourceDeclarationSnapshot(uri) : donor.snapshot(uri);
      expect(restored[mode](snapshot, uri), name).toBe(true);
      expect(restored.completeMembers(uri, marked.indexOf('|')).map(item => item.name), name).toEqual(expected);
    }
  } finally { donor.dispose(); restored.dispose(); }
}, 20000);
