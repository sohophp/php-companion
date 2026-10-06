import {afterAll,beforeAll,expect,it} from 'vitest';
import {PhpSyntaxParser} from '@php-companion/parser';
import {SemanticWorkspace} from '../src/index.js';
let parser: PhpSyntaxParser;
beforeAll(async()=>{parser=await PhpSyntaxParser.createDefault();});
afterAll(()=>parser.dispose());
const common='<?php class Row{function name(){}} class Other{function otherOnly(){}} ';
const cases=[
 ['ordinary constructor','class Maker{/** @param-out Row $value */function __construct(&$value){}}','new Maker($v);','Row'],
 ['method template constructor','class Maker{/** @template U of object\n * @param class-string<U> $class\n * @param-out U $value */function __construct(string $class,&$value){}}','new Maker(Row::class,$v);','Row'],
 ['class input template constructor','/** @template T of object */class Maker{/** @param class-string<T> $class\n * @param-out T $value */function __construct(string $class,&$value){}}','new Maker(Row::class,$v);','Row'],
 ['inherited bound constructor','/** @template T */class Base{/** @param-out T $value */function __construct(&$value){}}/** @extends Base<Row> */class Maker extends Base{}','new Maker($v);','Row'],
 ['trait bound constructor','/** @template T */trait Build{/** @param-out T $value */function __construct(&$value){}}class Maker{/** @use Build<Row> */use Build;}','new Maker($v);','Row'],
 ['constructor unbound input','/** @template T of object */class Maker{/** @param class-string<T> $class\n * @param-out T $value */function __construct(string $class,&$value){}}','new Maker($unknown,$v);',undefined],
 ['constructor rejected bound','/** @template T of Other */class Maker{/** @param class-string<T> $class\n * @param-out T $value */function __construct(string $class,&$value){}}','new Maker(Row::class,$v);',undefined],
 ['constructor no name borrowing','class T{} /** @template T */class Maker{/** @param-out T $value */function __construct(&$value){}}','new Maker($v);',undefined],
 ['constructor named output first','/** @template T of object */class Maker{/** @param class-string<T> $class\n * @param-out T $value */function __construct(string $class,&$value){}}','new Maker(value:$v,class:Row::class);','Row'],
 ['constructor unknown output bound','/** @template T of Missing */class Maker{/** @param class-string<T> $class\n * @param-out T $value */function __construct(string $class,&$value){}}','new Maker(Row::class,$v);',undefined],
 ['constructor unused owner template','/** @template T of object\n * @template U */class Maker{/** @param class-string<T> $class\n * @param-out T $value */function __construct(string $class,&$value){}}','new Maker(Row::class,$v);','Row'],
 ['constructor method template bound to owner','/** @template T of object */class Base{/** @template U of T\n * @param class-string<U> $class\n * @param-out U $value */function __construct(string $class,&$value){}}/** @extends Base<Row> */class Maker extends Base{}','new Maker(Row::class,$v);','Row'],
 ['constructor override keeps own output','/** @template T */class Base{/** @param-out T $value */function __construct(&$value){}}/** @extends Base<Row> */class Maker extends Base{/** @param-out Other $value */function __construct(&$value){}}','new Maker($v);','Other'],
 ['constructor duplicate output','class Maker{/** @param-out Row $value */function __construct(&$value){}}','new Maker(value:$v,value:$v);',undefined],
 ['constructor missing required input','/** @template T */class Maker{/** @param class-string<T> $class\n * @param-out T $value */function __construct(string $class,&$value){}}','new Maker(value:$v);',undefined],
 ['constructor conflict inference','/** @template T of object */class Maker{/** @param class-string<T> $first\n * @param class-string<T> $second\n * @param-out T $value */function __construct(string $first,string $second,&$value){}}','new Maker(Row::class,Other::class,$v);',undefined],
 ['inherited constructor conflict','/** @template T */class Base{/** @param-out T $value */function __construct(&$value){}}/** @extends Base<Row>\n * @extends Base<Other> */class Maker extends Base{}','new Maker($v);',undefined],
 ['trait constructor conflict','/** @template T */trait Build{/** @param-out T $value */function __construct(&$value){}}class Maker{/** @use Build<Row>\n * @use Build<Other> */use Build;}','new Maker($v);',undefined],
 ['constructor unknown following call','/** @template T */class Base{/** @param-out T $value */function __construct(&$value){}}/** @extends Base<Row> */class Maker extends Base{}','new Maker($v);unknown($v);',undefined],
 ['constructor self','class Maker{/** @param-out self $value */function __construct(&$value){}}','new Maker($v);','Maker'],
 ['constructor late static','class Base{/** @param-out static $value */function __construct(&$value){}}class Maker extends Base{}','new Maker($v);','Maker'],
 ['private constructor','class Maker{/** @param-out Row $value */private function __construct(&$value){}}','new Maker($v);',undefined],
 ['conditional true','/** @param-out ($mode is true ? Row : int) $value */function make(bool $mode,&$value){}','make(true,$v);','Row'],
 ['conditional false','/** @param-out ($mode is true ? Row : int) $value */function make(bool $mode,&$value){}','make(false,$v);','int'],
 ['conditional native bool','/** @param-out ($mode is true ? Row : int) $value */function make(bool $mode,&$value){}','make($flag,$v);','int|Row'],
 ['conditional default','/** @param-out ($mode is true ? Row : int) $value */function make(&$value,bool $mode=false){}','make($v);','int'],
 ['conditional named later','/** @param-out ($mode is true ? Row : int) $value */function make(bool $mode,&$value){}','make(value:$v,mode:true);','Row'],
 ['conditional nested','/** @param-out ($mode is true ? ($other is true ? Row : Other) : int) $value */function make(bool $mode,bool $other,&$value){}','make(true,false,$v);','Other'],
 ['conditional unknown subject','/** @param-out ($mode is true ? Row : int) $value */function make($mode,&$value){}','make($unknown,$v);',undefined],
 ['conditional missing branch','/** @param-out ($mode is true ? Missing : int) $value */function make(bool $mode,&$value){}','make(true,$v);',undefined],
 ['conditional unselected missing branch','/** @param-out ($mode is true ? Row : Missing) $value */function make(bool $mode,&$value){}','make(true,$v);','Row'],
 ['conditional negated','/** @param-out ($mode is not true ? Row : Other) $value */function make(bool $mode,&$value){}','make(false,$v);','Row'],
 ['conditional weak bool input','/** @param-out ($mode is true ? Row : int) $value */function make(bool $mode,&$value){}','make(1,$v);','int|Row'],
 ['conditional missing required','/** @param-out ($mode is true ? Row : int) $value */function make(bool $mode,&$value){}','make(value:$v);',undefined],
 ['conditional duplicate name','/** @param-out ($mode is true ? Row : int) $value */function make(bool $mode,&$value){}','make(mode:true,mode:false,value:$v);',undefined],
 ['conditional subsequent unknown','/** @param-out ($mode is true ? Row : int) $value */function make(bool $mode,&$value){}','make(true,$v);unknown($v);',undefined],
 ['conditional class literal default','/** @param-out ($class is class-string<Row> ? Row : Other) $value */function make(&$value,string $class=Row::class){}','make($v);','Row'],
 ['conditional class literal input','/** @param-out ($class is class-string<Row> ? Row : Other) $value */function make(string $class,&$value){}','make(Row::class,$v);','Row'],
 ['conditional method','class Api{/** @param-out ($mode is true ? Row : Other) $value */function make(bool $mode,&$value){}}','$api=new Api();$api->make(true,$v);','Row'],
 ['conditional constructor','class Maker{/** @param-out ($mode is true ? Row : Other) $value */function __construct(bool $mode,&$value){}}','new Maker(false,$v);','Other'],
 ['conditional unknown forward reference','/** @param-out ($missing is true ? Row : Other) $value */function make(bool $mode,&$value){}','make(true,$v);',undefined],
 ['conditional variadic fixed default','/** @param-out ($mode is true ? Row : int) $values */function make(bool $mode=false,&...$values){}','make(result:$v);','int'],
 ['variadic unnamed second','/** @param-out Row $values */function make(&...$values){}','make($first,$v,$third);','Row'],
 ['variadic arbitrary named key','/** @param-out Row $values */function make(&...$values){}','make(first:$first,result:$v);','Row'],
 ['variadic duplicate named key','/** @param-out Row $values */function make(&...$values){}','make(result:$first,result:$v);',undefined],
 ['variadic duplicate target keys','/** @param-out Row $values */function make(&...$values){}','make(first:$v,result:$v);',undefined],
 ['variadic missing fixed input','/** @param-out Row $values */function make(int $required,&...$values){}','make(result:$v);',undefined],
 ['variadic unknown subsequent mutation','/** @param-out Row $values */function make(&...$values){}','make($first,$v);unknown($v);',undefined],
 ['variadic generic output','/** @template T of object\n * @param class-string<T> $class\n * @param-out T $values */function make(string $class,&...$values){}','make(Row::class,$first,$v);','Row'],
 ['variadic method','class Api{/** @param-out Row $values */function make(&...$values){}}','$api=new Api();$api->make($first,$v);','Row'],
 ['variadic constructor','class Maker{/** @param-out Row $values */function __construct(&...$values){}}','new Maker($first,$v);','Row'],
 ['variadic unpacked input','/** @param-out Row $values */function make(&...$values){}','make(...$args);',undefined],
 ['callback factory','/** @template T of object\n * @param callable():T $factory\n * @param-out T $value */function make(callable $factory,&$value){}','make(function():Row{return new Row();},$v);','Row'],
 ['callback unknown','/** @template T of object\n * @param callable():T $factory\n * @param-out T $value */function make(callable $factory,&$value){}','make($unknown,$v);',undefined],
 ['callback constructor','class Maker{/** @template T of object\n * @param callable():T $factory\n * @param-out T $value */function __construct(callable $factory,&$value){}}','new Maker(function():Row{return new Row();},$v);','Row'],
 ['variadic outputs','/** @param-out Row $values */function make(&...$values){}','make($v);','Row'],
 ['variadic second output','/** @param-out Row $values */function make(&...$values){}','make($first,$v);','Row'],
 ['variadic duplicate output','/** @param-out Row $values */function make(&...$values){}','make($v,$v);',undefined],
] as const;
for(const retained of [true,false])for(const [name,decl,body,type]of cases)it(`${name}, retained=${retained}`,()=>{
 const w=new SemanticWorkspace(parser),uri='file:///Boundary.php';
 const source=`<?php function run(bool $flag,$unknown){${body}useValue($v);}`;
 try{w.setTargetPhpVersion('8.5');w.update('file:///Definitions.php',common+decl,retained);w.update(uri,source,retained);
 expect(w.variableValueAt(uri,source.lastIndexOf('$v')+1)?.type).toBe(type);
 const memberSource=source.replace('useValue($v)','$v->na');
 w.update(uri,memberSource,retained);
 expect(w.completeMembers(uri,memberSource.indexOf('->na')+4).map(item=>item.name)).toEqual(type==='Row'?['name']:[]);
 }finally{w.dispose();}
});

for (const retained of [true,false]) for (const [label, declaration, call] of [
 ['constructor literal', '/** @template T of object */class Maker{/** @param class-string<T> $class\n * @param-out T $value */function __construct(string $class,&$value){}}','new Maker(Row::class,$v);'],
 ['function literal', '/** @template T of object\n * @param class-string<T> $class\n * @param-out T $values */function make(string $class,&...$values){}','make(Row::class,$first,$v);'],
 ['callback return annotation','class Maker{/** @template T of object\n * @param callable():T $factory\n * @param-out T $value */function __construct(callable $factory,&$value){}}','new Maker(function():Row{return new Row();},$v);'],
 ['inherited output binding','/** @template T */class Base{/** @param-out T $value */function __construct(&$value){}}/** @extends Base<Row> */class Maker extends Base{}','new Maker($v);'],
] as const) it(`loads output dependencies without borrowing a value: ${label}, retained=${retained}`,()=>{
 const w=new SemanticWorkspace(parser),uri='file:///Consumer.php',source='<?php namespace App;function run(){'+call+'$v->na;}';
 try {
  w.setTargetPhpVersion('8.5');w.update(uri,source,retained);
  w.update('file:///Declarations.php','<?php namespace App;'+declaration,retained);
  const offset=source.lastIndexOf('$v')+1;
  expect(w.variableValueOwnerTypeNamesAt(uri,offset)).toContain('App\\Row');
  expect(w.variableValueAt(uri,offset)).toBeUndefined();
  expect(w.completeMembers(uri,source.indexOf('->na')+4)).toEqual([]);
  w.update('file:///Row.php','<?php namespace App;class Row{function name(){}}',retained);
  expect(w.completeMembers(uri,source.indexOf('->na')+4).map(item=>item.name)).toEqual(['name']);
 }finally{w.dispose();}
});
