import { afterAll, beforeAll, expect, it } from 'vitest';
import { PhpSyntaxParser } from '@php-companion/parser';
import { SemanticWorkspace } from '../src/index.js';

let parser: PhpSyntaxParser;
beforeAll(async () => { parser = await PhpSyntaxParser.createDefault(); });
afterAll(() => parser.dispose());
const uri = 'file:///ComplexityDefinitions.php', callerUri = 'file:///ComplexityCaller.php';
const valid = '<?php class Row { public function name(): string {} }\n/** @return Row */ function row() {}';
const excessive = valid.replace('@return Row', '@return ' + '('.repeat(4096) + 'Row' + ')'.repeat(4096));
const marked = '<?php function consume(){ $value=row(); $value->§name(); }';
const caller = marked.replace('§', ''), offset = marked.indexOf('§');

it.each([true, false])('withdraws an excessive PHPDoc return without losing adjacent declarations, retained=%s', retained => {
  const workspace = new SemanticWorkspace(parser);
  try {
    workspace.update(uri, valid, retained); workspace.update(callerUri, caller, retained);
    expect(workspace.completeMembers(callerUri, offset).map(member => member.name)).toEqual(['name']);
    workspace.update(uri, excessive, retained);
    expect(workspace.completeMembers(callerUri, offset)).toEqual([]);
    expect(workspace.definition(callerUri, offset)).toEqual([]);
    const direct = '<?php function direct(Row $value){ $value->§name(); }';
    workspace.update('file:///Direct.php', direct.replace('§', ''), retained);
    expect(workspace.completeMembers('file:///Direct.php', direct.indexOf('§')).map(member => member.name)).toEqual(['name']);
    workspace.update(uri, valid, retained);
    expect(workspace.completeMembers(callerUri, offset).map(member => member.name)).toEqual(['name']);
  } finally { workspace.dispose(); }
});

it.each(['restore', 'restoreDeclaration', 'restoreSourceDeclaration'] as const)(
  'keeps excessive types opaque after %s and rejects pre-budget facts', mode => {
    const donor = new SemanticWorkspace(parser), workspace = new SemanticWorkspace(parser);
    try {
      donor.update(uri, excessive);
      const snapshot = mode === 'restoreSourceDeclaration' ? donor.sourceDeclarationSnapshot(uri)! : donor.snapshot(uri)!;
      expect(snapshot.schema).toBe(mode === 'restoreSourceDeclaration' ? 10 : 93);
      expect(workspace[mode]({ ...snapshot, schema: mode === 'restoreSourceDeclaration' ? 9 : 91 }, uri)).toBe(false);
      expect(workspace[mode](JSON.parse(JSON.stringify(snapshot)), uri)).toBe(true);
      workspace.update(callerUri, caller);
      expect(workspace.completeMembers(callerUri, offset)).toEqual([]);
      workspace.update(uri, valid);
      expect(workspace.completeMembers(callerUri, offset).map(member => member.name)).toEqual(['name']);
    } finally { donor.dispose(); workspace.dispose(); }
  },
);
