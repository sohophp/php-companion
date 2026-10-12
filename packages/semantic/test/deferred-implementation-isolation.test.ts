import { afterAll, beforeAll, expect, it } from 'vitest';
import { PhpSyntaxParser } from '@php-companion/parser';
import { SemanticWorkspace } from '../src/index.js';

let parser: PhpSyntaxParser;
beforeAll(async () => { parser = await PhpSyntaxParser.createDefault(); });
afterAll(() => parser.dispose());

const modelUri = (name: string): string => `file:///DeferredIsolation/Item${name}.php`;
const consumerUri = (name: string): string => `file:///DeferredIsolation/Service${name}.php`;
const modelSource = (name: string, member: string): string => `<?php namespace DeferredIsolation; class Item${name} { public function ${member}(): void {} }`;
const consumerSource = (name: string): string => `<?php namespace DeferredIsolation; class Service${name} {
  public function inspect(): void { $item = new Item${name}(); $item->ready(); }
  public function untouched(): void { $other = new Item${name}(); }
}`;
const members = (workspace: SemanticWorkspace, name: string): string[] => workspace.completeMembers(consumerUri(name),
  consumerSource(name).indexOf('$item->rea') + '$item->rea'.length).map((entry) => entry.name);

it('keeps deferred fields and targeted callable loading isolated when another restored file changes', () => {
  const donor = new SemanticWorkspace(parser); const workspace = new SemanticWorkspace(parser);
  try {
    const snapshots = ['A', 'B'].flatMap((name) => {
      donor.update(modelUri(name), modelSource(name, `ready${name}`));
      donor.update(consumerUri(name), consumerSource(name));
      return [donor.snapshotForPersistence(modelUri(name))!, donor.snapshotForPersistence(consumerUri(name))!];
    });
    const originalSnapshots = JSON.stringify(snapshots);
    for (const snapshot of snapshots) expect(workspace.restoreDeclaration(snapshot, snapshot.declaration.uri)).toBe(true);
    expect(workspace.deferredImplementationCount()).toBe(4);
    expect(members(workspace, 'B')).toEqual(['readyB']);
    expect(members(workspace, 'A')).toEqual(['readyA']);
    for (const name of ['A', 'B']) {
      expect(workspace.callableImplementationStates(consumerUri(name))).toEqual([
        expect.objectContaining({ identity: `deferredisolation\\service${name.toLowerCase()}::inspect`, state: 'loaded' }),
        expect.objectContaining({ identity: `deferredisolation\\service${name.toLowerCase()}::untouched`, state: 'deferred' }),
      ]);
    }
    donor.update(modelUri('A'), modelSource('A', 'readyChanged'));
    const changed = donor.snapshotForPersistence(modelUri('A'))!;
    expect(workspace.restoreDeclaration(changed, modelUri('A'))).toBe(true);
    expect(members(workspace, 'A')).toEqual(['readyChanged']);
    expect(members(workspace, 'B')).toEqual(['readyB']);
    expect(workspace.restoreDeclaration({ ...changed, schema: -1 }, modelUri('A'))).toBe(false);
    expect(members(workspace, 'A')).toEqual(['readyChanged']);
    expect(JSON.stringify(snapshots)).toBe(originalSnapshots);
  } finally { donor.dispose(); workspace.dispose(); }
});

it('keeps identical restored URIs independent across workspaces and after one workspace is disposed', () => {
  const donor = new SemanticWorkspace(parser); const first = new SemanticWorkspace(parser); const second = new SemanticWorkspace(parser);
  try {
    donor.update(consumerUri('A'), consumerSource('A'));
    const consumer = donor.snapshotForPersistence(consumerUri('A'))!;
    donor.update(modelUri('A'), modelSource('A', 'readyFirst'));
    expect(first.restoreDeclaration(donor.snapshotForPersistence(modelUri('A')), modelUri('A'))).toBe(true);
    expect(first.restoreDeclaration(consumer, consumerUri('A'))).toBe(true);
    donor.update(modelUri('A'), modelSource('A', 'readySecond'));
    expect(second.restoreDeclaration(donor.snapshotForPersistence(modelUri('A')), modelUri('A'))).toBe(true);
    expect(second.restoreDeclaration(consumer, consumerUri('A'))).toBe(true);
    expect(members(first, 'A')).toEqual(['readyFirst']);
    expect(members(second, 'A')).toEqual(['readySecond']);
    first.dispose();
    expect(members(second, 'A')).toEqual(['readySecond']);
    expect(second.callableImplementationStates(consumerUri('A'))[1]).toMatchObject({ state: 'deferred' });
  } finally { donor.dispose(); first.dispose(); second.dispose(); }
});

type CachedIntegritySnapshot = NonNullable<ReturnType<SemanticWorkspace['snapshotForPersistence']>>;
const integritySource = `<?php namespace DeferredIntegrity;
function first($value) {
  $one = helper($value);
  $two = helper($one);
  return $two;
}
function second($value) { return helper($value); }
function helper($value) { return $value; }
`;
const integrityCorruptions: Array<[string, (snapshot: CachedIntegritySnapshot) => void]> = [
  ['a callable fact moved to the file layer', (snapshot): void => {
    snapshot.implementation.file.assignments.push(snapshot.implementation.callables[0]!.facts.assignments.shift()!);
  }],
  ['a callable fact moved to another callable', (snapshot): void => {
    snapshot.implementation.callables[1]!.facts.assignments.push(snapshot.implementation.callables[0]!.facts.assignments.shift()!);
  }],
  ['facts in descending source order', (snapshot): void => {
    snapshot.implementation.callables[0]!.facts.assignments.reverse();
  }],
  ['a fact with inverted source bounds', (snapshot): void => {
    const fact = snapshot.implementation.callables[0]!.facts.assignments[0]!; fact.end = fact.start - 1;
  }],
  ['a fact with a non-integer offset', (snapshot): void => {
    snapshot.implementation.callables[0]!.facts.assignments[0]!.start = 0.5;
  }],
  ['duplicate control-flow assignment offsets', (snapshot): void => {
    const record = snapshot.implementation.callables[0]!; record.facts.controlFlowAssignments = [record.start, record.start];
  }],
  ['a callable offset attributed to the file layer', (snapshot): void => {
    snapshot.implementation.file.controlFlowAssignments = [snapshot.implementation.callables[0]!.start];
  }],
  ['a different callable identity', (snapshot): void => {
    snapshot.implementation.callables[0]!.identity += '-wrong';
  }],
  ['callable records in descending source order', (snapshot): void => {
    snapshot.implementation.callables.reverse();
  }],
  ['a callable range beyond the source', (snapshot): void => {
    snapshot.implementation.callables[0]!.end = snapshot.implementation.source.length + 1;
  }],
];

it.each(integrityCorruptions)('rejects %s without replacing the accepted declaration state', (_name, corrupt) => {
  const uri = 'file:///DeferredIntegrity/Contracts.php';
  const donor = new SemanticWorkspace(parser); const workspace = new SemanticWorkspace(parser);
  try {
    donor.update(uri, integritySource);
    const snapshot = JSON.parse(JSON.stringify(donor.snapshotForPersistence(uri))) as CachedIntegritySnapshot;
    expect(snapshot.implementation.callables).toHaveLength(3);
    expect(snapshot.implementation.callables[0]!.facts.assignments.length).toBeGreaterThanOrEqual(2);
    expect(workspace.restoreDeclaration(snapshot, uri)).toBe(true);
    const acceptedStates = workspace.callableImplementationStates(uri);
    expect(acceptedStates).toHaveLength(3);
    expect(acceptedStates.every((record) => record.state === 'deferred')).toBe(true);
    const broken = structuredClone(snapshot); corrupt(broken); const serialized = JSON.stringify(broken);
    expect(workspace.restoreDeclaration(broken, uri)).toBe(false);
    expect(JSON.stringify(broken)).toBe(serialized);
    expect(workspace.source(uri)).toBe(integritySource);
    expect(workspace.deferredImplementationCount()).toBe(1);
    expect(workspace.callableImplementationStates(uri)).toEqual(acceptedStates);
    expect(workspace.restoreDeclaration(structuredClone(snapshot), uri)).toBe(true);
    expect(workspace.callableImplementationStates(uri)).toEqual(acceptedStates);
  } finally { donor.dispose(); workspace.dispose(); }
});
