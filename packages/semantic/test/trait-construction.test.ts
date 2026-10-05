import { afterAll, beforeAll, expect, it } from 'vitest';
import { PhpSyntaxParser } from '@php-companion/parser';
import { SemanticWorkspace } from '../src/index.js';
let parser: PhpSyntaxParser;
beforeAll(async () => { parser = await PhpSyntaxParser.createDefault(); });
afterAll(() => parser.dispose());
const uri = 'file:///TraitConstruction.php';
const cases = [
  ['direct', 'trait Init {public function __construct(int $value){}} class C {use Init;}'],
  ['nested', 'trait Init {public function __construct(int $value){}} trait Nested {use Init;} class C {use Nested;}'],
  ['alias', 'trait Init {public function seed(int $value){}} class C {use Init {seed as __construct;}}'],
  ['nested alias', 'trait Init {public function seed(int $value){}} trait Nested {use Init {seed as __construct;}} class C {use Nested;}'],
  ['precedence', 'trait Init {public function __construct(int $value){}} trait Other {public function __construct(){}} class C {use Init,Other {Init::__construct insteadof Other;}}'],
  ['trait before parent', 'class Base {public function __construct(){}} trait Init {public function __construct(int $value){}} class C extends Base {use Init;}'],
  ['inherited', 'trait Init {public function __construct(int $value){}} class Base {use Init;} class C extends Base {}'],
] as const;
it.each(cases)('uses the effective %s Trait constructor with and without parentheses', (_name, header) => {
  const workspace = new SemanticWorkspace(parser);
  try {
    for (const args of ['', '()']) {
      const source = `<?php ${header} new C${args};`;
      workspace.update(uri, source, true);
      expect(workspace.missingRequiredArguments(uri).map(item => item.parameters)).toEqual([['value']]);
    }
    const source = `<?php declare(strict_types=1); ${header} new C('wrong');`;
    workspace.update(uri, source, true);
    expect(workspace.signatures(uri, source.indexOf('new C(')+6)).toMatchObject([{parameters:[{name:'value',nativeType:'int'}]}]);
    expect(workspace.incompatibleArguments(uri).map(item => item.parameter)).toEqual(['value']);
  } finally { workspace.dispose(); }
});
it.each([
  ['private', 'trait Init {private function __construct(){}} class C {use Init;}'],
  ['private adaptation', 'trait Init {public function __construct(){}} class C {use Init {__construct as private;}}'],
  ['private alias', 'trait Init {public function seed(){}} class C {use Init {seed as private __construct;}}'],
])('checks effective %s constructor access from the consuming class', (_name, header) => {
  const workspace = new SemanticWorkspace(parser);
  try {
    workspace.update(uri, `<?php ${header} new C();`, true);
    expect(workspace.inaccessibleInstantiations(uri)).toHaveLength(1);
    const source = `<?php ${header.replace('class C {', 'class C {public static function make(){return new self();}')} C::make();`;
    workspace.update(uri, source, true);
    expect(workspace.inaccessibleInstantiations(uri)).toEqual([]);
    expect(workspace.signatures(uri, source.indexOf('new self(')+9)).toHaveLength(1);
  } finally { workspace.dispose(); }
});
it('gives the concrete class constructor precedence over Trait and parent', () => {
  const workspace = new SemanticWorkspace(parser);
  try {
    const source = '<?php class Base {public function __construct(int $base){}} trait Init {public function __construct(int $trait){}} class C extends Base {use Init; public function __construct(){}} new C();';
    workspace.update(uri, source, true);
    expect(workspace.missingRequiredArguments(uri)).toEqual([]);
    expect(workspace.signatures(uri, source.indexOf('new C(')+6)).toMatchObject([{fqcn:'C::__construct',parameters:[]}]);
  } finally { workspace.dispose(); }
});
it('keeps protected and private Trait inheritance distinct', () => {
  const workspace = new SemanticWorkspace(parser);
  try {
    for (const visibility of ['protected','private']) {
      const source = `<?php trait Init {${visibility} function __construct(int $value){}} class Base {use Init;} class C extends Base {public static function make(){return new self();}}`;
      workspace.update(uri, source, true);
      expect(workspace.signatures(uri, source.indexOf('new self(')+9)).toHaveLength(visibility === 'protected' ? 1 : 0);
      expect(workspace.inaccessibleInstantiations(uri)).toHaveLength(visibility === 'private' ? 1 : 0);
    }
  } finally { workspace.dispose(); }
});
it('binds Trait self parameter types to the consuming class and preserves declaration identity', () => {
  const workspace = new SemanticWorkspace(parser);
  try {
    const source = '<?php declare(strict_types=1); trait Init {public function __construct(self $value){}} class Base {use Init;} class C extends Base {} class Wrong {} new C(new Wrong());';
    workspace.update(uri, source, true);
    const signature = workspace.signatures(uri, source.indexOf('new C(')+6)[0];
    expect(signature).toMatchObject({fqcn:'Init::__construct',typeScopeFqcn:'Base',parameters:[{nativeType:'self'}]});
    expect(workspace.incompatibleArguments(uri).map(item=>item.parameter)).toEqual(['value']);
  } finally { workspace.dispose(); }
});
it.each([
  ['conflicting', 'trait Init {public function __construct(int $one){}} trait Other {public function __construct(string $two){}} class C {use Init,Other;}'],
  ['nested conflicting', 'trait Init {public function __construct(int $one){}} trait Other {public function __construct(string $two){}} trait Nested {use Init,Other;} class C {use Nested;}'],
  ['unresolved', 'trait Init {public function __construct(int $one){}} class Base {private function __construct(){}} class C extends Base {use Init,Missing;}'],
])('does not invent a constructor for %s composition', (_name, header) => {
  const workspace = new SemanticWorkspace(parser);
  try {
    const source = `<?php ${header} new C();`; workspace.update(uri,source,true);
    expect(workspace.signatures(uri,source.indexOf('new C(')+6)).toEqual([]);
    expect(workspace.missingRequiredArguments(uri)).toEqual([]);
    expect(workspace.inaccessibleInstantiations(uri)).toEqual([]);
  } finally {workspace.dispose();}
});
it.each(['restore','restoreDeclaration','restoreSourceDeclaration'] as const)('refreshes a Trait alias visibility and contract after %s', mode => {
  const first = new SemanticWorkspace(parser), restored = new SemanticWorkspace(parser);
  try {
    const parent = 'file:///Init.php', child = '<?php class C {use Init {seed as __construct;}} new C();';
    first.update(parent,'<?php trait Init {public function seed(int $value){}}',true);
    first.update(uri,child,true);
    for(const fileUri of [parent,uri]) {
      const snapshot = mode === 'restoreSourceDeclaration' ? first.sourceDeclarationSnapshot(fileUri)! : first.snapshot(fileUri)!;
      expect(restored[mode](structuredClone(snapshot),fileUri)).toBe(true);
    }
    expect(restored.missingRequiredArguments(uri)).toHaveLength(1);
    restored.update(parent,'<?php trait Init {private function seed(){}}',true);
    expect(restored.inaccessibleInstantiations(uri)).toHaveLength(1);
    expect(restored.signatures(uri,child.indexOf('new C(')+6)).toEqual([]);
    restored.update(parent,'<?php trait Init {public function seed(string $changed){}}',true);
    expect(restored.signatures(uri,child.indexOf('new C(')+6)).toMatchObject([{parameters:[{name:'changed'}]}]);
  } finally { first.dispose();restored.dispose(); }
});

it('uses the concrete parent rather than an abstract Trait requirement', () => {
  const workspace = new SemanticWorkspace(parser);
  try {
    const source = '<?php trait Init {abstract public function __construct(int $trait);} class Base {public function __construct(int $base){}} class C extends Base {use Init;} new C();';
    workspace.update(uri,source,true);
    expect(workspace.signatures(uri,source.indexOf('new C(')+6)).toMatchObject([{fqcn:'Base::__construct',parameters:[{name:'base'}]}]);
  } finally {workspace.dispose();}
});
it('retains a proven local private constructor when an unrelated parent is unresolved', () => {
  const workspace = new SemanticWorkspace(parser);
  try {
    workspace.update(uri,'<?php class C extends Missing {private function __construct(){}} new C();',true);
    expect(workspace.inaccessibleInstantiations(uri)).toHaveLength(1);
  } finally {workspace.dispose();}
});

it('keeps Trait source imports separate from same-name consumer types', () => {
  const workspace = new SemanticWorkspace(parser);
  try {
    workspace.update('file:///Origin.php','<?php namespace Origin; class User {} trait Init {public function __construct(User $value){}}',true);
    const header = '<?php namespace Consumer; class User {} class C {use \\Origin\\Init;}';
    workspace.update(uri,header+' new C(new \\Origin\\User());',true);
    expect(workspace.incompatibleArguments(uri)).toEqual([]);
    workspace.update(uri,header+' new C(new User());',true);
    expect(workspace.incompatibleArguments(uri)).toMatchObject([{parameter:'value',expectedType:'Origin\\User'}]);
  } finally {workspace.dispose();}
});
it('binds a Trait parent parameter using the consumer declaration and imports', () => {
  const workspace = new SemanticWorkspace(parser);
  try {
    workspace.update('file:///Origin.php','<?php namespace Origin; class Root {} trait Init {public function __construct(parent $value){}}',true);
    const header = '<?php namespace Consumer; use Origin\\Root as Base; class Wrong {} class C extends Base {use \\Origin\\Init;}';
    workspace.update(uri,header+' new C(new Base());',true);
    expect(workspace.incompatibleArguments(uri)).toEqual([]);
    workspace.update(uri,header+' new C(new Wrong());',true);
    expect(workspace.incompatibleArguments(uri)).toMatchObject([{parameter:'value',expectedType:'Origin\\Root'}]);
  } finally {workspace.dispose();}
});
it('binds a proven cross-namespace PHPDoc refinement without borrowing the consumer name', () => {
  const workspace = new SemanticWorkspace(parser);
  try {
    workspace.update('file:///Origin.php','<?php namespace Origin; class User {} trait Init {/** @param User $value */ public function __construct($value){}}',true);
    const source = '<?php namespace Consumer; class User {} class C {use \\Origin\\Init;} new C(new \\Origin\\User());';
    workspace.update(uri,source,true);
    expect(workspace.incompatibleArguments(uri)).toEqual([]);
    expect(workspace.signatures(uri,source.indexOf('new C(')+6)[0]?.parameters[0]?.type).toBe('\\Origin\\User');
  } finally {workspace.dispose();}
});
