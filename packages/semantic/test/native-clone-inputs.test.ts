import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, expect, it } from 'vitest';
import { PhpSyntaxParser } from '@php-companion/parser';
import { SemanticWorkspace } from '../src/index.js';

interface NumericCase { case: string; native: string; input: string; strict: boolean; accepted: boolean; }
interface SafetyCase { id: string; declaration: string; input: string; accepted: boolean; scope: string; prefix: string; }
const fixture = JSON.parse(readFileSync(new URL('./fixtures/native-clone-inputs.json', import.meta.url), 'utf8')) as {
  cases: NumericCase[]; safetyCases: SafetyCase[];
};
let parser: PhpSyntaxParser;
beforeAll(async () => { parser = await PhpSyntaxParser.createDefault(); });
afterAll(() => parser.dispose());

for (const row of fixture.cases) for (const retained of [true, false]) for (const member of [false, true]) {
  it(`clone native ${row.case} ${row.native} strict=${row.strict} member=${member} retained=${retained}`, () => {
    const workspace = new SemanticWorkspace(parser), uri = 'file:///CloneBoundary.php';
    try {
      workspace.setTargetPhpVersion('8.5');
      const operand = member ? '$box->value' : '$value';
      const source = `<?php declare(strict_types=${Number(row.strict)});class Value{public ${row.native} $mode;function valueOnly(){}}class Box{public Value $value;}`
        + `function run(Value $value,Box $box){$copy=clone(${operand},['mode'=>${row.input}]);$copy->valueOnly();}`;
      workspace.update(uri, source, retained);
      const access = source.lastIndexOf('$copy->');
      expect(workspace.completeMembers(uri, access + 7).map(item => item.name).sort()).toEqual(row.accepted ? ['mode', 'valueOnly'] : []);
      expect(workspace.definition(uri, access + 10)).toHaveLength(row.accepted ? 1 : 0);
    } finally { workspace.dispose(); }
  });
}

for (const row of fixture.safetyCases) for (const strict of [false, true]) for (const retained of [true, false]) {
  it(`clone safety ${row.id} strict=${strict} retained=${retained}`, () => {
    const workspace = new SemanticWorkspace(parser), uri = 'file:///CloneSafety.php';
    try {
      workspace.setTargetPhpVersion('8.5');
      const body = `$copy=clone($value,['mode'=>${row.input}]);$copy->valueOnly();`;
      const source = `<?php declare(strict_types=${Number(strict)});${row.prefix}class Value${row.id === 'inherited' ? ' extends Base' : ''}{${row.declaration}public function valueOnly(){}`
        + (row.scope === 'inside' ? `public static function run(Value $value){${body}}}` : `}function run(Value $value){${body}}`);
      workspace.update(uri, source, retained);
      const access = source.lastIndexOf('$copy->');
      expect(workspace.completeMembers(uri, access + 7).some(item => item.name === 'valueOnly')).toBe(row.accepted);
      expect(workspace.definition(uri, access + 10)).toHaveLength(row.accepted ? 1 : 0);
    } finally { workspace.dispose(); }
  });
}

for (const retained of [true, false]) {
  it(`keeps clone inference conservative through incomplete and duplicate declarations retained=${retained}`, () => {
    const workspace = new SemanticWorkspace(parser), uri = 'file:///CloneIncomplete.php';
    try {
      workspace.setTargetPhpVersion('8.5');
      for (const declaration of [
        'class Value extends Missing{public int $mode;function valueOnly(){}}',
        'class Value extends Other{public int $mode;function valueOnly(){}}class Other extends Value{}',
        'class Value{public int $mode;function valueOnly(){}}class Value{public bool $mode;}',
        '/** @property int $mode */class Value{function valueOnly(){}}',
      ]) {
        const source = `<?php ${declaration}function run(Value $value){$copy=clone($value,['mode'=>'42']);$copy->valueOnly();}`;
        workspace.update(uri, source, retained);
        expect(workspace.completeMembers(uri, source.lastIndexOf('$copy->') + 7), declaration).toEqual([]);
      }
    } finally { workspace.dispose(); }
  });
  it(`refreshes raw native clone property facts after same-length edits retained=${retained}`, () => {
    const workspace = new SemanticWorkspace(parser), uri = 'file:///CloneEdits.php';
    try {
      workspace.setTargetPhpVersion('8.5');
      for (const [native, accepted] of [['int', false], ['bool', true], ['int', false]] as const) {
        const source = `<?php class Value{public ${native.padEnd(4)} $mode;function valueOnly(){}}function run(Value $value){$copy=clone($value,['mode'=>'wrong']);$copy->valueOnly();}`;
        workspace.update(uri, source, retained);
        expect(workspace.completeMembers(uri, source.lastIndexOf('$copy->') + 7).some(item => item.name === 'valueOnly')).toBe(accepted);
      }
    } finally { workspace.dispose(); }
  });
}

for (const version of ['7.2', '8.4', '8.5']) for (const expression of ['clone $value', 'clone($value)', "clone($value,['mode'=>'42'])", 'clone($value,)']) {
  it(`respects clone syntax version ${version} ${expression}`, () => {
    const workspace = new SemanticWorkspace(parser), uri = 'file:///CloneVersion.php';
    try {
      workspace.setTargetPhpVersion(version);
      const source = `<?php class Value{public int $mode;function valueOnly(){}}function run(Value $value){$copy=${expression};$copy->valueOnly();}`;
      workspace.update(uri, source);
      const accepted = !expression.includes(',') || version === '8.5';
      expect(workspace.completeMembers(uri, source.lastIndexOf('$copy->') + 7).some(item => item.name === 'valueOnly')).toBe(accepted);
    } finally { workspace.dispose(); }
  });
}
