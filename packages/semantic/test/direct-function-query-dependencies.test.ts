import {afterAll,beforeAll,expect,it} from 'vitest';
import {PhpSyntaxParser} from '@php-companion/parser';
import {SemanticWorkspace} from '../src/index.js';
let parser: PhpSyntaxParser;
beforeAll(async()=>{parser=await PhpSyntaxParser.createDefault();});
afterAll(()=>parser.dispose());
for(const retained of [true,false]){
 it.each([
 ['named callee','<?php namespace App; function run(){ se§ndRow(); }','App\\sendRow'],
 ['argument','<?php namespace App; function run(){ sendRow(§); }','App\\sendRow'],
 ['unclosed EOF','<?php namespace App; function run(){ sendRow(§','App\\sendRow'],
 ['argument bare variable','<?php namespace App; function run(){ sendRow($§); }','App\\sendRow'],
 ['function alias','<?php namespace Client; use function App\\sendRow as deliver; function run(){ deliver(§); }','App\\sendRow'],
 ['namespace alias','<?php namespace Client; use App as Library; function run(){ Library\\sendRow(§); }','App\\sendRow'],
 ['absolute','<?php function run(){ \\App\\sendRow(§); }','App\\sendRow'],
 ['relative','<?php namespace App; function run(){ namespace\\sendRow(§); }','App\\sendRow'],
 ['innermost','<?php namespace App; function outer($a){} function run(){ outer(sendRow(§)); }','App\\sendRow'],
 ['after inner closes','<?php namespace App; function outer($a){} function run(){ outer(sendRow()§); }','App\\outer'],
 ])('collects %s without source mutation, retained='+retained,(_name,marked,expected)=>{
  const w=new SemanticWorkspace(parser);try{const uri='file:///Consumer.php',offset=marked.indexOf('§');w.update('file:///functions.php','<?php namespace App; function sendRow($row){}');w.update(uri,marked.replace('§',''),retained);const revision=w.revision();expect(w.directCallFunctionNamesAt(uri,offset)).toEqual([expected]);expect(w.revision()).toBe(revision);}finally{w.dispose();}
 });
 it.each([
  '<?php function run($fn){ $fn(§); }',
  '<?php function run($row){ $row->sendRow(§); }',
  '<?php function run(){ Row::sendRow(§); }',
  '<?php function run(){ new Row(§); }',
  '<?php function sendRow(§',
  '<?php $fn=function(§',
  '<?php $fn=fn(§',
  '<?php function run(){ if(§',
  '<?php function run(){ /* sendRow(§ */ }',
  '<?php function run(){ "sendRow(§"; }',
  '<?php ?> sendRow(§ <?php',
  '<?php #[Row(§)] function run(){}',
 ])('rejects non function positions, retained='+retained,(marked)=>{const w=new SemanticWorkspace(parser);try{const uri='file:///Negative.php';w.update(uri,marked.replace('§',''),retained);expect(w.directCallFunctionNamesAt(uri,marked.indexOf('§'))).toEqual([]);}finally{w.dispose();}});
 it.each([
  ['native','<?php namespace App; use Model\\Row as R; function sendRow(R $row){}',['Model\\Row']],
  ['documented','<?php namespace App; use Model\\Row as R; /** @param array{row:R} $row */ function sendRow($row){}',['Model\\Row']],
  ['scalar','<?php namespace App; function sendRow(int $row){}',[]],
  ['template','<?php namespace App; /**\n * @template T\n * @param T $row\n */ function sendRow($row){}',[]],
 ])('collects %s parameter sources, retained='+retained,(_name,functions,expected)=>{const w=new SemanticWorkspace(parser);try{const uri='file:///Consumer.php',source='<?php namespace Client; use function App\\sendRow as deliver; function run(){ deliver($); }';w.update('file:///functions.php',functions);w.update(uri,source,retained);expect(w.directFunctionParameterTypeNamesAt(uri,source.indexOf('$);')+1)).toEqual(expected);}finally{w.dispose();}});
 it('source identities remain indexed facts, retained='+retained,()=>{const w=new SemanticWorkspace(parser);try{const uri='file:///functions.php';w.update(uri,'<?php namespace App; function sendRow($row){}',retained);expect(w.functionSourceUrisForNames(['App\\sendRow','App\\missing'])).toEqual([uri]);w.remove(uri);expect(w.functionSourceUrisForNames(['App\\sendRow'])).toEqual([]);}finally{w.dispose();}});

}
