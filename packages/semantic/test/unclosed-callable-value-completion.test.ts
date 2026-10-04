import {afterAll,beforeAll,expect,it} from 'vitest';
import {PhpSyntaxParser} from '@php-companion/parser';
import {SemanticWorkspace} from '../src/index.js';

let parser:PhpSyntaxParser;
beforeAll(async()=>{parser=await PhpSyntaxParser.createDefault();});
afterAll(()=>parser.dispose());
const header="<?php function pickA():string{return 'x';} function pickZ():bool{return true;} const PICK_A_TEXT='x',PICK_Z_BOOL=true; function innerBool(bool $flag):bool{return $flag;} ";
const bodies=[
 'function run(string $text,bool $flag):bool{return /* value */ §',
 'class Host{public function run(string $text,bool $flag):bool{return /* value */ §',
 'class Host{public static function run(string $text,bool $flag):bool{return /* value */ §',
 '$callback=function(string $text,bool $flag):bool{return /* value */ §',
 '$callback=fn(string $text,bool $flag):bool=> /* value */ §',
 'function outer(string $text,bool $flag){$callback=function()use($text,$flag):bool{return §',
 'function run(string $text,bool $flag){$flag /* target */ = /* value */ §',
 'function run(string $text,bool $flag):string{return innerBool(/* value */ §',
];
function query<T>(retained:boolean,tail:string,read:(workspace:SemanticWorkspace,uri:string,offset:number)=>T):T {
 const workspace=new SemanticWorkspace(parser),uri='file:///UnclosedCallableValues.php',marked=header+tail;
 try{
  workspace.update(uri,marked.replace('§',''),retained);
  const revision=workspace.revision(),snapshot=JSON.stringify(workspace.snapshot(uri));
  const result=read(workspace,uri,marked.indexOf('§'));
  expect(workspace.revision()).toBe(revision);expect(JSON.stringify(workspace.snapshot(uri))).toBe(snapshot);
  return result;
 }finally{workspace.dispose();}
}
for(const retained of [false,true]) {
 it.each(bodies)('recovers bare value variables retained='+retained+': %s',body=>{
  const expected=[{name:'$flag',compatibilityRank:0},{name:'$text',compatibilityRank:2}];
  if(body.startsWith('class Host{public function')) expected.push({name:'$this',compatibilityRank:2});
  expect(query(retained,body,(w,u,o)=>w.completeBareExpressionVariables(u,o))).toEqual(expected);
 });
 it.each(bodies)('recovers literal values and expression keywords retained='+retained+': %s',body=>{
  const tail=body.replace('§','tr§');
  expect(query(retained,tail,(w,u,o)=>w.completeExpectedValues(u,o).map(i=>i.label))).toEqual(['true']);
  expect(query(retained,tail,(w,u,o)=>w.phpKeywordCompletionContext(u,o)?.kind)).toBe('expression');
 });
 it.each(bodies)('ranks function and constant values retained='+retained+': %s',body=>{
  expect(query(retained,body.replace('§','pick§'),(w,u,o)=>w.completeFunctions(u,o).map(i=>[i.name,i.compatibilityRank])))
   .toEqual([['pickZ',0],['pickA',2]]);
  expect(query(retained,body.replace('§','PICK_§'),(w,u,o)=>w.completeConstants(u,o).map(i=>[i.name,i.compatibilityRank])))
   .toEqual([['PICK_Z_BOOL',0],['PICK_A_TEXT',2]]);
 });
 it.each([
  'function run(string $text,bool $flag):bool{return unknown(§',
  'function run(string $text,bool $flag){return §',
  'function run(string $text,bool $flag):bool{return /* §',
  'function run(string $text,bool $flag):bool{return "§',
  'function run(string $text,bool $flag):bool{echo ; return §',
  'function run(string $text,bool $flag):bool{return §;}',
  'function run(string $text,bool $flag):bool{return '+ '('.repeat(17)+'§',
  '/*'+'.'.repeat(131_072)+'*/ function run(string $text,bool $flag):bool{return §',
  '?> <main>return §</main>',
 ].map((tail,index)=>({tail,name:['unknown call','untyped return','comment','string','invalid body','middle control','delimiter budget','size budget','HTML'][index]})))('does not guess a bare value contract retained='+retained+': $name',({tail})=>{
  // The completed function is a positive cursor-in-the-middle control.
  const expected=tail.endsWith('§;}')?[{name:'$flag',compatibilityRank:0},{name:'$text',compatibilityRank:2}]:undefined;
  expect(query(retained,tail,(w,u,o)=>w.completeBareExpressionVariables(u,o))).toEqual(expected);
 });
 it('offers the actual recursive function name without synthetic locations retained='+retained,()=>{
  const tail='function recursive():bool{return recu§';
  const result=query(retained,tail,(w,u,o)=>w.completeFunctions(u,o));
  expect(result.map(i=>[i.name,i.compatibilityRank])).toEqual([['recursive',0]]);
  expect(result[0]?.uri).toBe('file:///UnclosedCallableValues.php');
  expect(result[0]?.start).toBe((header+tail).indexOf('recursive'));
  expect(result[0]?.end).toBe((header+tail).indexOf('recursive')+'recursive'.length);
 });
 it.each([
  'function run():bool{return unknown(pick§',
  'function run():bool{return !pick§',
  'function run():bool{return 1 + pick§',
 ])('does not rank by the outer return type in an inner expression retained='+retained+': %s',tail=>{
  expect(query(retained,tail,(w,u,o)=>w.completeFunctions(u,o).map(i=>[i.name,i.compatibilityRank])))
   .toEqual([['pickA',undefined],['pickZ',undefined]]);
 });
 it('refreshes the current return type without leaking another scope retained='+retained,()=>{
  const workspace=new SemanticWorkspace(parser),uri='file:///UnclosedRefresh.php';
  try{
   for(const type of ['bool','string','bool']) {
    const marked=header+'function other(bool $outside){} '+`function run(string $text,bool $flag):${type}{return §`;
    workspace.update(uri,marked.replace('§',''),retained);
    const result=workspace.completeBareExpressionVariables(uri,marked.indexOf('§'));
    expect(result?.map(i=>i.name)).toEqual(type==='bool'?['$flag','$text']:['$text','$flag']);
    expect(result?.some(i=>i.name==='$outside')).toBe(false);
   }
  }finally{workspace.dispose();}
 });
}
