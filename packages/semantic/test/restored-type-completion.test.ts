import { afterAll, beforeAll, expect, it } from 'vitest';
import { PhpSyntaxParser } from '@php-companion/parser';
import { SemanticWorkspace } from '../src/index.js';

let parser: PhpSyntaxParser;
beforeAll(async () => { parser = await PhpSyntaxParser.createDefault(); });
afterAll(() => parser.dispose());

const owner = 'file:///RestoredType.php', caller = 'file:///TypeConsumer.php';
const source = '<?php new Target';
const configurations = ['7.2', '8.5'].flatMap(version =>
  ['full', 'deferred'].map(mode => ({ version, mode })));

function install(workspace: SemanticWorkspace, snapshot: NonNullable<ReturnType<SemanticWorkspace['snapshot']>>, mode: string): void {
  expect(mode === 'full' ? workspace.restore(snapshot, owner) : workspace.restoreDeclaration(snapshot, owner)).toBe(true);
}

it.each(configurations)('refreshes replacement type records after warm completion (PHP $version, $mode)', ({ version, mode }) => {
  const donor = new SemanticWorkspace(parser), workspace = new SemanticWorkspace(parser);
  try {
    donor.update(owner, '<?php class Target {}', true);
    const snapshot = donor.snapshot(owner)!;
    workspace.setTargetPhpVersion(version);
    install(workspace, snapshot, mode);
    workspace.update(caller, source, true);
    const complete = (): string[] => workspace.completeTypes(caller, source.length).map(item => item.fqcn);
    expect(complete()).toEqual(['Target']);
    const original = snapshot.declaration.declarations[0]!;
    snapshot.declaration.declarations[0] = { ...original, abstractClass: true };
    expect(workspace.workspaceTypes().find(item => item.fqcn === 'Target')!.abstract).toBe(true);
    expect(complete()).toEqual([]);
    snapshot.declaration.declarations[0] = original;
    expect(complete()).toEqual(['Target']);
    workspace.remove(owner);
    install(workspace, snapshot, mode);
    expect(complete()).toEqual(['Target']);
    snapshot.declaration.declarations[0] = { ...original, abstractClass: true };
    expect(complete()).toEqual([]);
  } finally { donor.dispose(); workspace.dispose(); }
});

it.each(configurations)('keeps restored record replacements visible in query forks (PHP $version, $mode)', ({ version, mode }) => {
  const donor = new SemanticWorkspace(parser), workspace = new SemanticWorkspace(parser);
  let fork: SemanticWorkspace | undefined;
  try {
    donor.update(owner, '<?php class Target {}', true);
    const snapshot = donor.snapshot(owner)!;
    workspace.setTargetPhpVersion(version);
    install(workspace, snapshot, mode);
    workspace.update(caller, source, true);
    fork = workspace.forkForLocalQuery(caller, source, new Set());
    expect(workspace.completeTypes(caller, source.length).map(item => item.fqcn)).toEqual(['Target']);
    expect(fork.completeTypes(caller, source.length).map(item => item.fqcn)).toEqual(['Target']);
    const original = snapshot.declaration.declarations[0]!;
    snapshot.declaration.declarations[0] = { ...original, abstractClass: true };
    expect(workspace.completeTypes(caller, source.length)).toEqual([]);
    expect(fork.completeTypes(caller, source.length)).toEqual([]);
    snapshot.declaration.declarations[0] = original;
    expect(fork.completeTypes(caller, source.length).map(item => item.fqcn)).toEqual(['Target']);
  } finally { fork?.dispose(); donor.dispose(); workspace.dispose(); }
});

it.each([true, false])('refreshes ordinary type completions across edits retained=%s', retained => {
  const workspace = new SemanticWorkspace(parser);
  try {
    workspace.update(caller, source, retained);
    workspace.update(owner, '<?php class Target {}', retained);
    expect(workspace.completeTypes(caller, source.length).map(item => item.fqcn)).toEqual(['Target']);
    workspace.update(owner, '<?php abstract class Target {}', retained);
    expect(workspace.completeTypes(caller, source.length)).toEqual([]);
    workspace.update(owner, '<?php class Target {}', retained);
    expect(workspace.completeTypes(caller, source.length).map(item => item.fqcn)).toEqual(['Target']);
  } finally { workspace.dispose(); }
});

it.each(['7.2', '8.5'].flatMap(version => [true, false].map(declarationsOnly => ({ version, declarationsOnly }))))(
  'refreshes borrowed prepared type records (PHP $version, declarationsOnly=$declarationsOnly)', ({ version, declarationsOnly }) => {
    const workspace = new SemanticWorkspace(parser);
    let fork: SemanticWorkspace | undefined;
    try {
      const text = '<?php class Target {}';
      const prepared = parser.prepare(text, owner, declarationsOnly);
      workspace.setTargetPhpVersion(version);
      workspace.updatePrepared(owner, text, prepared);
      workspace.update(caller, source, true);
      fork = workspace.forkForLocalQuery(caller, source, new Set());
      expect(workspace.completeTypes(caller, source.length).map(item => item.fqcn)).toEqual(['Target']);
      expect(fork.completeTypes(caller, source.length).map(item => item.fqcn)).toEqual(['Target']);
      const original = prepared.facts.declarations[0]!;
      prepared.facts.declarations[0] = { ...original, abstractClass: true };
      expect(workspace.workspaceTypes().find(item => item.fqcn === 'Target')!.abstract).toBe(true);
      expect(workspace.completeTypes(caller, source.length)).toEqual([]);
      expect(fork.completeTypes(caller, source.length)).toEqual([]);
      prepared.facts.declarations[0] = original;
      expect(workspace.completeTypes(caller, source.length).map(item => item.fqcn)).toEqual(['Target']);
    } finally { fork?.dispose(); workspace.dispose(); }
  });
