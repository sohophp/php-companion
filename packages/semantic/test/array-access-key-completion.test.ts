import {afterAll,beforeAll,expect,it} from 'vitest';
import {PhpSyntaxParser} from '@php-companion/parser';
import {SemanticWorkspace} from '../src/index.js';
let parser:PhpSyntaxParser;
beforeAll(async()=>{parser=await PhpSyntaxParser.createDefault();});afterAll(()=>parser.dispose());
const positives=[
 ['parameter',"<?php /** @param array{mode:string,id:int} $options */ function read(array $options):void{$options['mo§",['mode']],
 ['local',"<?php function read():void{$options=['mode'=>'create','id'=>1];$options['mo§",['mode']],
 ['union',"<?php /** @param array{mode:string,id:int}|array{mode:string,name:string} $options */ function read(array $options):void{$options['mo§",['mode']],
 ['nested',"<?php /** @param array{payload:array{mode:string}} $options */ function read(array $options):void{$options['payload']['mo§",['mode']],
 ['nested punctuation',"<?php /** @param array{'outer-key':array{'inner-key':string}} $options */ function read(array $options):void{$options['outer-key']['inner-§",['inner-key']],
 ['punctuation',"<?php /** @param array{'content-type':string} $options */ function read(array $options):void{$options['content-§",['content-type']],
 ['unicode',"<?php /** @param array{'标题':string} $options */ function read(array $options):void{$options['标§",['标题']],
 ['escaped',"<?php /** @param array{'can\\'t':string} $options */ function read(array $options):void{$options['can\\'§",["can't"]],
 ['optional',"<?php /** @param array{mode?:string} $options */ function read(array $options):void{$options['mo§",['mode']],
 ['function return',"<?php /** @return array{mode:string} */ function options():array{return ['mode'=>'create'];} function read():void{options()['mo§",['mode']],
 ['property',"<?php class Config {/** @var array{mode:string} */ public array $options;} function read(Config $config):void{$config->options['mo§",['mode']],
 ['numeric',"<?php /** @param array{0:string,1:int} $options */ function read(array $options):void{$options['§",['0','1']],
 ['non-null guard',"<?php /** @param array{mode:string}|null $options */ function read(?array $options):void{if($options===null)return;$options['mo§",['mode']],
] as const;
it.each(positives.flatMap(([name,input,expected])=>[false,true].map(closed=>({name,input,expected,closed}))))(
 'reads $name shape keys with closed=$closed',({input,expected,closed})=>{
  const marked=input+(closed?"'];}":''),offset=marked.indexOf('§'),source=marked.replace('§',''),uri='file:///ArrayAccess.php',workspace=new SemanticWorkspace(parser);
  try{workspace.update(uri,source,true);const revision=workspace.revision(),snapshot=JSON.stringify(workspace.snapshot(uri));const result=workspace.completeArrayAccessKeys(uri,offset);
  expect(result?.keys.map(key=>key.name)).toEqual(expected);expect(result?.end).toBe(offset+(closed?1:0));expect(result?.start).toBe(source.lastIndexOf('[')+1);expect(workspace.completionContext(uri,offset).kind).toBe('array-access-key');
  expect(workspace.revision()).toBe(revision);expect(JSON.stringify(workspace.snapshot(uri))).toBe(snapshot);
  }finally{workspace.dispose();}
 });
const negatives=[
 ['unknown',"<?php function read($options):void{$options['mo§"],
 ['broad',"<?php /** @param array{mode:string}|array $options */ function read(array $options):void{$options['mo§"],
 ['branch-only',"<?php /** @param array{mode:string}|array{name:string} $options */ function read(array $options):void{$options['mo§"],
 ['unknown call',"<?php /** @param array{mode:string} $options */ function read(array $options):void{unknown($options);$options['mo§"],
 ['reassigned',"<?php /** @param array{mode:string} $options */ function read(array $options):void{$options='other';$options['mo§"],
 ['unset',"<?php /** @param array{mode:string} $options */ function read(array $options):void{unset($options['mode']);$options['mo§"],
 ['nullable',"<?php /** @param array{mode:string}|null $options */ function read(?array $options):void{$options['mo§"],
 ['reference',"<?php /** @param array{mode:string} $options */ function read(array &$options):void{$options['mo§"],
 ['dynamic path',"<?php /** @param array{payload:array{mode:string}} $options */ function read(array $options,$key):void{$options[$key]['mo§"],
 ['string receiver',"<?php function read():void{$options='mode';$options['mo§"],
 ['comment',"<?php /** @param array{mode:string} $options */ function read(array $options):void{// $options['mo§"],
 ['HTML',"<?php $options=['mode'=>'create']; ?> $options['mo§"],
] as const;
it.each(negatives.flatMap(([name,input])=>[false,true].map(closed=>({name,input,closed}))))(
 'does not invent $name shape keys with closed=$closed',({input,closed})=>{
  const marked=input+(closed?"'];}":''),workspace=new SemanticWorkspace(parser),uri='file:///NegativeAccess.php';
  try{workspace.update(uri,marked.replace('§',''),true);expect(workspace.completeArrayAccessKeys(uri,marked.indexOf('§'))?.keys??[]).toEqual([]);}finally{workspace.dispose();}
 });
it('replaces the complete quoted suffix at a middle cursor',()=>{
 const workspace=new SemanticWorkspace(parser),uri='file:///MiddleAccess.php',marked="<?php /** @param array{'content-type':string} $options */ function read(array $options):void{$options['content-§garbage'];}";
 try{const source=marked.replace('§','');workspace.update(uri,source,true);const result=workspace.completeArrayAccessKeys(uri,marked.indexOf('§'));expect(result?.keys.map(key=>key.name)).toEqual(['content-type']);expect(source.slice(result!.start,result!.end)).toBe("'content-garbage'");}finally{workspace.dispose();}
});
it('retracts old keys after unsaved contract updates',()=>{
 const workspace=new SemanticWorkspace(parser),uri='file:///ChangedAccess.php';
 try{for(const key of ['mode','other','mode']){const source=`<?php /** @param array{${key}:string} $options */ function read(array $options):void{$options['mo`;workspace.update(uri,source,true);expect(workspace.completeArrayAccessKeys(uri,source.length)?.keys.map(field=>field.name)??[]).toEqual(key==='mode'?['mode']:[]);}}finally{workspace.dispose();}
});

it.each([false,true])('retains keys across a known value parameter call, closed=%s',closed=>{
 const workspace=new SemanticWorkspace(parser),uri='file:///ValueCallAccess.php';
 const marked="<?php function observe(array $options):void{} /** @param array{mode:string} $options */ function read(array $options):void{observe($options);$options['mo§"+(closed?"'];}":'');
 try{workspace.update(uri,marked.replace('§',''),true);expect(workspace.completeArrayAccessKeys(uri,marked.indexOf('§'))?.keys.map(key=>key.name)).toEqual(['mode']);}finally{workspace.dispose();}
});
it.each([false,true])('does not retain a local shape across an unknown mutation, closed=%s',closed=>{
 const workspace=new SemanticWorkspace(parser),uri='file:///UnknownLocalAccess.php';
 const marked="<?php function read():void{$options=['mode'=>'create'];unknown($options);$options['mo§"+(closed?"'];}":'');
 try{workspace.update(uri,marked.replace('§',''),true);expect(workspace.completeArrayAccessKeys(uri,marked.indexOf('§'))?.keys??[]).toEqual([]);}finally{workspace.dispose();}
});
it.each([false,true])('queries without requiring retained syntax, retain=%s',retain=>{
 const workspace=new SemanticWorkspace(parser),uri='file:///AccessRetention.php',marked=positives[0]![1]+"'];}";
 try{workspace.update(uri,marked.replace('§',''),retain);expect(workspace.completeArrayAccessKeys(uri,marked.indexOf('§'))?.keys.map(key=>key.name)).toEqual(['mode']);}finally{workspace.dispose();}
});

it.each([false,true])('suggests known keys at an empty access index, closed=%s',closed=>{
 const workspace=new SemanticWorkspace(parser),uri='file:///EmptyAccess.php';
 const marked="<?php /** @param array{mode:string,id:int} $options */ function read(array $options):void{$options[§"+(closed?'];}':'');
 try{const offset=marked.indexOf('§');workspace.update(uri,marked.replace('§',''),true);const result=workspace.completeArrayAccessKeys(uri,offset);expect(result?.keys.map(key=>key.name)).toEqual(['id','mode']);expect(result?.start).toBe(offset);expect(result?.end).toBe(offset);}finally{workspace.dispose();}
});

it.each([false,true])('uses an isset guard for an optional nested array, closed=%s',closed=>{
 const workspace=new SemanticWorkspace(parser),uri='file:///GuardedNestedAccess.php';
 const marked="<?php /** @param array{payload?:array{mode:string}} $options */ function read(array $options):void{if(!isset($options['payload']))return;$options['payload']['mo§"+(closed?"'];}":'');
 try{workspace.update(uri,marked.replace('§',''),true);expect(workspace.completeArrayAccessKeys(uri,marked.indexOf('§'))?.keys.map(key=>key.name)).toEqual(['mode']);}finally{workspace.dispose();}
});
it.each([false,true])('does not assume an optional nested array exists without a guard, closed=%s',closed=>{
 const workspace=new SemanticWorkspace(parser),uri='file:///OptionalNestedAccess.php';
 const marked="<?php /** @param array{payload?:array{mode:string}} $options */ function read(array $options):void{$options['payload']['mo§"+(closed?"'];}":'');
 try{workspace.update(uri,marked.replace('§',''),true);expect(workspace.completeArrayAccessKeys(uri,marked.indexOf('§'))?.keys??[]).toEqual([]);}finally{workspace.dispose();}
});

it('does not treat a qualified isset name as the native construct',()=>{
 const workspace=new SemanticWorkspace(parser),uri='file:///QualifiedConstruct.php',marked="<?php /** @param array{mode:string} $options */ function read(array $options):void{Other\\isset($options);$options['mo§'];}";
 try{workspace.update(uri,marked.replace('§',''),true);expect(workspace.completeArrayAccessKeys(uri,marked.indexOf('§'))?.keys??[]).toEqual([]);}finally{workspace.dispose();}
});

it.each([false,true])('reads a proven foreach element shape, closed=%s',closed=>{
 const workspace=new SemanticWorkspace(parser),uri='file:///ForeachAccess.php',marked="<?php /** @param list<array{mode:string}> $items */ function read(array $items):void{foreach($items as $entry)$entry['mo§"+(closed?"'];}":'');
 try{workspace.update(uri,marked.replace('§',''),true);expect(workspace.completeArrayAccessKeys(uri,marked.indexOf('§'))?.keys.map(key=>key.name)).toEqual(['mode']);}finally{workspace.dispose();}
});
it.each(["eval('$options=[];');", "extract(['options'=>[]]);", 'global $options;', 'static $options;', "include 'unknown.php';"]
 .flatMap(statement=>[false,true].map(closed=>({statement,closed}))))('withdraws keys after dynamic/shared bindings $statement closed=$closed',({statement,closed})=>{
 const workspace=new SemanticWorkspace(parser),uri='file:///DynamicAccess.php';
 const marked=`<?php /** @param array{mode:string} $options */ function read(array $options):void{${statement}$options['mo§${closed?"'];}":''}`;
 try{workspace.update(uri,marked.replace('§',''),true);expect(workspace.completeArrayAccessKeys(uri,marked.indexOf('§'))?.keys??[]).toEqual([]);}finally{workspace.dispose();}
});
it.each(["$label='extract global static include';", "$unused=function(){extract(['options'=>[]]);};"])(
 'retains a parameter shape when binding keywords are not executed: %s',statement=>{
  const workspace=new SemanticWorkspace(parser),uri='file:///HarmlessAccess.php';
  const marked=`<?php /** @param array{mode:string} $options */ function read(array $options):void{${statement}$options['mo§'];}`;
  try{workspace.update(uri,marked.replace('§',''),true);expect(workspace.completeArrayAccessKeys(uri,marked.indexOf('§'))?.keys.map(key=>key.name)).toEqual(['mode']);}finally{workspace.dispose();}
 });
