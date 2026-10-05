import { afterAll, beforeAll, expect, it } from 'vitest';
import { PhpSyntaxParser } from '@php-companion/parser';
import { SemanticWorkspace } from '../src/index.js';

let parser: PhpSyntaxParser;
beforeAll(async () => { parser = await PhpSyntaxParser.createDefault(); });
afterAll(() => parser.dispose());
const fixtures = [
  ['public', '<?php class C {public $options; public $Options; function read(){return $this->options.$this->Options;}}'],
  ['private', '<?php class C {private $options; private $Options; function read(){return $this->options.$this->Options;}}'],
  ['protected', '<?php class C {protected $options; protected $Options; function read(){return $this->options.$this->Options;}}'],
  ['static', '<?php class C {public static $options; public static $Options; function read(){return self::$options.self::$Options;}}'],
  ['trait', '<?php trait T {public $options; public $Options; function read(){return $this->options.$this->Options;}} class C {use T;} function read(C $c){return $c->options.$c->Options;}'],
  ['promoted', '<?php class C {function __construct(public $options, public $Options){echo $options.$Options;} function read(){return $this->options.$this->Options;}} new C(options:1,Options:2);'],
] as const;
function spans(source: string, name: string): Array<{start:number;end:number}> {
  return [...source.matchAll(new RegExp(`(?<![A-Za-z0-9_])${name}(?![A-Za-z0-9_])`, 'g'))]
    .map(match => ({start:match.index!,end:match.index!+name.length}));
}
it.each(fixtures.flatMap(([kind, source]) => ['options','Options'].flatMap(name => [false,true].map(retain => ({kind,source,name,retain}))))) (
  'keeps $kind $name rename and references distinct, retained=$retain', ({source,name,retain}) => {
    const ws=new SemanticWorkspace(parser),uri='file:///PropertyCase.php',offset=source.indexOf('$'+name)+2;
    try {
      ws.update(uri,source,retain);
      const rename=ws.propertyRename(uri,offset,'settings'); expect(rename).toBeDefined();
      expect(rename!.locations.map(location=>({start:location.start,end:location.end})).sort((a,b)=>a.start-b.start)).toEqual(spans(source,name));
      const refs=ws.references(uri,offset,true);
      expect(refs.map(location=>source.slice(location.start,location.end).replace(/^\$/, ''))).toEqual(refs.map(()=>name));
      expect(refs.map(location=>({start:location.start+(source[location.start]==='$'?1:0),end:location.end})).sort((a,b)=>a.start-b.start)).toEqual(spans(source,name));
      const edited=rename!.locations.slice().sort((a,b)=>b.start-a.start).reduce((text,location)=>text.slice(0,location.start)+'settings'+text.slice(location.end),source);
      const expected=spans(source,name).sort((a,b)=>b.start-a.start).reduce((text,location)=>text.slice(0,location.start)+'settings'+text.slice(location.end),source);
      expect(edited).toBe(expected);
      expect(ws.propertyRename(uri,offset,name==='options'?'Options':'options')).toBeUndefined();
    }finally{ws.dispose();}
  },
);
it.each(['options','Options'].flatMap(name=>[false,true].map(retain=>({name,retain}))))(
  'keeps overridden $name in its exact family, retained=$retain',({name,retain})=>{
    const ws=new SemanticWorkspace(parser),uri='file:///PropertyFamilyCase.php';
    const source='<?php class Base {public $options;public $Options;} class Child extends Base {public $options;public $Options; function read(){return $this->options.$this->Options;}} function read(Base $a,Child $b){return $a->options.$a->Options.$b->options.$b->Options;}';
    try{ws.update(uri,source,retain);const plan=ws.propertyRename(uri,source.indexOf('$'+name)+2,'settings');
      expect(plan).toBeDefined();expect(plan!.locations.map(location=>({start:location.start,end:location.end})).sort((a,b)=>a.start-b.start)).toEqual(spans(source,name));}
    finally{ws.dispose();}
  },
);
it.each(fixtures.filter(([kind])=>kind!=='promoted').map(([kind,source])=>({kind,source})))(
  'allows an unoccupied case-only destination for $kind',({source})=>{
    const ws=new SemanticWorkspace(parser),uri='file:///CaseDestination.php';
    try{ws.update(uri,source,true);expect(ws.propertyRename(uri,source.indexOf('$options')+2,'OPTIONS')).toBeDefined();}
    finally{ws.dispose();}
  },
);
it('does not confuse proven dynamic property names with distinct case',()=>{
  const ws=new SemanticWorkspace(parser),uri='file:///DynamicCase.php';
  const source="<?php class C {public $options;public $Options;} function read(C $c){echo $c->{'options'}.$c->{'Options'};$name='options';echo $c->{$name};}";
  try{ws.update(uri,source,true);const plan=ws.propertyRename(uri,source.indexOf('$options')+2,'settings');
    expect(plan).toBeDefined();expect(plan!.locations.map(location=>source.slice(location.start,location.end))).toEqual(['options','options','options']);
    ws.update('file:///UnknownProperty.php','<?php function unknown($c,$name){echo $c->{$name};}',true);
    expect(ws.propertyRename(uri,source.indexOf('$options')+2,'settings')).toBeUndefined();}
  finally{ws.dispose();}
});
it('retracts reference identity after unsaved case changes',()=>{
 const ws=new SemanticWorkspace(parser),uri='file:///ChangedCase.php';
 try{for(const accessed of ['options','Options','options']){
   const source=`<?php class C {public $options;public $Options;} function read(C $c){return $c->${accessed};}`;ws.update(uri,source,true);
   expect(ws.references(uri,source.indexOf('$options')+2,false).length).toBe(accessed==='options'?1:0);
 }}finally{ws.dispose();}
});
it.each(['options','Options'].flatMap(name=>[false,true].map(retain=>({name,retain}))))(
  'keeps class constant $name references distinct, retained=$retain',({name,retain})=>{
    const ws=new SemanticWorkspace(parser),uri='file:///ConstantCase.php';
    const source='<?php class C {const options=1;const Options=2;} echo C::options+C::Options;';
    try{ws.update(uri,source,retain);expect(ws.references(uri,source.indexOf('const '+name)+7,true).map(location=>({start:location.start,end:location.end})).sort((a,b)=>a.start-b.start)).toEqual(spans(source,name));}
    finally{ws.dispose();}
  },
);
it.each(['One','ONE'].flatMap(name=>[false,true].map(retain=>({name,retain}))))(
  'keeps enum case $name references distinct, retained=$retain',({name,retain})=>{
    const ws=new SemanticWorkspace(parser),uri='file:///EnumCase.php';
    const source='<?php enum E {case One;case ONE;} echo E::One->name.E::ONE->name;';
    try{ws.update(uri,source,retain);expect(ws.references(uri,source.indexOf('case '+name)+6,true).map(location=>({start:location.start,end:location.end})).sort((a,b)=>a.start-b.start)).toEqual(spans(source,name));}
    finally{ws.dispose();}
  },
);
it.each([false,true])('keeps methods case insensitive, retained=%s',retain=>{
 const ws=new SemanticWorkspace(parser),uri='file:///MethodCase.php',source='<?php class C {function read(){}} function useMethod(C $c){$c->read();$c->READ();}';
 try{ws.update(uri,source,retain);const refs=ws.references(uri,source.indexOf('read')+1,true);
   expect(refs.map(location=>source.slice(location.start,location.end))).toEqual(['read','read','READ']);}
 finally{ws.dispose();}
});
