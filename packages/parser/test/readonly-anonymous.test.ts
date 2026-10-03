import {afterAll,beforeAll,expect,it} from 'vitest';
import {PhpSyntaxParser} from '../src/index.js';
let parser:PhpSyntaxParser;
beforeAll(async()=>{parser=await PhpSyntaxParser.createDefault();});
afterAll(()=>parser.dispose());
it.each(['','readonly ','readonly /* trivia */ ','/* readonly */ '])('preserves anonymous readonly declarations and property facts %s',modifier=>{
 const source='<?php $value = new '+modifier+'class { public int $id; public function __construct(public int $version) {} };';
 const full=parser.parse(source,undefined,'file:///Anonymous.php'), declarations=parser.parseDeclarations(source,'file:///Anonymous.php');
 try {
  const owner=full.declarations.find(item=>item.anonymous);expect(owner).toBeDefined();
  const readonly=modifier.startsWith('readonly');expect(owner!.readonlyClass).toBe(readonly);
  expect(declarations.declarations).toEqual(full.declarations);expect(declarations.properties).toEqual(full.properties);
  const properties=full.properties.filter(item=>item.containerFqcn===owner!.fqcn);
  expect(properties.map(item=>({name:item.name,readonly:item.readonly}))).toEqual([{name:'id',readonly},{name:'version',readonly}]);
 } finally {full.tree.delete();declarations.tree.delete();}
});
