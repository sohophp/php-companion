import { afterAll, beforeAll, expect, it } from 'vitest';
import { PhpSyntaxParser } from '@php-companion/parser';
import { SemanticWorkspace } from '../src/index.js';

let parser: PhpSyntaxParser;
beforeAll(async () => { parser = await PhpSyntaxParser.createDefault(); });
afterAll(() => parser.dispose());

it.each(['function', 'method'] as const)('withdraws warmed value-call proofs when a %s signature is restored with reference parameters', kind => {
  const defsUri = `file:///SnapshotSignature-${kind}.php`;
  const callerUri = `file:///SnapshotCaller-${kind}.php`;
  const definitions = '<?php class SnapshotRepo { public function ready(): void {} } '
    + (kind === 'function' ? 'function snapshotObserve($value): void {}'
      : 'class SnapshotObserver { public function observe($value): void {} }');
  const reference = definitions.replace('($value)', '(&$value)');
  const caller = `<?php function run(): void { ${kind === 'method' ? '$observer = new SnapshotObserver();' : ''}
    $value = null ?: new SnapshotRepo(); ${kind === 'function' ? 'snapshotObserve' : '$observer->observe'}($value); $value->ready(); }`;
  for (const mode of ['restore', 'restoreDeclaration'] as const) {
    const project = new SemanticWorkspace(parser);
    const donor = new SemanticWorkspace(parser);
    try {
      donor.update(defsUri, definitions); const valueSnapshot = structuredClone(donor.snapshot(defsUri)!);
      donor.update(defsUri, reference); const referenceSnapshot = structuredClone(donor.snapshot(defsUri)!);
      project.update(defsUri, definitions); project.update(callerUri, caller);
      const members = (): string[] => project.completeMembers(callerUri,
        caller.indexOf('$value->rea') + '$value->rea'.length).map(item => item.name);
      expect(members(), mode).toEqual(['ready']);
      expect(members(), mode).toEqual(['ready']);
      expect(project[mode](referenceSnapshot, defsUri)).toBe(true);
      expect(members(), mode).toEqual([]);
      expect(members(), mode).toEqual([]);
      expect(project[mode](valueSnapshot, defsUri)).toBe(true);
      expect(members(), mode).toEqual(['ready']);
      // A rejected cache must preserve the current facts and their proof.
      expect(project[mode]({ ...referenceSnapshot, schema: -1 }, defsUri)).toBe(false);
      expect(members(), mode).toEqual(['ready']);
    } finally { project.dispose(); donor.dispose(); }
  }
});
