import { afterAll, beforeAll, expect, it } from 'vitest';
import { PhpSyntaxParser } from '@php-companion/parser';
import { SemanticWorkspace } from '../src/index.js';

let parser: PhpSyntaxParser;
beforeAll(async () => { parser = await PhpSyntaxParser.createDefault(); });
afterAll(() => parser.dispose());
const uri = 'file:///MagicMethodDefaults.php';
const source = `<?php
class Row { public function name(): string {} }
/**
 * @method Row run(string $label = 'x,y', Row $row = null, int $count = 2)
 * @property string $title
 */
class Magic {}
function consume(Magic $magic) { $magic->run(); $magic->run()->name(); }
`;

it.each([true, false])('keeps defaulted magic parameters and withdraws malformed signatures, retained=%s', retained => {
  const workspace = new SemanticWorkspace(parser);
  const signatureOffset = source.indexOf('->run()') + '->run('.length;
  const memberOffset = source.indexOf('->name()') + 3;
  try {
    workspace.update(uri, source, retained);
    const check = (): void => {
      const signature = workspace.signatures(uri, signatureOffset)[0];
      expect(signature?.parameters.map(({ name, defaultValue }) => ({ name, defaultValue }))).toEqual([
        { name: 'label', defaultValue: "'x,y'" }, { name: 'row', defaultValue: 'null' }, { name: 'count', defaultValue: '2' },
      ]);
      expect(workspace.completeMembers(uri, memberOffset).map(member => member.name)).toEqual(['name']);
    };
    check();
    for (const broken of ["array{owner: Row $label", "string $label = ['key' =>]"]) {
      const next = source.replace("string $label = 'x,y', Row $row = null, int $count = 2", broken);
      workspace.update(uri, next, retained);
      expect(workspace.signatures(uri, next.indexOf('->run()') + '->run('.length)).toEqual([]);
      expect(workspace.completeMembers(uri, next.indexOf('->name()') + 3)).toEqual([]);
      expect(workspace.snapshot(uri)?.declaration.magicMembers.map(member => member.name)).toEqual(['title']);
    }
    workspace.update(uri, source, retained); check();
  } finally { workspace.dispose(); }
});

it.each(['restore', 'restoreDeclaration', 'restoreSourceDeclaration'] as const)('retains concrete magic defaults after %s and rejects pre-fix snapshots', mode => {
  const donor = new SemanticWorkspace(parser), workspace = new SemanticWorkspace(parser);
  try {
    donor.update(uri, source);
    const snapshot = mode === 'restoreSourceDeclaration' ? donor.sourceDeclarationSnapshot(uri)! : donor.snapshot(uri)!;
    expect(snapshot.schema).toBe(mode === 'restoreSourceDeclaration' ? 10 : 93);
    expect(workspace[mode](JSON.parse(JSON.stringify(snapshot)), uri)).toBe(true);
    const callerUri = 'file:///RestoredMagicDefaults.php';
    const caller = '<?php function restored(Magic $magic) { $magic->run(); }';
    workspace.update(callerUri, caller);
    const cursor = caller.indexOf('->run()') + '->run('.length;
    expect(workspace.signatures(callerUri, cursor)[0]?.parameters.map(parameter => parameter.defaultValue)).toEqual(["'x,y'", 'null', '2']);
    expect(workspace[mode]({ ...snapshot, schema: mode === 'restoreSourceDeclaration' ? 9 : 91 }, uri)).toBe(false);
    expect(workspace.signatures(callerUri, cursor)[0]?.parameters).toHaveLength(3);
  } finally { donor.dispose(); workspace.dispose(); }
});
