import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, expect, it } from 'vitest';
import { PhpSyntaxParser } from '@php-companion/parser';
import { SemanticWorkspace } from '../src/index.js';

interface Observation {
  version: string; kind: 'default' | 'return' | 'property'; native: string;
  input: string; inputName: string; declarationStrict: boolean; callerStrict: boolean;
  accepted: boolean; branch?: 'Row' | 'Other';
}
interface SafetyCase {
  name: string; definitions: string; extraDefinitions?: string; consumer: string;
  query: 'return' | 'property' | 'members'; preservedPolicy?: {strict: number; weak: number};
}
const observations = JSON.parse(readFileSync(new URL('./fixtures/native-boundaries.json', import.meta.url), 'utf8')) as {cases: Observation[]};
const safety = JSON.parse(readFileSync(new URL('./fixtures/native-boundary-safety.json', import.meta.url), 'utf8')) as {cases: SafetyCase[]};
let parser: PhpSyntaxParser;
beforeAll(async () => { parser = await PhpSyntaxParser.createDefault(); });
afterAll(() => parser.dispose());
const header = (strict: boolean): string => '<?php ' + (strict ? 'declare(strict_types=1);' : '');
for (const row of observations.cases) for (const retained of [true, false]) {
  const flavors = row.kind === 'default' ? ['return', 'output'] as const : ['diagnostic'] as const;
  for (const flavor of flavors) {
    it(`native boundary ${row.version} ${row.kind} ${row.native} ${row.inputName} declarationStrict=${row.declarationStrict} callerStrict=${row.callerStrict} ${flavor} retained=${retained}`, () => {
      const workspace = new SemanticWorkspace(parser), defs = 'file:///Defs.php', uri = 'file:///Consumer.php';
      try {
        workspace.setTargetPhpVersion(row.version);
        if (row.kind === 'default') {
          const annotation = flavor === 'return' ? '@return ($mode is int ? Row : Other)'
            : '@param-out ($mode is int ? Row : Other) $value';
          const parameters = (flavor === 'output' ? '&$value,' : '') + `${row.native} $mode=${row.input}`;
          workspace.update(defs, header(row.declarationStrict)
            + `class Row{function rowOnly(){}}class Other{function otherOnly(){}}/** ${annotation} */function make(${parameters}){}`, retained);
          const text = header(row.callerStrict) + 'function run(){'
            + (flavor === 'output' ? 'make($v);' : '$v=make();') + '$v->;}';
          workspace.update(uri, text, retained);
          const branch = row.accepted ? row.branch : undefined;
          expect(workspace.variableValueAt(uri, text.lastIndexOf('$v') + 1)?.type).toBe(branch);
          expect(workspace.completeMembers(uri, text.lastIndexOf('->') + 2).map(item => item.name).sort())
            .toEqual(branch === 'Row' ? ['rowOnly'] : branch === 'Other' ? ['otherOnly'] : []);
        } else if (row.kind === 'return') {
          workspace.update(defs, header(row.declarationStrict) + `function make():${row.native}{return ${row.input};}`, retained);
          workspace.update(uri, header(row.callerStrict) + '$v=make();', retained);
          const diagnostics = workspace.incompatibleReturns(defs);
          expect(diagnostics).toHaveLength(row.accepted ? 0 : 1);
          if (!row.accepted && ['integral-float', 'fractional-float'].includes(row.inputName))
            expect(diagnostics[0]?.actualType).toBe('float');
        } else {
          workspace.update(defs, header(row.declarationStrict) + `class Holder{public ${row.native} $mode;}`, retained);
          workspace.update(uri, header(row.callerStrict) + `function run(){$holder=new Holder();$holder->mode=${row.input};}`, retained);
          const diagnostics = workspace.incompatibleAssignments(uri);
          expect(diagnostics).toHaveLength(row.accepted ? 0 : 1);
          if (!row.accepted && ['integral-float', 'fractional-float'].includes(row.inputName))
            expect(diagnostics[0]?.actualType).toBe('float');
        }
      } finally { workspace.dispose(); }
    });
  }
}
for (const row of safety.cases) for (const retained of [true, false]) for (const strict of [true, false]) {
  it(`native boundary safety ${row.name} strict=${strict} retained=${retained}`, () => {
    const workspace = new SemanticWorkspace(parser), uri = 'file:///SafetyCaller.php';
    try {
      workspace.setTargetPhpVersion('8.5');
      workspace.update('file:///SafetyDefs.php', '<?php ' + row.definitions, retained);
      if (row.extraDefinitions) workspace.update('file:///SafetyDuplicate.php', '<?php ' + row.extraDefinitions, retained);
      const text = header(strict) + row.consumer; workspace.update(uri, text, retained);
      if (row.query === 'members') {
        expect(workspace.variableValueAt(uri, text.lastIndexOf('$v') + 1)?.type).toBe('Row');
      } else {
        const count = row.query === 'return' ? workspace.incompatibleReturns(uri).length
          : workspace.incompatibleAssignments(uri).length;
        const expected = row.preservedPolicy ? row.preservedPolicy[strict ? 'strict' : 'weak']
          : ['inherited native property', 'trait native property', 'promoted native type with annotation'].includes(row.name) ? 1 : 0;
        expect(count).toBe(expected);
      }
    } finally { workspace.dispose(); }
  });
}
