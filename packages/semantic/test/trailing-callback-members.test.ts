import { afterAll, beforeAll, expect, it } from 'vitest';
import { PhpSyntaxParser } from '@php-companion/parser';
import { SemanticWorkspace } from '../src/index.js';
let parser: PhpSyntaxParser;
beforeAll(async()=>{parser=await PhpSyntaxParser.createDefault();});
afterAll(()=>parser.dispose());
const types="class Item {public function title():string{return 'text';} private function hidden():void{}} class Other {public function toggle():bool{return true;}}";
it.each([
 ['$cb=function(Item $item):void{$item->tit|', ['title']],
 ['$cb=function(Item $item):void{$item->|', ['title']],
 ['accept(function(Item $item):void{$item->tit|', ['title']],
 ['$item=new Item();$cb=function(Other $item):void{$item->t|', ['toggle']],
 ['$item=new Item();$cb=function($item):void{$item->tit|', []],
 ['$cb=fn(Item $item):string=>$item->tit|', ['title']],
 ['$cb=fn(Item $item):string=>$item->|', ['title']],
 ['class Factory {public function make(){ $cb=function(Item $item):void{$item->tit|', ['title']],
 ['function useItem(Item $item):void {$item->tit|', ['title']],
 ['class Factory {public function make(Item $item):void {$item->tit|', ['title']],
 ['class Factory {private function secret():void{} public function make():void {$this->sec|', ['secret']],
 ['class Factory {private function secret():void{} public static function make():void {$this->sec|', []],
] as const)('recovers trailing callback members with their lexical parameter types: %s', (expression, expected)=>{
 const project=new SemanticWorkspace(parser);
 try{
  const marked=`<?php ${types} function accept(callable $cb):void{} ${expression}`;const uri='file:///TrailingMembers.php';const offset=marked.indexOf('|');project.update(uri,marked.replace('|',''));
  const before=JSON.stringify(project.snapshot(uri));const revision=project.revision();
  expect(project.completeMembers(uri,offset).map(member=>member.name)).toEqual(expected);
  expect(JSON.stringify(project.snapshot(uri))).toBe(before);expect(project.revision()).toBe(revision);
 }finally{project.dispose();}
});

it('keeps variable ranking and details in an unclosed ordinary method',()=>{
 const project=new SemanticWorkspace(parser);
 try{
  const marked="<?php class Factory {public function make():string {$valueFlag=true;$valueText='text';return $va|";
  const uri='file:///TrailingMethodValues.php';const offset=marked.indexOf('|');project.update(uri,marked.replace('|',''));
  const before=JSON.stringify(project.snapshot(uri));const revision=project.revision();
  expect(project.completeVariables(uri,offset)?.names[0]).toBe('$valueText');
  expect(project.completionVariableDetail(uri,offset,'$valueText')).toBe('$valueText: string');
  expect(JSON.stringify(project.snapshot(uri))).toBe(before);expect(project.revision()).toBe(revision);
 }finally{project.dispose();}
});
