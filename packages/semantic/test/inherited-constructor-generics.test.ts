import { afterAll, beforeAll, expect, it } from 'vitest';
import { PhpSyntaxParser } from '@php-companion/parser';
import { SemanticWorkspace } from '../src/index.js';
let parser: PhpSyntaxParser;
beforeAll(async () => { parser = await PhpSyntaxParser.createDefault(); });
afterAll(() => parser.dispose());
const uri = 'file:///Consumer.php', origin = 'file:///Origin.php';
const cases = [
  ['name', 'T', '\\Origin\\User', 'new \\Origin\\User()', 'new User()'],
  ['nullable', '?T', '?\\Origin\\User', 'null', 'new User()'],
  ['array', 'T[]', '\\Origin\\User[]', '[new \\Origin\\User()]', '[new User()]'],
  ['list', 'list<T>', 'list<\\Origin\\User>', '[new \\Origin\\User()]', '[new User()]'],
  ['shape', "array{T:T, label:'T'}", "array{T:\\Origin\\User, label:'T'}", "['T'=>new \\Origin\\User(),'label'=>'T']", "['T'=>new User(),'label'=>'T']"],
  ['class-string', 'class-string<T>', 'class-string<\\Origin\\User>', '\\Origin\\User::class', 'User::class'],
  ['callback', 'callable(T $T):T', 'callable(\\Origin\\User $T):\\Origin\\User', 'function(\\Origin\\User $T):\\Origin\\User{return $T;}', 'function(User $T):User{return $T;}'],
] as const;
it.each(cases)('specializes inherited %s constructor arguments without rewriting non-type names', (_name, type, expected, good, bad) => {
  const workspace = new SemanticWorkspace(parser);
  const consumer = '<?php namespace Consumer; class User {} /** @extends \\Origin\\Box<\\Origin\\User> */ class C extends \\Origin\\Box {}';
  try {
    workspace.update(origin, `<?php namespace Origin; class User {} /** @template T */ class Box {/** @param ${type} $value */ public function __construct($value){}}`, true);
    workspace.update(uri, consumer+` new C(${good});`, true);
    expect(workspace.signatures(uri, consumer.length+7)[0]?.parameters[0]?.type).toBe(expected);
    expect(workspace.incompatibleArguments(uri)).toEqual([]);
    workspace.update(uri, consumer+` new C(${bad});`, true);
    expect(workspace.incompatibleArguments(uri)).toMatchObject([{ parameter: 'value' }]);
  } finally { workspace.dispose(); }
});
it('ranks proven generic constructor values first and retains incompatible variables', () => {
  const workspace = new SemanticWorkspace(parser);
  try {
    const marked = '<?php namespace Origin; class User {} /** @template T */ class Box {/** @param T $value */ public function __construct($value){}} namespace Consumer; class User {} /** @extends \\Origin\\Box<\\Origin\\User> */ class C extends \\Origin\\Box {} function run(User $offerA,\\Origin\\User $offerZ){new C($offer§);}';
    workspace.update(uri, marked.replace('§', ''), true);
    const candidates = workspace.completeVariables(uri, marked.indexOf('§'))?.names ?? [];
    expect(candidates[0]).toBe('$offerZ');
    expect(candidates.includes('$offerA')).toBe(true);
  } finally { workspace.dispose(); }
});
it('propagates two levels of generic inheritance in the child declaration import scope', () => {
  const workspace = new SemanticWorkspace(parser);
  try {
    workspace.update(origin, '<?php namespace Origin; class User {} /** @template T */ class Box {/** @param T $value */ public function __construct($value){}} /** @template U\n * @extends Box<U> */ class Middle extends Box {}', true);
    const source = '<?php namespace Consumer; use Origin\\Middle as ParentBox; use Origin\\User as Selected; class User {} /** @extends ParentBox<Selected> */ class C extends ParentBox {} new C(new \\Origin\\User());';
    workspace.update(uri, source, true);
    expect(workspace.signatures(uri, source.indexOf('new C(')+6)[0]?.parameters[0]?.type).toBe('\\Origin\\User');
    expect(workspace.incompatibleArguments(uri)).toEqual([]);
  } finally { workspace.dispose(); }
});
it('preserves grouping when a union template argument replaces an array element', () => {
  const workspace = new SemanticWorkspace(parser);
  try {
    const source = '<?php /** @template T */ class Box {/** @param T[] $value */ public function __construct(array $value){}} /** @extends Box<int|string> */ class C extends Box {} new C([1,"ok"]);';
    workspace.update(uri, source, true);
    expect(workspace.signatures(uri, source.indexOf('new C(')+6)[0]?.parameters[0]?.type).toBe('(int|string)[]');
    expect(workspace.incompatibleArguments(uri)).toEqual([]);
    workspace.update(uri, source.replace('[1,"ok"]', '[true]'), true);
    expect(workspace.incompatibleArguments(uri)).toMatchObject([{ parameter: 'value' }]);
  } finally { workspace.dispose(); }
});
it.each(['', '/** @extends Box<Missing> */', '/** @extends Box<User,User> */', '/** @extends Box<User>\n * @extends Box<Other> */', '/** @implements Box<User> */', '/** @extends Box<User */'])('withdraws unresolved inherited templates instead of borrowing a same-name class: %s', doc => {
  const workspace = new SemanticWorkspace(parser);
  try {
    const source = `<?php class T {} class User {} class Other {} /** @template T */ class Box {/** @param T $value */ public function __construct($value){}} ${doc} class C extends Box {} new C(42);`;
    workspace.update(uri, source, true);
    expect(workspace.signatures(uri, source.indexOf('new C(')+6)[0]?.parameters[0]?.type).toBeUndefined();
    expect(workspace.incompatibleArguments(uri)).toEqual([]);
  } finally { workspace.dispose(); }
});
it('does not change an own constructor when the parent has generic documentation', () => {
  const workspace = new SemanticWorkspace(parser);
  try {
    const source = '<?php class User {} /** @template T */ class Box {/** @param T $value */ public function __construct($value){}} /** @extends Box<User> */ class C extends Box {public function __construct(int $value){}} new C([]);';
    workspace.update(uri, source, true);
    expect(workspace.signatures(uri, source.indexOf('new C(')+6)[0]?.parameters[0]?.type).toBe('int');
    expect(workspace.incompatibleArguments(uri)).toMatchObject([{ parameter: 'value' }]);
  } finally { workspace.dispose(); }
});
it.each(['restore', 'restoreDeclaration', 'restoreSourceDeclaration'] as const)('refreshes the inherited binding after %s', mode => {
  const sourceWorkspace = new SemanticWorkspace(parser), workspace = new SemanticWorkspace(parser);
  try {
    workspace.update(uri, '<?php new C(new User());', true);
    for (const target of ['User','Other','User']) {
      sourceWorkspace.update(origin, `<?php class User {} class Other {} /** @template T */ class Box {/** @param T $value */ public function __construct($value){}} /** @extends Box<${target}> */ class C extends Box {}`, true);
      const snapshot = mode === 'restoreSourceDeclaration' ? sourceWorkspace.sourceDeclarationSnapshot(origin)! : sourceWorkspace.snapshot(origin)!;
      expect(workspace[mode](structuredClone(snapshot), origin)).toBe(true);
      const signature = workspace.signatures(uri, '<?php new C('.length)[0];
      expect(signature?.parameters[0]?.type).toBe(`\\${target}`);
      expect(workspace.incompatibleArguments(uri)).toHaveLength(target === 'Other' ? 1 : 0);
    }
  } finally { sourceWorkspace.dispose(); workspace.dispose(); }
});
it('specializes class template bounds without replacing method templates', () => {
  const workspace = new SemanticWorkspace(parser);
  try {
    const source = '<?php namespace Origin; class User {} /** @template T */ class Box {/** @template U of T\n * @param U $value */ public function __construct($value){}} namespace Consumer; class U {} class User {} /** @extends \\Origin\\Box<\\Origin\\User> */ class C extends \\Origin\\Box {} new C(new \\Origin\\User());';
    workspace.update(uri, source, true);
    expect(workspace.signatures(uri, source.indexOf('new C(')+6)[0]).toMatchObject({parameters:[{type:'U'}],callableTemplates:[{name:'U',bound:'\\Origin\\User'}]});
    expect(workspace.incompatibleArguments(uri)).toEqual([]);
    workspace.update(uri, source.replace('new C(new \\Origin\\User())','new C(new User())'), true);
    expect(workspace.incompatibleArguments(uri)).toMatchObject([{parameter:'value'}]);
  } finally {workspace.dispose();}
});
it.each([true,false])('validates the inherited generic bound without narrowing an invalid binding (valid=%s)', valid => {
  const workspace = new SemanticWorkspace(parser);
  try {
    const source = `<?php namespace Origin; class User {} class Derived extends User {} /** @template T of User */ class Box {/** @param T $value */ public function __construct($value,bool $enabled){}} namespace Consumer; class Other {} /** @extends \\Origin\\Box<${valid?'\\Origin\\Derived':'Other'}> */ class C extends \\Origin\\Box {} new C(new Other(),[]);`;
    workspace.update(uri, source, true);
    const signature = workspace.signatures(uri, source.indexOf('new C(')+6)[0];
    expect(signature?.parameters[0]?.type).toBe(valid ? '\\Origin\\Derived' : undefined);
    expect(workspace.incompatibleArguments(uri).map(item=>item.parameter)).toEqual(valid ? ['value','enabled'] : ['enabled']);
  } finally {workspace.dispose();}
});
it('maps multiple templates by declared order and preserves the actual source identity', () => {
  const workspace = new SemanticWorkspace(parser);
  try {
    const source = '<?php class User {} class Other {} /** @template First\n * @template Second */ class Box {/** @param First $first\n * @param Second $second */ public function __construct($first,$second){}} /** @extends Box<Other,User> */ class C extends Box {} new C(new Other(),new User());';
    workspace.update(uri, source, true);
    const signature = workspace.signatures(uri, source.indexOf('new C(')+6)[0];
    expect(signature?.parameters.map(parameter=>parameter.type)).toEqual(['\\Other','\\User']);
    expect(signature?.fqcn).toBe('Box::__construct');
    expect(signature?.start).toBe(source.indexOf('__construct'));
    expect(workspace.incompatibleArguments(uri)).toEqual([]);
  } finally {workspace.dispose();}
});
it('uses imports from the child actual namespace block when aliases repeat', () => {
  const workspace = new SemanticWorkspace(parser);
  try {
    const source = '<?php namespace One {class User {}} namespace Two {class User {}} namespace Origin {/** @template T */ class Box {/** @param T $value */ public function __construct($value){}}} namespace Consumer {use One\\User as Selected; class Other {}} namespace Consumer {use Two\\User as Selected; /** @extends \\Origin\\Box<Selected> */ class C extends \\Origin\\Box {} new C(new \\Two\\User());}';
    workspace.update(uri, source, true);
    expect(workspace.signatures(uri, source.indexOf('new C(')+6)[0]?.parameters[0]?.type).toBe('\\Two\\User');
    expect(workspace.incompatibleArguments(uri)).toEqual([]);
  } finally {workspace.dispose();}
});
it('keeps inherited private constructors inaccessible and diagnoses required arguments of a bare construction', () => {
  const workspace = new SemanticWorkspace(parser);
  try {
    const source = '<?php class User {} /** @template T */ class Box {/** @param T $value */ private function __construct($value){}} /** @extends Box<User> */ class C extends Box {} new C();';
    workspace.update(uri, source, true);
    expect(workspace.signatures(uri, source.indexOf('new C(')+6)).toEqual([]);
    expect(workspace.inaccessibleInstantiations(uri)).toHaveLength(1);
    workspace.update(uri, source.replace('private function','public function').replace('new C();','new C;'), true);
    expect(workspace.missingRequiredArguments(uri)).toMatchObject([{parameters:['value']}]);
  } finally {workspace.dispose();}
});
it.each([
  ['mixed','int','int'],
  ['int|float','float','float'],
  ['array-key','int|string','int|string'],
  ['list<int>','list<int>','list<int>'],
  ['Missing','int',undefined],
  ['non-empty-string','string',undefined],
  ['positive-int','int',undefined],
] as const)('proves the inherited %s bound for %s before specializing', (bound, argument, expected) => {
  const workspace = new SemanticWorkspace(parser);
  try {
    const source = `<?php /** @template T of ${bound} */ class Box {/** @param T $value */ public function __construct($value){}} /** @extends Box<${argument}> */ class C extends Box {} new C(42);`;
    workspace.update(uri,source,true);
    expect(workspace.signatures(uri,source.indexOf('new C(')+6)[0]?.parameters[0]?.type).toBe(expected === 'int|string' ? '(int|string)' : expected);
  } finally {workspace.dispose();}
});
it.each(['restore','restoreDeclaration','restoreSourceDeclaration'] as const)('preserves mixed union/intersection grouping after %s and rejects the previous cache contract', mode => {
  const sourceWorkspace = new SemanticWorkspace(parser), workspace = new SemanticWorkspace(parser);
  try {
    sourceWorkspace.update(origin,'<?php interface A {} interface B {} class D implements A {} class OnlyA implements A {} /** @template T */ class Box {/** @param T $value */ public function __construct($value){}} /** @extends Box<(A|B)&D> */ class C extends Box {}',true);
    const snapshot = mode==='restoreSourceDeclaration' ? sourceWorkspace.sourceDeclarationSnapshot(origin)! : sourceWorkspace.snapshot(origin)!;
    expect(workspace[mode](structuredClone(snapshot),origin)).toBe(true);
    workspace.update(uri,'<?php new C(new D());',true);
    expect(workspace.signatures(uri,'<?php new C('.length)[0]?.parameters[0]?.type).toBe('((\\A|\\B)&\\D)');
    expect(workspace.incompatibleArguments(uri)).toEqual([]);
    workspace.update(uri,'<?php new C(new OnlyA());',true);
    expect(workspace.incompatibleArguments(uri)).toMatchObject([{parameter:'value'}]);
    expect(workspace[mode]({...snapshot,schema:mode==='restoreSourceDeclaration'?2:84},origin)).toBe(false);
  } finally {sourceWorkspace.dispose();workspace.dispose();}
});
it.each([true,false])('validates a grouped template bound without widening it (valid=%s)', valid => {
  const workspace = new SemanticWorkspace(parser);
  try {
    const source = `<?php interface A {} interface B {} class D implements A {} class OnlyA implements A {} /** @template T of (A|B)&D */ class Box {/** @param T $value */ public function __construct($value){}} /** @extends Box<${valid?'D':'OnlyA'}> */ class C extends Box {} new C(new D());`;
    workspace.update(uri,source,true);
    expect(workspace.signatures(uri,source.indexOf('new C(')+6)[0]?.parameters[0]?.type).toBe(valid ? '\\D' : undefined);
  } finally {workspace.dispose();}
});
