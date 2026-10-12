import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PhpSyntaxParser } from '@php-companion/parser';
import { builtinDocumentUri, builtinPhpStub } from '@php-companion/language-spec';
import { SemanticWorkspace } from '../src/index.js';
import { generatorDelegationMismatchCalls, generatorDelegationSource } from '../../../test/extension/suite/generatorDelegationFixture.js';

let parser: PhpSyntaxParser;
beforeAll(async () => { parser = await PhpSyntaxParser.createDefault(); });
afterAll(() => parser.dispose());

describe('Delegated local identity across direct zero-argument member calls', () => {
  const states = ['result', 'other', 'array', 'noReturn', 'unknown', 'nested'] as const;
  it.each(states.flatMap(state => [false, true].map(deferred => ({ state, deferred }))))('$state (deferred=$deferred)', ({ state, deferred }) => {
    const workspace = new SemanticWorkspace(parser), uri = 'file:///DelegatedLocalCalls.php';
    const source = generatorDelegationSource('App', state);
    try {
      workspace.update(builtinDocumentUri('8.5'), builtinPhpStub('8.5'));
      if (deferred) workspace.updateDeclarations(uri, source); else workspace.update(uri, source, true);
      const expected = generatorDelegationMismatchCalls(state).map(name => `App\\${name}`).sort();
      expect(workspace.incompatibleArguments(uri).map(item => item.callable).sort()).toEqual(expected);
      expect(workspace.incompatibleArguments(uri, true).map(item => item.callable).sort()).toEqual(expected);
      expect(workspace.source(uri)).toBe(source);
    } finally { workspace.dispose(); }
  });

  const declarations = String.raw`<?php namespace App;
    class Result { public function done(): void {} }
    class Other {}
    function inner(): \Generator { yield 1; return new Result(); }
    function needOther(Other $value): void {}
    function factory(&$value) { $value = new Other(); return new Result(); }
  `;
  const boundaries = [
    { label: 'unresolved direct method', before: '', call: '$result->unknown();', expected: ['App\\needOther'] },
    { label: 'ordinary direct method', before: '', call: '$result->done();', expected: ['App\\needOther'] },
    { label: 'unresolved call with a value argument', before: '', call: '$result->unknown($result);', expected: [] },
    { label: 'dynamic method name', before: '', call: '$result->{$method}();', expected: [] },
    { label: 'effectful receiver', before: '', call: 'factory($result)->unknown();', expected: [] },
    { label: 'reference alias', before: '$alias =& $result;', call: '$result->unknown();', expected: [] },
    { label: 'reference capture', before: '$callback = function () use (&$result) { $result = new Other(); };', call: '$result->unknown();', expected: [] },
    { label: 'global binding', before: 'global $result;', call: '$result->unknown();', expected: [] },
  ];
  it.each(boundaries.flatMap(row => [false, true].map(deferred => ({ row, deferred }))))('$row.label (deferred=$deferred)', ({ row, deferred }) => {
    const workspace = new SemanticWorkspace(parser), uri = 'file:///DelegatedLocalBoundaries.php';
    const source = declarations + `function inspect(): \\Generator {
      $result = yield from inner(); ${row.before} ${row.call} needOther($result);
    }`;
    try {
      workspace.update(builtinDocumentUri('8.5'), builtinPhpStub('8.5'));
      if (deferred) workspace.updateDeclarations(uri, source); else workspace.update(uri, source, true);
      expect(workspace.incompatibleArguments(uri).map(item => item.callable)).toEqual(row.expected);
    } finally { workspace.dispose(); }
  });
});
