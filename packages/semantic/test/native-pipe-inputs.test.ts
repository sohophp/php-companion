import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, expect, it } from 'vitest';
import { PhpSyntaxParser } from '@php-companion/parser';
import { SemanticWorkspace } from '../src/index.js';

interface Observation { version: string; case: string; input: string; native: string; strict: boolean; accepted: boolean; }
const fixture = JSON.parse(readFileSync(new URL('./fixtures/native-numeric-inputs.json', import.meta.url), 'utf8')) as {cases: Observation[]};
const rows = fixture.cases.filter(row => row.version === '8.5');
const forms = ['function', 'static', 'instance', 'arrow', 'closure'] as const;
let parser: PhpSyntaxParser;
beforeAll(async () => { parser = await PhpSyntaxParser.createDefault(); });
afterAll(() => parser.dispose());
for (const row of rows) for (const form of forms) for (const retained of [true, false]) for (const local of [true, false]) {
  it(`pipe native ${row.case} ${row.native} strict=${row.strict} ${form} local=${local} retained=${retained}`, () => {
    const workspace = new SemanticWorkspace(parser), uri = 'file:///Caller.php';
    try {
      workspace.setTargetPhpVersion('8.5');
      const body = `(${row.native} $mode):Row{return new Row();}`;
      const definitions = form === 'function' ? `function make${body}`
        : form === 'static' ? `class Factory{static function make${body}}`
        : form === 'instance' ? `class Factory{function make${body}}` : '';
      workspace.update('file:///Defs.php', '<?php class Row{function rowOnly(){}}' + definitions, retained);
      const callback = form === 'function' ? 'make(...)' : form === 'static' ? 'Factory::make(...)'
        : form === 'instance' ? '$factory->make(...)' : form === 'arrow'
          ? `(fn(${row.native} $mode):Row=>new Row())` : `(function${body})`;
      const prefix = (form === 'instance' ? '$factory=new Factory();' : '') + (local ? `$input=${row.input};` : '');
      const text = `<?php declare(strict_types=${Number(row.strict)});function run(){${prefix}`
        + `$v=${local ? '$input' : row.input} |> ${callback};$v->;}`;
      workspace.update(uri, text, retained);
      expect(workspace.variableValueAt(uri, text.lastIndexOf('$v') + 1)?.type).toBe(row.accepted ? 'Row' : undefined);
      expect(workspace.completeMembers(uri, text.lastIndexOf('->') + 2).map(item => item.name)).toEqual(row.accepted ? ['rowOnly'] : []);
    } finally { workspace.dispose(); }
  });
}

const safety = [
  { name: 'latest valid assignment', prefix: "$input='wrong';$input='42';", expression: '$input |> make(...)', count: 1 },
  { name: 'latest invalid assignment', prefix: "$input='42';$input='wrong';", expression: '$input |> make(...)', count: 0 },
  { name: 'unknown mutation', prefix: "$input='42';mutate($input);", expression: '$input |> make(...)', count: 0 },
  { name: 'shared reference', prefix: "$input='42';$alias=&$input;$alias='wrong';", expression: '$input |> make(...)', count: 0 },
  { name: 'unknown branch', prefix: "$input='42';if($flag){$input='wrong';}", expression: '$input |> make(...)', count: 0 },
  { name: 'parenthesized literal', prefix: '', expression: "('42') |> make(...)", count: 1 },
  { name: 'scalar stage', prefix: '', expression: "'42' |> scalar(...) |> make(...)", count: 1 },
  { name: 'invalid first stage', prefix: '', expression: "'wrong' |> scalar(...) |> make(...)", count: 0 },
  { name: 'incompatible next stage', prefix: '', expression: "'42' |> make(...) |> scalar(...)", count: 0 },
  { name: 'reference parameter', prefix: '', expression: "'42' |> byReference(...)", count: 0 },
  { name: 'unknown callback', prefix: '', expression: "'42' |> $callback", count: 0 },
  { name: 'native conversion of a typed string on normal return', prefix: '', expression: '$input |> make(...)', count: 1 },
  { name: 'unknown scalar', prefix: '', expression: '$untyped |> make(...)', count: 0 },
];
for (const retained of [true, false]) for (const row of safety) {
  it(`pipe proof ${row.name} retained=${retained}`, () => {
    const workspace = new SemanticWorkspace(parser), uri = 'file:///Caller.php';
    try {
      workspace.setTargetPhpVersion('8.5');
      workspace.update('file:///Defs.php', '<?php class Row{function rowOnly(){}}function make(int $mode):Row{}'
        + 'function scalar(int $mode):int{}function byReference(int &$mode):Row{}function mutate(&$input){}', retained);
      const source = `<?php function run(string $input,$flag,callable $callback,$untyped){${row.prefix}$v=${row.expression};$v->;}`;
      workspace.update(uri, source, retained);
      expect(workspace.completeMembers(uri, source.lastIndexOf('->') + 2).map(item => item.name)).toEqual(row.count ? ['rowOnly'] : []);
    } finally { workspace.dispose(); }
  });
}
