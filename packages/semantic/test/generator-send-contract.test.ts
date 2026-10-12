import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PhpSyntaxParser } from '@php-companion/parser';
import { builtinDocumentUri, builtinPhpStub } from '@php-companion/language-spec';
import { SemanticWorkspace } from '../src/index.js';

let parser: PhpSyntaxParser;
beforeAll(async () => { parser = await PhpSyntaxParser.createDefault(); });
afterAll(() => parser.dispose());
const declarations = String.raw`<?php namespace SendProof;
class Item { public function name(): string { return 'item'; } }
class Command { public function execute(): string { return 'command'; } }
class Other { public function wrong(): string { return 'other'; } }
class Result { public function done(): string { return 'result'; } }
function needCommand(Command $value): void {}
function needOther(Other $value): void {}
`;
const variants = [
  { name: 'parenthesized plain yield', declaration: '/** @return \\Generator<int, Item, Command, Result> */ function exchange(): \\Generator', expression: '(yield new Item())', expected: ['execute'] },
  { name: 'bare plain yield', declaration: '/** @return \\Generator<int, null, Command, Result> */ function exchange(): \\Generator', expression: 'yield', expected: ['execute'] },
  { name: 'keyed yield', declaration: '/** @return \\Generator<string, Item, Command, Result> */ function exchange(): \\Generator', expression: '(yield "key" => new Item())', expected: ['execute'] },
  { name: 'commented yield', declaration: '/** @return \\Generator<int, Item, Command, Result> */ function exchange(): \\Generator', expression: '(yield /* source */ new Item())', expected: ['execute'] },
  { name: 'method own contract', declaration: 'class Host { /** @return \\Generator<int, Item, Command, Result> */ public function exchange(): \\Generator', expression: '(yield new Item())', suffix: '}', expected: ['execute'] },
  { name: 'bounded callable template', declaration: '/** @template T of Command\n * @return \\Generator<int, Item, T, Result> */ function exchange(): \\Generator', expression: '(yield new Item())', expected: ['execute'] },
  { name: 'undocumented yield stays unknown', declaration: 'function exchange(): \\Generator', expression: '(yield new Item())', expected: [] },
  { name: 'mixed send stays unknown', declaration: '/** @return \\Generator<int, Item, mixed, Result> */ function exchange(): \\Generator', expression: '(yield new Item())', expected: [] },
  { name: 'unknown send class stays unknown', declaration: '/** @return \\Generator<int, Item, Missing, Result> */ function exchange(): \\Generator', expression: '(yield new Item())', expected: [] },
  { name: 'wrong generic arity stays unknown', declaration: '/** @return \\Generator<int, Item, Command> */ function exchange(): \\Generator', expression: '(yield new Item())', expected: [] },
  { name: 'general iterable has no send contract', declaration: '/** @return iterable<int, Command> */ function exchange(): iterable', expression: '(yield new Item())', expected: [] },
  { name: 'unbounded template stays unknown', declaration: '/** @template T\n * @return \\Generator<int, Item, T, Result> */ function exchange(): \\Generator', expression: '(yield new Item())', expected: [] },
] as const;

describe('Generator plain yield uses its own documented send contract', () => {
  it.each(variants.flatMap(row => [false, true].map(deferred => ({ row, deferred }))))('$row.name (deferred=$deferred)', ({ row, deferred }) => {
    const workspace = new SemanticWorkspace(parser); const uri = 'file:///GeneratorSendContract.php';
    const source = declarations + row.declaration + ` { $command = ${row.expression}; $command->execute(); return new Result(); }`
      + ('suffix' in row ? row.suffix : '');
    try {
      workspace.update(builtinDocumentUri('8.5'), builtinPhpStub('8.5'));
      if (deferred) workspace.updateDeclarations(uri, source); else workspace.update(uri, source, true);
      const offset = source.lastIndexOf('$command->execute') + '$command->'.length;
      expect(workspace.completeMembers(uri, offset).map(item => item.name)).toEqual(row.expected);
      const problems = source.replace('$command->execute();', 'needCommand($command); needOther($command);');
      if (deferred) workspace.updateDeclarations(uri, problems); else workspace.update(uri, problems, true);
      expect(workspace.incompatibleArguments(uri).map(item => item.callable)).toEqual(row.expected.length ? ['SendProof\\needOther'] : []);
      expect(workspace.source(uri)).toBe(problems);
    } finally { workspace.dispose(); }
  });

  it.each([false, true])('does not borrow an outer Generator contract for a nested closure (deferred=%s)', deferred => {
    const workspace = new SemanticWorkspace(parser); const uri = 'file:///NestedSendContract.php';
    const source = declarations + String.raw`/** @return \Generator<int, Item, Command, Result> */
    function exchange(): \Generator {
      $closure = function(): \Generator { $unknown = yield new Item(); $unknown->execute(); };
      $command = yield new Item(); $command->execute(); return new Result();
    }`;
    try {
      workspace.update(builtinDocumentUri('8.5'), builtinPhpStub('8.5'));
      if (deferred) workspace.updateDeclarations(uri, source); else workspace.update(uri, source, true);
      expect(workspace.completeMembers(uri, source.indexOf('$unknown->execute') + '$unknown->'.length)).toEqual([]);
      expect(workspace.completeMembers(uri, source.indexOf('$command->execute') + '$command->'.length).map(item => item.name)).toEqual(['execute']);
    } finally { workspace.dispose(); }
  });
});

describe('Generator send keeps TSend input and nullable yielded output', () => {
  it.each(['7.2', '8.5'] as const)('version %s gives send and throw the yielded-value-or-null result', version => {
    const workspace = new SemanticWorkspace(parser); const uri = 'file:///GeneratorSendMembers.php';
    const source = declarations + String.raw`/** @param \Generator<int, Item, Command, Result> $stream */
    function consume(\Generator $stream): void {
      $stream->send(new Command()); $stream->send(new Other());
      $stream->throw(new \Exception());
      $next = $stream->send(new Command()); $next->name();
      if ($next !== null) { $next->name(); }
    }`;
    try {
      workspace.update(builtinDocumentUri(version), builtinPhpStub(version)); workspace.update(uri, source, true);
      const send = workspace.signature(uri, source.indexOf('$stream->send(') + '$stream->send('.length);
      const thrown = workspace.signature(uri, source.indexOf('$stream->throw(') + '$stream->throw('.length);
      expect(send?.parameters[0]?.type).toBe('SendProof\\Command');
      expect(send?.returnType).toBe('SendProof\\Item|null');
      expect(thrown?.returnType).toBe('SendProof\\Item|null');
      expect(workspace.completeMembers(uri, source.indexOf('$next->name') + '$next->'.length)).toEqual([]);
      expect(workspace.completeMembers(uri, source.lastIndexOf('$next->name') + '$next->'.length).map(item => item.name)).toEqual(['name']);
      const problems = workspace.incompatibleArguments(uri);
      expect(problems).toHaveLength(1);
      expect(source.slice(problems[0]!.start, problems[0]!.end)).toBe('new Other()');
    } finally { workspace.dispose(); }
  });
});
