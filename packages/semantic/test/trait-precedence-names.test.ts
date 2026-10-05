import { afterAll, beforeAll, expect, it } from 'vitest';
import { PhpSyntaxParser } from '@php-companion/parser';
import { SemanticWorkspace } from '../src/index.js';
let parser: PhpSyntaxParser;
beforeAll(async () => {parser=await PhpSyntaxParser.createDefault();});
afterAll(() => parser.dispose());
const uri='file:///Consumer.php',origin='file:///Origin.php';
const definitions='<?php namespace Origin; /** @template T */ trait A {/** @param T $value */ public function __construct($value){}} trait B {public function __construct(string $value){}} trait D {public function __construct(bool $value){}}';
const modes=['full','declarations','prepared','restore','restoreDeclaration','restoreSourceDeclaration'] as const;
const cases=[
  ['absolute','namespace Consumer;','\\Origin\\A::__construct insteadof \\Origin\\B,\\Origin\\D'],
  ['qualified','','Origin\\A::__construct insteadof Origin\\B,Origin\\D'],
  ['relative','namespace Origin;','namespace\\A::__construct insteadof namespace\\B,namespace\\D'],
  ['simple','namespace Origin;','A::__construct insteadof B,D'],
  ['comments','namespace Consumer;','\\Origin\\A::__construct /* 😀 */ insteadof /* ; */ \\Origin\\B,\n /* 😀 */ \\Origin\\D'],
] as const;
it.each(cases.flatMap(row=>modes.map(mode=>[...row,mode] as const)))('uses %s precedence in %s / %s after %s', (_name,namespace,clause,mode) => {
  const workspace=new SemanticWorkspace(parser),seed=new SemanticWorkspace(parser);
  const header=`<?php declare(strict_types=1); ${namespace} class C {/** @use \\Origin\\A<int> */ use \\Origin\\A,\\Origin\\B,\\Origin\\D {${clause};}} `;
  const source=header+'new C();';
  try {
    if(mode.startsWith('restore')) {
      seed.update(origin,definitions,true);seed.update(uri,source,true);
      for(const file of [origin,uri])expect(workspace[mode as 'restore'|'restoreDeclaration'|'restoreSourceDeclaration'](mode==='restoreSourceDeclaration'?seed.sourceDeclarationSnapshot(file):seed.snapshot(file),file)).toBe(true);
    } else for(const [file,text] of [[origin,definitions],[uri,source]]) {
      if(mode==='declarations')workspace.updateDeclarations(file!,text!);
      else if(mode==='prepared')workspace.updatePrepared(file!,text!,parser.prepare(text!,file!,true));
      else workspace.update(file!,text!,true);
    }
    const offset=source.indexOf('new C(')+6;
    expect(workspace.signatures(uri,offset)[0]?.parameters[0]?.type).toBe('int');
    expect(workspace.missingRequiredArguments(uri)).toMatchObject([{callable:'Origin\\A::__construct',parameters:['value']}]);
    workspace.update(uri,header+"new C('bad');",true);
    expect(workspace.incompatibleArguments(uri)).toMatchObject([{callable:'Origin\\A::__construct',expectedType:'int'}]);
    workspace.update(uri,header+'new C(42);',true);
    expect(workspace.incompatibleArguments(uri)).toEqual([]);
    const switched=header.replace(clause,clause.replace('A::__construct','B::__construct').replace('B,','A,'));
    workspace.update(uri,switched+'new C(42);',true);
    expect(workspace.signatures(uri,switched.length+6)[0]?.parameters[0]?.type).toBe('string');
    expect(workspace.incompatibleArguments(uri)).toMatchObject([{expectedType:'string'}]);
  } finally {workspace.dispose();seed.dispose();}
});
it.each(['restore','restoreDeclaration','restoreSourceDeclaration'] as const)('rejects stale pre-recovery facts through %s', mode => {
  const workspace=new SemanticWorkspace(parser),target=new SemanticWorkspace(parser);
  try {
    workspace.update(uri,'<?php class C {use \\Origin\\A,\\Origin\\B {\\Origin\\A::__construct insteadof \\Origin\\B;}}',true);
    const snapshot=mode==='restoreSourceDeclaration'?workspace.sourceDeclarationSnapshot(uri)!:workspace.snapshot(uri)!;
    expect(target[mode]({...snapshot,schema:mode==='restoreSourceDeclaration'?4:86},uri)).toBe(false);
    expect(target[mode](snapshot,uri)).toBe(true);
  } finally {workspace.dispose();target.dispose();}
});
