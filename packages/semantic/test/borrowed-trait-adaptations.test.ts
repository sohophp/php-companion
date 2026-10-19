import { afterAll, beforeAll, expect, it } from 'vitest';
import { PhpSyntaxParser } from '@php-companion/parser';
import { SemanticWorkspace } from '../src/index.js';

let parser: PhpSyntaxParser;
beforeAll(async () => { parser = await PhpSyntaxParser.createDefault(); });
afterAll(() => parser.dispose());

const uri = 'file:///TraitAdaptations.php';
const source = '<?php trait T { function action() {} } class action {} class Uses { use T { action as alias; } }';
const declarationStart = source.indexOf('class action') + 'class '.length;
const adaptationStart = source.indexOf('action as');
const declaration = { uri, start: declarationStart, end: declarationStart + 'action'.length };
const adaptation = { uri, start: adaptationStart, end: adaptationStart + 'action'.length };
const configurations = ['7.2', '8.5'].flatMap(version =>
  ['full', 'deferred', 'prepared', 'prepared-declarations'].flatMap(mode =>
    ['replace-array', 'replace-record'].map(mutation => ({ version, mode, mutation }))));

it.each(configurations)('keeps Trait adaptation references current (PHP $version, $mode, $mutation)', ({ version, mode, mutation }) => {
  const donor = new SemanticWorkspace(parser), workspace = new SemanticWorkspace(parser);
  let fork: SemanticWorkspace | undefined;
  try {
    donor.update(uri, source, true);
    const snapshot = donor.snapshot(uri)!;
    const prepared = parser.prepare(source, uri, mode === 'prepared-declarations');
    workspace.setTargetPhpVersion(version);
    if (mode.startsWith('prepared')) workspace.updatePrepared(uri, source, prepared);
    else expect(mode === 'full' ? workspace.restore(snapshot, uri) : workspace.restoreDeclaration(snapshot, uri)).toBe(true);
    const declarations = mode.startsWith('prepared') ? prepared.facts.declarations : snapshot.declaration.declarations;
    const index = declarations.findIndex(item => item.name === 'Uses');
    const original = declarations[index]!;
    const originalAdaptations = original.traitAdaptations;
    expect(originalAdaptations).toHaveLength(1);
    fork = workspace.forkForLocalQuery('file:///Consumer.php', '<?php', new Set());
    const references = (target: SemanticWorkspace): ReturnType<SemanticWorkspace['references']> => target.references(uri, declarationStart + 1);
    expect(references(workspace)).toEqual([declaration]);
    expect(references(fork)).toEqual([declaration]);
    const symbols = (target: SemanticWorkspace): ReturnType<SemanticWorkspace['typeCopySymbols']> =>
      target.typeCopySymbols(uri, [{ start: adaptationStart, end: adaptation.end }]);
    expect(symbols(workspace)).toEqual([]);
    expect(symbols(fork)).toEqual([]);
    if (mutation === 'replace-array') original.traitAdaptations = [];
    else declarations[index] = { ...original, traitAdaptations: [] };
    // Declaration-only prepared input is detached when the first reference
    // query materializes its source. Mutating that old input must stay isolated.
    const expected = mode === 'prepared-declarations' ? [declaration] : [declaration, adaptation];
    if (mode === 'prepared-declarations') {
      expect(workspace.snapshot(uri)!.declaration.declarations.find(item => item.name === 'Uses')!.traitAdaptations).toHaveLength(1);
    }
    const expectedSymbols = mode === 'prepared-declarations' ? [] : [{ ...adaptation, fqcn: 'action', alias: 'action' }];
    expect(symbols(workspace)).toEqual(expectedSymbols);
    expect(symbols(fork)).toEqual(expectedSymbols);
    expect(references(workspace)).toEqual(expected);
    expect(references(fork)).toEqual(expected);
    original.traitAdaptations = originalAdaptations;
    declarations[index] = original;
    expect(references(workspace)).toEqual([declaration]);
    expect(references(fork)).toEqual([declaration]);
    expect(symbols(workspace)).toEqual([]);
    expect(symbols(fork)).toEqual([]);
    expect(workspace.source(uri)).toBe(source);
  } finally { fork?.dispose(); workspace.dispose(); donor.dispose(); }
});

it.each([true, false])('refreshes ordinary Trait references across source edits retained=%s', retained => {
  const workspace = new SemanticWorkspace(parser);
  try {
    workspace.update(uri, source, retained);
    expect(workspace.references(uri, declarationStart + 1)).toEqual([declaration]);
    const changed = source.replace('class action {}', 'class Different {}');
    workspace.update(uri, changed, retained);
    expect(workspace.references(uri, declarationStart + 1)).toEqual([{ uri, start: declarationStart, end: declarationStart + 'Different'.length }]);
    workspace.update(uri, source, retained);
    expect(workspace.references(uri, declarationStart + 1)).toEqual([declaration]);
  } finally { workspace.dispose(); }
});
