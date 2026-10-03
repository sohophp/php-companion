import {afterAll,beforeAll,expect,it} from 'vitest';
import {PhpSyntaxParser} from '@php-companion/parser';
import {SemanticWorkspace} from '../src/index.js';
let parser:PhpSyntaxParser;
beforeAll(async()=>{parser=await PhpSyntaxParser.createDefault();});afterAll(()=>parser.dispose());
it.each([
 ['send(["ow|"]);',['owner']],
 ['send((["ow|"]));',['owner']],
 ['send(true?["ow|"]:[]);',['owner']],
 ['send(null??["ow|"]);',['owner']],
 ['send(["ow|"]??[]);',['owner']],
 ['send(match(true){true=>["ow|"],default=>[]});',['owner']],
 ['send(match(true){default=>["ow|"]});',['owner']],
 ['send(match(true){true=>null??["ow|"],default=>[]});',['owner']],
 ['send(match(["ow|"]){default=>[]});',[]],
 ['send(match(true){["ow|"]=>[],default=>[]});',[]],
 ['send(["ow|"]?[]:[]);',[]],
 ['send(!["ow|"]);',[]],
 ['send(unknown(["ow|"]));',[]],
 ['send((function():array{return ["ow|"];})());',[]],
 ['send(fn():array=>["ow|"]);',[]],
 ['send(match(true){true=>inner(["ot|"]),default=>[]});',['other']],
] as const)('completes shape keys only in value branches: %s',(expression,expected)=>{
 const project=new SemanticWorkspace(parser);try{
 const marked=`<?php /** @param array{owner:string} $config */ function send(array $config):void{}
 /** @param array{other:string} $input */ function inner(array $input):array{return $input;}
 ${expression}`;
 const uri='file:///BranchShapes.php',offset=marked.indexOf('|');project.update(uri,marked.replace('|',''));
 const revision=project.revision(),snapshot=JSON.stringify(project.snapshot(uri));
 expect(project.completeArrayShapeKeys(uri,offset)?.keys.map(key=>key.name)??[]).toEqual(expected);
 expect(project.revision()).toBe(revision);expect(JSON.stringify(project.snapshot(uri))).toBe(snapshot);
 }finally{project.dispose();}
});

it.each([
 ['send(["active"=>|]);',true],
 ['send(true?["active"=>|]:[]);',true],
 ['send(null??["active"=>|]);',true],
 ['send(["active"=>|]??[]);',true],
 ['send(match(true){true=>["active"=>|],default=>[]});',true],
 ['send(match(["active"=>|]){default=>[]});',false],
 ['send((function():array{return ["active"=>|];})());',false],
] as const)('completes proven values only in array value branches: %s',(expression,proven)=>{
 const project=new SemanticWorkspace(parser);try{
 const marked=`<?php /** @param array{active:bool} $config */ function send(array $config):void{} ${expression}`;
 const uri='file:///BranchShapeValues.php',offset=marked.indexOf('|');project.update(uri,marked.replace('|',''));
 const labels=project.completeExpectedValues(uri,offset).map(item=>item.label);
 expect(labels.includes('true')).toBe(proven);expect(labels.includes('false')).toBe(proven);
 }finally{project.dispose();}
});
it.each(['send(["nested"=>["deep"=>["ow|"]]]);','send(true?["nested"=>["deep"=>["ow|"]]]:[]);'])('follows nested shape fields in root-to-leaf order: %s',expression=>{
 const project=new SemanticWorkspace(parser);try{
 const marked=`<?php /** @param array{nested:array{deep:array{owner:string}}} $config */ function send(array $config):void{} ${expression}`;
 const uri='file:///NestedBranchShapeKeys.php',offset=marked.indexOf('|');project.update(uri,marked.replace('|',''));
 expect(project.completeArrayShapeKeys(uri,offset)?.keys.map(item=>item.name)).toEqual(['owner']);
 }finally{project.dispose();}
});

it.each([
 'return true?["ow|"]:[];',
 'return null??["ow|"];',
 'return ["ow|"]??[];',
 'return match(true){true=>["ow|"],default=>[]};',
 '$config=true?["ow|"]:[];',
 '$config=null??["ow|"];',
 '$config=match(true){true=>["ow|"],default=>[]};',
] as const)('preserves return and assignment contracts in shape value branches: %s',expression=>{
 const project=new SemanticWorkspace(parser);try{
 const marked=`<?php /**\n * @param array{owner:string} $config\n * @return array{owner:string}\n */ function config(array $config):array{${expression}}`;
 const uri='file:///ShapeLocalBranches.php',offset=marked.indexOf('|');project.update(uri,marked.replace('|',''));
 expect(project.completeArrayShapeKeys(uri,offset)?.keys.map(item=>item.name)).toEqual(['owner']);
 }finally{project.dispose();}
});
it.each(['send(array("ow|"));','send(true?array("ow|"):[]);'])('supports long array syntax in value branches: %s',expression=>{
 const project=new SemanticWorkspace(parser);try{
 const marked=`<?php /** @param array{owner:string} $config */ function send(array $config):void{} ${expression}`;
 const uri='file:///LongShapeBranches.php',offset=marked.indexOf('|');project.update(uri,marked.replace('|',''));
 expect(project.completeArrayShapeKeys(uri,offset)?.keys.map(item=>item.name)).toEqual(['owner']);
 }finally{project.dispose();}
});
