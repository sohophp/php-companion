import {afterAll,beforeAll,expect,it} from 'vitest';
import {PhpSyntaxParser} from '@php-companion/parser';
import {SemanticWorkspace} from '../src/index.js';
let parser:PhpSyntaxParser;
beforeAll(async()=>{parser=await PhpSyntaxParser.createDefault();});
afterAll(()=>parser.dispose());
const header='<?php namespace Catalog; interface BuildFirst {} interface BuildSecond {} class BuildBase {} final class BuildFinal {} trait BuildTrait {} namespace Consumer; use Catalog as Types; use Catalog\\BuildFirst as First; ';
it.each(['class Child implements','interface Child extends','enum Child implements'])('omits directly listed interface identities in %s',declaration=>{
 const workspace=new SemanticWorkspace(parser),uri='file:///Consumer.php';
 try {
  for(const prior of ['First','Types\\BuildFirst','\\Catalog\\BuildFirst','types\\buildfirst']) {
   const marked=header+declaration+' '+prior+', /* ignored , } */ Types\\Build§ {}';
   workspace.update(uri,marked.replace('§',''),true);
   expect(workspace.completeTypes(uri,marked.indexOf('§')).map(item=>item.name)).toEqual(['BuildSecond']);
  }
 } finally {workspace.dispose();}
});
it.each(['new class extends','new class(123) extends','new class(/* extends Fake */ 123) extends'])('filters anonymous class parent position %s',expression=>{
 const workspace=new SemanticWorkspace(parser),uri='file:///Consumer.php';
 try {
  const marked=header+'$value = '+expression+' /* parent */ Types\\Build§ {};';
  workspace.update(uri,marked.replace('§',''),true);
  expect(workspace.completeTypes(uri,marked.indexOf('§')).map(item=>item.name)).toEqual(['BuildBase']);
 } finally {workspace.dispose();}
});
it('filters anonymous implements and removes prior aliases',()=>{
 const workspace=new SemanticWorkspace(parser),uri='file:///Consumer.php';
 try {
  const marked=header+'$value = new class implements First, Types\\Build§ {};';
  workspace.update(uri,marked.replace('§',''),true);
  expect(workspace.completeTypes(uri,marked.indexOf('§')).map(item=>item.name)).toEqual(['BuildSecond']);
 } finally {workspace.dispose();}
});
it('keeps an interface while editing its own existing list entry',()=>{
 const workspace=new SemanticWorkspace(parser),uri='file:///Consumer.php';
 try {
  const marked=header+'class Child implements Types\\Build§First {}';
  workspace.update(uri,marked.replace('§',''),true);
  expect(workspace.completeTypes(uri,marked.indexOf('§')).map(item=>item.name)).toEqual(['BuildFirst','BuildSecond']);
 } finally {workspace.dispose();}
});
