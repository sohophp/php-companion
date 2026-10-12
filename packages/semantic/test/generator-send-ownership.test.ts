import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PhpSyntaxParser } from '@php-companion/parser';
import { builtinDocumentUri, builtinPhpStub } from '@php-companion/language-spec';
import { SemanticWorkspace } from '../src/index.js';

let parser: PhpSyntaxParser;
beforeAll(async () => { parser = await PhpSyntaxParser.createDefault(); });
afterAll(() => parser.dispose());
const header = String.raw`<?php namespace SendProof;
class Item {}
class Command { public function execute(): string { return 'command'; } }
class Other { public function wrong(): string { return 'other'; } }
class Result {}
class T { public function unrelated(): void {} }
`;
const body = '$received = yield new Item(); $received->§execute(); return new Result();';
const cases = [
  { name: 'class template bound', source: header + '/** @template T of Command */ class Host { /** @return \\Generator<int, Item, T, Result> */ public function exchange(): \\Generator {' + body + '} }', expected: ['execute'] },
  { name: 'method bound shadows class bound', source: header + '/** @template T of Command */ class Host { /** @template T of Other\n * @return \\Generator<int, Item, T, Result> */ public function exchange(): \\Generator {' + body + '} }', expected: ['wrong'] },
  { name: 'unbounded method shadows class bound', source: header + '/** @template T of Command */ class Host { /** @template T\n * @return \\Generator<int, Item, T, Result> */ public function exchange(): \\Generator {' + body + '} }', expected: [] },
  { name: 'transitive bounds', source: header + '/** @template U of Command\n * @template T of U\n * @return \\Generator<int, Item, T, Result> */ function exchange(): \\Generator {' + body + '}', expected: ['execute'] },
  { name: 'cyclic bounds avoid unrelated class T', source: header + '/** @template U of T\n * @template T of U\n * @return \\Generator<int, Item, T, Result> */ function exchange(): \\Generator {' + body + '}', expected: [] },
  { name: 'missing bound avoids unrelated class T', source: header + '/** @template T of Missing\n * @return \\Generator<int, Item, T, Result> */ function exchange(): \\Generator {' + body + '}', expected: [] },
  { name: 'scalar send has no members', source: header + '/** @return \\Generator<int, Item, int, Result> */ function exchange(): \\Generator {' + body + '}', expected: [] },
  { name: 'nullable send has no unguarded members', source: header + '/** @return \\Generator<int, Item, Command|null, Result> */ function exchange(): \\Generator {' + body + '}', expected: [] },
  { name: 'nullable send is narrowed after a guard', source: header + '/** @return \\Generator<int, Item, Command|null, Result> */ function exchange(): \\Generator { $received = yield new Item(); if ($received !== null) { $received->§execute(); } return new Result(); }', expected: ['execute'] },
  { name: 'union has no unrelated exclusive member', source: header + '/** @return \\Generator<int, Item, Command|Other, Result> */ function exchange(): \\Generator {' + body + '}', expected: [] },
  { name: 'native incompatible return does not trust send PHPDoc', source: header + '/** @return \\Generator<int, Item, Command, Result> */ function exchange(): Other {' + body + '}', expected: [] },
  { name: 'namespaced fake Generator is not the builtin', source: header + 'class Generator {} /** @return Generator<int, Item, Command, Result> */ function exchange(): Generator {' + body + '}', expected: [] },
  { name: 'a global Generator import alias is accepted', source: header + 'use \\Generator as Stream; /** @return Stream<int, Item, Command, Result> */ function exchange(): Stream {' + body + '}', expected: ['execute'] },
  { name: 'nested named function owns its contract', source: header + '/** @return \\Generator<int, Item, Command, Result> */ function outer(): \\Generator { /** @return \\Generator<int, Item, Other, Result> */ function inner(): \\Generator {' + body + '} yield new Item(); return new Result(); }', expected: ['wrong'] },
  { name: 'anonymous scope owns an adjacent contract', source: header + 'function outer(): void { $callback = /** @return \\Generator<int, Item, Other, Result> */ function(): \\Generator {' + body + '}; }', expected: ['wrong'] },
  { name: 'anonymous scope without an own contract stays unknown', source: header + '/** @return \\Generator<int, Item, Command, Result> */ function outer(): \\Generator { $callback = function(): \\Generator {' + body + '}; yield new Item(); return new Result(); }', expected: [] },
  { name: 'braced namespace function resolves its imported send type', source: String.raw`<?php namespace Data { class Command { public function execute(): void {} } }
namespace Scoped { use Data\Command as Imported; use \Generator as Stream; class Item {} class Result {}
/** @return Stream<int, Item, Imported, Result> */ function exchange(): Stream { $received = yield new Item(); $received->§execute(); return new Result(); } }`, expected: ['execute'] },
  { name: 'braced namespace anonymous scope resolves its imported send type', source: String.raw`<?php namespace Data { class Command { public function execute(): void {} } }
namespace Scoped { use Data\Command as Imported; class Item {} class Result {}
function outer(): void { $callback = /** @return \Generator<int, Item, Imported, Result> */ function(): \Generator { $received = yield new Item(); $received->§execute(); return new Result(); }; } }`, expected: ['execute'] },
  { name: 'top-level anonymous scope resolves its braced namespace import', source: String.raw`<?php namespace Data { class Command { public function execute(): void {} } }
namespace Scoped { use Data\Command as Imported; class Item {} class Result {}
$callback = /** @return \Generator<int, Item, Imported, Result> */ function(): \Generator { $received = yield new Item(); $received->§execute(); return new Result(); }; }`, expected: ['execute'] },
] as const;

describe('Generator send contracts use lexical ownership and safe template bounds', () => {
  it.each(cases.flatMap(row => [false, true].map(deferred => ({ row, deferred }))))('$row.name (deferred=$deferred)', ({ row, deferred }) => {
    const workspace = new SemanticWorkspace(parser); const uri = 'file:///GeneratorSendOwnership.php';
    const offset = row.source.indexOf('§'), source = row.source.replace('§', '');
    try {
      workspace.update(builtinDocumentUri('8.5'), builtinPhpStub('8.5'));
      if (deferred) workspace.updateDeclarations(uri, source); else workspace.update(uri, source, true);
      expect(workspace.completeMembers(uri, offset).map(item => item.name)).toEqual(row.expected);
      expect(workspace.source(uri)).toBe(source);
    } finally { workspace.dispose(); }
  });
});
