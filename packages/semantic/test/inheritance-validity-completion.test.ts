import {afterAll,beforeAll,expect,it} from 'vitest';
import {PhpSyntaxParser} from '@php-companion/parser';
import {SemanticWorkspace} from '../src/index.js';
let parser:PhpSyntaxParser;
beforeAll(async()=>{parser=await PhpSyntaxParser.createDefault();});
afterAll(()=>parser.dispose());
it.each([' ', ' /* final class Fake {} */ '])('excludes final, self and proven descendant classes %j', trivia=>{
 const workspace=new SemanticWorkspace(parser),uri='file:///Build.php';
 try {
  const marked='<?php class BuildGood {} final class BuildFinal {} abstract class BuildAbstract {} class BuildDescendant extends BuildChild {} class BuildChild extends'+trivia+'Build§ {}';
  workspace.update(uri,marked.replace('§',''),true);
  expect(workspace.completeTypes(uri,marked.indexOf('§')).map(item=>item.name)).toEqual(['BuildAbstract','BuildGood']);
 } finally {workspace.dispose();}
});
it.each([false,true])('keeps compatible readonly inheritance for readonly=%s', readonly=>{
 const workspace=new SemanticWorkspace(parser),uri='file:///Build.php';
 try {
  const marked='<?php class BuildMutable {} readonly class BuildReadonly {} '+(readonly?'readonly ':'')+'class BuildChild extends Build§ {}';
  workspace.update(uri,marked.replace('§',''),true);
  expect(workspace.completeTypes(uri,marked.indexOf('§')).map(item=>item.name)).toEqual([readonly?'BuildReadonly':'BuildMutable']);
 } finally {workspace.dispose();}
});
it('keeps final classes available for construction and ordinary parameter types',()=>{
 const workspace=new SemanticWorkspace(parser),uri='file:///Build.php';
 try {
  for(const tail of ['function make(){new Build§;}','function make(Build§ $value){}']) {
   const marked='<?php final class BuildFinal {} '+tail;
   workspace.update(uri,marked.replace('§',''),true);
   expect(workspace.completeTypes(uri,marked.indexOf('§')).map(item=>item.name)).toEqual(['BuildFinal']);
  }
 } finally {workspace.dispose();}
});
it('withdraws and restores final candidates after unsaved provider edits',()=>{
 const workspace=new SemanticWorkspace(parser),uri='file:///Consumer.php',provider='file:///Base.php';
 try {
  const marked='<?php class Child extends Build§ {}';workspace.update(uri,marked.replace('§',''),true);
  for(const modifier of ['', 'final ', '']) {
   workspace.update(provider,'<?php '+modifier+'class BuildBase {}',true);
   expect(workspace.completeTypes(uri,marked.indexOf('§')).map(item=>item.name)).toEqual(modifier?[]:['BuildBase']);
  }
 } finally {workspace.dispose();}
});
it('excludes interface self and proven descendants without excluding unrelated interfaces',()=>{
 const workspace=new SemanticWorkspace(parser),uri='file:///Build.php';
 try {
  const marked='<?php interface BuildOther {} interface BuildDescendant extends BuildChild {} interface BuildChild extends Build§ {}';
  workspace.update(uri,marked.replace('§',''),true);
  expect(workspace.completeTypes(uri,marked.indexOf('§')).map(item=>item.name)).toEqual(['BuildOther']);
 } finally {workspace.dispose();}
});
