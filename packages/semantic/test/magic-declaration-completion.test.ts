import {afterAll,beforeAll,expect,it} from 'vitest';
import {PhpSyntaxParser} from '@php-companion/parser';
import {SemanticWorkspace} from '../src/index.js';
let parser:PhpSyntaxParser;
beforeAll(async()=>{parser=await PhpSyntaxParser.createDefault();});afterAll(()=>parser.dispose());
it.each(['class','trait','interface'])('records only methods already declared in the current %s',kind=>{
 const workspace=new SemanticWorkspace(parser),uri='file:///Magic.php';
 try {
  const body=kind==='interface'?';':'{}';
  const marked='<?php class Other { public function __get($name) {} } '+kind+' Current { public function __Construct()'+body+' public function __§()'+body+' }';
  workspace.update(uri,marked.replace('§',''),true);
  expect(workspace.phpDeclarationNameCompletionContext(uri,marked.indexOf('§'))?.declaredMethods).toEqual(['__construct']);
 } finally {workspace.dispose();}
});
it('does not suppress the currently edited method or a parent method',()=>{
 const workspace=new SemanticWorkspace(parser),uri='file:///Magic.php';
 try {
  const marked='<?php class ParentType { public function __construct() {} } class Child extends ParentType { public function __con§struct() {} }';
  workspace.update(uri,marked.replace('§',''),true);
  expect(workspace.phpDeclarationNameCompletionContext(uri,marked.indexOf('§'))?.declaredMethods??[]).toEqual([]);
 } finally {workspace.dispose();}
});
it('uses the innermost anonymous class declaration',()=>{
 const workspace=new SemanticWorkspace(parser),uri='file:///Magic.php';
 try {
  const marked='<?php class Outer { public function __construct() {} public function make(){ return new class { public function __get($name) {} public function __§() {} }; } }';
  workspace.update(uri,marked.replace('§',''),true);
  expect(workspace.phpDeclarationNameCompletionContext(uri,marked.indexOf('§'))?.declaredMethods).toEqual(['__get']);
 } finally {workspace.dispose();}
});

it.each([
 ['<?php enum E { public function __§(){} }','class-member',true],
 ['<?php enum E { public function __inv§ }','class-member',true],
 ['<?php enum E { public function method(){ retu§ } }','statement',true],
 ['<?php enum E {} class C { public function __§(){} }','class-member',false],
] as const)('classifies enum declaration lists without changing method bodies: %s',(marked,kind,inEnum)=>{
 const workspace=new SemanticWorkspace(parser),uri='file:///Magic.php';
 try {
  workspace.update(uri,marked.replace('§',''),true);
  expect(workspace.phpKeywordCompletionContext(uri,marked.indexOf('§'))).toMatchObject({kind,inEnum});
 } finally {workspace.dispose();}
});
