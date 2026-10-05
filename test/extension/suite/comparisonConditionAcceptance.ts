import assert from 'node:assert/strict';
import * as vscode from 'vscode';
import { pressWorkbenchEnter, pressWorkbenchTab, visibleCompletionLabels } from './c1Ui.js';
import { largeRankingFixture } from './largeRankingFixture.js';
import { largeLocalRankingFixture } from './largeLocalRankingFixture.js';

async function until<T>(read: () => PromiseLike<T>, ready: (value: T) => boolean): Promise<T> {
  const deadline = Date.now() + 20_000;
  while (Date.now() < deadline) { const value = await read(); if (ready(value)) return value; await new Promise(done => setTimeout(done, 50)); }
  throw new Error('Timed out waiting for comparison condition completion acceptance');
}
export async function run(): Promise<void> {
  const core = vscode.extensions.getExtension('sohophp.php-companion'); assert.ok(core); await core.activate();
  const folder = vscode.workspace.workspaceFolders?.[0]; assert.ok(folder);
  const port = Number(process.env.PHP_COMPANION_TEST_C1_DEBUG_PORT); assert.ok(port > 0);
  const declarationDefaults = process.env.PHP_COMPANION_TEST_DECLARATION_DEFAULT_ONLY === '1';
  const defaultCallables = process.env.PHP_COMPANION_TEST_DEFAULT_CALLABLE_ONLY === '1';
  const constantInitializers = process.env.PHP_COMPANION_TEST_CONSTANT_INITIALIZER_ONLY === '1';
  const initializerExpressions = process.env.PHP_COMPANION_TEST_INITIALIZER_EXPRESSION_ONLY === '1';
  const blankInitializers = process.env.PHP_COMPANION_TEST_BLANK_INITIALIZER_ONLY === '1';
  const blankInitializerTypes = process.env.PHP_COMPANION_TEST_BLANK_INITIALIZER_TYPE_ONLY === '1';
  const largeRanking = process.env.PHP_COMPANION_TEST_LARGE_RANKING_ONLY === '1';
  const largeLocalRanking = process.env.PHP_COMPANION_TEST_LARGE_LOCAL_RANKING_ONLY === '1';
  const reassignedParameters = process.env.PHP_COMPANION_TEST_REASSIGNED_PARAMETER_ONLY === '1';
  const flowValues = process.env.PHP_COMPANION_TEST_FLOW_VALUE_ONLY === '1';
  const functionIdentifiers = process.env.PHP_COMPANION_TEST_FUNCTION_IDENTIFIER_ONLY === '1';
  const typeTails = process.env.PHP_COMPANION_TEST_TYPE_TAIL_ONLY === '1';
  const unclosedCallables = process.env.PHP_COMPANION_TEST_UNCLOSED_CALLABLE_ONLY === '1';
  const mixedCallables = process.env.PHP_COMPANION_TEST_MIXED_CALLABLE_ONLY === '1';
  const assignmentComments = process.env.PHP_COMPANION_TEST_ASSIGNMENT_COMMENT_ONLY === '1';
  const assignmentTargets = process.env.PHP_COMPANION_TEST_ASSIGNMENT_TARGET_ONLY === '1';
  const nativeXmlReaders = process.env.PHP_COMPANION_TEST_NATIVE_XML_READER_ONLY === '1';
  const functionLookups = process.env.PHP_COMPANION_TEST_FUNCTION_LOOKUP_ONLY === '1';
  const canonicalConstructions = process.env.PHP_COMPANION_TEST_CANONICAL_CONSTRUCTION_ONLY === '1';
  const traitUseGenerics = process.env.PHP_COMPANION_TEST_TRAIT_USE_GENERIC_ONLY === '1';
  const inheritedConstructors = process.env.PHP_COMPANION_TEST_INHERITED_CONSTRUCTOR_ONLY === '1';
  const traitPhpDocs = process.env.PHP_COMPANION_TEST_TRAIT_PHPDOC_ONLY === '1';
  const traitConstructions = process.env.PHP_COMPANION_TEST_TRAIT_CONSTRUCTION_ONLY === '1';
  const classRelativeConstructions = process.env.PHP_COMPANION_TEST_CLASS_RELATIVE_CONSTRUCTION_ONLY === '1';
  const reflectionConstructions = process.env.PHP_COMPANION_TEST_REFLECTION_CONSTRUCTION_ONLY === '1';
  const unclosedShapes = process.env.PHP_COMPANION_TEST_UNCLOSED_SHAPE_ONLY === '1';
  const blankComments = process.env.PHP_COMPANION_TEST_BLANK_COMMENT_ONLY === '1';
  const shapeComments = process.env.PHP_COMPANION_TEST_SHAPE_COMMENT_ONLY === '1';
  const shapeValues = process.env.PHP_COMPANION_TEST_SHAPE_VALUE_ONLY === '1';
  const namedAttributeValues = process.env.PHP_COMPANION_TEST_NAMED_ATTRIBUTE_VALUE_ONLY === '1';
  const importPrefixes = process.env.PHP_COMPANION_TEST_IMPORT_PREFIX_ONLY === '1';
  const nativeHandles = process.env.PHP_COMPANION_TEST_NATIVE_HANDLE_ONLY === '1';
  const rootImports = process.env.PHP_COMPANION_TEST_ROOT_IMPORT_ONLY === '1';
  const namespaceSeparators = process.env.PHP_COMPANION_TEST_NAMESPACE_SEPARATOR_ONLY === '1';
  const importHeader = '<?php namespace ImportCatalog; class Invoice {} function createInvoice():void{} const API_KEY=1; namespace Consumer; $text="literal;😀"; /* 中文; trivia */\r\n';
  const separatorHeader = '<?php namespace App\\NamespaceUi; function nestedFn():void{} namespace Consumer; ';
  const largeRankingCases = (['function', 'constant', 'method', 'function'] as const).map((kind, index) => {
    const fixture = largeRankingFixture(kind, index === 3 ? 500 : 70);
    return { prefix: kind === 'constant' ? 'OFFER_' : 'offer', label: fixture.target,
      forbidden: 'offerPrivate', addCall: kind !== 'constant',
      marked: fixture.source.slice(0, fixture.offset) + '§' + fixture.source.slice(fixture.offset) };
  });
  const largeLocalCases = (['variable', 'blank', 'construction', 'variable'] as const).map((kind, index) => {
    const fixture = largeLocalRankingFixture(kind, 100, index === 3);
    return { prefix: fixture.prefix, label: fixture.target, forbidden: '$offerOutside', addCall: kind === 'construction',
      marked: fixture.source.slice(0, fixture.offset) + '§' + fixture.source.slice(fixture.offset) };
  });
  const reassignedHeader = '<?php function send(string $value):void{} function run(int $offerA,string $offerZ):string{$offerA="changed";$offerZ=42;';
  const assignmentHeader = '<?php class Child {public bool $flag;} class Holder {public Child $child; /** @var array<int, Child> */ public array $items;} function make():Child{return new Child();} function pickA():string{return "text";} function pickZ():bool{return true;} ';
  const callableHeader = '<?php class User{public function name():string{return "user";}} class View{public function title():string{return "view";}} ';
  const configuredPhpVersion = vscode.workspace.getConfiguration('phpCompanion', folder.uri).get<string>('phpVersion');
  const reflectionNewType = Number(configuredPhpVersion?.replace('.', '')) < 80 ? 'ReflectionType' : 'ReflectionNamedType';
  const cases: Array<{ prefix: string; label: string; forbidden: string; addCall: boolean; marked: string; suffix?: string; consume?: number; hoverVariable?: string; hoverType?: string }> = canonicalConstructions ? [
    {prefix:'$offer',label:'$offerZ',forbidden:'$outside',addCall:false,marked:'<?php declare(strict_types=1); namespace Consumer; class C {use \\Origin\\Init;} function run(string $offerA,int $offerZ){return new C($offer§);}'},
    {prefix:'$offer',label:'$offerZ',forbidden:'$outside',addCall:false,marked:'<?php declare(strict_types=1); namespace Consumer; class C {use \\Origin\\Init {seed as __construct;}} function run(string $offerA,int $offerZ){return new C($offer§);}'},
    {prefix:'$offer',label:'$offerZ',forbidden:'$outside',addCall:false,marked:'<?php declare(strict_types=1); namespace Consumer; class C {use \\Origin\\Mid;} function run(string $offerA,int $offerZ){return new C($offer§);}'},
    {prefix:'$offer',label:'$offerZ',forbidden:'$outside',addCall:false,marked:'<?php declare(strict_types=1); namespace Consumer; class C {/** @use \\Origin\\Init<int> */ use \\Origin\\Init;} function run(string $offerA,int $offerZ){return new C($offer§);}'},
  ] : traitUseGenerics ? [
    {prefix:'$offer',label:'$offerZ',forbidden:'$outside',addCall:false,marked:"<?php namespace Origin; class User {} /** @template T */ trait Box {/** @param T $value */ public function __construct($value){}} namespace Consumer; class User {} class C {/** @use \\Origin\\Box<\\Origin\\User> */ use \\Origin\\Box;} function run(User $offerA,\\Origin\\User $offerZ){new C($offer\u00a7);}"},
    {prefix:'$offer',label:'$offerZ',forbidden:'$outside',addCall:false,marked:"<?php namespace Origin; class User {} /** @template T */ trait Box {/** @param list<T> $value */ public function __construct(array $value){}} namespace Consumer; class User {} class C {/** @use \\Origin\\Box<\\Origin\\User> */ use \\Origin\\Box;} /** @param list<User> $offerA\n * @param list<\\Origin\\User> $offerZ */ function run(array $offerA,array $offerZ){new C($offer\u00a7);}"},
    {prefix:'$offer',label:'$offerZ',forbidden:'$outside',addCall:false,marked:"<?php namespace Origin; class User {} /** @template T */ trait Box {/** @param array{T:T, label:'T'} $value */ public function __construct(array $value){}} namespace Consumer; class User {} class C {/** @use \\Origin\\Box<\\Origin\\User> */ use \\Origin\\Box;} /** @param array{T:User, label:'T'} $offerA\n * @param array{T:\\Origin\\User, label:'T'} $offerZ */ function run(array $offerA,array $offerZ){new C($offer\u00a7);}"},
    {prefix:'$offer',label:'$offerZ',forbidden:'$outside',addCall:false,marked:"<?php namespace Origin; class User {} /** @template T */ trait Box {/** @param T $value */ public function __construct($value){}} /** @template U */ trait Middle {/** @use Box<U> */ use Box;} namespace Consumer; class User {} class C {/** @use \\Origin\\Middle<\\Origin\\User> */ use \\Origin\\Middle;} function run(User $offerA,\\Origin\\User $offerZ){new C($offer\u00a7);}"},
  ] : inheritedConstructors ? [
    {prefix:'$offer',label:'$offerZ',forbidden:'$outside',addCall:false,marked:"<?php namespace Origin; class User {} /** @template T */ class Box {/** @param T $value */ public function __construct($value){}} namespace Consumer; class User {} /** @extends \\Origin\\Box<\\Origin\\User> */ class C extends \\Origin\\Box {} function run(User $offerA,\\Origin\\User $offerZ){new C($offer\u00a7);}"},
    {prefix:'$offer',label:'$offerZ',forbidden:'$outside',addCall:false,marked:"<?php namespace Origin; class User {} /** @template T */ class Box {/** @param list<T> $value */ public function __construct(array $value){}} namespace Consumer; class User {} /** @extends \\Origin\\Box<\\Origin\\User> */ class C extends \\Origin\\Box {} /** @param list<User> $offerA\n * @param list<\\Origin\\User> $offerZ */ function run(array $offerA,array $offerZ){new C($offer\u00a7);}"},
    {prefix:'$offer',label:'$offerZ',forbidden:'$outside',addCall:false,marked:"<?php namespace Origin; class User {} /** @template T */ class Box {/** @param array{T:T, label:'T'} $value */ public function __construct(array $value){}} namespace Consumer; class User {} /** @extends \\Origin\\Box<\\Origin\\User> */ class C extends \\Origin\\Box {} /** @param array{T:User, label:'T'} $offerA\n * @param array{T:\\Origin\\User, label:'T'} $offerZ */ function run(array $offerA,array $offerZ){new C($offer\u00a7);}"},
    {prefix:'$offer',label:'$offerZ',forbidden:'$outside',addCall:false,marked:"<?php namespace Origin; class User {} /** @template T */ class Box {/** @param T $value */ public function __construct($value){}} /** @template U\n * @extends Box<U> */ class Middle extends Box {} namespace Consumer; class User {} /** @extends \\Origin\\Middle<\\Origin\\User> */ class C extends \\Origin\\Middle {} function run(User $offerA,\\Origin\\User $offerZ){new C($offer\u00a7);}"},
  ] : traitPhpDocs ? [
    {prefix:'$offer',label:'$offerZ',forbidden:'',addCall:false,marked:"<?php namespace Origin; class User {} trait Init {/** @param User $value */ public function __construct($value){}} namespace Consumer; class User {} class C {use \\Origin\\Init;} function run(User $offerA,\\Origin\\User $offerZ){return new C($offer§);}"},
    {prefix:'$offer',label:'$offerZ',forbidden:'',addCall:false,marked:"<?php namespace Origin; class User {} trait Init {/** @param list<User> $value */ public function __construct(array $value){}} namespace Consumer; class User {} class C {use \\Origin\\Init;} /** @param list<User> $offerA\n * @param list<\\Origin\\User> $offerZ */ function run(array $offerA,array $offerZ){return new C($offer§);}"},
    {prefix:'$offer',label:'$offerZ',forbidden:'',addCall:false,marked:"<?php namespace Origin; class User {} trait Init {/** @param array{User:User, label:'User'} $value */ public function __construct(array $value){}} namespace Consumer; class User {} class C {use \\Origin\\Init;} /** @param array{User:User, label:'User'} $offerA\n * @param array{User:\\Origin\\User, label:'User'} $offerZ */ function run(array $offerA,array $offerZ){return new C($offer§);}"},
    {prefix:'$offer',label:'$offerZ',forbidden:'',addCall:false,marked:"<?php namespace Origin; class User {} trait Init {/** @template T of User\n * @param T $seed\n * @param T $value */ public function __construct($seed,$value){}} namespace Consumer; class T {} class User {} class C {use \\Origin\\Init;} function run(User $offerA,\\Origin\\User $offerZ){return new C($offerZ,$offer§);}"},
  ] : traitConstructions ? [
    {prefix:'$offer',label:'$offerZ',forbidden:'',addCall:false,marked:'<?php trait Init {public function __construct(int $value){}} class C {use Init;} function run(string $offerA,int $offerZ){return new C($offer§);}'},
    {prefix:'$offer',label:'$offerZ',forbidden:'',addCall:false,marked:'<?php trait Init {public function seed(int $value){}} class C {use Init {seed as __construct;}} function run(string $offerA,int $offerZ){return new C($offer§);}'},
    {prefix:'$offer',label:'$offerZ',forbidden:'',addCall:false,marked:'<?php trait Init {protected function __construct(int $value){}} class Base {use Init;} class C extends Base {public static function make(string $offerA,int $offerZ){return new self($offer§);}}'},
    {prefix:'$offer',label:'$offerZ',forbidden:'',addCall:false,marked:'<?php trait Init {public function __construct(int $value){}} trait Nested {use Init;} class C {use Nested;} function run(string $offerA,int $offerZ){return new C($offer§);}'},
  ] : classRelativeConstructions ? [
    {prefix:'$offer',label:'$offerZ',forbidden:'',addCall:false,
      marked:'<?php class Base {protected function __construct(int $value){}} class Child extends Base {public static function make(string $offerA,int $offerZ){return new self($offer§);}}'},
    {prefix:'$offer',label:'$offerZ',forbidden:'',addCall:false,
      marked:'<?php class Base {protected function __construct(int $value){}} class Child extends Base {public static function make(string $offerA,int $offerZ){return new parent($offer§);}}'},
    {prefix:'$offer',label:'$offerZ',forbidden:'',addCall:false,
      marked:'<?php class Base {protected function __construct(int $value){}} class Child extends Base {public static function make(string $offerA,int $offerZ){return new Base($offer§);}}'},
    {prefix:'$offer',label:'$offerZ',forbidden:'',addCall:false,
      marked:'<?php class Base {protected function __construct(int $value){}} class Middle extends Base {} class Child extends Middle {public static function make(string $offerA,int $offerZ){return new self($offer§);}}'},
  ] : reflectionConstructions ? [
    {prefix:reflectionNewType.slice(0,-1),label:reflectionNewType,forbidden:'',addCall:false,consume:1,marked:`<?php $value=new \\${reflectionNewType.slice(0,-1)}§e();`},
    {prefix:'ReflectionTyp',label:'ReflectionType',forbidden:'',addCall:false,consume:1,marked:'<?php function accepts(\\ReflectionTyp§e $value){}'},
    {prefix:'ReflectionTyp',label:'ReflectionType',forbidden:'',addCall:false,consume:1,marked:'<?php use ReflectionTyp§e;'},
    {prefix:'Selected',label:'SelectedAlias',forbidden:'',addCall:false,consume:5,marked:`<?php use ${reflectionNewType} as SelectedAlias; $value=new Selected§Alias();`},
    {prefix:reflectionNewType.slice(0,-1),label:reflectionNewType,forbidden:'',addCall:true,consume:1,marked:`<?php $value=new \\${reflectionNewType.slice(0,-1)}§e;`},
    {prefix:reflectionNewType.slice(0,-1),label:reflectionNewType,forbidden:'',addCall:true,consume:1,marked:`<?php function consume(object $value){} consume(new /*🙂*/ \\${reflectionNewType.slice(0,-1)}§e);`},
  ] : functionLookups ? [
    {prefix:'na',label:'name',forbidden:'title',addCall:false,consume:2,marked:callableHeader+'/** @param list<User> $users */ function run(array $users){array_map(fn($user)=>$user->na§me(),$users);}'},
    {prefix:'ti',label:'title',forbidden:'name',addCall:false,consume:3,marked:callableHeader+'/** @param list<User> $users */ function run(array $users){$views=array_map(fn($user)=>new View(),$users);$views[0]->ti§tle();}'},
    {prefix:'na',label:'name',forbidden:'title',addCall:false,consume:2,marked:callableHeader+'/** @param callable(User):void $visit */ function visit(callable $visit):void{} visit(fn($user)=>$user->na§me());'},
    {prefix:'na',label:'name',forbidden:'title',addCall:false,consume:2,marked:callableHeader+'/** @param callable(User):void $visit */ function visit(callable $visit):void{} visit(function($user){$user->na§me();});'},
  ] : nativeXmlReaders ? [
    {prefix:'X',label:'XML',forbidden:'__construct',addCall:false,consume:2,marked:'<?php function run(string $source){$reader=new \\XMLReader();$reader->X§ML($source);}'},
    {prefix:'X',label:'XML',forbidden:'__construct',addCall:false,consume:2,marked:'<?php function run(string $source){\\XMLReader::X§ML($source);}'},
    {prefix:'o',label:'open',forbidden:'__construct',addCall:false,consume:3,marked:'<?php class ChildReader extends \\XMLReader {} function run(string $source){$reader=new ChildReader();$reader->o§pen($source);}'},
    {prefix:'o',label:'open',forbidden:'__construct',addCall:false,consume:3,marked:'<?php class ChildReader extends \\XMLReader {} function run(string $source){ChildReader::o§pen($source);}'},
  ] : assignmentTargets ? [
    {prefix:'$offer',label:'$offerZ',forbidden:'$outside',addCall:false,marked:assignmentHeader+'function run(Holder $holder,string $offerA,bool $offerZ){$holder->child->flag=$offer§;}'},
    {prefix:'pick',label:'pickZ',forbidden:'',addCall:true,marked:assignmentHeader+'function run(){make()->flag=pick§;}'},
    {prefix:'tr',label:'true',forbidden:'try',addCall:false,marked:assignmentHeader+'function run(){(make())->flag=tr§;}'},
    {prefix:'$offer',label:'$offerZ',forbidden:'$outside',addCall:false,marked:assignmentHeader+'function run(Holder $holder,string $offerA,bool $offerZ){$holder->items[0]->flag=$offer§;}'},
  ] : flowValues ? [
    {prefix:'$offer',label:'$offerA',forbidden:'$outside',addCall:false,hoverVariable:'$offerA',hoverType:'string',marked:'<?php function send(string $value):void{} function run(?string $offerA,string $offerZ){if($offerA!==null){send($offer§);}}'},
    {prefix:'$offer',label:'$offerA',forbidden:'$outside',addCall:false,hoverVariable:'$offerA',hoverType:'string',marked:'<?php function send(string $value):void{} function run($offerA,string $offerZ){if(is_string($offerA)){send($offer§);}}'},
    {prefix:'$offer',label:'$offerA',forbidden:'$outside',addCall:false,hoverVariable:'$offerA',hoverType:'true',marked:'<?php function send(bool $value):void{} function run(bool $offerA,int $offerZ){if($offerA===true){send($offer§);}}'},
    {prefix:'$offer',label:'$offerZ',forbidden:'$outside',addCall:false,hoverVariable:'$offerA',marked:'<?php function send(string $value):void{} function mutate(&$value):void{} function run(?string $offerA,string $offerZ){if($offerA!==null){mutate($offerA);send($offer§);$offerA;}}'},
    {prefix:'$offer',label:'$offerA',forbidden:'$outside',addCall:false,hoverVariable:'$offerA',hoverType:'string',marked:'<?php function send(string $value):void{} function run(?string $offerA,string $offerZ){if(is_string($offerA)){$call=function($item,&$output=null){};$call($offerA);send($offer§);}}'},
    {prefix:'$offer',label:'$offerZ',forbidden:'$outside',addCall:false,hoverVariable:'$offerA',marked:'<?php function send(string $value):void{} function run(?string $offerA,string $offerZ){if(is_string($offerA)){$call=function(&$item){$item=42;};$call($offerA);send($offer§);$offerA;}}'},
    {prefix:'$offer',label:'$offerZ',forbidden:'$outside',addCall:false,hoverVariable:'$offerA',marked:'<?php function send(string $value):void{} function run(?string $offerA,string $offerZ){if(is_string($offerA)){$call=function()use(&$offerA){$offerA=42;};$call();send($offer§);$offerA;}}'},
    {prefix:'$offer',label:'$offerA',forbidden:'$outside',addCall:false,hoverVariable:'$offerA',hoverType:'string',marked:'<?php function send(string $value):void{} function run(?string $offerA,string $offerZ){if(is_string($offerA)){$call=function()use(&$offerA){$offerA=42;};send($offer§);}}'},
  ] : reassignedParameters ? [
    {prefix:'$offer',label:'$offerA',forbidden:'$offerOutside',addCall:false,marked:reassignedHeader+'send($offer§);}'},
    {prefix:'',label:'$offerA',forbidden:'$offerOutside',addCall:false,marked:reassignedHeader+'send(value: §);}'},
    {prefix:'',label:'$offerA',forbidden:'$offerOutside',addCall:false,marked:reassignedHeader+'return §;}'},
    {prefix:'',label:'$offerA',forbidden:'$offerOutside',addCall:false,marked:'<?php function send(string $value):void{} function run(string $offerA,int $offerZ){$offerA=unknown();send(§);}'},
  ] : largeLocalRanking ? largeLocalCases : largeRanking ? largeRankingCases : blankInitializerTypes ? [
    {prefix:'',label:'false',forbidden:'strlen',addCall:false,marked:'<?php function choose(bool $value = §) {}'},
    {prefix:'',label:'Current::Ready',forbidden:'strlen',addCall:false,marked:'<?php enum Current { case Ready; case Waiting; } function choose(Current $value = /* value */ §) {}'},
    {prefix:'',label:'false',forbidden:'new',addCall:false,marked:'<?php class Host { public bool $value = // value\n §; }'},
    {prefix:'',label:'false',forbidden:'new',addCall:false,marked:'<?php class Host { const bool VALUE = §; }'},
  ] : blankInitializers ? [
    {prefix:'',label:'true',forbidden:'strlen',addCall:false,marked:'<?php function choose($value = §) {}'},
    {prefix:'',label:'true',forbidden:'new',addCall:false,marked:'<?php class Host { public $value = /* default */ §; }'},
    {prefix:'',label:'true',forbidden:'strlen',addCall:false,marked:'<?php const VALUE = // default\n §;'},
    {prefix:'',label:'true',forbidden:'new',addCall:false,marked:'<?php class Host { const VALUE = §; }'},
  ] : namespaceSeparators ? [
    {prefix:'Name',label:'NamespaceUi\\',forbidden:'strlen',addCall:false,marked:separatorHeader+'use App\\Name§spaceUi\\Child;'},
    {prefix:'Name',label:'NamespaceUi\\',forbidden:'strlen',addCall:false,marked:separatorHeader+'use App\\{Name§spaceUi\\Child};'},
    {prefix:'Name',label:'NamespaceUi\\',forbidden:'strlen',addCall:false,marked:separatorHeader+'use function App\\Name§spaceUi\\nestedFn;'},
    {prefix:'Name',label:'NamespaceUi\\',forbidden:'strlen',addCall:false,marked:separatorHeader+'function make(){new \\App\\Name§spaceUi\\Child();}'},
  ] : rootImports ? [
    {prefix:'Shm',label:'Shmop',forbidden:'shmop_open',addCall:false,consume:2,marked:'<?php namespace Consumer; use Shm§op;'},
    {prefix:'ArrayOb',label:'ArrayObject',forbidden:'array_map',addCall:true,consume:4,marked:'<?php namespace Consumer; $value=new \\ArrayOb§ject;'},
    {prefix:'strl',label:'strlen',forbidden:'ArrayObject',addCall:false,consume:2,marked:'<?php namespace Consumer; use function count as Existing, strl§en;'},
    {prefix:'Inv',label:'Invoice',forbidden:'strlen',addCall:false,suffix:'}',consume:5,marked:'<?php namespace RootImportCatalog; class Invoice {} namespace Consumer; use RootImportCatalog\\{/* { ; 中文😀 } */\r\nInv§oice};'},
  ] : nativeHandles ? [
    {prefix:'Sh',label:'Shmop',forbidden:'shmop_open',addCall:false,marked:'<?php function choose(\\Sh§ $value):void{}'},
    {prefix:'XMLP',label:'XMLParser',forbidden:'xml_parser_create',addCall:false,marked:'<?php function choose(\\XMLP§ $value):void{}'},
    {prefix:'Con',label:'Connection',forbidden:'ftp_connect',addCall:false,marked:'<?php function choose():\\FTP\\Con§{}'},
    {prefix:'Lo',label:'Lob',forbidden:'pg_lo_open',addCall:false,marked:'<?php namespace Consumer; use PgSql\\Lo§;'},
  ] : importPrefixes ? [
    {prefix:'Inv',label:'Invoice',forbidden:'createInvoice',addCall:false,marked:importHeader+'use ImportCatalog\\Inv§;'},
    {prefix:'Inv',label:'Invoice',forbidden:'createInvoice',addCall:false,suffix:'}',consume:1,marked:importHeader+'use ImportCatalog\\{Inv§};'},
    {prefix:'crea',label:'createInvoice',forbidden:'API_KEY',addCall:false,suffix:'}',consume:1,marked:importHeader+'use ImportCatalog\\{Invoice, function crea§};'},
    {prefix:'API_',label:'API_KEY',forbidden:'createInvoice',addCall:false,suffix:'}',consume:1,marked:importHeader+'use ImportCatalog\\{function createInvoice, const API_§};'},
  ] : typeTails ? [
    {prefix:'Cur',label:'Current',forbidden:'',addCall:false,
      marked:'<?php class Current {} class Other {} class Host { public Other|Cur§ $value; }'},
    {prefix:'Cur',label:'Current',forbidden:'',addCall:false,
      marked:'<?php class Current {} class Other {} function choose(Other|Cur§ $value):void {}'},
    {prefix:'Cur',label:'Current',forbidden:'',addCall:false,
      marked:'<?php class Current {} class Other {} function choose():Other|Cur§ {return new Current;}'},
    {prefix:'Cur',label:'Current',forbidden:'',addCall:false,
      marked:'<?php class Current {} class Other {} class Host { public function __construct(public Other|Cur§ $value) {} }'},
  ] : mixedCallables ? [
    {prefix:'tr',label:'true',forbidden:'try',addCall:false,
      marked:'<?php ?> <script>const data={a:[1]}; }])</script> <?php function choose():bool{return tr§'},
    {prefix:'',label:'$flag',forbidden:'',addCall:false,
      marked:'<?php function choose(string $text,bool $flag):bool{?> <main>汉字🙂{])</main> <?php return /* value */ §'},
    {prefix:'pick',label:'pickZ',forbidden:'',addCall:true,
      marked:"<?php function pickA($value=null):string{return 'x';} function pickZ($value=null):bool{return true;} $tag='?> {])'; $callback=function():bool{return pick§"},
    {prefix:'tit',label:'title',forbidden:'hidden',addCall:true,
      marked:"<?php class Item{public function title($value=null):string{return 'x';} private function hidden():void{}} function choose(Item $item):string{?> <main>{])</main> <?php return $item->tit§"},
  ] : unclosedCallables ? [
    {prefix:'',label:'$flag',forbidden:'',addCall:false,
      marked:'<?php function choose(string $text,bool $flag):bool{return /* value */ §'},
    {prefix:'tr',label:'true',forbidden:'try',addCall:false,
      marked:'<?php class Host{public function choose(string $text,bool $flag):bool{return /* value */ tr§'},
    {prefix:'pick',label:'pickZ',forbidden:'',addCall:true,
      marked:"<?php function pickA($value=null):string{return 'x';} function pickZ($value=null):bool{return true;} $callback=function():bool{return pick§"},
    {prefix:'',label:'$flag',forbidden:'',addCall:false,
      marked:'<?php $callback=fn(string $text,bool $flag):bool=> /* value */ §'},
  ] : assignmentComments ? [
    {prefix:'pick',label:'pickZ',forbidden:'',addCall:true,
      marked:"<?php function pickA($value=null):string{return 'x';} function pickZ($value=null):bool{return true;} class Builder{public bool $enabled;} function run(Builder $builder){$builder /* owner */ -> enabled /* property */ = pick§;}"},
    {prefix:'pick',label:'pickZ',forbidden:'',addCall:true,
      marked:"<?php function pickA($value=null):string{return 'x';} function pickZ($value=null):bool{return true;} class Builder{public static bool $enabled;} function run(){Builder /* owner */ :: $enabled /* property */ = pick§;}"},
    {prefix:'pick',label:'pickZ',forbidden:'',addCall:true,
      marked:"<?php function pickA($value=null):string{return 'x';} function pickZ($value=null):bool{return true;} function run(bool $assigned){$assigned /* variable */ = pick§;}"},
    {prefix:'pick',label:'pickZ',forbidden:'',addCall:true,
      marked:"<?php function pickA($value=null):string{return 'x';} function pickZ($value=null):bool{return true;} class Builder{public bool $enabled{set(bool $value){}}} function run(Builder $builder){$builder /* owner */ -> enabled /* property */ = pick§;}"},
  ] : unclosedShapes ? [
    {prefix:'shapePick',label:'shapePickZ',forbidden:'',addCall:true,
      marked:"<?php function shapePickA($value=null):string{return 'x';} function shapePickZ($value=null):bool{return true;} /** @param array{enabled:bool} $config */ function send(array $config):void{} send(['enabled'=>shapePick§"},
    {prefix:'tr',label:'true',forbidden:'try',addCall:false,
      marked:"<?php /** @param array{enabled:bool} $config */ function send(array $config):void{} send(['enabled'=> /* value */ tr§"},
    {prefix:'shapePick',label:'shapePickZ',forbidden:'',addCall:true,
      marked:"<?php function shapePickA($value=null):string{return 'x';} function shapePickZ($value=null):bool{return true;} /** @param array{nested:array{enabled:bool}} $config */ function send(array $config):void{} send(['nested'=>['enabled'=>shapePick§"},
    {prefix:'shapePick',label:'shapePickA',forbidden:'',addCall:true,
      marked:"<?php function shapePickA($value=null):string{return 'x';} function shapePickZ($value=null):bool{return true;} function inner(string $value):void{} /** @param array{enabled:bool} $config */ function send(array $config):void{} send(['enabled'=>inner(shapePick§"},
  ] : blankComments ? [
    {prefix:'',label:'$shapeZBool',forbidden:'',addCall:false,
      marked:"<?php /** @param array{enabled:bool} $config */ function send(array $config):void{} function run(string $shapeAText,bool $shapeZBool){send(['enabled'=> /* value */ §]);}"},
    {prefix:'',label:'$shapeZBool',forbidden:'',addCall:false,
      marked:"<?php function run(string $shapeAText,bool $shapeZBool):bool{return /* value */ §;}"},
    {prefix:'',label:'$shapeZBool',forbidden:'',addCall:false,
      marked:"<?php function inner(bool $flag):void{} function run(string $shapeAText,bool $shapeZBool){inner(/* value */ §);}"},
    {prefix:'',label:'$shapeZBool',forbidden:'flag:',addCall:false,
      marked:"<?php function inner(bool $flag):void{} function run(string $shapeAText,bool $shapeZBool){inner(flag: /* value */ §);}"},
  ] : shapeComments ? [
    {prefix:'shapePick',label:'shapePickZ',forbidden:'',addCall:true,
      marked:"<?php function shapePickA($value=null):string{return 'x';} function shapePickZ($value=null):bool{return true;} /** @param array{enabled:bool} $config */ function send(array $config):void{} send(['enabled' /* key */ => /* value */ shapePick§]);"},
    {prefix:'tr',label:'true',forbidden:'try',addCall:false,
      marked:"<?php /** @param array{enabled:bool} $config */ function send(array $config):void{} send(['enabled' // key\n => tr§]);"},
    {prefix:'tr',label:'true',forbidden:'try',addCall:false,
      marked:"<?php /** @param array{nested:array{enabled:bool}} $config */ function send(array $config):void{} send(['nested' /* key */ => ['enabled' => /* value */ tr§]]);"},
    {prefix:'PICK_',label:'PICK_Z_BOOL',forbidden:'',addCall:false,
      marked:"<?php const PICK_A_TEXT='x', PICK_Z_BOOL=true; /** @param array{enabled:bool} $config */ function send(array $config):void{} send(['enabled' /* key */ => PICK_§]);"},
  ] : shapeValues ? [
    {prefix:'shapePick',label:'shapePickZ',forbidden:'',addCall:true,
      marked:"<?php function shapePickA($value=null):string{return 'x';} function shapePickZ($value=null):bool{return true;} /** @param array{enabled:bool} $config */ function send(array $config):void{} send(['enabled'=>shapePick§]);"},
    {prefix:'PICK_',label:'PICK_Z_BOOL',forbidden:'',addCall:false,
      marked:"<?php const PICK_A_TEXT='x', PICK_Z_BOOL=true; /** @param array{enabled:bool} $config */ function send(array $config):void{} send(['enabled'=>PICK_§]);"},
    {prefix:'tr',label:'true',forbidden:'try',addCall:false,
      marked:"<?php /** @param array{enabled:bool} $config */ function send(array $config):void{} send(['enabled'=>(tr§)]);"},
    {prefix:'tr',label:'true',forbidden:'try',addCall:false,
      marked:"<?php /** @param array{enabled:bool} $config */ function send(array $config):void{} function inner(bool $value):bool{return $value;} send(['enabled'=>inner(tr§)]);"},
  ] : namedAttributeValues ? [
    {prefix:'tr',label:'true',forbidden:'flag:',addCall:false,
      marked:'<?php #[\\Attribute] class Host { public function __construct(string $text, bool $flag) {} } #[Host(flag: (tr§), text: "x")] class Tagged {}'},
    {prefix:'tr',label:'true',forbidden:'flag:',addCall:false,
      marked:'<?php #[\\Attribute] class Host { public function __construct(string $text, bool $flag) {} } #[Host /* ctor */ (flag: tr§, text: "x")] class Tagged {}'},
    {prefix:'rea',label:'Current::Ready',forbidden:'state:',addCall:false,
      marked:'<?php enum Current { case Ready; } #[\\Attribute] class Host { public function __construct(string $text, Current $state) {} } #[Host(state: rea§, text: "x")] class Tagged {}'},
    {prefix:'PICK_',label:'PICK_FLAG',forbidden:'flag:',addCall:false,
      marked:'<?php const PICK_TEXT = "x", PICK_FLAG = true; #[\\Attribute] class Host { public function __construct(bool $flag) {} } #[Host(flag: PICK_§)] class Tagged {}'},
  ] : functionIdentifiers ? [
    {prefix:'demo2',label:'demo2',forbidden:'',addCall:true,
      marked:'<?php function demo2($value = null) {} demo2§;'},
    {prefix:'demo2',label:'demo2_optional',forbidden:'',addCall:true,consume:'_optional'.length,
      marked:'<?php function demo2_optional($value = null) {} demo2§_optional;'},
    {prefix:'méth',label:'méthode2',forbidden:'throw',addCall:true,consume:'ode2'.length,
      marked:'<?php function méthode2($value = null) {} méth§ode2;'},
    {prefix:'demo2',label:'demo2_optional',forbidden:'',addCall:false,
      suffix:' /* before */ (/* inside */...)',consume:'_optional /* before */ (/* inside */)'.length,
      marked:'<?php function demo2_optional($value = null) {} const CALLBACK = demo2§_optional /* before */ (/* inside */);'},
  ] : initializerExpressions ? [
    {prefix:'strl',label:'strlen',forbidden:'',addCall:false,suffix:'(...)',
      marked:'<?php const CALLBACK = strl§;'},
    {prefix:'strl',label:'strlen',forbidden:'',addCall:false,suffix:'(...)',
      marked:'<?php #[Attr(strl§)] class Host {}'},
    {prefix:'tar',label:'target',forbidden:'',addCall:false,suffix:'(...)',
      marked:'<?php class Host { private static function target() {} const CALLBACK = self::tar§; }'},
    {prefix:'phpv',label:'phpversion',forbidden:'',addCall:true,
      marked:'<?php function choose() { static $value = phpv§; }'},
  ] : constantInitializers ? [
    {prefix:'tr',label:'true',forbidden:'readonly',addCall:false,
      marked:'<?php class Host { const bool VALUE = /* value */ tr§; }'},
    {prefix:'PICK_',label:'PICK_TEXT',forbidden:'',addCall:false,
      marked:'<?php const PICK_BOOL = true, PICK_TEXT = "ready"; class Host { const string VALUE = PICK_§; }'},
    {prefix:'PICK_',label:'PICK_INT',forbidden:'',addCall:false,
      marked:'<?php const PICK_BOOL = true, PICK_INT = 1, PICK_TEXT = "ready"; enum Current: int { case Ready = PICK_§; }'},
    {prefix:'PICK_',label:'PICK_TEXT',forbidden:'',addCall:false,
      marked:'<?php const PICK_BOOL = true, PICK_INT = 1, PICK_TEXT = "ready"; enum Current: string { case Ready = PICK_§; }'},
  ] : defaultCallables ? [
    {prefix:'strl',label:'strlen',forbidden:'',addCall:false,suffix:'(...)',
      marked:'<?php function choose($callback = strl§) {}'},
    {prefix:'strl',label:'strlen',forbidden:'',addCall:false,suffix:'(...)',
      marked:'<?php class Host { public $callback = strl§; }'},
    {prefix:'tar',label:'target',forbidden:'',addCall:false,suffix:'(...)',
      marked:'<?php class Host { private static function target() {} public $callback = self::tar§; }'},
    {prefix:'strl',label:'strlen',forbidden:'',addCall:false,suffix:'(...)',consume:2,
      marked:'<?php function choose($callback = strl§()) {}'},
  ] : declarationDefaults ? [
    {prefix:'tr',label:'true',forbidden:'try',addCall:false,
      marked:'<?php function choose(bool $flag = tr§): void {}'},
    {prefix:'fa',label:'false',forbidden:'',addCall:false,
      marked:'<?php class Host { public bool $flag = fa§; }'},
    {prefix:'rea',label:'Current::Ready',forbidden:'',addCall:false,
      marked:'<?php enum Current { case Ready; } class Host { public Current $state = rea§; }'},
    {prefix:'tr',label:'true',forbidden:'try',addCall:false,
      marked:'<?php class Host { public function __construct(public bool $flag = tr§) {} }'},
  ] : [
    {prefix:'rea',label:'Current::Ready',forbidden:'try',addCall:false,
      marked:'<?php enum Current { case Ready; } function choose(Current $status): string { return match($status) { rea§ => "yes", default => "no" }; }'},
    {prefix:'rea',label:'Current::Ready',forbidden:'try',addCall:false,
      marked:'<?php enum Current { case Ready; } function choose(Current $status): string { switch($status) { case rea§: return "yes"; default: return "no"; } }'},
    {prefix:'tr',label:'true',forbidden:'try',addCall:false,
      marked:'<?php function choose(bool $status): string { switch($status) { case tr§: return "yes"; default: return "no"; } }'},
    {prefix:'tr',label:'true',forbidden:'try',addCall:false,
      marked:'<?php function choose(bool $status): string { return match($status) { tr§ => "yes", default => "no" }; }'},
  ];
  const results: object[] = [];
  for (const item of cases) for (const key of ['Enter', 'Tab'] as const) {
    const constructorSources: Array<{ name: string; source: string }> = [];
    console.log('Comparison condition case: ' + JSON.stringify({ index: cases.indexOf(item), key, marked: item.marked }));
    const uri = vscode.Uri.joinPath(folder.uri, 'src', `ComparisonCondition${cases.indexOf(item)}${key}.php`);
    const suffix = `${cases.indexOf(item)}${key}`;
    let marked = item.marked.replace(/\b(Current|choose|Host|CALLBACK)\b/g, name => `${name}${suffix}`)
      .replaceAll('PICK_', `PICK${suffix}_`);
    if (importPrefixes) marked = marked.replaceAll('ImportCatalog', `ImportCatalog${suffix}`);
    if (rootImports) marked = marked.replaceAll('RootImportCatalog', `RootImportCatalog${suffix}`);
    if (namespaceSeparators) {
      marked = marked.replaceAll('Name§spaceUi', `Name§spaceUi${suffix}`)
        .replace(/\bNamespaceUi\b/gu, `NamespaceUi${suffix}`)
        .replaceAll('App\\', `App\\SeparatorGate${suffix}\\`);
      const directory = vscode.Uri.joinPath(folder.uri, 'src', `SeparatorGate${suffix}`, `NamespaceUi${suffix}`);
      await vscode.workspace.fs.createDirectory(directory);
      await vscode.workspace.fs.writeFile(vscode.Uri.joinPath(directory, 'Child.php'),
        Buffer.from(`<?php namespace App\\SeparatorGate${suffix}\\NamespaceUi${suffix}; class Child {}`));
    }
    if (canonicalConstructions) {
      const namespace = `App\\CanonicalGate${suffix}`, directory = vscode.Uri.joinPath(folder.uri,'src',`CanonicalGate${suffix}`);
      await vscode.workspace.fs.createDirectory(directory);
      const index = cases.indexOf(item);
      const init = `<?php namespace ${namespace}; ${index === 3 ? '/** @template T */ ' : ''}trait Init {${index === 3 ? '/** @param T $value */ ' : ''}public function ${index === 1 ? 'seed' : '__construct'}(${index === 3 ? '' : 'int '}$value){}}`;
      constructorSources.push({name:'Init',source:init});
      const initUri = vscode.Uri.joinPath(directory,'Init.php');
      await vscode.workspace.fs.writeFile(initUri,Buffer.from(init)); await vscode.workspace.openTextDocument(initUri);
      await vscode.commands.executeCommand('vscode.executeDocumentSymbolProvider',initUri);
      if(index === 2) {
        const midUri=vscode.Uri.joinPath(directory,'Mid.php');
        const midSource=`<?php namespace ${namespace}; trait Mid {use Init;}`;
        constructorSources.push({name:'Mid',source:midSource});
        await vscode.workspace.fs.writeFile(midUri,Buffer.from(midSource));
        await vscode.workspace.openTextDocument(midUri); await vscode.commands.executeCommand('vscode.executeDocumentSymbolProvider',midUri);
      }
      marked = marked.replace('namespace Consumer;',`namespace App\\CallerGate${suffix};`).replaceAll('Origin\\',`${namespace}\\`);
    }
    if (traitPhpDocs || inheritedConstructors || traitUseGenerics) marked = marked.replaceAll('namespace Origin;',`namespace OriginGate${suffix};`)
      .replaceAll('namespace Consumer;',`namespace ConsumerGate${suffix};`).replaceAll('Origin\\',`OriginGate${suffix}\\`);
    if (classRelativeConstructions || traitConstructions) marked = marked.replace('<?php ', `<?php namespace ConstructionGate${suffix}; `);
    if (typeTails) marked = marked.replace('<?php ', `<?php namespace TypeTailGate${suffix}; `);
    if (shapeValues || shapeComments || blankComments || unclosedShapes || assignmentComments || assignmentTargets || nativeXmlReaders || functionLookups || unclosedCallables || mixedCallables) marked = marked.replace('<?php ', `<?php namespace ShapeGate${suffix}; `);
    if (functionIdentifiers) marked = marked.replace('<?php ', `<?php namespace FunctionGate${suffix}; `);
    if (blankInitializers || blankInitializerTypes) marked = marked.replace('<?php ', `<?php namespace BlankInitializerGate${suffix}; `);
    if (largeRanking || largeLocalRanking || reassignedParameters || flowValues) marked = marked.replace('<?php ', `<?php namespace LargeRankingGate${suffix}; `);
    const offset = marked.indexOf('§'); const source = marked.replace('§', '');
    const label = item.label.replace('Current', `Current${suffix}`).replace('PICK_', `PICK${suffix}_`)
      .replace('NamespaceUi', `NamespaceUi${suffix}`);
    const prefix = item.prefix.replace('PICK_', `PICK${suffix}_`);
    const consume = namespaceSeparators ? /^[A-Za-z0-9_]+\\/u.exec(source.slice(offset))?.[0].length : item.consume ?? 0;
    if (namespaceSeparators) assert.ok(consume, 'Namespace fixture must retain a word suffix and separator');
    const accepted = source.slice(0, offset - prefix.length) + label + (item.suffix ?? (item.addCall ? '()' : '')) + source.slice(offset + (consume ?? 0));
    await vscode.workspace.fs.writeFile(uri, Buffer.from(source));
    const document = await vscode.workspace.openTextDocument(uri); const editor = await vscode.window.showTextDocument(document);
    if (canonicalConstructions) {
      const replace = async (text: string): Promise<void> => {
        assert.equal(await editor.edit(edit => edit.replace(new vscode.Range(document.positionAt(0),document.positionAt(document.getText().length)),text)),true);
      };
      const codes = (): string[] => vscode.languages.getDiagnostics(uri).map(diagnostic => typeof diagnostic.code === 'object' ? String(diagnostic.code.value) : String(diagnostic.code));
      await replace(source.replace('new C($offer)','new C()'));
      await until(async () => codes(),values => values.filter(code => code === 'php.argument.missing-required').length === 1);
      await replace(source.replace('new C($offer)',"new C('wrong')"));
      await until(async () => codes(),values => values.filter(code => code === 'php.argument.type-mismatch').length === 1 && !values.includes('php.argument.missing-required'));
      await replace(source);
      await until(async () => codes(),values => !values.includes('php.argument.type-mismatch') && !values.includes('php.argument.missing-required'));
    }
    const position = document.positionAt(offset); editor.selection = new vscode.Selection(position, position);
    const provided = await until(() => vscode.commands.executeCommand<vscode.CompletionList>('vscode.executeCompletionItemProvider', uri, position),
      list => list?.items.some(value => value.label === label) === true);
    console.log('Comparison provided target: ' + JSON.stringify(provided.items.find(value => value.label === label)));
    if (item.forbidden) assert.equal(provided.items.some(value => value.label === item.forbidden), false);
    if (classRelativeConstructions || traitConstructions || traitPhpDocs || inheritedConstructors || traitUseGenerics || canonicalConstructions) {
      const help = await vscode.commands.executeCommand<vscode.SignatureHelp>('vscode.executeSignatureHelpProvider', uri, position);
      assert.ok(help?.signatures.some(value => value.label.includes('$value')));
    }
    await vscode.commands.executeCommand('workbench.action.focusActiveEditorGroup');
    const visibleStarted = Date.now();
    await vscode.commands.executeCommand('editor.action.triggerSuggest');
    let lastLabels: string[] = [];
    const labels = await until(async () => { const next = await visibleCompletionLabels(port); if (JSON.stringify(next) !== JSON.stringify(lastLabels)) console.log('Comparison visible labels: ' + JSON.stringify(next)); lastLabels = next; return lastLabels; }, values => values.some(value => value.startsWith(label)));
    if (item.forbidden) assert.equal(labels.some(value => value.startsWith(item.forbidden)), false);
    const visibleMs = Date.now() - visibleStarted;
    const visibleIndex = labels.findIndex(value => value.startsWith(label));
    if (blankInitializers) {
      assert.equal(labels[0], 'array');
      assert.ok(visibleIndex > 0, `Expected visible literal ${label}, got ${JSON.stringify(labels)}`);
      for (let index = 0; index < visibleIndex; index++) await vscode.commands.executeCommand('selectNextSuggestion');
    } else assert.equal(visibleIndex, 0, `Expected first visible candidate ${label}, got ${JSON.stringify(labels)}`);
    if (key === 'Enter') await pressWorkbenchEnter(port); else await pressWorkbenchTab(port);
    await until(async () => document.getText(), text => text === accepted);
    if (item.hoverVariable) {
      const hoverOffset = accepted.lastIndexOf(item.hoverVariable);
      const hovers = await vscode.commands.executeCommand<vscode.Hover[]>('vscode.executeHoverProvider', uri, document.positionAt(hoverOffset));
      if (item.hoverType) assert.ok(hovers?.some(hover => hover.contents.some(content =>
        typeof content === 'string' ? content.includes(`${item.hoverVariable}: ${item.hoverType}`)
          : 'value' in content && content.value.includes(`${item.hoverVariable}: ${item.hoverType}`))));
      else assert.equal(hovers?.length ?? 0, 0);
    }
    const caretExtra = (rootImports || importPrefixes) && item.suffix === '}' ? 0 : item.suffix?.length ?? (item.addCall ? largeRanking || assignmentTargets ? 2 : 1 : 0);
    assert.equal(document.offsetAt(editor.selection.active), offset - prefix.length + label.length + caretExtra);
    assert.equal(editor.selection.isEmpty, true);
    await vscode.commands.executeCommand('undo'); await until(async () => document.getText(), text => text === source);
    await vscode.commands.executeCommand('redo'); await until(async () => document.getText(), text => text === accepted);
    assert.equal(Buffer.from(await vscode.workspace.fs.readFile(uri)).toString(), source);
    results.push({ label, key, visibleMs, visibleLabels: labels, acceptedText: accepted,
      ...(canonicalConstructions ? { constructorDiagnostics: { missingWithdrawn: true, mismatchWithdrawn: true }, sourceDependencies: constructorSources } : {}),
      ...(item.hoverVariable ? { hover: { variable: item.hoverVariable, type: item.hoverType ?? null, checked: true } } : {}),
      caretOffset: document.offsetAt(editor.selection.active), exactText: true, caretMatched: true, addCall: item.addCall, undoRedo: true, diskUnchanged: true });
  }
  console.log('Comparison condition acceptance proof: ' + JSON.stringify({ platform: process.platform,
    context: canonicalConstructions ? `canonical-construction-${configuredPhpVersion}` : traitUseGenerics ? `trait-use-generics-${configuredPhpVersion}` : inheritedConstructors ? `inherited-construction-${configuredPhpVersion}` : traitPhpDocs ? `trait-phpdoc-${configuredPhpVersion}` : traitConstructions ? `trait-construction-${configuredPhpVersion}` : classRelativeConstructions ? `class-relative-construction-${configuredPhpVersion}` : reflectionConstructions ? `reflection-construction-${configuredPhpVersion}` : functionLookups ? 'contextual-callable-function-lookups' : nativeXmlReaders ? 'native-xmlreader-invocations' : assignmentTargets ? 'assignment-target-values' : flowValues ? 'control-flow-variable-values' : reassignedParameters ? 'reassigned-parameter-values' : largeLocalRanking ? 'large-local-and-construction-ranking' : largeRanking ? 'large-candidate-type-ranking' : blankInitializerTypes ? 'blank-initializer-native-types' : blankInitializers ? 'blank-initializers' : namespaceSeparators ? 'namespace-separators-and-middle-word-ranges' : rootImports ? 'root-imports-and-middle-word-ranges' : nativeHandles ? 'native-handle-type-references' : mixedCallables ? 'mixed-callable-values' : unclosedCallables ? 'unclosed-callable-values' : assignmentComments ? 'assignment-comment-values' : unclosedShapes ? 'unclosed-shape-values' : blankComments ? 'blank-comment-variables' : shapeComments ? 'shape-comment-values' : typeTails ? 'composite-type-positions' : shapeValues ? 'shape-field-values' : namedAttributeValues ? 'named-attribute-values' : functionIdentifiers ? 'function-identifiers' : initializerExpressions ? 'initializer-expressions' : constantInitializers ? 'constant-initializers'
      : defaultCallables ? 'declaration-callables' : declarationDefaults ? 'declaration-defaults' : 'comparison-conditions', results }));
}
