import { afterAll, beforeAll, expect, it } from 'vitest';
import { PhpSyntaxParser } from '@php-companion/parser';
import { SemanticWorkspace } from '../src/index.js';

let parser: PhpSyntaxParser;
beforeAll(async () => { parser = await PhpSyntaxParser.createDefault(); });
afterAll(() => parser.dispose());
const uri = 'file:///VariableBoundaries.php';
const declarations: Array<[string, string]> = [
  ['<?php function f(string $na§) {}', 'parameter'],
  ['<?php function f(string &$na§) {}', 'parameter'],
  ['<?php function f(string ...$na§) {}', 'parameter'],
  ['<?php function f($previous = 1, string $na§) {}', 'parameter'],
  ['<?php function f(string $na§', 'parameter'],
  ['<?php class C { public string $na§; }', 'property'],
  ['<?php class C { public string $first, $na§; }', 'property'],
  ['<?php class C { public string $na§me; }', 'property'],
  ['<?php class C { public function __construct(public string $na§) {} }', 'parameter'],
  ['<?php class C { public string $name { set(string $na§) {} } }', 'parameter'],
];
const references: Array<[string, string | undefined]> = [
  ['<?php class C { public string $name { get => $th§; } }', '$this'],
  ['<?php class C { public string $name { get { $other = "text"; return $ot§; } } }', '$other'],
  ['<?php class C { public string $name { set { $va§; } } }', '$value'],
  ['<?php class C { public string $name { set(string $incoming) { $in§; } } }', '$incoming'],
  ['<?php class C { public string $name { get { $other = "text"; return $ot§her; } } }', '$other'],
  ['<?php class C { public string $name { get { $other = "text"; return $ot§', '$other'],
  ['<?php class C { public string $name { get { $callback = function($arg) { return $ar§; }; } } }', '$arg'],
  // These are recovery inputs; PHP defaults cannot use arbitrary variables.
  ['<?php function f($arg = $de§) {}', undefined],
  ['<?php function f($arg = new Holder(value: $de§)) {}', undefined],
  ['<?php function f($arg = [1, $de§]) {}', undefined],
];
it.each([false, true])('keeps actual declaration names suppressed with retainTree=%s', retainTree => {
  const workspace = new SemanticWorkspace(parser);
  try {
    for (const [marked, kind] of declarations) {
      workspace.update(uri, marked.replace('§', ''), retainTree);
      expect(workspace.completionContext(uri, marked.indexOf('§')), marked)
        .toMatchObject({ kind: 'declaration-name', declaration: { kind } });
    }
  } finally { workspace.dispose(); }
});
it.each([false, true])('preserves references inside declarations with retainTree=%s', retainTree => {
  const workspace = new SemanticWorkspace(parser);
  try {
    for (const [marked, expected] of references) {
      workspace.update(uri, marked.replace('§', ''), retainTree);
      const context = workspace.completionContext(uri, marked.indexOf('§'));
      expect(context.kind, marked).not.toBe('declaration-name');
      if (expected) {
        expect(context, marked).toMatchObject({ kind: 'variable' });
        expect(context.kind === 'variable' ? context.variables.names : [], marked).toContain(expected);
      }
    }
  } finally { workspace.dispose(); }
});
it.each(['restore', 'restoreDeclaration', 'restoreSourceDeclaration'] as const)('keeps variable boundaries after %s', mode => {
  const donor = new SemanticWorkspace(parser); const restored = new SemanticWorkspace(parser);
  try {
    for (const [marked, kind] of declarations) {
      donor.update(uri, marked.replace('§', ''), true);
      const snapshot = mode === 'restoreSourceDeclaration' ? donor.sourceDeclarationSnapshot(uri) : donor.snapshot(uri);
      expect(restored[mode](snapshot, uri), marked).toBe(true);
      expect(restored.completionContext(uri, marked.indexOf('§')), marked)
        .toMatchObject({ kind: 'declaration-name', declaration: { kind } });
    }
    for (const [marked, expected] of references) {
      donor.update(uri, marked.replace('§', ''), true);
      const snapshot = mode === 'restoreSourceDeclaration' ? donor.sourceDeclarationSnapshot(uri) : donor.snapshot(uri);
      expect(restored[mode](snapshot, uri), marked).toBe(true);
      const context = restored.completionContext(uri, marked.indexOf('§'));
      expect(context.kind, marked).not.toBe('declaration-name');
      if (expected) expect(context.kind === 'variable' ? context.variables.names : [], marked).toContain(expected);
    }
  } finally { donor.dispose(); restored.dispose(); }
});
