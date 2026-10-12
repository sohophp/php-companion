import { afterAll, beforeAll, expect, it } from 'vitest';
import { PhpSyntaxParser } from '@php-companion/parser';
import { SemanticWorkspace } from '../src/index.js';

let parser: PhpSyntaxParser;
beforeAll(async () => { parser = await PhpSyntaxParser.createDefault(); });
afterAll(() => parser.dispose());
const uri = 'file:///Mixed.php';
function sourceFor(eol: string): string {
  return ['<?php namespace App; ?>', '<header>中文 😃 Real FLAG</header>', '<?php',
    'class Real {} const FLAG = 1;', '?>', '<p>Real FLAG new Missing consume()</p>',
    '<?php function consume(Real $value) { echo FLAG; return new Real(); }',
    '?>', '<footer>Real FLAG</footer>'].join(eol);
}
function locations(source: string, needles: string[], name: string): Array<{ uri: string; start: number; end: number }> {
  return needles.map(needle => {
    const start = source.indexOf(needle) + needle.lastIndexOf(name);
    return { uri, start, end: start + name.length };
  });
}
function check(workspace: SemanticWorkspace, source: string): void {
  const types = locations(source, ['class Real', 'consume(Real', 'new Real'], 'Real');
  const constants = locations(source, ['const FLAG', 'echo FLAG'], 'FLAG');
  expect(workspace.references(uri, types[0]!.start)).toEqual(types);
  expect(workspace.typeRename(uri, types[0]!.start, 'Renamed')?.locations).toEqual(types);
  expect(workspace.references(uri, constants[0]!.start)).toEqual(constants);
  expect(workspace.constantRename(uri, constants[0]!.start, 'NEW_FLAG')?.locations).toEqual(constants);
  expect(workspace.unresolvedNewTypes(uri)).toEqual([]);
}

it.each(['\n', '\r\n'].flatMap(eol => [true, false].map(retained => ({ eol, retained }))))(
  'keeps HTML out of references, rename edits and unresolved types, eol=$eol retained=$retained', ({ eol, retained }) => {
    const workspace = new SemanticWorkspace(parser), base = sourceFor(eol);
    try {
      for (const source of [base, base.replace('😃', '😄').replace('<p>', '<p>😃 Real FLAG '),
        base.replace('return new Real();', 'return new Real()->;'), base]) {
        workspace.update(uri, source, retained);
        // An unrelated incomplete expression must not contaminate references.
        if (source.includes('->;')) {
          const types = locations(source, ['class Real', 'consume(Real', 'new Real'], 'Real');
          expect(workspace.references(uri, types[0]!.start)).toEqual(types);
          expect(workspace.unresolvedNewTypes(uri)).toEqual([]);
          const rename = workspace.typeRename(uri, types[0]!.start, 'Renamed');
          if (rename) expect(rename.locations).toEqual(types);
        } else check(workspace, source);
      }
    } finally { workspace.dispose(); }
  },
);

it.each([true, false])('does not navigate or select PHP symbols from HTML text, retained=%s', retained => {
  const workspace = new SemanticWorkspace(parser), source = sourceFor('\r\n');
  try {
    workspace.update(uri, source, retained);
    for (const name of ['Real', 'FLAG', 'consume']) {
      const start = source.indexOf(name, source.indexOf('<p>'));
      for (const offset of [start + 1, start + name.length]) {
        expect(workspace.definition(uri, offset)).toEqual([]);
        expect(workspace.references(uri, offset)).toEqual([]);
        expect(workspace.typeAt(uri, offset)).toBeUndefined();
        expect(workspace.constantAt(uri, offset)).toBeUndefined();
        expect(workspace.functionAt(uri, offset)).toBeUndefined();
        expect(workspace.typeRename(uri, offset, 'Renamed')).toBeUndefined();
        expect(workspace.constantRename(uri, offset, 'NEW_FLAG')).toBeUndefined();
        expect(workspace.functionRename(uri, offset, 'renamed')).toBeUndefined();
      }
    }
    expect(workspace.signatures(uri, source.indexOf('consume()') + 'consume('.length)).toEqual([]);
    check(workspace, source);
  } finally { workspace.dispose(); }
});

it.each(['restore', 'restoreDeclaration'] as const)('rejects pre-boundary implementation facts and preserves HTML after %s', mode => {
  const donor = new SemanticWorkspace(parser), restored = new SemanticWorkspace(parser), source = sourceFor('\r\n');
  try {
    donor.update(uri, source);
    const snapshot = donor.snapshot(uri)!;
    expect(snapshot.schema).toBe(93);
    expect(restored[mode]({ ...snapshot, schema: 92 }, uri)).toBe(false);
    expect(restored[mode](JSON.parse(JSON.stringify(snapshot)), uri)).toBe(true);
    check(restored, source);
  } finally { donor.dispose(); restored.dispose(); }
});
