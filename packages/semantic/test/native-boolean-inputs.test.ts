import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, expect, it } from 'vitest';
import { PhpSyntaxParser } from '@php-companion/parser';
import { displayType, literal, primitive, union } from '@php-companion/type-system';
import { SemanticWorkspace } from '../src/index.js';
import { nativeScalarInput } from '../src/nativeScalarInput.js';

interface Observation { versions: string[]; native: string; input: string; strict: boolean; accepted: boolean; type?: string; }
const fixture = JSON.parse(readFileSync(new URL('./fixtures/native-boolean-inputs.json', import.meta.url), 'utf8')) as {cases: Observation[]};
let parser: PhpSyntaxParser;
beforeAll(async () => { parser = await PhpSyntaxParser.createDefault(); });
afterAll(() => parser.dispose());
for (const row of fixture.cases) for (const version of row.versions) for (const retained of [true, false])
  for (const kind of ['argument', 'return', 'property'] as const) {
    it(`boolean boundary ${version} ${kind} ${row.native} ${row.input} strict=${row.strict} retained=${retained}`, () => {
      const workspace = new SemanticWorkspace(parser), uri = 'file:///BooleanBoundary.php';
      try {
        workspace.setTargetPhpVersion(version);
        const body = kind === 'argument' ? `function convert(${row.native} $value){}function run(){convert(${row.input});}`
          : kind === 'return' ? `function convert():${row.native}{return ${row.input};}`
            : `class Target{public ${row.native} $value;}function run(){$object=new Target();$object->value=${row.input};}`;
        workspace.update(uri, `<?php declare(strict_types=${Number(row.strict)});${body}`, retained);
        const diagnostics = kind === 'argument' ? workspace.incompatibleArguments(uri)
          : kind === 'return' ? workspace.incompatibleReturns(uri) : workspace.incompatibleAssignments(uri);
        expect(diagnostics).toHaveLength(row.accepted ? 0 : 1);
      } finally { workspace.dispose(); }
    });
  }

for (const boolean of [false, true]) for (const native of ['int', 'float', 'string'] as const) {
  it(`preserves the allowed ${boolean} branch beside ${native}`, () => {
    const target = union(literal(boolean), primitive(native));
    for (const strict of [true, false]) {
      expect(nativeScalarInput(literal(boolean), target, strict, '8.5'))
        .toEqual({ accepted: 'yes', type: literal(boolean) });
    }
    const projected = nativeScalarInput(primitive('bool'), target, false, '8.5');
    expect(projected?.accepted).toBe('yes');
    expect(displayType(projected!.type!)).toBe(displayType(target));
  });
}

for (const boolean of [false, true]) for (const retained of [true, false]) {
  it(`keeps conditional return subjects boolean=${boolean} retained=${retained}`, () => {
    const workspace = new SemanticWorkspace(parser), uri = 'file:///BooleanReturn.php';
    try {
      workspace.setTargetPhpVersion('8.5');
      const source = `<?php declare(strict_types=1);class Selected{function selectedOnly(){}}class Other{function otherOnly(){}}`
        + `/** @return ($mode is ${boolean} ? Selected : Other) */function make(${boolean}|int $mode){}`
        + `function run(){$v=make(${boolean});$v->;}`;
      workspace.update(uri, source, retained);
      expect(workspace.completeMembers(uri, source.lastIndexOf('->') + 2).map(item => item.name)).toEqual(['selectedOnly']);
    } finally { workspace.dispose(); }
  });
}
