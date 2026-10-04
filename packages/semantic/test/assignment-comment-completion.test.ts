import {afterAll,beforeAll,expect,it} from 'vitest';
import {PhpSyntaxParser} from '@php-companion/parser';
import {SemanticWorkspace} from '../src/index.js';
let parser:PhpSyntaxParser;
beforeAll(async()=>{parser=await PhpSyntaxParser.createDefault();});afterAll(()=>parser.dispose());
const header="<?php function pickA():string{return 'x';} function pickZ():bool{return true;} ";
for(const retained of [false,true]) {
 it.each([
  '$this /* owner */ -> enabled = pick§',
  '$this-> /* operator */ enabled = pick§',
  '$this->enabled /* property */ = pick§',
  '$this /* owner */ -> enabled /* property */ = /* value */ pick§',
  'Builder /* owner */ :: $staticEnabled = pick§',
  'Builder:: /* operator */ $staticEnabled /* property */ = pick§',
  '$assigned /* variable */ = pick§',
 ])(`ranks commented assignments retained=${retained}: %s`,assignment=>{
  const workspace=new SemanticWorkspace(parser),uri='file:///AssignmentComments.php';
  const marked=header+'class Builder{public bool $enabled;public static bool $staticEnabled;function run(){'+(assignment.includes('$assigned')?'$assigned=true; ':'')+assignment+';}}';
  try{
   workspace.update(uri,marked.replace('§',''),retained);
   const revision=workspace.revision(),snapshot=JSON.stringify(workspace.snapshot(uri));
   const result=workspace.completeFunctions(uri,marked.indexOf('§'));
   expect(result.map(i=>[i.name,i.compatibilityRank])).toEqual([['pickZ',0],['pickA',2]]);
   expect(workspace.revision()).toBe(revision);expect(JSON.stringify(workspace.snapshot(uri))).toBe(snapshot);
  }finally{workspace.dispose();}
 });
 it.each(['private bool','public readonly bool','public bool'])('keeps property restrictions retained='+retained+': %s',type=>{
  const workspace=new SemanticWorkspace(parser),uri='file:///AssignmentRestriction.php';
  const marked=header+`class Builder{${type} $enabled;} function run(Builder $builder){$builder /* owner */ -> enabled /* property */ = pick§;}`;
  try{
   workspace.update(uri,marked.replace('§',''),retained);
   const result=workspace.completeFunctions(uri,marked.indexOf('§'));
   expect(result.map(i=>[i.name,i.compatibilityRank])).toEqual(type==='public bool'?[['pickZ',0],['pickA',2]]:[['pickA',undefined],['pickZ',undefined]]);
  }finally{workspace.dispose();}
 });
}
for(const retained of [false,true]) {
 it.each(['before','after'])('keeps valid statement lookup with an unrelated syntax error retained='+retained+': %s',position=>{
  const workspace=new SemanticWorkspace(parser),uri='file:///UnrelatedAssignmentError.php';
  const body='class Builder{public bool $enabled;} function run(Builder $builder){$builder /* owner */ -> enabled /* property */ = pick§;}';
  const marked=header+(position==='before'?'echo ; ':'')+body+(position==='after'?' function unfinished(':'');
  try{
   const source=marked.replace('§',''),tree=parser.parseTree(source);
   try{expect(tree.rootNode.hasError).toBe(true);}finally{tree.delete();}
   workspace.update(uri,source,retained);
   const revision=workspace.revision(),snapshot=JSON.stringify(workspace.snapshot(uri));
   expect(workspace.completeFunctions(uri,marked.indexOf('§')).map(i=>[i.name,i.compatibilityRank])).toEqual([['pickZ',0],['pickA',2]]);
   expect(workspace.revision()).toBe(revision);expect(JSON.stringify(workspace.snapshot(uri))).toBe(snapshot);
  }finally{workspace.dispose();}
 });
 it('recognizes write-only hooked properties after comments retained='+retained,()=>{
  const workspace=new SemanticWorkspace(parser),uri='file:///WriteOnlyComments.php';
  const marked=header+'class Builder{public bool $enabled {set(bool $value){}}} function run(Builder $builder){$builder /* owner */ -> enabled /* property */ = pick§;}';
  try{
   workspace.update(uri,marked.replace('§',''),retained);
   expect(workspace.completeFunctions(uri,marked.indexOf('§')).map(i=>[i.name,i.compatibilityRank])).toEqual([['pickZ',0],['pickA',2]]);
  }finally{workspace.dispose();}
 });
 it('distinguishes a commented method invocation from the same-named property retained='+retained,()=>{
  const workspace=new SemanticWorkspace(parser),uri='file:///CalledComments.php';
  const source="<?php class Builder{public bool $produce;public function produce():string{return 'x';}} function run(Builder $builder){$builder /* owner */ -> produce /* call */ ();}";
  try{
   workspace.update(uri,source,retained);
   const member=workspace.memberAt(uri,source.lastIndexOf('produce')+1);
   expect(member?.kind).toBe('method');expect(member?.name).toBe('produce');expect(member?.returnType).toBe('string');
  }finally{workspace.dispose();}
 });
 it('does not mask comment-like string content before an assignment retained='+retained,()=>{
  const workspace=new SemanticWorkspace(parser),uri='file:///LiteralBeforeAssignment.php';
  const marked=header+"class Builder{public bool $enabled;function run(){$text='/* literal } */';$this /* owner */ -> enabled /* property */ = pick§;}}";
  try{
   workspace.update(uri,marked.replace('§',''),retained);
   expect(workspace.completeFunctions(uri,marked.indexOf('§')).map(i=>[i.name,i.compatibilityRank])).toEqual([['pickZ',0],['pickA',2]]);
  }finally{workspace.dispose();}
 });
}
