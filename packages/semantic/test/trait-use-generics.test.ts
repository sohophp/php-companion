import { afterAll, beforeAll, expect, it } from 'vitest';
import { PhpSyntaxParser } from '@php-companion/parser';
import { SemanticWorkspace } from '../src/index.js';
let parser: PhpSyntaxParser;
beforeAll(async () => { parser = await PhpSyntaxParser.createDefault(); });
afterAll(() => parser.dispose());
const origin = 'file:///Origin.php', uri = 'file:///Consumer.php';
const modes = ['full', 'declarations', 'prepared', 'restore', 'restoreDeclaration', 'restoreSourceDeclaration'] as const;
type Mode = typeof modes[number];
function load(source: string, consumer: string, mode: Mode): SemanticWorkspace {
  const workspace = new SemanticWorkspace(parser);
  if (mode === 'restore' || mode === 'restoreDeclaration' || mode === 'restoreSourceDeclaration') {
    const seed = new SemanticWorkspace(parser);
    try {
      seed.update(origin, source, true); seed.update(uri, consumer, true);
      for (const file of [origin, uri]) {
        const snapshot = mode === 'restoreSourceDeclaration' ? seed.sourceDeclarationSnapshot(file) : seed.snapshot(file);
        expect(workspace[mode](structuredClone(snapshot), file)).toBe(true);
      }
    } finally { seed.dispose(); }
  } else {
    for (const [file, text] of [[origin, source], [uri, consumer]]) {
      if (mode === 'declarations') workspace.updateDeclarations(file!, text!);
      else if (mode === 'prepared') workspace.updatePrepared(file!, text!, parser.prepare(text!, file!, true));
      else workspace.update(file!, text!, true);
    }
  }
  return workspace;
}
const cases = [
  ['name', 'T', '\\Origin\\User', 'new \\Origin\\User()', 'new User()'],
  ['nullable', '?T', '?\\Origin\\User', 'null', 'new User()'],
  ['array', 'T[]', '\\Origin\\User[]', '[new \\Origin\\User()]', '[new User()]'],
  ['list', 'list<T>', 'list<\\Origin\\User>', '[new \\Origin\\User()]', '[new User()]'],
  ['shape', "array{T:T,label:'T'}", "array{T:\\Origin\\User,label:'T'}", "['T'=>new \\Origin\\User(),'label'=>'T']", "['T'=>new User(),'label'=>'T']"],
  ['class-string', 'class-string<T>', 'class-string<\\Origin\\User>', '\\Origin\\User::class', 'User::class'],
  ['callback', 'callable(T $T):T', 'callable(\\Origin\\User $T):\\Origin\\User', 'function(\\Origin\\User $T):\\Origin\\User{return $T;}', 'function(User $T):User{return $T;}'],
] as const;
it.each(cases.flatMap(row => modes.map(mode => [...row, mode] as const)))('binds %s constructor facts after %s / %s / %s / %s in %s', (_name, type, expected, good, bad, mode) => {
  const source = `<?php namespace Origin; class User {} /** @template T */ trait Init {/** @param ${type} $value */ public function __construct($value){}}`;
  const base = '<?php namespace Consumer; class User {} class C {/** @use \\Origin\\Init<\\Origin\\User> */ use \\Origin\\Init;} ';
  const workspace = load(source, base + `new C(${good});`, mode);
  try {
    expect(workspace.signatures(uri, base.length + 6)[0]?.parameters[0]?.type).toBe(expected);
    expect(workspace.incompatibleArguments(uri)).toEqual([]);
    workspace.update(uri, base + `new C(${bad});`, true);
    expect(workspace.incompatibleArguments(uri)).toEqual(expect.arrayContaining([expect.objectContaining({ parameter: 'value' })]));
  } finally { workspace.dispose(); }
});
it.each(modes)('propagates nested Trait and inherited class arguments through %s', mode => {
  const source = '<?php namespace Origin; class User {} /** @template T */ trait Init {/** @param T $value */ public function __construct($value){}} /** @template U */ trait Mid {/** @use Init<U> */ use Init;}';
  const base = '<?php namespace Consumer; class User {} /** @template V */ class ParentC {/** @use \\Origin\\Mid<V> */ use \\Origin\\Mid;} /** @extends ParentC<\\Origin\\User> */ class C extends ParentC {} ';
  const workspace = load(source, base + 'new C(new User());', mode);
  try {
    expect(workspace.signatures(uri, base.length + 6)[0]?.parameters[0]?.type).toBe('\\Origin\\User');
    expect(workspace.incompatibleArguments(uri)).toEqual(expect.arrayContaining([expect.objectContaining({ parameter: 'value' })]));
  } finally { workspace.dispose(); }
});
it.each(modes)('preserves member keys, literals, method bounds and source identity through %s', mode => {
  const source = `<?php namespace Origin; class User {} /** @template T */ trait Init {/** @var array{T:T,label:'T'} */ public $value; /** @return T */ public function get(){} /** @template U of T\n * @param U $value\n * @return U */ public function take($value){return $value;} /** @param T $value */ public function __construct($value){}}`;
  const text = '<?php namespace Consumer; class C {/** @use \\Origin\\Init<\\Origin\\User> */ use \\Origin\\Init;} $c=new C(new \\Origin\\User()); $c->';
  const workspace = load(source, text, mode);
  try {
    const members = workspace.completeMembers(uri, text.length);
    expect(members.find(member => member.name === 'get')?.returnType).toBe('\\Origin\\User');
    expect(members.find(member => member.name === 'value')?.returnType).toBe("array{T: \\Origin\\User, label: 'T'}");
    expect(members.find(member => member.name === 'take')).toMatchObject({ uri: origin, parameters: [{ type: 'U' }], callableTemplates: [{ bound: '\\Origin\\User' }] });
  } finally { workspace.dispose(); }
});
it.each([
  ['missing', 'use \\Origin\\Init;', undefined],
  ['wrong arity', '/** @use \\Origin\\Init<int,string> */ use \\Origin\\Init;', undefined],
  ['conflict', '/** @use \\Origin\\Init<int>\n * @use \\Origin\\Init<string> */ use \\Origin\\Init;', undefined],
  ['violated bound', '/** @use \\Origin\\Init<string> */ use \\Origin\\Init;', undefined],
  ['valid bound', '/** @use \\Origin\\Init<int> */ use \\Origin\\Init;', 'int'],
] as const)('requires a proven binding: %s', (_name, use, expected) => {
  const text = `<?php class C {${use}} new C(1);`;
  const workspace = load('<?php namespace Origin; /** @template T of int */ trait Init {/** @param T $value */ public function __construct($value){}}', text, 'full');
  try { expect(workspace.signatures(uri, text.indexOf('new C(') + 6)[0]?.parameters[0]?.type).toBe(expected); }
  finally { workspace.dispose(); }
});
it.each(['full', 'restore', 'restoreDeclaration', 'restoreSourceDeclaration'] as const)('invalidates same-length use-contract changes after %s', mode => {
  const source = '<?php namespace Origin; class User {} class View {} /** @template T */ trait Init {/** @param T $value */ public function __construct($value){}}';
  const consumer = (target: string): string => `<?php namespace Consumer; class C {/** @use \\Origin\\Init<\\Origin\\${target}> */ use \\Origin\\Init;}`;
  const workspace = load(source, consumer('User'), mode);
  const caller = '<?php new \\Consumer\\C(null);'; workspace.update('file:///Caller.php', caller, true);
  try {
    for (const target of ['View', 'User', 'View']) {
      expect(workspace.update(uri, consumer(target), true)).toMatchObject({ kind: 'declaration', changedTypes: ['consumer\\c'] });
      expect(workspace.signatures('file:///Caller.php', caller.indexOf('new \\Consumer\\C(') + 16)[0]?.parameters[0]?.type).toBe(`\\Origin\\${target}`);
    }
  } finally { workspace.dispose(); }
});
it.each(['@use', '@phpstan-use', '@psalm-use'] as const)('ranks compatible variables using %s and an imported Trait alias', tag => {
  const text = `<?php namespace Consumer; use Origin\\Init as Selected; class User {} class C {/** ${tag} Selected<\\Origin\\User> */ use Selected;} function run(User $offerA,\\Origin\\User $offerZ){new C($offer);}`;
  const workspace = load('<?php namespace Origin; class User {} /** @template T */ trait Init {/** @param T $value */ public function __construct($value){}}', text, 'full');
  try { expect(workspace.completeVariables(uri, text.indexOf('$offer);') + 6)?.names.slice(0, 2)).toEqual(['$offerZ', '$offerA']); }
  finally { workspace.dispose(); }
});
const genericTrait = '<?php namespace Origin; class User {} /** @template T */ trait Init {/** @param T $value */ public function __construct($value){}}';
it.each([
  ['class document is not a use contract', genericTrait, '<?php /** @use \\Origin\\Init<\\Origin\\User> */ class C {use \\Origin\\Init;} new C(null);', undefined],
  ['another Trait tag is not borrowed', genericTrait + ' trait Other{}', '<?php class C {/** @use \\Origin\\Other<\\Origin\\User> */ use \\Origin\\Init;} new C(null);', undefined],
  ['unresolved argument is withdrawn', genericTrait, '<?php class Missing{} class C {/** @use \\Origin\\Init<MissingFromNowhere> */ use \\Origin\\Init;} new C(null);', undefined],
  ['native type is not replaced by a template with the same name', '<?php namespace Origin; class User{} class T{} /** @template T */ trait Init {public function __construct(T $value){}}', '<?php class C {/** @use \\Origin\\Init<\\Origin\\User> */ use \\Origin\\Init;} new C(null);', '\\Origin\\T'],
  ['constructor alias retains its binding', '<?php namespace Origin; class User{} /** @template T */ trait Init {/** @param T $value */ public function boot($value){}}', '<?php class C {/** @use \\Origin\\Init<\\Origin\\User> */ use \\Origin\\Init {boot as __construct;}} new C(null);', '\\Origin\\User'],
  ['precedence retains the selected Trait contract', genericTrait + ' class View{} /** @template T */ trait Other {/** @param T $value */ public function __construct($value){}}', '<?php use Origin\\Init as Selected; use Origin\\Other as Other; class C {/** @use Selected<\\Origin\\User>\n * @use Other<\\Origin\\View> */ use Selected,Other {Selected::__construct insteadof Other;}} new C(null);', '\\Origin\\User'],
] as const)('protects %s', (_name, source, consumer, expected) => {
  const workspace = load(source, consumer, 'full');
  try { expect(workspace.signatures(uri, consumer.lastIndexOf('new C(') + 6)[0]?.parameters[0]?.type).toBe(expected); }
  finally { workspace.dispose(); }
});
it('keeps method templates independent of a Trait template with the same name', () => {
  const source = '<?php namespace Origin; class User{} /** @template T */ trait Init {/** @template T of int\n * @param T $value\n * @return T */ public function choose($value){return $value;} /** @param T $value */ public function __construct($value){}}';
  const text = '<?php class C {/** @use \\Origin\\Init<\\Origin\\User> */ use \\Origin\\Init;} $c=new C(null); $c->';
  const workspace = load(source, text, 'full');
  try { expect(workspace.completeMembers(uri, text.length).find(member => member.name === 'choose')).toMatchObject({ parameters: [{ type: 'T' }], returnType: 'T', callableTemplates: [{ name: 'T', bound: 'int' }] }); }
  finally { workspace.dispose(); }
});
it.each(['/** @phpstan-type Alias string */', '/** @phpstan-import-type Original from Source as Alias */'])('does not resolve unsupported local aliases as same-named classes: %s', doc => {
  const text = `<?php class Alias {} ${doc} class C {/** @use \\Origin\\Init<Alias> */ use \\Origin\\Init;} new C(null);`;
  const workspace = load(genericTrait, text, 'full');
  try { expect(workspace.signatures(uri, text.lastIndexOf('new C(') + 6)[0]?.parameters[0]?.type).toBeUndefined(); }
  finally { workspace.dispose(); }
});
it.each(['restore', 'restoreDeclaration', 'restoreSourceDeclaration'] as const)('rejects stale schemas and malformed Trait use metadata through %s', mode => {
  const text = '<?php class C {/** @use \\Origin\\Init<\\Origin\\User> */ use \\Origin\\Init;}';
  const seed = load(genericTrait, text, 'full'), workspace = new SemanticWorkspace(parser);
  try {
    const snapshot = mode === 'restoreSourceDeclaration' ? seed.sourceDeclarationSnapshot(uri)! : seed.snapshot(uri)!;
    const old = structuredClone(snapshot); (old as { schema: number }).schema = mode === 'restoreSourceDeclaration' ? 3 : 85;
    expect(workspace[mode](old, uri)).toBe(false);
    for (const value of [null, [{ start: -1, end: 999999, names: ['Origin\\Init'] }], [{ start: 14, end: 20, names: 42 }], [{ start: 14, end: 20, names: ['Other'] }]]) {
      const malformed = structuredClone(snapshot);
      (malformed.declaration.declarations[0] as { traitUses: unknown }).traitUses = value;
      expect(workspace[mode](malformed, uri)).toBe(false);
    }
    expect(workspace.workspaceTypes()).toEqual([]);
    expect(workspace[mode](snapshot, uri)).toBe(true);
  } finally { seed.dispose(); workspace.dispose(); }
});
it.each(modes)('invalidates changed alias names in use-contract scope after %s', mode => {
  const consumer = (alias: string): string => `<?php class Alias {} /** @phpstan-type ${alias} string */ class C {/** @use \\Origin\\Init<Alias> */ use \\Origin\\Init;} new C(null);`;
  const workspace = load(genericTrait, consumer('Other'), mode);
  try {
    for (const alias of ['Alias','Other','Alias']) {
      expect(workspace.update(uri, consumer(alias), true)).toMatchObject({ kind: 'declaration', changedTypes: ['c'] });
      expect(workspace.signatures(uri, consumer(alias).lastIndexOf('new C(') + 6)[0]?.parameters[0]?.type).toBe(alias === 'Alias' ? undefined : '\\Alias');
    }
  } finally { workspace.dispose(); }
});
