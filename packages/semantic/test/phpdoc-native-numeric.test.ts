import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, expect, it } from 'vitest';
import { PhpSyntaxParser } from '@php-companion/parser';
import { SemanticWorkspace } from '../src/index.js';
interface Observation {
  version: string; case: string; input: string; native: string; strict: boolean;
  accepted: boolean; branch?: string;
}
const fixture = JSON.parse(readFileSync(new URL('./fixtures/native-numeric-inputs.json', import.meta.url), 'utf8')) as {cases: Observation[]};
let parser: PhpSyntaxParser;
beforeAll(async () => { parser = await PhpSyntaxParser.createDefault(); });
afterAll(() => parser.dispose());
for (const observation of fixture.cases) for (const flavor of ['return', 'output'] as const)
  for (const retained of [true, false]) for (const form of ['literal', 'local']) {
    it(`${flavor} ${observation.case} ${observation.native} strict=${observation.strict} PHP=${observation.version} ${form} retained=${retained}`, () => {
      const workspace = new SemanticWorkspace(parser), uri = 'file:///Consumer.php';
      try {
        workspace.setTargetPhpVersion(observation.version);
        const annotation = flavor === 'return' ? '@return ($mode is int ? Row : Other)'
          : '@param-out ($mode is int ? Row : Other) $value';
        workspace.update('file:///Definitions.php', '<?php class Row{function rowOnly(){}}class Other{function otherOnly(){}}'
          + `/** ${annotation} */function make(${observation.native} $mode${flavor === 'output' ? ',&$value' : ''}){}`, retained);
        const argument = form === 'local' ? '$input' : observation.input;
        const call = flavor === 'output' ? `make(${argument},$v);` : `$v=make(${argument});`;
        const text = '<?php ' + (observation.strict ? 'declare(strict_types=1);' : '')
          + `function run(){${form === 'local' ? `$input=${observation.input};` : ''}${call}$v->;}`;
        workspace.update(uri, text, retained);
        const type = observation.accepted ? observation.branch : undefined;
        expect(workspace.variableValueAt(uri, text.lastIndexOf('$v') + 1)?.type).toBe(type);
        expect(workspace.completeMembers(uri, text.lastIndexOf('->') + 2).map(item => item.name).sort())
          .toEqual(type === 'Row' ? ['rowOnly'] : type === 'Other' ? ['otherOnly'] : []);
        expect(workspace.incompatibleArguments(uri).filter(item => item.parameter === 'mode'))
          .toHaveLength(observation.accepted ? 0 : 1);
      } finally { workspace.dispose(); }
    });
  }
const safetyCases: Array<[string, string, string, number]> = [
  ['latest valid assignment', "$input='wrong';$input=42;", 'make($input)', 0],
  ['latest invalid assignment', "$input=42;$input='wrong';", 'make($input)', 1],
  ['unrelated literal assignment', "$input='wrong';$other=1;", 'make($input)', 1],
  ['alias mutates input', "$input='wrong';$alias=&$input;$alias=42;", 'make($input)', 0],
  ['shared input mutates input', "$input='wrong';$input=&$alias;$input=42;", 'make($input)', 0],
  ['unknown mutating call', "$input='wrong';mutate($input);", 'make($input)', 0],
  ['branch may change input', "$input='wrong';if($flag){$input=42;}", 'make($input)', 0],
  ['same call later mutator', "$input='wrong';", 'make($input,mutate($input))', 1],
  ['same call earlier mutator', "$input='wrong';", 'other(mutate($input),$input)', 0],
];
for (const retained of [true, false]) for (const [name, prefix, call, count] of safetyCases) {
  it(`numeric argument proof ${name} retained=${retained}`, () => {
    const workspace = new SemanticWorkspace(parser), uri = 'file:///Safety.php';
    try {
      workspace.setTargetPhpVersion('8.5');
      workspace.update('file:///Defs.php', '<?php function make(int $mode,$other=null){}'
        + 'function other($first,int $mode){}function mutate(&$input){$input=42;}', retained);
      workspace.update(uri, `<?php function run($flag){${prefix}${call};}`, retained);
      expect(workspace.incompatibleArguments(uri).filter(item => item.parameter === 'mode')).toHaveLength(count);
    } finally { workspace.dispose(); }
  });
}

for (const retained of [true, false]) {
  it(`finds conditional return declaration sources without guessing the result retained=${retained}`, () => {
    const workspace = new SemanticWorkspace(parser), uri = 'file:///Consumer.php';
    const text = '<?php use App\\Row;use App\\Other;/** @return ($mode is int ? Row : Other) */'
      + 'function make(int $mode){}function run(){$input="42";$v=make($input);$v->rowOnly();}';
    try {
      workspace.setTargetPhpVersion('8.5'); workspace.update(uri, text, retained);
      expect(workspace.memberOwnerTypeNamesAt(uri, text.indexOf('->')+2).sort()).toEqual(['App\\Other','App\\Row']);
      expect(workspace.completeMembers(uri, text.indexOf('->')+2)).toEqual([]);
      workspace.update('file:///Row.php', '<?php namespace App;class Row{function rowOnly(){}}', retained);
      workspace.update('file:///Other.php', '<?php namespace App;class Other{function otherOnly(){}}', retained);
      expect(workspace.completeMembers(uri, text.indexOf('->')+2).map(item => item.name)).toEqual(['rowOnly']);
      const invalid = text.replace('$input="42"', '$input="wrong"'); workspace.update(uri, invalid, retained);
      expect(workspace.completeMembers(uri, invalid.indexOf('->')+2)).toEqual([]);
    } finally { workspace.dispose(); }
  });
}
