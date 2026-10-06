
import {afterAll,beforeAll,expect,it} from 'vitest';
import {PhpSyntaxParser} from '@php-companion/parser';
import {SemanticWorkspace} from '../src/index.js';
let parser:PhpSyntaxParser;beforeAll(async()=>{parser=await PhpSyntaxParser.createDefault();});afterAll(()=>parser.dispose());
const cases=[
 ['strict scalar mismatch','bool','1',true,undefined],
 ['weak scalar conservative','bool','1',false,'int|Row'],
 ['object to bool','bool','new Other()',false,undefined],
 ['strict object to bool','bool','new Other()',true,undefined],
 ['array to bool','bool','[]',false,undefined],
 ['null to nonnullable','bool','null',false,undefined],
 ['nullable null','?bool','null',false,'int'],
 ['bool true','bool','true',true,'Row'],
 ['bool false','bool','false',true,'int'],
 ['strict literal string','bool',"'yes'",true,undefined],
 ['weak literal string','bool',"'yes'",false,'int|Row'],
 ['known native union mismatch','bool|int','new Other()',false,undefined],
 ['class literal weak bool','bool','Row::class',false,'int|Row'],
 ['class literal strict bool','bool','Row::class',true,undefined],
 ['class literal cannot coerce to int','int','Row::class',false,undefined],
 ['class literal cannot coerce to float','float','Row::class',false,undefined],
 ['range weak bool','bool','$unknown',false,'int|Row','/** @param int<0,10> $unknown */'],
 ['range strict bool','bool','$unknown',true,undefined,'/** @param int<0,10> $unknown */'],
 ['scalar union weak bool','bool','$unknown',false,'int|Row','/** @param int|string $unknown */'],
 ['scalar union strict bool','bool','$unknown',true,undefined,'/** @param int|string $unknown */'],
 ['unknown subject','bool','$unknown',false,undefined],
] as const;
for(const flavor of ['output','return'] as const)for(const retained of [true,false])for(const [name,native,input,strict,type,incoming] of cases)it(`${flavor} ${name} retained=${retained}`,()=>{
 const w=new SemanticWorkspace(parser),uri='file:///Consumer.php';
 const defs='<?php class Row{function name(){}}class Other{function other(){}}/** '+(flavor==='output'?'@param-out ($mode is true ? Row : int) $value':'@return ($mode is true ? Row : int)')+' */function make('+native+' $mode'+(flavor==='output'?',&$value':'')+'){}';
 const text='<?php '+(strict?'declare(strict_types=1);':'')+(incoming??'')+'function run($unknown){'+(flavor==='output'?'make('+input+',$v);':'$v=make('+input+');')+'useValue($v);}';
 try{w.setTargetPhpVersion('8.5');w.update('file:///Definitions.php',defs,retained);w.update(uri,text,retained);
 expect(w.variableValueAt(uri,text.lastIndexOf('$v')+1)?.type).toBe(type);
 const member=text.replace('useValue($v)','$v->na');w.update(uri,member,retained);
 expect(w.completeMembers(uri,member.indexOf('->na')+4).map(item=>item.name)).toEqual(type==='Row'?['name']:[]);
 }finally{w.dispose();}
});
