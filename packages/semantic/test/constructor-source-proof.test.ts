import { afterAll, beforeAll, expect, it } from 'vitest';
import { PhpSyntaxParser } from '@php-companion/parser';
import { SemanticWorkspace } from '../src/index.js';
let parser: PhpSyntaxParser;
beforeAll(async () => {parser=await PhpSyntaxParser.createDefault();});
afterAll(() => parser.dispose());
const uri='file:///Consumer.php',origin='file:///Origin/Init.php';
const init='<?php namespace Origin; trait Init {public function __construct(int $value){}}';
const cases: Array<{name:string;source?:string;text:string;extras?:Array<[string,string]>;expected?:string}> = [
  {name:'direct Trait',text:'<?php class C {use \\Origin\\Init;} new C();',expected:'Origin\\Init::__construct'},
  {name:'no parentheses',text:'<?php class C {use \\Origin\\Init;} new C;',expected:'Origin\\Init::__construct'},
  {name:'constructor alias',source:'<?php namespace Origin; trait Init {public function boot(int $value){}}',text:'<?php class C {use \\Origin\\Init {boot as __construct;}} new C();',expected:'Origin\\Init::boot'},
  {name:'nested Trait',extras:[['file:///Origin/Mid.php','<?php namespace Origin; trait Mid {use Init;}']],text:'<?php class C {use \\Origin\\Mid;} new C();',expected:'Origin\\Init::__construct'},
  {name:'inherited Trait',extras:[['file:///Origin/Base.php','<?php namespace Origin; class Base {use Init;}']],text:'<?php class C extends \\Origin\\Base {} new C();',expected:'Origin\\Init::__construct'},
  {name:'unloaded dependency',text:'<?php class C {use \\Origin\\Init,\\Origin\\Missing;} new C();'},
  {name:'conflicting constructors',extras:[['file:///Origin/Other.php','<?php namespace Origin; trait Other {public function __construct(string $text){}}']],text:'<?php class C {use \\Origin\\Init,\\Origin\\Other;} new C();'},
  {name:'duplicate Trait origin',extras:[['file:///Duplicate.php',init]],text:'<?php class C {use \\Origin\\Init;} new C();'},
  {name:'duplicate instantiated type',extras:[['file:///Duplicate.php','<?php class C {use \\Origin\\Init;}']],text:'<?php class C {use \\Origin\\Init;} new C();'},
  {name:'virtual static target',text:'<?php class C {use \\Origin\\Init; public static function make(){return new static();}}'},
  {name:'fixed final static target',text:'<?php final class C {use \\Origin\\Init; public static function make(){return new static();}}',expected:'Origin\\Init::__construct'},
  {name:'Trait-relative target',text:'<?php trait C {use \\Origin\\Init; public function make(){return new self();}}'},
  {name:'hierarchy cycle',extras:[['file:///Origin/Base.php','<?php namespace Origin; class Base extends \\C {public function __construct(int $value){}}']],text:'<?php class C extends \\Origin\\Base {} new C();'},
  {name:'private constructor',source:'<?php namespace Origin; trait Init {private function __construct(int $value){}}',text:'<?php class C {use \\Origin\\Init;} new C();'},
];
it.each(cases.flatMap(item => (['full','restored'] as const).map(mode=>({...item,mode}))))('$name constructor proof from $mode', ({source,text,extras,expected,mode}) => {
  const workspace=new SemanticWorkspace(parser);
  try {
    for(const [file,contents] of [[origin,source??init],...(extras??[]),[uri,text]] as Array<[string,string]>) workspace.update(file,contents,true);
    if(mode === 'restored') {
      const snapshots=[origin,...(extras??[]).map(([file])=>file),uri].map(file=>[file,workspace.sourceDeclarationSnapshot(file)!] as const);
      for(const [file] of snapshots)workspace.remove(file);
      for(const [file,snapshot] of snapshots)expect(workspace.restoreSourceDeclaration(snapshot,file)).toBe(true);
    }
    const missing=workspace.missingRequiredArguments(uri)[0];
    const match=/\bnew\s+([A-Za-z_\\][A-Za-z0-9_\\]*)/u.exec(text)!;
    const start=missing?.start??match.index+match[0].lastIndexOf(match[1]!),end=missing?.end??start+match[1]!.length;
    const proof=workspace.constructorCallSource(uri,start,end,missing?.callable??'Origin\\Init::__construct');
    expect(proof?.signature.fqcn).toBe(expected);
    if(expected){expect(proof?.target.kind).toBe('class');expect(proof?.dependencies.some(type=>type.uri===origin)).toBe(true);}
  } finally {workspace.dispose();}
});
it('associates an argument diagnostic with its outer constructor rather than a nested call sharing its origin', () => {
  const workspace=new SemanticWorkspace(parser);
  const text='<?php class C {use \\Origin\\Init;} class D {use \\Origin\\Init;} new C(new D());';
  try {
    workspace.update(origin,init,true);workspace.update(uri,text,true);
    const argument=workspace.incompatibleArguments(uri).find(item=>item.actualType==='D')!;
    expect(argument).toBeDefined();
    expect(workspace.constructorCallSource(uri,argument.start,argument.end,argument.callable)?.target.fqcn).toBe('C');
    const missing=workspace.missingRequiredArguments(uri).find(item=>text.slice(item.start,item.end)==='D')!;
    expect(workspace.constructorCallSource(uri,missing.start,missing.end,missing.callable)?.target.fqcn).toBe('D');
  } finally {workspace.dispose();}
});
