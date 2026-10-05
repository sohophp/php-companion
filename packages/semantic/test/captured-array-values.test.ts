import { afterAll, beforeAll, expect, it } from 'vitest';
import { PhpSyntaxParser } from '@php-companion/parser';
import { SemanticWorkspace } from '../src/index.js';

let parser: PhpSyntaxParser;
beforeAll(async () => { parser = await PhpSyntaxParser.createDefault(); });
afterAll(() => parser.dispose());

const cases = [
 ['ordinary',"$options=['mode'=>'x'];$options['mo§'];",['mode']],
 ['closure value',"$options=['mode'=>'x'];$f=function()use($options){$options['mo§'];};",['mode']],
 ['arrow value',"$options=['mode'=>'x'];$f=fn()=> $options['mo§'];",['mode']],
 ['closure reference',"$options=['mode'=>'x'];$f=function()use(&$options){$options['mo§'];};",[]],
 ['closure shadow',"$options=['mode'=>'x'];$f=function($options){$options['mo§'];};",[]],
 ['arrow shadow',"$options=['mode'=>'x'];$f=fn($options)=>$options['mo§'];",[]],
 ['no capture',"$options=['mode'=>'x'];$f=function(){$options['mo§'];};",[]],
 ['nested capture',"$options=['mode'=>'x'];$f=function()use($options){$g=fn()=>$options['mo§'];};",['mode']],
 ['nested arrow',"$options=['mode'=>'x'];$f=fn()=>fn()=>$options['mo§'];",['mode']],
 ['local replace',"$options=['mode'=>'x'];$f=function()use($options){$options=['other'=>'x'];$options['§'];};",['other']],
 ['local update',"$options=['mode'=>'x'];$f=function()use($options){$options['more']=1;$options['mo§'];};",['mode','more']],
 ['unset capture',"$options=['mode'=>'x'];$f=function()use($options){unset($options);$options['mo§'];};",[]],
 ['unknown call',"$options=['mode'=>'x'];$f=function()use($options){mutate($options);$options['mo§'];};",[]],
 ['unknown outer call',"$options=['mode'=>'x'];mutate($options);$f=function()use($options){$options['mo§'];};",[]],
 ['outer reference',"$options=['mode'=>'x'];$alias=&$options;$f=function()use($options){$options['mo§'];};",[]],
 ['inner reference',"$options=['mode'=>'x'];$f=function()use($options){$alias=&$options;$options['mo§'];};",[]],
 ['created snapshot',"$options=['mode'=>'x'];$f=function()use($options){$options['mo§'];};$options=['later'=>'x'];",['mode']],
 ['closure alias',"$options=['mode'=>'x'];$f=function()use($options){$copy=$options;$copy['mo§'];};",['mode']],
 ['arrow assignment',"$options=['mode'=>'x'];$f=fn()=>($options=[])+$options['mo§'];",[]],
 ['arrow unknown call',"$options=['mode'=>'x'];$f=fn()=>mutate($options)+$options['mo§'];",[]],
 ['captured property',"$options=Config::$options;$f=function()use($options){$options['mo§'];};",['mode']],
 ['captured outer param',"$f=function()use($param){$param['mo§'];};",['mode']],
 ['param unknown call',"mutate($param);$f=function()use($param){$param['mo§'];};",[]],
 ['param replaced',"$param=['more'=>1];$f=function()use($param){$param['mo§'];};",['more']],
 ['param outer unset',"unset($param);$f=function()use($param){$param['mo§'];};",[]],
 ['param arrow',"$f=fn()=>$param['mo§'];",['mode']],
 ['nested shadow',"$options=['mode'=>'x'];$f=function($options){$g=fn()=>$options['mo§'];};",[]],
 ['nested reference',"$options=['mode'=>'x'];$f=function()use(&$options){$g=fn()=>$options['mo§'];};",[]],
 ['dynamic binding',"$options=['mode'=>'x'];$f=function()use($options){extract($other);$options['mo§'];};",[]],
 ['conditional overwrite',"$options=['mode'=>'x'];$f=function()use($options){if($flag)$options=[];$options['mo§'];};",[]],
 ['before initialized',"$f=function()use($options){$options['mo§'];};$options=['mode'=>'x'];",[]],
 ['nested captured property',"$options=Config::$options;$f=function()use($options){$g=fn()=>$options['mo§'];};",['mode']],
 ['captured property alias',"$options=Config::$options;$copy=$options;$f=function()use($copy){$copy['mo§'];};",['mode']],
 ['arrow property',"$options=Config::$options;$f=fn()=>$options['mo§'];",['mode']],

] as const;

it.each(cases.flatMap(([name, body, expected]) => [false, true].map(retain => ({ name, body, expected, retain }))))(
  'keeps current $name capture values with retained syntax=$retain', ({ name, body, expected, retain }) => {
    const ws = new SemanticWorkspace(parser), uri = 'file:///Capture.php';
    const marked = '<?php class Config {/** @var array{mode:string} */ public static $options;} '
      + '/** @param array{mode:string} $param */ function read($param){' + body + '}';
    try {
      ws.update(uri, marked.replace('§', ''), retain);
      const revision = ws.revision(), snapshot = JSON.stringify(ws.snapshot(uri));
      const offset = marked.indexOf('§');
      expect(ws.completeArrayAccessKeys(uri, offset)?.keys.map(key => key.name) ?? []).toEqual(expected);
      expect(ws.arrayAccessOwnerTypeNamesAt(uri, offset)).toEqual(name.includes('property') ? ['Config'] : []);
      expect(ws.revision()).toBe(revision); expect(JSON.stringify(ws.snapshot(uri))).toBe(snapshot);
    } finally { ws.dispose(); }
  },
);

for (const retain of [false, true]) it(`retracts captured keys after unsaved edits, retained=${retain}`, () => {
  const ws = new SemanticWorkspace(parser), uri = 'file:///CaptureEdits.php';
  const states = [
    ["$options=['mode'=>1];$f=function()use($options){$options['mo§'];};", ['mode']],
    ["$options=['more'=>1];$f=function()use($options){$options['mo§'];};", ['more']],
    ["$options=['other'=>1];$f=function()use($options){$options['mo§'];};", []],
    ["$options=42;$f=function()use($options){$options['mo§'];};", []],
    ["$options=['mode'=>1];$f=function()use(&$options){$options['mo§'];};", []],
    ["$options=['mode'=>1];$f=function($options){$options['mo§'];};", []],
    ["$options=['mode'=>1];$f=function()use($options){unknown($options);$options['mo§'];};", []],
    ["$options=['mode'=>1];$f=function(){$options['mo§'];};", []],
    ["$options=['mode'=>1];$f=function()use($options){$options['mo§'];};", ['mode']],
  ] as const;
  try {
    for (const [body, expected] of states) {
      const marked = `<?php function run(){${body}}`;
      const before = ws.revision(); ws.update(uri, marked.replace('§', ''), retain);
      expect(ws.revision()).toBeGreaterThan(before);
      const revision = ws.revision(), snapshot = JSON.stringify(ws.snapshot(uri));
      expect(ws.completeArrayAccessKeys(uri, marked.indexOf('§'))?.keys.map(key => key.name) ?? []).toEqual(expected);
      expect(ws.revision()).toBe(revision); expect(JSON.stringify(ws.snapshot(uri))).toBe(snapshot);
    }
  } finally { ws.dispose(); }
});

for (const retain of [false, true]) it(`updates captured source facts without reopening the consumer, retained=${retain}`, () => {
  const ws = new SemanticWorkspace(parser), uri = 'file:///Consumer.php', owner = 'file:///Config.php';
  const marked = "<?php function run(){$options=Config::$options;$f=function()use($options){$options['mo§'];};}";
  try {
    ws.update(uri, marked.replace('§', ''), retain);
    for (const [key, expected] of [['mode', ['mode']], ['more', ['more']], ['other', []], ['mode', ['mode']]] as const) {
      ws.update(owner, `<?php class Config {/** @var array{${key}:string} */ public static $options;}`, retain);
      const consumer = JSON.stringify(ws.snapshot(uri)), revision = ws.revision();
      expect(ws.completeArrayAccessKeys(uri, marked.indexOf('§'))?.keys.map(key => key.name) ?? []).toEqual(expected);
      expect(ws.arrayAccessOwnerTypeNamesAt(uri, marked.indexOf('§'))).toEqual(['Config']);
      expect(ws.revision()).toBe(revision); expect(JSON.stringify(ws.snapshot(uri))).toBe(consumer);
    }
  } finally { ws.dispose(); }
});

for (const retain of [false, true]) it(`bounds nested captures and releases the inference guard, retained=${retain}`, () => {
  const ws = new SemanticWorkspace(parser), uri = 'file:///NestedCapture.php';
  try {
    for (const [depth, expected] of [[40, []], [2, ['mode']]] as const) {
      const marked = "<?php function run(){$options=['mode'=>1];" + '$f=function()use($options){'.repeat(depth)
        + "$options['mo§'];" + '};'.repeat(depth) + '}';
      ws.update(uri, marked.replace('§', ''), retain);
      expect(ws.completeArrayAccessKeys(uri, marked.indexOf('§'))?.keys.map(key => key.name) ?? []).toEqual(expected);
    }
  } finally { ws.dispose(); }
});

for (const retain of [false, true]) it(`retains a proven initialization after an outer unset, retained=${retain}`, () => {
  const ws = new SemanticWorkspace(parser), uri = 'file:///RestoredCapture.php';
  const marked = "<?php /** @param array{old:string} $options */ function run($options){unset($options);"
    + "$options=['mode'=>1];$f=function()use($options){$options['mo§'];};}";
  try {
    ws.update(uri, marked.replace('§', ''), retain);
    expect(ws.completeArrayAccessKeys(uri, marked.indexOf('§'))?.keys.map(key => key.name)).toEqual(['mode']);
  } finally { ws.dispose(); }
});

it.each([false, true].flatMap(retain => [
  { retain, write: '$options=42;' },
  { retain, write: "$options=['other'=>1];" },
]))('does not restore an overwritten entry inside a child block, retained=$retain: $write', ({ retain, write }) => {
  const ws = new SemanticWorkspace(parser), uri = 'file:///ChildBlockCapture.php';
  const marked = "<?php function run(){$options=['mode'=>1];$f=function()use($options){"
    + write + "if($flag){$options['mo§'];}};}";
  try {
    ws.update(uri, marked.replace('§', ''), retain);
    expect(ws.completeArrayAccessKeys(uri, marked.indexOf('§'))?.keys.map(key => key.name) ?? []).toEqual([]);
  } finally { ws.dispose(); }
});

it.each([false, true].flatMap(retain => [
  { retain, island: '?> <main>{])</main> <?php', expected: ['mode'] },
  { retain, island: '?> <?=unknown($options)?> <?php', expected: [] },
]))('keeps only proven capture values across PHP islands, retained=$retain: $island', ({ retain, island, expected }) => {
  const ws = new SemanticWorkspace(parser), uri = 'file:///IslandCapture.php';
  const marked = "<?php function read(){$options=['mode'=>1];$f=function()use($options){"
    + island + "$options['mo§'];};}";
  try {
    ws.update(uri, marked.replace('§', ''), retain);
    expect(ws.completeArrayAccessKeys(uri, marked.indexOf('§'))?.keys.map(key => key.name) ?? []).toEqual(expected);
  } finally { ws.dispose(); }
});

it.each([false, true].flatMap(retain => [
  { retain, prior: '$a=function()use($options){return $options;};', expected: ['mode'] },
  { retain, prior: '$a=function(){return [];};', expected: ['mode'] },
  { retain, prior: '$a=function()use(&$options){return $options;};', expected: [] },
  { retain, prior: '$a=function(&$value){$value=[];};', expected: ['mode'] },
]))('separates closure creation from invocation, retained=$retain: $prior', ({ retain, prior, expected }) => {
  const ws = new SemanticWorkspace(parser), uri = 'file:///SequentialCapture.php';
  const marked = "<?php function read(){$options=['mode'=>1];" + prior
    + "$b=function()use($options){$options['mo§'];};}";
  try {
    ws.update(uri, marked.replace('§', ''), retain);
    expect(ws.completeArrayAccessKeys(uri, marked.indexOf('§'))?.keys.map(key => key.name) ?? []).toEqual(expected);
  } finally { ws.dispose(); }
});
