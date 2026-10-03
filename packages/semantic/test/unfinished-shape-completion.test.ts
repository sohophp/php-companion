import {afterAll,beforeAll,expect,it} from 'vitest';
import {PhpSyntaxParser} from '@php-companion/parser';
import {SemanticWorkspace} from '../src/index.js';
let parser:PhpSyntaxParser;
beforeAll(async()=>{parser=await PhpSyntaxParser.createDefault();});afterAll(()=>parser.dispose());
const contracts=[['single',"array{mode:'create',id:int}"],['union',"array{mode:'create',id:int}|array{mode:'update',name:string}"]] as const;
const cases=contracts.flatMap(([name,type])=>['argument','return','assignment','method'].flatMap(context=>['key','value'].flatMap(part=>['tight','spaced'].map(style=>({name,type,context,part,style})))));
it.each(cases)('recovers $name $context $part with $style arrow spacing',({type,context,part,style})=>{
 const unfinished=part==='key'?"['mo":style==='tight'?"['mode'=>'cr":"['mode'=> 'cr";
 const source=context==='argument'?`<?php /** @param ${type} $options */ function choose(array $options):void{} choose(${unfinished}`
  :context==='return'?`<?php /** @return ${type} */ function choose():array{return ${unfinished}`
  :context==='assignment'?`<?php /** @param ${type} $options */ function choose(array $options):void{$options=${unfinished}`
  :`<?php class Builder{/** @param ${type} $options */ public function choose(array $options):void{}} $builder=new Builder();$builder->choose(${unfinished}`;
 const workspace=new SemanticWorkspace(parser);try{
 const uri='file:///UnfinishedShapes.php';workspace.update(uri,source,true);const revision=workspace.revision(),snapshot=JSON.stringify(workspace.snapshot(uri));
 if(part==='key'){const result=workspace.completeArrayShapeKeys(uri,source.length);expect(result?.keys.map(x=>x.name)).toEqual(['mode']);expect(result?.end).toBe(source.length);expect(result?.start).toBe(source.lastIndexOf("'mo"));}
 else{const results=workspace.completeExpectedValues(uri,source.length);expect(results.map(x=>x.label)).toEqual(["'create'"]);expect(results[0]?.insertText).toBe("'create'");expect(results[0]?.end).toBe(source.length);expect(results[0]?.start).toBe(source.lastIndexOf("'cr"));}
 expect(workspace.revision()).toBe(revision);expect(JSON.stringify(workspace.snapshot(uri))).toBe(snapshot);
 }finally{workspace.dispose();}
});
const declaration="<?php /** @param array{mode:'create',id:int} $options */ function choose(array $options):void{} ";
it.each([
 ['unknown call',declaration+"unknown(['mo"],
 ['unknown nested call',declaration+"choose(unknown(['mo"],
 ['callback',declaration+"choose((function(){return ['mo"],
 ['selector',declaration+"choose(!['mo"],
 ['match selector',declaration+"choose(match(['mo"],
 ['comment',declaration+"// choose(['mo"],
 ['block comment',declaration+"/* choose(['mo"],
 ['HTML',declaration+"?>choose(['mo"],
 ['wrong delimiter',declaration+"choose({['mo"],
 ['nonarray contract',"<?php /** @param string $options */ function choose(string $options):void{} choose(['mo"],
 ['incompatible return',"<?php /** @return array{mode:'create'}|null */ function choose():array{return ['mo"],
 ['unknown shape branch',"<?php /** @param array{mode:'create'}|array $options */ function choose(array $options):void{} choose(['mo"],
] as const)('does not recover a guessed contract: %s',(_,source)=>{
 const workspace=new SemanticWorkspace(parser);try{const uri='file:///UnfinishedShapeNegative.php';workspace.update(uri,source,true);expect(workspace.completeArrayShapeKeys(uri,source.length)?.keys??[]).toEqual([]);
 const valueSource=source.replace("'mo", "'mode'=>'cr");workspace.update(uri,valueSource,true);expect(workspace.completeExpectedValues(uri,valueSource.length)).toEqual([]);
 }finally{workspace.dispose();}
});
it.each(['key','value'])('preserves PHP islands after HTML with braces: %s',part=>{
 const source="<div>{html}</div>"+declaration+(part==='key'?"choose(['mo":"choose(['mode'=>'cr");const workspace=new SemanticWorkspace(parser);
 try{const uri='file:///MixedUnfinishedShapes.php';workspace.update(uri,source,true);if(part==='key')expect(workspace.completeArrayShapeKeys(uri,source.length)?.keys.map(x=>x.name)).toEqual(['mode']);else expect(workspace.completeExpectedValues(uri,source.length).map(x=>x.label)).toEqual(["'create'"]);}finally{workspace.dispose();}
});
it('withdraws and restores keys after unsaved contract edits',()=>{
 const workspace=new SemanticWorkspace(parser);try{
 const uri='file:///UnfinishedShapeRefresh.php';for(const key of ['mode','other','mode']){const source=`<?php /** @param array{${key}:string} $options */ function choose(array $options):void{} choose(['mo`;workspace.update(uri,source,true);expect(workspace.completeArrayShapeKeys(uri,source.length)?.keys.map(x=>x.name)??[]).toEqual(key==='mode'?['mode']:[]);}
 }finally{workspace.dispose();}
});

it.each([false,true])('works with retained syntax set to %s',retain=>{
 const workspace=new SemanticWorkspace(parser);try{const uri='file:///UnfinishedRetention.php',source=declaration+"choose(['mo";workspace.update(uri,source,retain);expect(workspace.completeArrayShapeKeys(uri,source.length)?.keys.map(x=>x.name)).toEqual(['mode']);}finally{workspace.dispose();}
});
it.each([
 ['source size', '/*'+'x'.repeat(131073)+'*/'+declaration+"choose(['mo"],
 ['delimiter depth', declaration+'choose('+'('.repeat(17)+"['mo"],
] as const)('withdraws rather than expanding the %s budget',(_,source)=>{
 const workspace=new SemanticWorkspace(parser);try{const uri='file:///UnfinishedBudget.php';workspace.update(uri,source,true);expect(workspace.completeArrayShapeKeys(uri,source.length)?.keys??[]).toEqual([]);}finally{workspace.dispose();}
});
it.each([
 [declaration+"choose(['mode'=>'cr",true],
 ["<?php unknown('mo",true],
 ['<?php unknown("mo',true],
 ["<?php unknown('mo§');",true],
 ["<?php // unknown('mo",false],
 ["<?php /** @param 'mo",false],
 ["<?php retu",false],
] as const)('marks string value context without suppressing code or PHPDoc: %s',(marked,quoted)=>{
 const workspace=new SemanticWorkspace(parser);try{const uri='file:///QuotedValueContext.php',offset=marked.includes('§')?marked.indexOf('§'):marked.length;workspace.update(uri,marked.replace('§',''),true);const context=workspace.completionContext(uri,offset);expect(context.kind).toBe('general');if(context.kind==='general')expect(context.quotedValue).toBe(quoted);}finally{workspace.dispose();}
});
