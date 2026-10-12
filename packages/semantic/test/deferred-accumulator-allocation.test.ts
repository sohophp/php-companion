import { afterAll, beforeAll, expect, it } from 'vitest';
import { PhpSyntaxParser } from '@php-companion/parser';
import { SemanticWorkspace } from '../src/index.js';

let parser: PhpSyntaxParser;
beforeAll(async () => { parser = await PhpSyntaxParser.createDefault(); });
afterAll(() => parser.dispose());

function retainedAccumulationArrays(workspace: SemanticWorkspace): number {
  const records = (workspace as unknown as {
    deferredImplementations: Map<string, { facts?: Record<string, unknown> }>;
  }).deferredImplementations;
  return new Set([...records.values()].flatMap((record) =>
    record.facts ? Object.values(record.facts).filter(Array.isArray) : [])).size;
}

it('keeps accumulation arrays unallocated for declaration-only files after metadata reads, another file hydration and rejection', () => {
  const donor = new SemanticWorkspace(parser); const workspace = new SemanticWorkspace(parser);
  try {
    const snapshots = Array.from({ length: 64 }, (_, i) => {
      const uri = `file:///DeferredAccumulator/Fixture${i}.php`;
      donor.update(uri, `<?php namespace DeferredAccumulator; class Fixture${i} {
        public function id(): int { return ${i}; }
        public function next(): self { return $this; }
      }`);
      return donor.snapshotForPersistence(uri)!;
    });
    const original = JSON.stringify(snapshots);
    for (const snapshot of snapshots) expect(workspace.restoreDeclaration(snapshot, snapshot.declaration.uri)).toBe(true);
    for (const snapshot of snapshots) {
      expect(workspace.callableImplementationStates(snapshot.declaration.uri).map((entry) => entry.state)).toEqual(['deferred', 'deferred']);
    }
    expect(workspace.deferredImplementationCount()).toBe(64);
    expect(retainedAccumulationArrays(workspace)).toBe(0);
    const first = snapshots[0]!;
    expect(workspace.snapshotForPersistence(first.declaration.uri)).toEqual(donor.snapshotForPersistence(first.declaration.uri));
    expect(workspace.snapshot(first.declaration.uri)).toEqual(donor.snapshot(first.declaration.uri));
    const rejected = structuredClone(snapshots[1]!);
    rejected.layers.referenceCandidates.keys = ['raw-ci:corrupt'];
    expect(workspace.restoreDeclaration(rejected, rejected.declaration.uri)).toBe(false);
    expect(workspace.deferredImplementationCount()).toBe(63);
    expect(retainedAccumulationArrays(workspace)).toBe(0);
    expect(workspace.callableImplementationStates(rejected.declaration.uri).map((entry) => entry.state)).toEqual(['deferred', 'deferred']);
    expect(JSON.stringify(snapshots)).toBe(original);
  } finally { donor.dispose(); workspace.dispose(); }
});
