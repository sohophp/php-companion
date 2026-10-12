import {beforeAll,afterAll,expect,it} from 'vitest';
import {PhpSyntaxParser} from '@php-companion/parser';
import {SemanticWorkspace} from '../src/index.js';
let parser:PhpSyntaxParser;
beforeAll(async()=>{parser=await PhpSyntaxParser.createDefault();});afterAll(()=>parser.dispose());
const root='file:///move-docs/',sourceUri=root+'Source.php',targetUri=root+'Target.php',extraUri=root+'Extra.php';
const cases=[
 ['external see','<?php namespace C; use A\\Source as S; /** @see S::observe */ function info() {}',false,true],
 ['external inline link','<?php namespace C; use A\\Source as S; /** Details {@link S::observe()} */ function info() {}',false,true],
 ['external uses','<?php namespace C; /** @uses \\A\\Source::observe() */ function info() {}',false,true],
 ['source magic prototype','<?php function info() {}',true,false],
 ['unrelated method link','<?php namespace C; class Other {public static function observe(): int {return 2;}} /** @see Other::observe */ function info() {}',false,false],
 ['ordinary comment','<?php // Source::observe is only an example\nfunction info() {}',false,false],
] as const;
it.each(cases)('keeps member metadata consistent: %s',(label,extra,magic,reference)=>{
 const source=`<?php namespace A; ${magic?'/** @method static int observe() */':''} final class Source {public static function observe(): int {return 1;}}`;
 const files=new Map([[sourceUri,source],[targetUri,'<?php namespace B; final class Target {}'],[root+'Caller.php','<?php return \\A\\Source::observe();'],[extraUri,extra]]);
 const workspace=new SemanticWorkspace(parser);workspace.setTargetPhpVersion('8.5');
 try{
  for(const [uri,text] of files)workspace.update(uri,text,true);
  const plan=workspace.moveStaticMethod(sourceUri,source.lastIndexOf('observe(')+1,'B\\Target');
  if(magic&&plan===undefined)return;
  expect(plan,label).toBeDefined();
  const changed=new Map([...files].map(([uri,text])=>[uri,plan!.edits.filter(edit=>edit.uri===uri)
    .sort((a,b)=>b.start-a.start).reduce((value,edit)=>value.slice(0,edit.start)+edit.newText+value.slice(edit.end),text)]));
  if(magic)expect(changed.get(sourceUri)).not.toContain('@method static int observe');
  else if(reference)expect(changed.get(extraUri)).toContain('\\B\\Target::observe');
  else expect(changed.get(extraUri)).toBe(extra);
 }finally{workspace.dispose();}
});

const guardedCases = [
 ['parent virtual contract', '<?php namespace A; /** @method static int observe() */ class Base {} final class Source extends Base {public static function observe(): int {return 1;}}', '<?php namespace B; final class Target {}', '<?php function info() {}', false, false],
 ['Trait virtual contract', '<?php namespace A; /** @method static int observe() */ trait Contract {} final class Source {use Contract; public static function observe(): int {return 1;}}', '<?php namespace B; final class Target {}', '<?php function info() {}', false, false],
 ['unknown documentation owner', '<?php namespace A; final class Source {public static function observe(): int {return 1;}}', '<?php namespace B; final class Target {}', '<?php /** @see Missing::observe */ function info() {}', false, false],
 ['destination documentation', '<?php namespace A; final class Source {public static function observe(): int {return 1;}}', '<?php namespace B; /** @see \\A\\Source::observe */ final class Target {}', '<?php function info() {}', true, true],
 ['repeated namespace aliases', '<?php namespace A; final class Source {public static function observe(): int {return 1;}}', '<?php namespace B; final class Target {}', '<?php namespace C {use B\\Target as S;} namespace D {use A\\Source as S; /** @see S::observe */ function info() {}}', true, false],
 ['unrelated virtual method', '<?php namespace A; /** @method static int unrelated() */ final class Source {public static function observe(): int {return 1;}}', '<?php namespace B; final class Target {}', '<?php function info() {}', true, false],
] as const;
it.each(guardedCases)('checks documentation ownership: %s',(label,source,target,extra,safe,targetLink)=>{
 const files=new Map([[sourceUri,source],[targetUri,target],[root+'Caller.php','<?php return \\A\\Source::observe();'],[extraUri,extra]]);
 const workspace=new SemanticWorkspace(parser);workspace.setTargetPhpVersion('8.5');
 try{
  for(const [uri,text] of files)workspace.updateDeclarations(uri,text);
  const plan=workspace.moveStaticMethod(sourceUri,source.lastIndexOf('observe(')+1,'B\\Target');
  if(!safe){expect(plan,label).toBeUndefined();return;}
  expect(plan,label).toBeDefined();
  const changed=new Map([...files].map(([uri,text])=>[uri,plan!.edits.filter(edit=>edit.uri===uri)
   .sort((a,b)=>b.start-a.start).reduce((value,edit)=>value.slice(0,edit.start)+edit.newText+value.slice(edit.end),text)]));
  if(targetLink)expect(changed.get(targetUri)).toContain('@see \\B\\Target::observe');
  if(label==='repeated namespace aliases')expect(changed.get(extraUri)).toContain('@see \\B\\Target::observe');
  for(const [uri,text] of files)expect(workspace.source(uri)).toBe(text);
 }finally{workspace.dispose();}
});
it('moves between existing classes in the same file without losing their documented references',()=>{
 const source='<?php namespace A; final class Source {public static function observe(): int {return 1;}} /** @see Source::observe */ final class Target {} function run(): int {return Source::observe();}';
 const workspace=new SemanticWorkspace(parser);workspace.setTargetPhpVersion('8.5');
 try{
  workspace.updateDeclarations(sourceUri,source);
  const plan=workspace.moveStaticMethod(sourceUri,source.indexOf('observe(')+1,'A\\Target');expect(plan).toBeDefined();
  const changed=[...plan!.edits].sort((a,b)=>b.start-a.start).reduce((value,edit)=>value.slice(0,edit.start)+edit.newText+value.slice(edit.end),source);
  expect(changed).toContain('@see \\A\\Target::observe');expect(changed).toContain('return \\A\\Target::observe()');
  const parsed=parser.parse(changed);try{expect(parsed.errors).toEqual([]);}finally{parsed.tree.delete();}
  workspace.update(sourceUri,changed,true);expect(workspace.memberAt(sourceUri,changed.lastIndexOf('observe()')+1)?.fqcn).toBe('A\\Target::observe');
 }finally{workspace.dispose();}
});
