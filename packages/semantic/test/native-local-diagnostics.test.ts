import { afterAll, beforeAll, expect, it } from 'vitest';
import { PhpSyntaxParser } from '@php-companion/parser';
import { SemanticWorkspace } from '../src/index.js';

let parser: PhpSyntaxParser;
beforeAll(async () => { parser = await PhpSyntaxParser.createDefault(); });
afterAll(() => parser.dispose());
for (const retained of [true, false]) {
  for (const row of [
    { native: 'int', input: "'wrong'", strict: false, count: 1 },
    { native: 'int', input: "'42'", strict: false, count: 0 },
    { native: 'int', input: '42.', strict: true, count: 1 },
    { native: 'float', input: '42', strict: true, count: 0 },
    { native: '?int', input: 'null', strict: true, count: 0 },
    { native: 'int|float', input: "'wrong'", strict: false, count: 1 },
  ]) {
    it(`proves cold local ${row.native} ${row.input} strict=${row.strict} retained=${retained}`, () => {
      const workspace = new SemanticWorkspace(parser), uri = 'file:///Consumer.php';
      try {
        workspace.setTargetPhpVersion('8.5');
        workspace.update(uri, `<?php declare(strict_types=${Number(row.strict)});`
          + `class Holder{public ${row.native} $mode;}function make():${row.native}{return ${row.input};}`
          + `function run(Holder $holder){$holder->mode=${row.input};}`, retained);
        expect(workspace.incompatibleReturns(uri, true)).toHaveLength(row.count);
        expect(workspace.incompatibleAssignments(uri, true)).toHaveLength(row.count);
        expect(workspace.incompatibleReturns(uri, true)).toEqual(workspace.incompatibleReturns(uri));
        expect(workspace.incompatibleAssignments(uri, true)).toEqual(workspace.incompatibleAssignments(uri));
      } finally { workspace.dispose(); }
    });
  }
  it(`defers external property and annotation contracts before project readiness retained=${retained}`, () => {
    const workspace = new SemanticWorkspace(parser), uri = 'file:///Consumer.php';
    try {
      workspace.setTargetPhpVersion('8.5');
      workspace.update('file:///External.php', '<?php class External{public int $mode;}', retained);
      workspace.update(uri, "<?php class Local{/** @var int */public $mode;}"
        + "function run(External $external,Local $local){$external->mode='wrong';$local->mode='wrong';}", retained);
      expect(workspace.incompatibleAssignments(uri, true)).toEqual([]);
      expect(workspace.incompatibleAssignments(uri)).toHaveLength(1);
    } finally { workspace.dispose(); }
  });
  it(`does not guess return hierarchies or local inherited owners retained=${retained}`, () => {
    const workspace = new SemanticWorkspace(parser), uri = 'file:///Consumer.php';
    try {
      workspace.setTargetPhpVersion('8.5');
      workspace.update(uri, "<?php class Holder extends Missing{public int $mode;}"
        + "function make():Missing{return new Child();}function run(Holder $holder){$holder->mode='wrong';}", retained);
      expect(workspace.incompatibleReturns(uri, true)).toEqual([]);
      expect(workspace.incompatibleAssignments(uri, true)).toEqual([]);
    } finally { workspace.dispose(); }
  });
}
