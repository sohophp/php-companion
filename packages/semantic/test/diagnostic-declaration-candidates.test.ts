import { afterAll, beforeAll, expect, it } from 'vitest';
import { PhpSyntaxParser, type ParsedCallableDeclaration } from '@php-companion/parser';
import { SemanticWorkspace } from '../src/index.js';

let parser: PhpSyntaxParser;
beforeAll(async () => { parser = await PhpSyntaxParser.createDefault(); });
afterAll(() => parser.dispose());
const uri = 'file:///DiagnosticCandidates/Contracts.php';
const duplicateUri = 'file:///DiagnosticCandidates/Duplicate.php';
const noiseUri = 'file:///DiagnosticCandidates/Unrelated.php';
const source = `<?php declare(strict_types=1); namespace DiagnosticCandidates;
function needs(int $value, int $other): void {}
function mutate(int &$value): void {}
class Worker { public function take(int $value, int $other): void {} }
class Box { public readonly int $value; }
function inspect(Worker $worker, Box $box): void {
  needs('wrong'); $worker->take('wrong');
  needs('wrong', 2); $worker->take('wrong', 2); mutate($box->value);
}`;
type Internals = { files: Map<string, { callables: ParsedCallableDeclaration[] }>; referenceCandidates: { remove(uri: string): void }; unindexedReferenceCandidateUris: Set<string> };
const queries = [
  ['missing arguments', (w: SemanticWorkspace): ReturnType<SemanticWorkspace['missingRequiredArguments']> => w.missingRequiredArguments(uri), 2],
  ['local missing arguments', (w: SemanticWorkspace): ReturnType<SemanticWorkspace['missingRequiredArguments']> => w.missingRequiredArguments(uri, true), 2],
  ['argument types', (w: SemanticWorkspace): ReturnType<SemanticWorkspace['incompatibleArguments']> => w.incompatibleArguments(uri), 2],
  ['local argument types', (w: SemanticWorkspace): ReturnType<SemanticWorkspace['incompatibleArguments']> => w.incompatibleArguments(uri, true), 2],
  ['readonly reference writes', (w: SemanticWorkspace): ReturnType<SemanticWorkspace['readonlyPropertyAssignments']> => w.readonlyPropertyAssignments(uri), 1],
] as const;
function fixture(restored: boolean): SemanticWorkspace {
  const donor = new SemanticWorkspace(parser); const workspace = new SemanticWorkspace(parser);
  try {
    for (const [target, text] of [[uri, source], [noiseUri, '<?php namespace Unrelated; function needs(int $value): void {} class Worker { public function take(int $value): void {} }']] as const) {
      if (restored) {
        donor.update(target, text);
        expect(workspace.restoreDeclaration(donor.snapshotForPersistence(target)!, target)).toBe(true);
      } else workspace.update(target, text);
    }
    return workspace;
  } finally { donor.dispose(); }
}
for (const restored of [false, true]) {
  const mode = restored ? 'restored declarations' : 'live sources';
  it.each(queries)(`preserves %s with ${mode}`, (_name, query, count) => {
    const workspace = fixture(restored);
    try { expect(query(workspace)).toHaveLength(count); } finally { workspace.dispose(); }
  });
  it.each(queries)(`does not inspect unrelated indexed callable arrays for %s with ${mode}`, (_name, query, count) => {
    const workspace = fixture(restored); const file = (workspace as unknown as Internals).files.get(noiseUri)!;
    const callables = file.callables; let reads = 0;
    Object.defineProperty(file, 'callables', { configurable: true, get: () => { reads += 1; return callables; } });
    try { expect(query(workspace)).toHaveLength(count); expect(reads).toBe(0); }
    finally { Object.defineProperty(file, 'callables', { configurable: true, value: callables }); workspace.dispose(); }
  });
  it(`rechecks case-insensitive function duplicates after edits and removal with ${mode}`, () => {
    const workspace = fixture(restored);
    try {
      workspace.update(duplicateUri, '<?php namespace DiagnosticCandidates; function NEEDS(int $value, int $other): void {}');
      expect(workspace.missingRequiredArguments(uri)).toHaveLength(1);
      workspace.update(duplicateUri, '<?php namespace Elsewhere; function NEEDS(int $value, int $other): void {}');
      expect(workspace.missingRequiredArguments(uri)).toHaveLength(2);
      workspace.update(duplicateUri, '<?php namespace DiagnosticCandidates; function needs(int $value, int $other): void {}');
      expect(workspace.missingRequiredArguments(uri)).toHaveLength(1);
      workspace.remove(duplicateUri); expect(workspace.missingRequiredArguments(uri)).toHaveLength(2);
    } finally { workspace.dispose(); }
  });
  it(`keeps duplicate method owners ambiguous and recovers after removal with ${mode}`, () => {
    const workspace = fixture(restored);
    try {
      workspace.update(duplicateUri, '<?php namespace DiagnosticCandidates; class WORKER { public function TAKE(int $value, int $other): void {} }');
      expect(workspace.missingRequiredArguments(uri)).toHaveLength(2); expect(workspace.missingRequiredArguments(uri, true)).toHaveLength(1); expect(workspace.incompatibleArguments(uri)).toHaveLength(1);
      workspace.remove(duplicateUri);
      expect(workspace.missingRequiredArguments(uri)).toHaveLength(2); expect(workspace.incompatibleArguments(uri)).toHaveLength(2);
    } finally { workspace.dispose(); }
  });
  it(`keeps readonly reference writes conservative for duplicate callees with ${mode}`, () => {
    const workspace = fixture(restored);
    try {
      workspace.update(duplicateUri, '<?php namespace DiagnosticCandidates; function MUTATE(int &$value): void {}');
      expect(workspace.readonlyPropertyAssignments(uri)).toHaveLength(0);
      workspace.remove(duplicateUri); expect(workspace.readonlyPropertyAssignments(uri)).toHaveLength(1);
    } finally { workspace.dispose(); }
  });
  it(`checks unindexed declaration owners instead of assuming absence with ${mode}`, () => {
    const workspace = fixture(restored);
    try {
      const internal = workspace as unknown as Internals;
      internal.referenceCandidates.remove(uri); internal.unindexedReferenceCandidateUris.add(uri);
      for (const [, query, count] of queries) expect(query(workspace)).toHaveLength(count);
    } finally { workspace.dispose(); }
  });
}
