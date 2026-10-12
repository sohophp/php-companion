import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PhpSyntaxParser } from '@php-companion/parser';
import { builtinDocumentUri, builtinPhpStub } from '@php-companion/language-spec';
import { SemanticWorkspace } from '../src/index.js';
import { source } from './fixture.js';
let parser: PhpSyntaxParser;
beforeAll(async () => { parser = await PhpSyntaxParser.createDefault(); });
afterAll(() => parser.dispose());
const cases = [
  ['inner', 'Generator<int, App\\Item, mixed, App\\Result>'],
  ['delegatedReturn', 'Generator<int, App\\Item, mixed, App\\Result>'],
  ['delegatedLocal', 'Generator<int, App\\Item, mixed, App\\Result>'],
  ['delegatedArray', 'Generator<int, App\\Item, mixed, null>'],
  ['delegatedParameter', 'Generator<int, App\\Item, mixed, App\\Result>'],
  ['unknownSource', '\\Generator'],
] as const;
describe('Generator delegation result propagation', () => {
  it.each(cases.flatMap(([name, expected]) => [false, true].map(deferred => ({ name, expected, deferred }))))('$name (deferred=$deferred)', ({ name, expected, deferred }) => {
    const workspace = new SemanticWorkspace(parser); workspace.update(builtinDocumentUri('8.5'), builtinPhpStub('8.5')); const uri = 'file:///GeneratorDelegation.php';
    try {
      if (deferred) workspace.updateDeclarations(uri, source); else workspace.update(uri, source, true);
      const offset = source.lastIndexOf(name + '(') + name.length + 1;
      expect(workspace.signature(uri, offset)?.returnType).toBe(expected);
      expect(workspace.source(uri)).toBe(source);
    } finally { workspace.dispose(); }
  });
});

describe('Delegated result consumers and unknown contracts', () => {
  const definitions = String.raw`<?php namespace App;
    class Item { public function name(): string { return 'item'; } }
    class Result { public function done(): string { return 'done'; } }
    class Other { public function wrong(): string { return 'other'; } }
    function inner(): \Generator { yield new Item(); return new Result(); }
    function needResult(Result $value): void {}
    function needOther(Other $value): void {}
  `;
  const cases = [
    { label: 'delegated local offers result members', body: '$result = yield from inner(); $result->do;', marker: '$result->do', members: ['done'], definition: 'App\\Result::done' },
    { label: 'array delegation offers no object members', body: '$result = yield from [new Item()]; $result->do;', marker: '$result->do', members: [], definition: undefined },
    { label: 'unknown delegation offers no guessed members', body: '$result = yield from unknown(); $result->do;', marker: '$result->do', members: [], definition: undefined },
  ] as const;
  it.each(cases.flatMap(row => [false, true].map(deferred => ({ row, deferred }))))('$row.label (deferred=$deferred)', ({ row, deferred }) => {
      const workspace = new SemanticWorkspace(parser); workspace.update(builtinDocumentUri('8.5'), builtinPhpStub('8.5')); const uri = 'file:///DelegatedConsumers.php';
      const source = definitions + `function consume(): \\Generator { ${row.body} }`;
      try {
        if (deferred) workspace.updateDeclarations(uri, source); else workspace.update(uri, source, true);
        const offset = source.indexOf(row.marker) + row.marker.length;
        expect(workspace.completeMembers(uri, offset).map(member => member.name)).toEqual(row.members);
        // Complete the same expression before asking for its exact definition.
        const complete = source.replace(row.marker, row.marker.replace(/do$/, 'done()'));
        if (deferred) workspace.updateDeclarations(uri, complete); else workspace.update(uri, complete, true);
        expect(workspace.memberAt(uri, complete.lastIndexOf('done()') + 1)?.fqcn).toBe(row.definition);
      } finally { workspace.dispose(); }
    });
  it.each([false, true])('delegated arguments retain incompatible-result diagnostics (deferred=%s)', deferred => {
    const workspace = new SemanticWorkspace(parser); workspace.update(builtinDocumentUri('8.5'), builtinPhpStub('8.5')); const uri = 'file:///DelegatedArguments.php';
    const source = definitions + String.raw`function consume(): \Generator {
      needResult((yield from inner())); needOther((yield from inner()));
    }`;
    try {
      if (deferred) workspace.updateDeclarations(uri, source); else workspace.update(uri, source, true);
      const problems = workspace.incompatibleArguments(uri);
      expect(problems).toHaveLength(1);
      expect(source.slice(problems[0]!.start, problems[0]!.end)).toContain('yield from inner()');
    } finally { workspace.dispose(); }
  });
});
