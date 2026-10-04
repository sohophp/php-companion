import {afterAll,beforeAll,expect,it} from 'vitest';
import {PhpSyntaxParser} from '@php-companion/parser';
import {SemanticWorkspace} from '../src/index.js';
let parser:PhpSyntaxParser;
beforeAll(async()=>{parser=await PhpSyntaxParser.createDefault();});afterAll(()=>parser.dispose());
const declarations="function pickA():string{return 'x';} function pickZ():bool{return true;} const PICK_A_TEXT='x',PICK_Z_BOOL=true; class Item{public function title():string{return 'x';} private function hidden():void{}} ";
const layouts=[
 {name:'HTML prefix with unmatched delimiters',prefix:'<script>const data = {a:[1]}; }])</script><?php '+declarations,body:''},
 {name:'between PHP islands',prefix:'<?php '+declarations+'?> <script>{])</script> <?php ',body:''},
 {name:'inline HTML in the body',prefix:'<?php '+declarations,body:'?> <main>{])</main> <?php '},
 {name:'Unicode HTML in the body',prefix:'<?php '+declarations,body:'?> <main>汉字🙂{])</main> <?php '},
 {name:'closing-tag text in a string',prefix:'<?php '+declarations+"$tag='?> {])'; ",body:''},
 {name:'closing-tag text in a block comment',prefix:'<?php '+declarations+'/* ?> {]) */ ',body:''},
 {name:'closing-tag text in a heredoc',prefix:'<?php '+declarations+'$tag=<<<TEXT\n?> {])\nTEXT;\n',body:''},
];
function query<T>(retained:boolean,marked:string,read:(w:SemanticWorkspace,u:string,o:number)=>T):T {
 const w=new SemanticWorkspace(parser),uri='file:///MixedCallableRecovery.php';
 try {
  w.update(uri,marked.replace('§',''),retained);
  const revision=w.revision(),snapshot=JSON.stringify(w.snapshot(uri));
  const result=read(w,uri,marked.indexOf('§'));
  expect(w.revision()).toBe(revision);expect(JSON.stringify(w.snapshot(uri))).toBe(snapshot);
  return result;
 }finally{w.dispose();}
}
for(const retained of [false,true]) for(const layout of layouts) {
 it('recovers ordinary value families retained='+retained+' '+layout.name,()=>{
  const body=layout.prefix+'function run(string $text,bool $flag):bool{'+layout.body+'return /* value */ §';
  expect(query(retained,body,(w,u,o)=>w.completeBareExpressionVariables(u,o)))
   .toEqual([{name:'$flag',compatibilityRank:0},{name:'$text',compatibilityRank:2}]);
  expect(query(retained,body.replace('§','tr§'),(w,u,o)=>w.completeExpectedValues(u,o).map(i=>i.label))).toEqual(['true']);
  expect(query(retained,body.replace('§','tr§'),(w,u,o)=>w.phpKeywordCompletionContext(u,o)?.kind)).toBe('expression');
  expect(query(retained,body.replace('§','pick§'),(w,u,o)=>w.completeFunctions(u,o).map(i=>[i.name,i.compatibilityRank])))
   .toEqual([['pickZ',0],['pickA',2]]);
  expect(query(retained,body.replace('§','PICK_§'),(w,u,o)=>w.completeConstants(u,o).map(i=>[i.name,i.compatibilityRank])))
   .toEqual([['PICK_Z_BOOL',0],['PICK_A_TEXT',2]]);
 });
 it('recovers variable prefixes and details retained='+retained+' '+layout.name,()=>{
  const body=layout.prefix+'function run(string $valueText,bool $valueFlag):bool{'+layout.body+'return $va§';
  expect(query(retained,body,(w,u,o)=>w.completeVariables(u,o)?.names)).toEqual(['$valueFlag','$valueText']);
  expect(query(retained,body,(w,u,o)=>w.completionVariableDetail(u,o,'$valueFlag'))).toBe('$valueFlag: bool');
 });
 it('recovers lexical member access retained='+retained+' '+layout.name,()=>{
  const body=layout.prefix+'function run(Item $item):string{'+layout.body+'return $item->§';
  expect(query(retained,body,(w,u,o)=>w.completeMembers(u,o).map(i=>i.name))).toEqual(['title']);
 });
 it('recovers comparison values retained='+retained+' '+layout.name,()=>{
  const body=layout.prefix+'function run(bool $flag):void{'+layout.body+'switch($flag){case tr§';
  expect(query(retained,body,(w,u,o)=>w.completeExpectedValues(u,o).map(i=>i.label))).toEqual(['true']);
  expect(query(retained,body,(w,u,o)=>w.phpKeywordCompletionContext(u,o)?.kind)).toBe('expression');
 });
}
for(const retained of [false,true]) {
 it('refreshes PHP islands and contracts without stale trivia retained='+retained,()=>{
  const w=new SemanticWorkspace(parser),uri='file:///MixedTriviaRefresh.php';
  try {
   for(const [prefix,type] of [
    ['<?php ', 'bool'],['<?php ?> <script>{])</script> <?php ', 'string'],['<?php ', 'bool'],
   ]) {
    const marked=prefix+declarations+`function run(string $text,bool $flag):${type}{return §`;
    w.update(uri,marked.replace('§',''),retained);
    expect(w.completeBareExpressionVariables(uri,marked.indexOf('§'))?.map(i=>i.name))
     .toEqual(type==='bool'?['$flag','$text']:['$text','$flag']);
   }
  }finally{w.dispose();}
 });
 it('keeps closure captures across a body island retained='+retained,()=>{
  const marked='<?php '+declarations+'function outer(string $text,bool $flag){$cb=function()use($text,$flag):bool{?> <main>{])</main> <?php return §';
  expect(query(retained,marked,(w,u,o)=>w.completeBareExpressionVariables(u,o)))
   .toEqual([{name:'$flag',compatibilityRank:0},{name:'$text',compatibilityRank:2}]);
 });
 it.each(['$flag','$item->enabled'])('does not join assignments across a closing tag retained='+retained+': %s',target=>{
  const marked='<?php '+declarations+'class Box{public bool $enabled;} function run(bool $flag,Box $item){'+target+' ?> <main>{])</main> <?php = pick§;}';
  expect(query(retained,marked,(w,u,o)=>w.completeFunctions(u,o).map(i=>[i.name,i.compatibilityRank])))
   .toEqual([['pickA',undefined],['pickZ',undefined]]);
 });
 it.each([
  {name:'HTML cursor',tail:'function run(string $text,bool $flag):bool{ ?> <main>return tr§'},
  {name:'line comment closing PHP',tail:'function run(string $text,bool $flag):bool{ // ?> return tr§'},
  {name:'HTML imitating PHP',tail:'function run(string $text,bool $flag):bool{ ?> function fake():bool{return tr§'},
  {name:'unknown inner call',tail:'?> <main>{])</main> <?php function run():bool{return unknown(tr§'},
  {name:'PHP delimiter mismatch',tail:'?> <main>{])</main> <?php function run():bool{] return tr§'},
 ])('keeps boundaries retained='+retained+' $name',({name,tail})=>{
  const marked='<?php '+declarations+tail;
  expect(query(retained,marked,(w,u,o)=>w.completeExpectedValues(u,o))).toEqual([]);
  expect(query(retained,marked,(w,u,o)=>w.completeBareExpressionVariables(u,o))).toBeUndefined();
  if(['HTML cursor','line comment closing PHP','HTML imitating PHP'].includes(name)) {
   expect(query(retained,marked,(w,u,o)=>w.completeFunctions(u,o))).toEqual([]);
   expect(query(retained,marked,(w,u,o)=>w.phpKeywordCompletionContext(u,o))).toBeUndefined();
  }
  if(name==='unknown inner call') expect(query(retained,marked.replace('tr§','pick§'),(w,u,o)=>w.completeFunctions(u,o).map(i=>[i.name,i.compatibilityRank])))
   .toEqual([['pickA',undefined],['pickZ',undefined]]);
 });
 it('retains the full-source size budget with HTML padding retained='+retained,()=>{
  const marked='<main>'+'.'.repeat(131_072)+'</main><?php '+declarations+'function run(bool $flag):bool{return §';
  expect(query(retained,marked,(w,u,o)=>w.completeBareExpressionVariables(u,o))).toBeUndefined();
 });
}
