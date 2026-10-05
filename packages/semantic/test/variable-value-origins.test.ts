import { afterAll, beforeAll, expect, it } from 'vitest';
import { PhpSyntaxParser } from '@php-companion/parser';
import { SemanticWorkspace } from '../src/index.js';
let parser: PhpSyntaxParser;
beforeAll(async () => { parser = await PhpSyntaxParser.createDefault(); });
afterAll(() => parser.dispose());
const cases = [
 ['ordinary array',"$options=External\\TYPE::$options;$options['mo'];",'array{mode: int}'],
 ['captured array',"$options=External\\TYPE::$options;$f=function()use($options){$options['mo'];};",'array{mode: int}'],
 ['bare argument',"$options=External\\TYPE::$options;$f=function()use($options){send($options);};",'array{mode: int}'],
 ['scalar capture',"$options=External\\TYPE::$scalar;$f=function()use($options){send($options);};",'string'],
 ['method capture',"$options=External\\TYPE::options();$f=function()use($options){send($options);};",'array{mode: int}'],
 ['instance property',"$config=new External\\TYPE();$options=$config->options;$f=function()use($options){send($options);};",'array{mode: int}'],
 ['nested capture',"$options=External\\TYPE::$options;$f=function()use($options){$g=function()use($options){send($options);};};",'array{mode: int}'],
 ['alias',"$options=External\\TYPE::$options;$copy=$options;$f=function()use($copy){send($copy);};",'array{mode: int}'],
 ['reference capture',"$options=External\\TYPE::$options;$f=function()use(&$options){send($options);};",null],
 ['shadow',"$options=External\\TYPE::$options;$f=function($options){send($options);};",null],
 ['unknown mutation',"$options=External\\TYPE::$options;$f=function()use($options){unknown($options);send($options);};",null],
 ['overwrite',"$options=External\\TYPE::$options;$f=function()use($options){$options=123;send($options);};",'int'],
 ['unset',"$options=External\\TYPE::$options;$f=function()use($options){unset($options);send($options);};",null],
 ['arrow',"$options=External\\TYPE::$options;$f=fn()=>send($options);",'array{mode: int}'],
] as const;

for (const retained of [false, true]) it.each(cases)(`shares variable origins and value queries, retained=${retained}: %s`, (name, body, expected) => {
  const ws = new SemanticWorkspace(parser), uri = 'file:///Consumer.php';
  try {
    const source = ('<?php function send($value){} function run(){' + body + '}').replaceAll('TYPE', 'Source').replace('->options', '->instanceOptions');
    ws.update(uri, source, retained);
    const variable = name === 'alias' ? '$copy' : '$options', offset = source.lastIndexOf(variable) + 2;
    const owners = ['reference capture', 'shadow', 'overwrite'].includes(name) ? [] : ['External\\Source'];
    const revision = ws.revision(), snapshot = ws.snapshot(uri);
    expect(ws.variableValueOwnerTypeNamesAt(uri, offset)).toEqual(owners);
    expect(ws.revision()).toBe(revision); expect(ws.snapshot(uri)).toEqual(snapshot);
    ws.update('file:///Source.php', '<?php namespace External;class Source{/** @var array{mode:int} */public static $options;/** @var string */public static $scalar;/** @var array{mode:int} */public $instanceOptions;/** @return array{mode:int} */public static function options(){return [];} }', retained);
    expect(ws.variableValueAt(uri, offset)?.type ?? null).toBe(expected);
    expect(ws.completionVariableDetail(uri, offset, variable) ?? null).toBe(expected ? `${variable}: ${expected}` : null);
  } finally { ws.dispose(); }
});

for (const retained of [false, true]) it(`keeps lexical boundaries and owner edits pure, retained=${retained}`, () => {
  const ws = new SemanticWorkspace(parser), uri = 'file:///Boundary.php';
  try {
    const source = "<?php function run(){$options=External\\Source::$options; /* $options */ $literal='$options'; ?>text $options<?php $f=function()use($options){send($options);};}";
    ws.update(uri, source, retained);
    for (const token of ['/* $options', "'$options'", 'text $options'])
      expect(ws.variableValueOwnerTypeNamesAt(uri, source.indexOf(token) + token.indexOf('$options') + 2)).toEqual([]);
    const offset = source.lastIndexOf('$options') + 2;
    for (const type of ['array{mode:int}', 'string', undefined, 'array{more:string}']) {
      ws.update('file:///Source.php', `<?php namespace External;class Source{${type ? `/** @var ${type} */` : ''}public static $options;}`, retained);
      const snapshot = ws.snapshot(uri), revision = ws.revision();
      expect(ws.variableValueOwnerTypeNamesAt(uri, offset)).toEqual(['External\\Source']);
      expect(ws.revision()).toBe(revision);expect(ws.snapshot(uri)).toEqual(snapshot);
    }
  } finally { ws.dispose(); }
});

for (const retained of [false, true]) it(`bounds deep variable captures and recovers, retained=${retained}`, () => {
  const ws = new SemanticWorkspace(parser), uri = 'file:///Depth.php';
  try {
    for (const depth of [40, 2]) {
      const source = '<?php function run(){$options=External\\Source::$options;' + '$next=function()use($options){'.repeat(depth) + 'send($options);' + '};'.repeat(depth) + '}';
      ws.update(uri, source, retained);
      expect(ws.variableValueOwnerTypeNamesAt(uri, source.lastIndexOf('$options') + 2)).toEqual(depth === 40 ? [] : ['External\\Source']);
    }
  } finally { ws.dispose(); }
});
