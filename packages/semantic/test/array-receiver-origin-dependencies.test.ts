import { afterAll, beforeAll, expect, it } from 'vitest';
import { PhpSyntaxParser } from '@php-companion/parser';
import { SemanticWorkspace } from '../src/index.js';

let parser: PhpSyntaxParser;
beforeAll(async () => { parser = await PhpSyntaxParser.createDefault(); }); afterAll(() => parser.dispose());
const cases = [
  ['static local', "$data=Source::$options; $data['mo§'];", ['Source']],
  ['static alias', "$data=Source::$options; $copy=$data; $copy['mo§'];", ['Source']],
  ['parenthesized alias', "$data=(Source::$options); $copy=($data); $copy['mo§'];", ['Source']],
  ['nested local', "$data=Source::$options['payload']; $data['mo§'];", ['Source']],
  ['instance', "$holder=new Source(); $holder->options['mo§'];", ['Source']],
  ['instance local', "$holder=new Source(); $data=$holder->options; $data['mo§'];", ['Source']],
  ['instance alias', "$holder=new Source(); $data=$holder->options; $copy=$data; $copy['mo§'];", ['Source']],
  ['static method', "Source::options()['mo§'];", ['Source']],
  ['static method local', "$data=Source::options(); $data['mo§'];", ['Source']],
  ['instance method', "$holder=new Source(); $holder->options()['mo§'];", ['Source']],
  ['instance method local', "$holder=new Source(); $data=$holder->options(); $data['mo§'];", ['Source']],
  ['conditional origins', "$data=First::$options; if($flag)$data=Second::$options; $data['mo§'];", ['Second', 'First']],
  ['unconditional replacement', "$data=First::$options; $data=Second::$options; $data['mo§'];", ['Second']],
  ['replaced scalar', "$data=Source::$options; $data='other'; $data['mo§'];", []],
  ['unknown replacement', "$data=Source::$options; $data=unknown(); $data['mo§'];", []],
  ['other binding', "$outside=Source::$options; $data=[]; $data['mo§'];", []],
  ['dynamic type', "$data=$type::$options; $data['mo§'];", []],
  ['dynamic property', "$data=Source::${$name}; $data['mo§'];", []],
  ['foreach origin', "$data=Source::$options; foreach($data as $entry){$entry['mo§'];}", ['Source']],
] as const;
it.each(cases.flatMap(([name, body, owners]) => [false, true].map(retain => ({name, body, owners, retain}))))(
  'collects current $name dependencies with retained syntax=$retain', ({body, owners, retain}) => {
    const ws = new SemanticWorkspace(parser), uri='file:///Origin.php', marked=`<?php function read($flag,$type,$name){${body}}`;
    try {
      ws.update(uri,marked.replace('§',''),retain);
      const revision=ws.revision(),snapshot=JSON.stringify(ws.snapshot(uri));
      expect(ws.arrayAccessOwnerTypeNamesAt(uri,marked.indexOf('§'))).toEqual(owners);
      expect(ws.revision()).toBe(revision); expect(JSON.stringify(ws.snapshot(uri))).toBe(snapshot);
    } finally {ws.dispose();}
  },
);
it.each(['closed','unclosed','middle'])('recovers local origin metadata with %s input', state => {
  const ws=new SemanticWorkspace(parser),uri='file:///OriginRecovery.php';
  const marked="<?php function read(){$data=Source::$options; $copy=$data; $copy['mo§"+(state==='closed'?"'];}":state==='middle'?'];}':'');
  try {ws.update(uri,marked.replace('§',''),true);expect(ws.arrayAccessOwnerTypeNamesAt(uri,marked.indexOf('§'))).toEqual(['Source']);}
  finally {ws.dispose();}
});
it('resolves static origins in their actual namespace block',()=>{
 const ws=new SemanticWorkspace(parser),uri='file:///Namespaces.php';
 const marked="<?php namespace A {class Source{}} namespace B {class Source{} function read(){$data=Source::$options;$data['mo§'];}}";
 try{ws.update(uri,marked.replace('§',''),true);expect(ws.arrayAccessOwnerTypeNamesAt(uri,marked.indexOf('§'))).toEqual(['B\\Source']);}
 finally{ws.dispose();}
});
it('does not load origins from a different function',()=>{
 const ws=new SemanticWorkspace(parser),uri='file:///Scope.php';
 const marked="<?php function other(){$data=Source::$options;} function read($data){$data['mo§'];}";
 try{ws.update(uri,marked.replace('§',''),true);expect(ws.arrayAccessOwnerTypeNamesAt(uri,marked.indexOf('§'))).toEqual([]);}finally{ws.dispose();}
});
it.each([16,17])('keeps the existing nesting bound at %s parentheses', count=>{
 const ws=new SemanticWorkspace(parser),uri='file:///Depth.php';
 const expression='('.repeat(count)+'Source::$options'+')'.repeat(count),marked=`<?php function read(){${expression}['mo§'];}`;
 try{ws.update(uri,marked.replace('§',''),true);expect(ws.arrayAccessOwnerTypeNamesAt(uri,marked.indexOf('§'))).toEqual(count===16?['Source']:[]);}finally{ws.dispose();}
});
it.each([16,17])('bounds local origin traversal with %s aliases', count=>{
 const ws=new SemanticWorkspace(parser),uri='file:///AliasDepth.php';
 const aliases=['$a0=Source::$options;',...Array.from({length:count-1},(_,index)=>`$a${index+1}=$a${index};`)].join('');
 const marked=`<?php function read(){${aliases}$a${count-1}['mo§'];}`;
 try{ws.update(uri,marked.replace('§',''),true);expect(ws.arrayAccessOwnerTypeNamesAt(uri,marked.indexOf('§'))).toEqual(count===16?['Source']:[]);}finally{ws.dispose();}
});
it('does not cycle through recursive local origins',()=>{
 const ws=new SemanticWorkspace(parser),uri='file:///Cycle.php',marked="<?php function read(){$first=$second; $second=$first; $first['mo§'];}";
 try{ws.update(uri,marked.replace('§',''),true);expect(ws.arrayAccessOwnerTypeNamesAt(uri,marked.indexOf('§'))).toEqual([]);}finally{ws.dispose();}
});
