import {afterAll,beforeAll,expect,it} from 'vitest';
import {PhpSyntaxParser} from '@php-companion/parser';
import {SemanticWorkspace} from '../src/index.js';
let parser:PhpSyntaxParser;
beforeAll(async()=>{parser=await PhpSyntaxParser.createDefault();});
afterAll(()=>parser.dispose());
it('withdraws incompatible anonymous parents after unsaved readonly changes',()=>{
 const workspace=new SemanticWorkspace(parser),uri='file:///Anonymous.php';
 try {
  for(const modifier of ['','readonly ','']) {
   const marked='<?php class BuildMutable {} readonly class BuildReadonly {} $value = new '+modifier+'class extends Build§ {};';
   workspace.update(uri,marked.replace('§',''),true);
   expect(workspace.completeTypes(uri,marked.indexOf('§')).map(item=>item.name)).toEqual([modifier?'BuildReadonly':'BuildMutable']);
  }
 } finally {workspace.dispose();}
});
it.each([
 ['<?php $value = new readonly class { public int $id; }; $value->id = 1;','8.3'],
 ['<?php readonly class State { public int $id; } $value = new State(); $value->id = 1;','8.2'],
 ['<?php class State { public readonly int $id; } $value = new State(); $value->id = 1;','8.1'],
 ['<?php readonly class State { public int $id; } $value = new readonly class extends State {}; $value->id = 1;','8.2'],
] as const)('preserves declaring owner minimum version %s',(source,minimum)=>{
 const workspace=new SemanticWorkspace(parser),uri='file:///Anonymous.php';
 try {workspace.update(uri,source,true);expect(workspace.readonlyPropertyAssignments(uri).map(item=>item.minimumPhpVersion)).toEqual([minimum]);}
 finally {workspace.dispose();}
});
