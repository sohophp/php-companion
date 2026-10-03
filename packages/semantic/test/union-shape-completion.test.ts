import {afterAll,beforeAll,expect,it} from 'vitest';
import {PhpSyntaxParser} from '@php-companion/parser';
import {SemanticWorkspace} from '../src/index.js';
let parser:PhpSyntaxParser;
beforeAll(async()=>{parser=await PhpSyntaxParser.createDefault();});afterAll(()=>parser.dispose());
const contract="array{mode:'create',id:int}|array{mode:'update',name:string}";
it.each([
 ['common',contract,"choose(['mo§']);",['mode']],
 ['empty',contract,'choose([§]);',['mode']],
 ['branch only',contract,"choose(['i§']);",[]],
 ['used common',contract,"choose(['mode'=>'create','mo§']);",[]],
 ['ternary',contract,"choose(true?['mo§']:[]);",['mode']],
 ['coalescing',contract,"choose(null??['mo§']);",['mode']],
 ['match arm',contract,"choose(match(true){default=>['mo§']});",['mode']],
 ['selector',contract,"choose(['mo§']?[]:[]);",[]],
 ['unknown callback',contract,"choose((function(){return ['mo§'];})());",[]],
 ['nested','array{payload:array{trace:string,x:int}}|array{payload:array{trace:string,y:string}}',"choose(['payload'=>['tr§']]);",['trace']],
 ['deep','array{payload:array{deep:array{trace:string,x:int}}}|array{payload:array{deep:array{trace:string,y:string}}}',"choose(['payload'=>['deep'=>['tr§']]]);",['trace']],
 ['broad array','array{mode:string}|array',"choose(['mo§']);",[]],
 ['mixed arm','array{mode:string}|mixed',"choose(['mo§']);",[]],
 ['disjoint','array{left:string}|array{right:string}',"choose([§]);",[]],
 ['nullable',`(${contract})|null`,"choose(['mo§']);",['mode']],
 ['branch count budget',Array.from({length:33},(_,i)=>`array{mode:'m${i}',unique${i}:int}`).join('|'),"choose(['mo§']);",[]],
] as const)('proves shared shape keys without choosing an arm: %s',(_,type,expression,names)=>{
 const project=new SemanticWorkspace(parser);try{
 const marked=`<?php /** @param ${type} $options */ function choose(${type.endsWith('|null')?'?array':'array'} $options):void{} ${expression}`,offset=marked.indexOf('§'),uri='file:///UnionShapeKeys.php';
 project.update(uri,marked.replace('§',''),true);const revision=project.revision(),snapshot=JSON.stringify(project.snapshot(uri));
 expect(project.completeArrayShapeKeys(uri,offset)?.keys.map(key=>key.name)??[]).toEqual(names);
 expect(project.revision()).toBe(revision);expect(JSON.stringify(project.snapshot(uri))).toBe(snapshot);
 }finally{project.dispose();}
});
it.each([
 ['literal values',contract,"choose(['mode'=>'§']);",["'create'","'update'"]],
 ['quoted prefix',contract,"choose(['mode'=>'cr§']);",["'create'"]],
 ['bool and literal',"array{flag:bool}|array{flag:'auto'}", "choose(['flag'=>§]);",["'auto'",'false','true']],
 ['nonshared field',contract,"choose(['id'=>§]);",[]],
 ['unknown arm','array{mode:string}|array',"choose(['mode'=>'§']);",[]],
 ['nested values',"array{payload:array{mode:'a',x:int}}|array{payload:array{mode:'b',y:string}}", "choose(['payload'=>['mode'=>'§']]);",["'a'","'b'"]],
] as const)('merges the proven field value contracts: %s',(_,type,expression,labels)=>{
 const project=new SemanticWorkspace(parser);try{
 const marked=`<?php /** @param ${type} $options */ function choose(${type.endsWith('|null')?'?array':'array'} $options):void{} ${expression}`,offset=marked.indexOf('§'),uri='file:///UnionShapeValues.php';
 project.update(uri,marked.replace('§',''),true);
 const candidates=project.completeExpectedValues(uri,offset);expect(candidates.map(item=>item.label)).toEqual(labels);
 for(const candidate of candidates){expect(candidate.start).toBeLessThanOrEqual(offset);expect(candidate.end).toBeGreaterThanOrEqual(offset);}
 }finally{project.dispose();}
});
it('preserves optionality when only one arm makes the shared key optional',()=>{
 const project=new SemanticWorkspace(parser);try{
 const marked="<?php /** @param array{mode?:string}|array{mode:string} $options */ function choose(array $options):void{} choose(['mo§']);",offset=marked.indexOf('§'),uri='file:///UnionShapeOptional.php';
 project.update(uri,marked.replace('§',''),true);expect(project.completeArrayShapeKeys(uri,offset)?.keys).toEqual([{name:'mode',optional:true}]);
 }finally{project.dispose();}
});

it.each(['array', '?string'])('rejects nullable shape documentation incompatible with native %s',native=>{
 const project=new SemanticWorkspace(parser);try{
 const marked=`<?php /** @param (${contract})|null $options */ function choose(${native} $options):void{} choose(['mo§']);`,offset=marked.indexOf('§'),uri='file:///UnionShapeNativeConflict.php';
 project.update(uri,marked.replace('§',''),true);expect(project.completeArrayShapeKeys(uri,offset)?.keys??[]).toEqual([]);
 }finally{project.dispose();}
});
it.each(['return', 'assignment'])('uses a union shape contract in %s expressions',kind=>{
 const project=new SemanticWorkspace(parser);try{
 const marked=kind==='return'
  ?`<?php /** @return ${contract} */ function choices():array{return ['mo§'];}`
  :`<?php /** @param ${contract} $options */ function choices(array $options):void{$options=['mo§'];}`;
 const offset=marked.indexOf('§'),uri='file:///UnionShapeExpressions.php';project.update(uri,marked.replace('§',''),true);
 expect(project.completeArrayShapeKeys(uri,offset)?.keys.map(key=>key.name)).toEqual(['mode']);
 }finally{project.dispose();}
});
