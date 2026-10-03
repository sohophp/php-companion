import { afterAll, beforeAll, expect, it } from 'vitest';
import { PhpSyntaxParser } from '@php-companion/parser';
import { SemanticWorkspace } from '../src/index.js';
let parser: PhpSyntaxParser;
beforeAll(async()=>{parser=await PhpSyntaxParser.createDefault();});
afterAll(()=>parser.dispose());
it.each([
 ["$valueText='text';$cb=fn():string=>$va|;", "$valueText: string"],
 ["$valueText='text';$cb=function()use($valueText):string{return $va|;};", "$valueText: string"],
 ["$valueText='text';$cb=fn():string=>$va|", "$valueText: string"],
 ["$cb=function():string{$valueText='text';return $va|", "$valueText: string"],
 ["$valueText='text';$cb=function()use(&$valueText):string{return $va|;};", undefined],
 ["$valueText='text';$cb=function()use(&$valueText):string{return $va|", undefined],
 ["$valueText='text';$cb=function()use($valueText):string{eval('');return $va|", undefined],
 ["$valueText='text';$cb=function()use($valueText):string{unset($valueText);return $va|", undefined],
 ["$valueText='text';$cb=function()use($valueText):string{mutate($valueText);return $va|;};", undefined],
 ["$valueText='text';$cb=function()use($valueText):string{eval('');return $va|;};", undefined],
 ["$valueText='text';$cb=function()use($valueText):bool{$valueText=false;return $va|;};", "$valueText: bool"],
 ["$valueText='text';$cb=function()use($valueText):string{unset($valueText);return $va|;};", undefined],
] as const)('shows only proven callback variable details: %s', (expression, detail)=>{
 const project=new SemanticWorkspace(parser);
 try {
  const uri='file:///CallbackDetails.php';const marked=`<?php ${expression}`;const offset=marked.indexOf('|');project.update(uri,marked.replace('|',''));
  const snapshot=JSON.stringify(project.snapshot(uri));const revision=project.revision();
  expect(project.completionVariableDetail(uri,offset,'$valueText')).toBe(detail);
  expect(JSON.stringify(project.snapshot(uri))).toBe(snapshot);expect(project.revision()).toBe(revision);
 }finally{project.dispose();}
});
