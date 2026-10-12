import { afterAll, beforeAll, expect, it } from 'vitest';
import { PhpSyntaxParser } from '@php-companion/parser';
import { SemanticWorkspace } from '../src/index.js';
import { parsePhpDoc } from '@php-companion/phpdoc';
let parser: PhpSyntaxParser;
beforeAll(async () => { parser = await PhpSyntaxParser.createDefault(); });
afterAll(() => parser.dispose());
const defs = `<?php
class Row { public function name(): string {} }
class Other { public function otherOnly(): void {} }
/** @param-out Row $value */ function fill(&$value): void {}
/** @param-out Other $value */ function other(&$value): void {}
/** @param Row $value */ function inputOnly(&$value): void {}
/** @param-out Row $value */ function valueOnly($value): void {}
/** @param-out Row $value */ function required(int $first, &$value): void {}
/** @param-out Row $value */ function ambiguous(&$value): void {}
/** @param-out Other $value */ function ambiguous(&$value): void {}
class Api {
 /** @param-out Row $value */ public function fill(&$value): void {}
 /** @param-out Row $value */ public static function make(&$value): void {}
}
class Child extends Api {}
class Creator { /** @param-out Row $value */ public function __construct(&$value) {} }
`;
const positive = [
 ['new binding','fill($v);'],
 ['overwrite','$v=new Other();fill($v);'],
 ['later assignment','fill($v);$v=new Row();'],
 ['two outputs','other($v);fill($v);'],
 ['named argument','fill(value:$v);'],
 ['method','$api=new Api();$api->fill($v);'],
 ['static','Api::make($v);'],
 ['inherited','$api=new Child();$api->fill($v);'],
 ['assigned result','$done=fill($v);'],
 ['constructor','$creator=new Creator($v);'],
 ['both branches','if($flag){fill($v);}else{fill($v);}'],
 ['do once','do{fill($v);}while(false);'],
 ['try catch','try{fill($v);}catch(Exception $e){fill($v);}'],
 ['safe following literal','fill($v);$other=123;'],
] as const;
const negative = [
 ['before call',''],
 ['input annotation only','inputOnly($v);'],
 ['value parameter','valueOnly($v);'],
 ['branch not guaranteed','if($flag){fill($v);}'],
 ['short circuit','$flag&&fill($v);'],
 ['later mutation','fill($v);inputOnly($v);'],
 ['unknown mutation','fill($v);unknown($v);'],
 ['different output','fill($v);other($v);'],
 ['reassignment','fill($v);$v=new Other();'],
 ['unset','fill($v);unset($v);'],
 ['unpacked','fill(...$args);'],
 ['duplicate named','fill(value:$v,value:$v);'],
 ['missing required','required(value:$v);'],
 ['ambiguous declaration','ambiguous($v);'],
 ['nullsafe','$api=null;$api?->fill($v);'],
 ['reference alias','$v=new Other();$alias=&$v;fill($v);$alias=123;'],
 ['capture reference','$fn=function()use(&$v){};fill($v);unknown();'],
 ['future call','$v->na§;fill($v);'],
 ['inside skipped loop','while($flag){fill($v);}'],
] as const;
for (const retained of [true,false]) {
 for(const [label,body] of [...positive,...negative])it(`output ${label}, retained=${retained}`,()=>{
  const w=new SemanticWorkspace(parser);try{
   const uri='file:///Consumer.php',marked=`<?php function run($flag){${body}$v->na;}`,source=marked.replace('§','');
   w.update('file:///Defs.php',defs,retained);w.update(uri,source,retained);
   const names=w.completeMembers(uri,marked.includes('§')?marked.indexOf('§'):source.lastIndexOf('->na')+4).map(item=>item.name);
   expect(names).toEqual(positive.some(([name])=>name===label)?['name']:[]);
  }finally{w.dispose();}
 });
 it(`caller parameter value changes, retained=${retained}`,()=>{
  const w=new SemanticWorkspace(parser);try{const uri='file:///Consumer.php',source='<?php function run(Other $v){fill($v);$v->na;}';w.update('file:///Defs.php',defs,retained);w.update(uri,source,retained);expect(w.completeMembers(uri,source.indexOf('->na')+4).map(item=>item.name)).toEqual(['name']);}finally{w.dispose();}
 });
}
for(const dialect of ['','phpstan-','psalm-'])it(`distinct input and output parser tags ${dialect}`,()=>{
 const d=parsePhpDoc(`/** @param Other $value\n * @${dialect}param-out Row $value\n */`);expect(d.errors).toEqual([]);expect(d.tags.map(t=>t.name)).toEqual(['param','param-out']);
});
it('inline tags from existing stubs remain distinct',()=>{const d=parsePhpDoc('/** @param resource $in @param resource $out @param-out int $consumed @return int */');expect(d.errors).toEqual([]);expect(d.tags.map(t=>t.name)).toEqual(['param','param','param-out','return']);});
for(const retained of [true,false]) {
 for(const [type,expected] of [['int','int'],['string','string'],['array{item: Row}','array{item: Row}'],['Row|null','Row|null'],['class-string<Row>','class-string<Row>']] as const)
 it(`shared output value ${type}, retained=${retained}`,()=>{const w=new SemanticWorkspace(parser);try{const uri='file:///Value.php',source='<?php function run(){fill($v);send($v);}';w.update('file:///Defs.php',defs.replace('/** @param-out Row $value */ function fill',`/** @param-out ${type} $value */ function fill`),retained);w.update(uri,source,retained);const offset=source.lastIndexOf('$v')+1;expect(w.variableValueAt(uri,offset)?.type).toBe(expected);expect(w.completionVariableDetail(uri,offset,'$v')).toBe(`$v: ${expected}`);}finally{w.dispose();}});
 it(`keeps input type distinct, retained=${retained}`,()=>{const w=new SemanticWorkspace(parser);try{const uri='file:///Value.php',source='<?php function run(){ $v=new Other();fill($v);$v->na;}';w.update('file:///Defs.php',defs.replace('/** @param-out Row $value */ function fill','/** @param Other $value\n * @param-out Row $value */ function fill'),retained);w.update(uri,source,retained);expect(w.signature(uri,source.indexOf('fill(')+5)?.parameters[0]?.type).toBe('Other');expect(w.completeMembers(uri,source.indexOf('->na')+4).map(x=>x.name)).toEqual(['name']);}finally{w.dispose();}});
 it(`retains array output facts, retained=${retained}`,()=>{const w=new SemanticWorkspace(parser);try{const uri='file:///Value.php',source="<?php function run(){fill($v);$v['item']->na;}";w.update('file:///Defs.php',defs.replace('/** @param-out Row $value */ function fill','/** @param-out array{item: Row} $value */ function fill'),retained);w.update(uri,source,retained);expect(w.completeMembers(uri,source.indexOf('->na')+4).map(x=>x.name)).toEqual(['name']);}finally{w.dispose();}});
 it(`binds output names at declaration scope, retained=${retained}`,()=>{const w=new SemanticWorkspace(parser);try{const uri='file:///Value.php',source='<?php namespace Client;use function App\\fill as build;function run(){build($v);$v->na;}';w.update('file:///Defs.php','<?php namespace Model;class Row{function name(){}}namespace App;use Model\\Row as R;/** @param-out R $value */function fill(&$value){}',retained);w.update(uri,source,retained);expect(w.variableValueAt(uri,source.lastIndexOf('$v')+1)?.type).toBe('Model\\Row');expect(w.completeMembers(uri,source.indexOf('->na')+4).map(x=>x.name)).toEqual(['name']);}finally{w.dispose();}});
 it(`updates output types as declaration changes, retained=${retained}`,()=>{const w=new SemanticWorkspace(parser);try{const uri='file:///Value.php',source='<?php function run(){fill($v);$v->na;}';w.update('file:///Defs.php',defs,retained);w.update(uri,source,retained);expect(w.completeMembers(uri,source.indexOf('->na')+4).map(x=>x.name)).toEqual(['name']);const changed=w.update('file:///Defs.php',defs.replace('/** @param-out Row $value */ function fill','/** @param-out Other $value */ function fill'),retained);expect(changed.kind).toBe('declaration');expect(w.completeMembers(uri,source.indexOf('->na')+4).map(x=>x.name)).toEqual([]);}finally{w.dispose();}});
}
it('does not split quoted literal types at inline tag text',()=>{const source="/** @param-out array{'label': 'hello @param Foo $fake'} $value @return void */",doc=parsePhpDoc(source,12);expect(doc.errors).toEqual([]);expect(doc.tags.map(t=>t.name)).toEqual(['param-out','return']);expect(doc.tags[0]?.variable).toBe('$value');for(const t of doc.tags)expect(source.slice(t.start-12,t.end-12)).toBe(t.name==='return'?'@return void':"@param-out array{'label': 'hello @param Foo $fake'} $value");});
it('unknown longer tags stay unsupported',()=>{expect(parsePhpDoc('/** @param-out-extra Row $value */')).toEqual({tags:[],errors:[]});});
for(const retained of [true,false]){
 it(`supports global output bindings, retained=${retained}`,()=>{const w=new SemanticWorkspace(parser);try{const uri='file:///Global.php',source='<?php fill($v);$v->na;';w.update('file:///Defs.php',defs,retained);w.update(uri,source,retained);expect(w.completeMembers(uri,source.indexOf('->na')+4).map(x=>x.name)).toEqual(['name']);}finally{w.dispose();}});
 it(`keeps output annotations in parameter rename, retained=${retained}`,()=>{const w=new SemanticWorkspace(parser);try{const uri='file:///Defs.php',source='<?php class Row {} /** @param-out Row $value */ function fill(&$value):void { $value=new Row(); }';w.update(uri,source,retained);const offset=source.indexOf('function fill(&$value)')+'function fill(&$'.length;const result=w.localVariableRename(uri,offset,'result');expect(result?.locations).toContainEqual({uri,start:source.indexOf('$value')+1,end:source.indexOf('$value')+'$value'.length});}finally{w.dispose();}});
 it(`binds generic output to input arguments, retained=${retained}`,()=>{const w=new SemanticWorkspace(parser);try{const uri='file:///Generic.php',source='<?php function run(){make(Row::class,$v);$v->na;}';w.update('file:///Defs.php','<?php class Row{function name(){}}/**\n * @template T of object\n * @param class-string<T> $class\n * @param-out T $value\n */function make(string $class,&$value){}',retained);w.update(uri,source,retained);expect(w.completeMembers(uri,source.indexOf('->na')+4).map(x=>x.name)).toEqual(['name']);}finally{w.dispose();}});
}
for(const retained of [true,false]) {
 const globalCases = [
  ['new binding','fill($v);',true],
  ['existing binding','$v=new Other();fill($v);',true],
  ['two outputs','other($v);fill($v);',true],
  ['pure echo','fill($v);echo 123;',true],
  ['both branches','if($flag){fill($v);}else{fill($v);}',true],
  ['try catch','try{fill($v);}catch(Exception $e){fill($v);}',true],
  ['do once','do{fill($v);}while(false);',true],
  ['unknown call','fill($v);unknown();',false],
  ['other global write','fill($v);$alias=123;',false],
  ['globals write','fill($v);$GLOBALS["alias"]=123;',false],
  ['property write','fill($v);$obj->alias=123;',false],
  ['reference capture','fill($v);$fn=function()use(&$v){};',false],
  ['unset','fill($v);unset($v);',false],
  ['unknown branch','if($flag){fill($v);}',false],
  ['assigned result','$done=fill($v);',false],
  ['overwritten','fill($v);$v=new Other();',false],
 ] as const;
 for(const [label,body,known] of globalCases)it(`global ${label}, retained=${retained}`,()=>{const w=new SemanticWorkspace(parser);try{const uri='file:///Global.php',source=`<?php ${body}$v->na;`;w.update('file:///Defs.php',defs,retained);w.update(uri,source,retained);expect(w.completeMembers(uri,source.lastIndexOf('->na')+4).map(x=>x.name)).toEqual(known?['name']:[]);}finally{w.dispose();}});
 for(const [label,body,known] of [
  ['reference parameter','function run(&$v){fill($v);$v->na;}',true],
  ['aliased parameter write','function run(&$v,&$alias){fill($v);$alias=123;$v->na;}',false],
  ['local alias fresh','function run(){$alias=&$v;fill($v);$v->na;}',true],
  ['local alias later','function run(){$alias=&$v;fill($v);$alias=123;$v->na;}',false],
  ['captured fresh','function run(){$f=function()use(&$v){fill($v);$v->na;};}',true],
  ['captured alias later','function run(){$f=function()use(&$v,&$alias){fill($v);$alias=123;$v->na;};}',false],
 ] as const)it(`shared output ${label}, retained=${retained}`,()=>{const w=new SemanticWorkspace(parser);try{const uri='file:///Shared.php',source='<?php '+body;w.update('file:///Defs.php',defs,retained);w.update(uri,source,retained);expect(w.completeMembers(uri,source.lastIndexOf('->na')+4).map(x=>x.name)).toEqual(known?['name']:[]);}finally{w.dispose();}});
}
const genericOutputCases = [
 ['generic class receiver', `/** @template T */ class Box {/** @param-out T $value */ function fill(&$value){}}`, '/** @param Box<Row> $api */ function run($api){$api->fill($v);$v->na;}', ['name']],
 ['inherited class receiver', `/** @template T */ class Box {/** @param-out T $value */ function fill(&$value){}} /** @extends Box<Row> */ class ChildBox extends Box {}`, 'function run(){$api=new ChildBox();$api->fill($v);$v->na;}', ['name']],
 ['unbound class receiver', `/** @template T */ class Box {/** @param-out T $value */ function fill(&$value){}}`, 'function run(){$api=new Box();$api->fill($v);$v->na;}', []],
 ['trait receiver', `/** @template T */ trait Fill {/** @param-out T $value */ function fill(&$value){}} class Host {/** @use Fill<Row> */ use Fill;}`, 'function run(){$api=new Host();$api->fill($v);$v->na;}', ['name']],
 ['nested trait receiver', `/** @template T */ trait Fill {/** @param-out T $value */ function fill(&$value){}} /** @template U */ trait Mid {/** @use Fill<U> */ use Fill;} /** @template V */ class Host {/** @use Mid<V> */ use Mid;} /** @extends Host<Row> */ class ChildHost extends Host {}`, 'function run(){$api=new ChildHost();$api->fill($v);$v->na;}', ['name']],
 ['trait alias receiver', `/** @template T */ trait Fill {/** @param-out T $value */ function fill(&$value){}} class Host {/** @use Fill<Row> */ use Fill {fill as build;}}`, 'function run(){$api=new Host();$api->build($v);$v->na;}', ['name']],
 ['trait class document is not use', `/** @template T */ trait Fill {/** @param-out T $value */ function fill(&$value){}} /** @use Fill<Row> */ class Host {use Fill;}`, 'function run(){$api=new Host();$api->fill($v);$v->na;}', []],
 ['trait conflict is not resolved', `/** @template T */ trait Fill {/** @param-out T $value */ function fill(&$value){}} class Host {/** @use Fill<Row>\n * @use Fill<Other> */ use Fill;}`, 'function run(){$api=new Host();$api->fill($v);$v->na;}', []],
 ['trait method template shadows owner', `/** @template T */ trait Fill {/** @template T of object\n * @param class-string<T> $class\n * @param-out T $value */ function fill(string $class,&$value){}} class Host {/** @use Fill<Other> */ use Fill;}`, 'function run(){$api=new Host();$api->fill(Row::class,$v);$v->na;}', ['name']],
 ['declaration namespace of trait binding', `namespace Origin;class Row{function name(){}}/** @template T */ trait Fill {/** @param-out T $value */ function fill(&$value){}} namespace Consumer;class Row{function unrelated(){}}class Host {/** @use \\Origin\\Fill<\\Origin\\Row> */ use \\Origin\\Fill;}`, 'namespace Consumer;function run(){$api=new Host();$api->fill($v);$v->na;}', ['name']],
 ['trait self is consuming class', `trait Fill {/** @param-out self $value */ function fill(&$value){}}class Host {use Fill;function name(){}}`, 'function run(){$api=new Host();$api->fill($v);$v->na;}', ['name']],
 ['inherited static is called class', `class Base {/** @param-out static $value */ function fill(&$value){}}class Derived extends Base {function name(){}}`, 'function run(){$api=new Derived();$api->fill($v);$v->na;}', ['name']],
] as const;
for(const retained of [true,false])for(const [label,declarations,body,expected] of genericOutputCases)it(`generic output ${label}, retained=${retained}`,()=>{
 const w=new SemanticWorkspace(parser);try{const uri='file:///GenericConsumer.php',source='<?php '+body;w.update('file:///GenericDefs.php','<?php class Row{function name(){}}class Other{}'+declarations,retained);w.update(uri,source,retained);expect(w.completeMembers(uri,source.lastIndexOf('->na')+4).map(x=>x.name)).toEqual([...expected]);}finally{w.dispose();}
});
for (const retained of [true, false]) {
 for (const [label, body, known] of [
  ['explicit global fresh', 'function run(){global $v;fill($v);$v->na;}', true],
  ['explicit global unknown call', 'function run(){global $v;fill($v);unknown();$v->na;}', false],
  ['static local fresh', 'function run(){static $v;fill($v);$v->na;}', true],
  ['static local alias later', 'function run(){static $v;$alias=&$v;fill($v);$alias=123;$v->na;}', false],
 ] as const) it(`shared output ${label}, retained=${retained}`, () => {
  const w = new SemanticWorkspace(parser); try {
   const uri = 'file:///SharedDeclaration.php', source = '<?php ' + body;
   w.update('file:///Defs.php', defs, retained); w.update(uri, source, retained);
   expect(w.completeMembers(uri, source.lastIndexOf('->na') + 4).map(x => x.name)).toEqual(known ? ['name'] : []);
  } finally { w.dispose(); }
 });
}
for (const mode of ['full', 'declarations', 'prepared', 'restore', 'restoreDeclaration', 'restoreSourceDeclaration'] as const) {
 it(`preserves output contracts through ${mode}`, () => {
  const seed = new SemanticWorkspace(parser), w = new SemanticWorkspace(parser);
  const origin = 'file:///SnapshotDefs.php', uri = 'file:///SnapshotConsumer.php';
  const source = '<?php function run(){fill($v);$v->na;}';
  try {
   for (const [file, text] of [[origin, defs], [uri, source]] as const) {
    if (mode === 'declarations') w.updateDeclarations(file, text);
    else if (mode === 'prepared') w.updatePrepared(file, text, parser.prepare(text, file, true));
    else if (mode === 'full') w.update(file, text);
    else {
     seed.update(file, text);
     const snapshot = mode === 'restoreSourceDeclaration' ? seed.sourceDeclarationSnapshot(file) : seed.snapshot(file);
     expect(w[mode](structuredClone(snapshot), file)).toBe(true);
    }
   }
   expect(w.completeMembers(uri, source.indexOf('->na') + 4).map(x => x.name)).toEqual(['name']);
   w.update(origin, defs.replace('/** @param-out Row $value */ function fill', '/** @param-out Other $value */ function fill'));
   expect(w.completeMembers(uri, source.indexOf('->na') + 4).map(x => x.name)).toEqual([]);
  } finally { seed.dispose(); w.dispose(); }
 });
}
it('rejects previous snapshot schemas missing output and inline tag facts', () => {
 const seed = new SemanticWorkspace(parser), w = new SemanticWorkspace(parser), uri = 'file:///SchemaDefs.php';
 try {
  seed.update(uri, defs);
  const snapshot = seed.snapshot(uri)!;
  expect(snapshot.schema).toBe(93);
  for (const schema of [87, 88, 89, 90, 91, 92]) {
   const legacy = structuredClone(snapshot) as { schema: number };
   legacy.schema = schema;
   expect(w.restore(legacy, uri)).toBe(false);
   expect(w.restoreDeclaration(legacy, uri)).toBe(false);
  }
  const source = seed.sourceDeclarationSnapshot(uri)!;
  expect(source.schema).toBe(10);
  expect(w.restoreSourceDeclaration({ ...source, schema: 6 }, uri)).toBe(false);
 } finally { seed.dispose(); w.dispose(); }
});
it('loads only same-scope output producer dependencies without treating them as value proofs', () => {
 const w = new SemanticWorkspace(parser), uri = 'file:///Dependencies.php';
 const source = '<?php function unrelated(){fill($v);} function run($flag){if($flag){fill($v);}$v->na;}';
 try {
  w.update(uri, source);
  const offset = source.indexOf('->na') + 4;
  expect(w.memberReceiverFunctionNamesAt(uri, offset)).toEqual(['fill']);
  expect(w.completeMembers(uri, offset)).toEqual([]);
  w.update('file:///Defs.php', defs.replace('class Row { public function name(): string {} }', ''));
  expect(w.memberOwnerTypeNamesAt(uri, offset)).toContain('Row');
  expect(w.completeMembers(uri, offset)).toEqual([]);
  const different = '<?php function unrelated(){fill($v);} function run(){$v->na;}';
  w.update(uri, different);
  expect(w.memberReceiverFunctionNamesAt(uri, different.indexOf('->na') + 4)).toEqual([]);
 } finally { w.dispose(); }
});
it('discovers the output class before its declaration exists without manufacturing a value type', () => {
 const w = new SemanticWorkspace(parser), uri = 'file:///UnloadedOutput.php';
 const source = '<?php use function App\\fill as build;function run(){build($v);$v->na;}';
 try {
  w.update('file:///Functions.php', '<?php namespace App;/** @param-out Row $value */function fill(&$value){}');
  w.update(uri, source);
  const offset = source.indexOf('->na') + 4;
  expect(w.memberReceiverFunctionNamesAt(uri, offset)).toEqual(['App\\fill']);
  expect(w.memberOwnerTypeNamesAt(uri, offset)).toContain('App\\Row');
  expect(w.completeMembers(uri, offset)).toEqual([]);
  w.update('file:///Row.php', '<?php namespace App;class Row{function name(){}}');
  expect(w.completeMembers(uri, offset).map(x => x.name)).toEqual(['name']);
 } finally { w.dispose(); }
});
for (const retained of [true, false]) for (const [type, expected] of [
 ['array{T: T}', 'array{T: Row}'],
 ["array{item: T, label: 'T'}", "array{item: Row, label: 'T'}"],
 ['array{item: T, callback: callable(T $T): T}', 'array{item: Row, callback: callable(Row): Row}'],
 ["array{T: T|null, label: 'T'}", "array{T: Row|null, label: 'T'}"],
] as const) it(`binds output templates without rewriting keys, literals or parameter names: ${type}, retained=${retained}`, () => {
 const w = new SemanticWorkspace(parser), uri = 'file:///OutputTemplateNames.php';
 const declaration = `<?php class Row {} /**\n * @template T of object\n * @param class-string<T> $class\n * @param-out ${type} $value\n */ function make(string $class, &$value) {}`;
 const source = '<?php function run(){make(Row::class,$v);useValue($v);}';
 try {
  w.update('file:///OutputTemplateDefinitions.php', declaration, retained);
  w.update(uri, source, retained);
  expect(w.variableValueAt(uri, source.lastIndexOf('$v') + 1)?.type).toBe(expected);
 } finally { w.dispose(); }
});
