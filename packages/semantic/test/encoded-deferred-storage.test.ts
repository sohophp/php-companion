import { afterAll, beforeAll, expect, it, vi } from 'vitest';
import { PhpSyntaxParser } from '@php-companion/parser';
import { SemanticWorkspace } from '../src/index.js';

let parser: PhpSyntaxParser;
beforeAll(async () => { parser = await PhpSyntaxParser.createDefault(); });
afterAll(() => parser.dispose());
const uri = 'file:///EncodedStorage/Consumer.php'; const modelUri = 'file:///EncodedStorage/Model.php';
const source = `<?php namespace EncodedStorage; class Consumer {
  public function inspect(): void { $item = new Model(); $item->ready(); }
  public function untouched(): void { $other = new Model(); }
}`;
const model = '<?php namespace EncodedStorage; class Model { public function ready(): void {} }';
type Snapshot = NonNullable<ReturnType<SemanticWorkspace['snapshotForPersistence']>>;
type Stored = Snapshot['implementation'] & { storage?: { serialized?: string; decoded?: unknown } };
function seed(donor: SemanticWorkspace): Snapshot {
  donor.update(modelUri, model); donor.update(uri, source);
  return JSON.parse(JSON.stringify(donor.snapshotForPersistence(uri))) as Snapshot;
}
function stored(workspace: SemanticWorkspace): Stored {
  const state = workspace as unknown as { deferredImplementations: Map<string, { snapshot: Stored }> };
  return state.deferredImplementations.get(uri)!.snapshot;
}

it('keeps facts encoded until requested and preserves the complete persisted snapshot after targeted hydration', () => {
  const donor = new SemanticWorkspace(parser); const workspace = new SemanticWorkspace(parser);
  try {
    const snapshot = seed(donor); const before = JSON.stringify(snapshot);
    expect(workspace.restoreDeclaration(donor.snapshotForPersistence(modelUri), modelUri)).toBe(true);
    expect(workspace.restoreDeclaration(snapshot, uri)).toBe(true);
    const deferred = stored(workspace); expect(typeof deferred.storage?.serialized).toBe('string');
    workspace.source(uri); workspace.workspaceTypes(); workspace.workspaceFunctions(); workspace.workspaceSymbols('');
    expect(deferred.storage?.decoded).toBeUndefined();
    expect(workspace.callableImplementationStates(uri).every(record => record.state === 'deferred')).toBe(true);
    expect(workspace.completeMembers(uri, source.indexOf('$item->rea') + '$item->rea'.length).map(member => member.name)).toEqual(['ready']);
    expect(workspace.callableImplementationStates(uri).map(record => record.state)).toEqual(['loaded', 'deferred']);
    expect(workspace.snapshotForPersistence(uri)).toEqual(snapshot);
    expect(JSON.stringify(snapshot)).toBe(before);
  } finally { donor.dispose(); workspace.dispose(); }
});

it.each(['nonextensible file', 'frozen file', 'sealed empty facts', 'negative zero', 'undefined metadata', 'shared graph'])(
  'retains the accepted representation for %s', mode => {
    const donor = new SemanticWorkspace(parser); const workspace = new SemanticWorkspace(parser);
    try {
      const snapshot = seed(donor); const file = snapshot.implementation.file as typeof snapshot.implementation.file & { extra?: unknown };
      if (mode === 'nonextensible file') Object.preventExtensions(file);
      else if (mode === 'frozen file') Object.freeze(file);
      else if (mode === 'sealed empty facts') Object.seal(file.assignments);
      else if (mode === 'negative zero') file.extra = -0;
      else if (mode === 'undefined metadata') file.extra = undefined;
      else { const shared = {}; file.extra = [shared, shared]; }
      expect(workspace.restoreDeclaration(snapshot, uri)).toBe(true);
      expect(stored(workspace) === snapshot.implementation).toBe(true);
      expect(workspace.callableImplementationStates(uri).every(record => record.state === 'deferred')).toBe(true);
    } finally { donor.dispose(); workspace.dispose(); }
  });

it('keeps decoded mutable facts independent across workspaces and after one workspace is disposed', () => {
  const donor = new SemanticWorkspace(parser); const first = new SemanticWorkspace(parser); const second = new SemanticWorkspace(parser);
  try {
    const snapshot = seed(donor);
    for (const workspace of [first, second]) expect(workspace.restoreDeclaration(snapshot, uri)).toBe(true);
    const left = stored(first).callables[0]!.facts; const right = stored(second).callables[0]!.facts;
    expect(left === right).toBe(false); expect(left.assignments === right.assignments).toBe(false);
    const original = structuredClone(right); left.assignments.splice(0);
    expect(right).toEqual(original); first.dispose(); expect(second.snapshotForPersistence(uri)).toEqual(snapshot);
  } finally { donor.dispose(); first.dispose(); second.dispose(); }
});

it('preserves the original accepted snapshot if encoding throws', () => {
  const donor = new SemanticWorkspace(parser); const workspace = new SemanticWorkspace(parser);
  try {
    const snapshot = seed(donor); const original = JSON.stringify;
    const stringify = vi.spyOn(JSON, 'stringify').mockImplementation(((value: unknown): string | undefined => {
      if (value === snapshot.implementation.file) throw new Error('Controlled encoding failure.'); return original(value);
    }) as typeof JSON.stringify);
    try { expect(workspace.restoreDeclaration(snapshot, uri)).toBe(true); }
    finally { stringify.mockRestore(); }
    expect(stored(workspace) === snapshot.implementation).toBe(true);
  } finally { donor.dispose(); workspace.dispose(); }
});
