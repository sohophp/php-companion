import {afterAll,beforeAll,expect,it} from 'vitest';
import {PhpSyntaxParser} from '@php-companion/parser';
import {SemanticWorkspace} from '../src/index.js';
let parser:PhpSyntaxParser;
beforeAll(async()=>{parser=await PhpSyntaxParser.createDefault();});afterAll(()=>parser.dispose());
const cases=[
 ['uppercase','<?php class C { PUBLIC STATIC FUNCTION __§(){} }',true,'public'],
 ['line-comment','<?php class C { public static function // comment\n __§($name,$args){} }',true,'public'],
 ['multiline-name-comment','<?php class C { public function /* name\n comment */ __§($name,$args){} }',false,'public'],
 ['explicit-static','<?php class C { public static function __§(){} }',true,'public'],
 ['unfinished','<?php class C { public static function __§',true,'public'],
 ['reordered','<?php class C { static public function __§(){} }',true,'public'],
 ['block-comment','<?php class C { public /* static */ function __§(){} }',false,'public'],
 ['keyword-comment','<?php class C { public static function /* hé漢 */ __§(){} }',true,'public'],
 ['between-modifiers','<?php class C { static /* long\ncomment */ public function __§',true,'public'],
 ['private','<?php class C { private function __§(){} }',false,'private'],
 ['protected','<?php class C { protected static function __§(){} }',true,'protected'],
 ['attribute','<?php class C { #[Tag("static")] public function __§(){} }',false,'public'],
 ['reference','<?php class C { static public function &__§(){} }',true,'public'],
 ['trait','<?php trait C { function __§(){} }',false,'public'],
 ['interface','<?php interface C { public static function __§(); }',true,'public'],
 ['enum','<?php enum C { public static function __§(){} }',true,'public'],
 ['anonymous','<?php $c=new class { public static function __§(){} };',true,'public'],
 ['global','<?php function __§(){}',false,'public'],
 ['comment-before-function','<?php class C { /** public static */ function __§(){} }',false,'public'],
] as const;
it.each(cases)('records method modifiers and function position: %s',(_name,marked,isStatic,visibility)=>{
 const workspace=new SemanticWorkspace(parser),uri='file:///Magic.php',source=marked.replace('§','');
 try {
  workspace.update(uri,source,true);
  const context=workspace.phpDeclarationNameCompletionContext(uri,marked.indexOf('§'));
  expect(context?.kind).toBe('function');expect(context?.methodModifiers).toMatchObject({static:isStatic,visibility});
  const start=context!.methodModifiers!.functionStart;
  expect(source.slice(start,start+8).toLowerCase()).toBe('function');
 } finally {workspace.dispose();}
});
const boundaries=[
 ['class-comment','<?php class /* doc */\n C§ {}','type'],
 ['enum-comment','<?php enum /* doc */ e§ {}','type'],
 ['interface-comment','<?php interface /* 漢 */ I§ {}','type'],
 ['namespace-comment','<?php namespace /* doc */\n F§;','namespace'],
 ['constant-comment','<?php const /* doc */\n V§ = 1;','constant'],
 ['enum-case-comment','<?php enum E { case /* doc */\n O§; }','enum-case'],
 ['function-import','<?php use function /* doc */\n Vendor\\f§;',undefined],
 ['comment-before-import','<?php use /* doc */ function Vendor\\f§;',undefined],
 ['constant-import','<?php use const /* doc */ Vendor\\C§;',undefined],
 ['anonymous-class','<?php $c=new /* doc */ class C§ {};',undefined],
 ['method-reference','<?php $obj->function /* doc */ N§;',undefined],
 ['string','<?php $s="class /* doc */ C§";',undefined]
] as const;
it.each(boundaries)('keeps declaration and reference boundaries through comments: %s',(_name,marked,expected)=>{
 const workspace=new SemanticWorkspace(parser),uri='file:///Magic.php';
 try {
  workspace.update(uri,marked.replace('§',''),true);
  expect(workspace.phpDeclarationNameCompletionContext(uri,marked.indexOf('§'))?.kind).toBe(expected);
 } finally {workspace.dispose();}
});
