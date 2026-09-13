import { describe, expect, it } from 'vitest';
import { createEditPlan, EditPlanError, isValidPhpIdentifier, validateEditPlan } from '../src/index.js';

describe('versioned edit plans', () => {
  const snapshot = { uri: 'file:///A.php', version: 4, length: 20, textHash: 'abc' };
  it('validates PHP identifiers for refactoring entry points', () => {
    expect(isValidPhpIdentifier('renamedMethod')).toBe(true);
    expect(isValidPhpIdentifier('命名')).toBe(true);
    expect(isValidPhpIdentifier('class')).toBe(false);
    expect(isValidPhpIdentifier('1invalid')).toBe(false);
  });
  it('attaches preconditions and orders same-file edits from the end', () => {
    expect(createEditPlan('Rename', [snapshot], [
      { uri: snapshot.uri, start: 2, end: 3, newText: 'B' }, { uri: snapshot.uri, start: 10, end: 12, newText: 'C' },
    ]).textEdits).toMatchObject([{ start: 10, expectedVersion: 4 }, { start: 2, expectedTextHash: 'abc' }]);
  });
  it('rejects missing snapshots and invalid ranges', () => {
    expect(() => createEditPlan('Bad', [], [{ uri: snapshot.uri, start: 0, end: 1, newText: '' }])).toThrow(EditPlanError);
    expect(() => createEditPlan('Bad', [snapshot], [{ uri: snapshot.uri, start: 19, end: 21, newText: '' }])).toThrow(/outside/);
  });
  it('rejects overlapping edits, including duplicate insertions', () => {
    expect(() => createEditPlan('Bad', [snapshot], [{ uri: snapshot.uri, start: 2, end: 5, newText: '' }, { uri: snapshot.uri, start: 4, end: 6, newText: '' }])).toThrow(/overlap/);
    expect(() => createEditPlan('Bad', [snapshot], [{ uri: snapshot.uri, start: 2, end: 2, newText: 'a' }, { uri: snapshot.uri, start: 2, end: 2, newText: 'b' }])).toThrow(/overlap/);
  });
  it('rejects conflicting or no-op file operations', () => {
    expect(() => createEditPlan('Bad', [], [], [{ kind: 'rename', oldUri: 'a', newUri: 'b' }, { kind: 'create', uri: 'b' }])).toThrow(/Multiple/);
    expect(() => createEditPlan('Bad', [], [], [{ kind: 'rename', oldUri: 'a', newUri: 'a' }])).toThrow(/must change/);
  });
  it('detects stale versions and disk content before application', () => {
    const plan = createEditPlan('Edit', [snapshot], [{ uri: snapshot.uri, start: 1, end: 2, newText: 'x' }]);
    expect(validateEditPlan(plan, [{ ...snapshot, version: 5 }])).toMatchObject([{ code: 'stale-version' }]);
    expect(validateEditPlan(plan, [{ ...snapshot, version: 4, textHash: 'changed' }])).toMatchObject([{ code: 'stale-content' }]);
    expect(validateEditPlan(plan, [snapshot])).toEqual([]);
  });
});
