import { afterAll, beforeAll, expect, it } from 'vitest';
import { PhpSyntaxParser } from '@php-companion/parser';
import { SemanticWorkspace } from '../src/index.js';
let parser: PhpSyntaxParser;
beforeAll(async () => {parser=await PhpSyntaxParser.createDefault();});
afterAll(()=>parser.dispose());
const uri='file:///Caller.php', origin='file:///Origin.php';
const cases=[
  ['name','User','\\Origin\\User',undefined,'new \\Origin\\User()','new User()'],
  ['import alias','Selected','\\Origin\\User','use Origin\\User as Selected;','new \\Origin\\User()','new User()'],
  ['absolute','\\Origin\\User','\\Origin\\User',undefined,'new \\Origin\\User()','new User()'],
  ['nullable','?User','?\\Origin\\User',undefined,'new \\Origin\\User()','new User()'],
  ['array','User[]','\\Origin\\User[]',undefined,'[new \\Origin\\User()]','[new User()]'],
  ['list','list<User>','list<\\Origin\\User>',undefined,'[new \\Origin\\User()]','[new User()]'],
  ['shape',"array{'User':User, label:'User'}","array{'User':\\Origin\\User, label:'User'}",undefined,"['User'=>new \\Origin\\User(),'label'=>'User']","['User'=>new User(),'label'=>'User']"],
  ['class string','class-string<User>','class-string<\\Origin\\User>',undefined,'\\Origin\\User::class','User::class'],
  ['self','self','\\Consumer\\C',undefined,'C::make()','new User()'],
  ['parent','parent','\\Origin\\Root',undefined,'new Base()','new User()'],
] as const;
it.each(cases)('binds %s documentation using Trait source imports and the actual consuming class', (_name, type, expected, imports, good, bad)=>{
  const workspace=new SemanticWorkspace(parser);
  const consumer='<?php namespace Consumer; use Origin\\Root as Base; class User {} class C extends Base {use \\Origin\\Init; public static function make(){return new self(null);}}';
  try {
    workspace.update(origin,`<?php namespace Origin; ${imports??''} class Root {} class User {} trait Init {/** @param ${type} $value */ public function __construct($value){}}`,true);
    workspace.update(uri,`${consumer} new C(${good});`,true);
    expect(workspace.signatures(uri,consumer.length+7)[0]?.parameters[0]?.type).toBe(expected);
    // Only compare the external constructor call; make() deliberately supplies null.
    expect(workspace.incompatibleArguments(uri).filter(item=>item.start>consumer.length)).toEqual([]);
    workspace.update(uri,`${consumer} new C(${bad});`,true);
    expect(workspace.incompatibleArguments(uri).filter(item=>item.start>consumer.length)).toMatchObject([{parameter:'value'}]);
  } finally {workspace.dispose();}
});
it('does not borrow an unresolved doc name from the consuming namespace',()=>{
  const workspace=new SemanticWorkspace(parser);
  try {
    workspace.update(origin,'<?php namespace Origin; trait Init {/** @param Missing $value */ public function __construct($value){}}',true);
    const source='<?php namespace Consumer; class Missing {} class Other {} class C {use \\Origin\\Init;} new C(new Other());';
    workspace.update(uri,source,true);
    expect(workspace.signatures(uri,source.indexOf('new C(')+6)[0]?.parameters[0]?.type).toBe('\\Origin\\Missing');
    expect(workspace.incompatibleArguments(uri)).toEqual([]);
  } finally {workspace.dispose();}
});
it('uses the import scope of the Trait declaration in repeated namespace blocks',()=>{
  const workspace=new SemanticWorkspace(parser);
  try {
    workspace.update(origin,'<?php namespace One {class User {}} namespace Two {class User {}} namespace Origin {use One\\User as Selected; trait First {/** @param Selected $value */ public function __construct($value){}}} namespace Origin {use Two\\User as Selected; trait Init {/** @param Selected $value */ public function __construct($value){}}}',true);
    const source='<?php namespace Consumer; class C {use \\Origin\\Init;} new C(new \\Two\\User());';
    workspace.update(uri,source,true);
    expect(workspace.signatures(uri,source.indexOf('new C(')+6)[0]?.parameters[0]?.type).toBe('\\Two\\User');
    expect(workspace.incompatibleArguments(uri)).toEqual([]);
  } finally {workspace.dispose();}
});
it('retains callback variable names and source class references',()=>{
  const workspace=new SemanticWorkspace(parser);
  try {
    workspace.update(origin,'<?php namespace Origin; class User {} trait Init {/** @param callable(User $User):User $value */ public function __construct(callable $value){}}',true);
    const source='<?php namespace Consumer; class User {} class C {use \\Origin\\Init;} new C(function(\\Origin\\User $User):\\Origin\\User{return $User;});';
    workspace.update(uri,source,true);
    expect(workspace.signatures(uri,source.indexOf('new C(')+6)[0]?.parameters[0]?.type).toBe('callable(\\Origin\\User $User):\\Origin\\User');
    expect(workspace.incompatibleArguments(uri)).toEqual([]);
    workspace.update(uri,source.replaceAll('function(\\Origin\\User $User):\\Origin\\User','function(User $User):User'),true);
    expect(workspace.incompatibleArguments(uri)).toMatchObject([{parameter:'value'}]);
  } finally {workspace.dispose();}
});
it('keeps documented bounds lexical and declared method templates symbolic',()=>{
  const workspace=new SemanticWorkspace(parser);
  try {
    workspace.update(origin,'<?php namespace Origin; class User {} trait Init {/** @template T of User\n * @param T $seed\n * @param T $value */ public function __construct($seed,$value){}}',true);
    const source='<?php namespace Consumer; class T {} class User {} class C {use \\Origin\\Init;} function run(\\Origin\\User $offerZ,User $offerA){return new C($offerZ,$offer); }';
    workspace.update(uri,source,true);
    expect(workspace.signatures(uri,source.indexOf('new C(')+6)[0]).toMatchObject({parameters:[{type:'T'},{type:'T'}],callableTemplates:[{name:'T',bound:'\\Origin\\User'}]});
  } finally {workspace.dispose();}
});
it('keeps union/intersection grouping and scalar pseudo types intact',()=>{
  const workspace=new SemanticWorkspace(parser);
  try {
    workspace.update(origin,'<?php namespace Origin; interface A {} interface B {} interface D {} trait Init {/** @param (A|B)&D $value\n * @param int<min,42> $limit\n * @param scalar $label */ public function __construct($value,int $limit,$label){}}',true);
    const source='<?php namespace Consumer; class C {use \\Origin\\Init;} new C();';workspace.update(uri,source,true);
    expect(workspace.signatures(uri,source.indexOf('new C(')+6)[0]?.parameters.map(p=>p.type))
      .toEqual(['(\\Origin\\A|\\Origin\\B)&\\Origin\\D','int<min,42>','scalar']);
  } finally {workspace.dispose();}
});
it.each(['restore','restoreDeclaration','restoreSourceDeclaration'] as const)('refreshes doc imports after %s',mode=>{
  const first=new SemanticWorkspace(parser),workspace=new SemanticWorkspace(parser);
  try {
    const consumer='<?php namespace Consumer; class User {} class C {use \\Origin\\Init;} new C(new \\Origin\\User());';
    workspace.update(uri,consumer,true);
    for(const target of ['Origin\\User','Origin\\Other','Origin\\User']) {
      first.update(origin,`<?php namespace Origin; use ${target} as Selected; class User {} class Other {} trait Init {/** @param Selected $value */ public function __construct($value){}}`,true);
      const snapshot=mode==='restoreSourceDeclaration'?first.sourceDeclarationSnapshot(origin)!:first.snapshot(origin)!;
      expect(workspace[mode](structuredClone(snapshot),origin)).toBe(true);
      expect(workspace.signatures(uri,consumer.indexOf('new C(')+6)[0]?.parameters[0]?.type).toBe(`\\${target}`);
      expect(workspace.incompatibleArguments(uri)).toHaveLength(target.endsWith('Other')?1:0);
    }
  } finally {first.dispose();workspace.dispose();}
});

it.each(['@phpstan-type Selected array{value:User}', '@psalm-import-type Item from Source as Selected'])('does not reinterpret an unsupported local alias as a same-name class: %s', alias=>{
  const workspace=new SemanticWorkspace(parser);
  try {
    workspace.update(origin,`<?php namespace Origin; class User {} class Selected {} /** ${alias} */ trait Init {/** @param Selected $value */ public function __construct($value){}}`,true);
    const source='<?php namespace Consumer; class C {use \\Origin\\Init;} new C(42);';workspace.update(uri,source,true);
    expect(workspace.signatures(uri,source.indexOf('new C(')+6)[0]?.parameters[0]?.type).toBeUndefined();
    expect(workspace.incompatibleArguments(uri)).toEqual([]);
  } finally {workspace.dispose();}
});
it('withdraws malformed doc proof while preserving a native signature',()=>{
  const workspace=new SemanticWorkspace(parser);
  try {
    workspace.update(origin,'<?php namespace Origin; trait Init {/** @param list<User $value */ public function __construct(array $value){}}',true);
    const source='<?php namespace Consumer; class C {use \\Origin\\Init;} new C([]);';workspace.update(uri,source,true);
    expect(workspace.signatures(uri,source.indexOf('new C(')+6)[0]?.parameters[0]?.nativeType).toBe('array');
    expect(workspace.incompatibleArguments(uri)).toEqual([]);
  } finally {workspace.dispose();}
});
it('binds names within generic, constant and conditional documentation without changing syntax',()=>{
  const workspace=new SemanticWorkspace(parser);
  try {
    workspace.update(origin,'<?php namespace Origin; class User {} class Box {} class Settings {const MAP=["RED"=>1];} trait Init {/** @param Box<User> $box\n * @param key-of<Settings::MAP> $key\n * @param ($flag is User ? list<User> : self) $value */ public function __construct($box,$key,$value){}}',true);
    const source='<?php namespace Consumer; class C {use \\Origin\\Init;} new C();';workspace.update(uri,source,true);
    expect(workspace.signatures(uri,source.indexOf('new C(')+6)[0]?.parameters.map(p=>p.type))
      .toEqual(['\\Origin\\Box<\\Origin\\User>','key-of<\\Origin\\Settings::MAP>','($flag is \\Origin\\User ? list<\\Origin\\User> : \\Consumer\\C)']);
  } finally {workspace.dispose();}
});
it('withdraws an entire oversized proof rather than leaving partially rebound names',()=>{
  const workspace=new SemanticWorkspace(parser);
  try {
    workspace.update(origin,`<?php namespace Origin; class User {} trait Init {/** @param ${Array(300).fill('User').join('|')} $value */ public function __construct($value){}}`,true);
    const source='<?php namespace Consumer; class User {} class C {use \\Origin\\Init;} new C(new User());';workspace.update(uri,source,true);
    expect(workspace.signatures(uri,source.indexOf('new C(')+6)[0]?.parameters[0]?.type).toBeUndefined();
    expect(workspace.incompatibleArguments(uri)).toEqual([]);
  } finally {workspace.dispose();}
});
it('does not diagnose method templates as consumer classes with the same name',()=>{
  const workspace=new SemanticWorkspace(parser);
  try {
    workspace.update(origin,'<?php namespace Origin; class User {} trait Init {/** @template T of User\n * @param T $value */ public function __construct($value){}}',true);
    const header='<?php namespace Consumer; class T {} class User {} class C {use \\Origin\\Init;}';
    workspace.update(uri,header+' new C(new \\Origin\\User());',true);
    expect(workspace.incompatibleArguments(uri)).toEqual([]);
    workspace.update(uri,header+' new C(new User());',true);
    expect(workspace.incompatibleArguments(uri)).toMatchObject([{parameter:'value',expectedType:'Origin\\User'}]);
  } finally {workspace.dispose();}
});
it('does not guess an unresolved Trait template binding from a consumer class name',()=>{
  const workspace=new SemanticWorkspace(parser);
  try {
    workspace.update(origin,'<?php namespace Origin; /** @template T */ trait Init {/** @param T $value */ public function __construct($value){}}',true);
    const source='<?php namespace Consumer; class T {} class C {use \\Origin\\Init;} new C(42);';workspace.update(uri,source,true);
    expect(workspace.signatures(uri,source.indexOf('new C(')+6)[0]?.parameters[0]?.type).toBeUndefined();
    expect(workspace.incompatibleArguments(uri)).toEqual([]);
  } finally {workspace.dispose();}
});
it.each(['function(User $User):User{return $User;}','fn(User $User):User=>$User','function():User{return new User();}'])('uses lexical namespaces for native callback types: %s', callback=>{
  const workspace=new SemanticWorkspace(parser);
  try {
    const signature=callback.startsWith('function():')?'callable():User':'callable(User):User';
    const source=`<?php namespace Origin; class User {} /** @param ${signature} $callback */ function consume(callable $callback){} namespace Consumer; class User {} \\Origin\\consume(${callback});`;
    workspace.update(uri,source,true);
    expect(workspace.incompatibleArguments(uri)).toMatchObject([{parameter:'callback'}]);
  } finally {workspace.dispose();}
});
