import { afterAll, beforeAll, expect, it } from 'vitest';
import { PhpSyntaxParser } from '@php-companion/parser';
import { SemanticWorkspace } from '../src/index.js';
let parser: PhpSyntaxParser;
beforeAll(async()=>{parser=await PhpSyntaxParser.createDefault();});
afterAll(()=>parser.dispose());
it.each([
 ["return null ?? $va|;", '$valueText'],
 ["$target='text';$target=null??$va|;", '$valueText'],
 ["$target='text';$target=match(true){true=>$va|,default=>'text'};", '$valueText'],
 ["$bag=new BranchBag();$bag->target=null??$va|;", '$valueText'],
 ["$bag=new BranchBag();$bag->target=match(true){true=>$va|,default=>'text'};", '$valueText'],
 ["return (null ?? $va|);", '$valueText'],
 ["return match(true){true=>$va|,default=>'text'};", '$valueText'],
 ["return match(true){true=>'text',default=>$va|};", '$valueText'],
 ["return match(true){true=>null??$va|,default=>'text'};", '$valueText'],
 ["takesText(match($va|){true=>'text',default=>'text'});", '$valueFlag'],
 ["takesText(match(true){$va|=>'text',default=>'text'});", '$valueFlag'],
 ["takesText(match(true){true=>takesNumber($va|),default=>'text'});", '$valueNumber'],
 ["return null ?? takesNumber($va|);", '$valueNumber'],
 ["return match(true){true=>!$va|,default=>'text'};", '$valueFlag'],
 ["return match(true){true=>'text',default=>match(false){false=>$va|,default=>'text'}};", '$valueText'],
] as const)('ranks value branches without using result types on selectors: %s', (expression, expected)=>{
 const project=new SemanticWorkspace(parser);
 try{
  const marked=`<?php class BranchBag {public string $target;} function takesText(string $v):void{} function takesNumber(int $v):int{return $v;}
  function run():string{$valueFlag=true;$valueText='text';$valueNumber=123;${expression}}`;
  const uri='file:///BranchValues.php';const offset=marked.indexOf('|');project.update(uri,marked.replace('|',''));
  const names=project.completeVariables(uri,offset)?.names;
  expect(names).toContain('$valueFlag');expect(names).toContain('$valueText');expect(names).toContain('$valueNumber');
  expect(names?.[0]).toBe(expected);
 }finally{project.dispose();}
});
it.each(['return $va| ?? "text";', 'takesText($va| ?? "text");'])('permits nullable left values of coalescing: %s',expression=>{
 const project=new SemanticWorkspace(parser);
 try{
  const marked=`<?php function takesText(string $v):void{} function run(?string $valueMaybe,string $valueText):string {${expression}}`;
  const uri='file:///NullableCoalescing.php';const offset=marked.indexOf('|');project.update(uri,marked.replace('|',''));
  expect(project.completeVariables(uri,offset)?.names).toEqual(['$valueMaybe','$valueText']);
 }finally{project.dispose();}
});
