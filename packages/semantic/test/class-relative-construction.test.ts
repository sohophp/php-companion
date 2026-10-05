import { afterAll, beforeAll, expect, it } from 'vitest';
import { PhpSyntaxParser } from '@php-companion/parser';
import { SemanticWorkspace } from '../src/index.js';

let parser: PhpSyntaxParser;
beforeAll(async () => { parser = await PhpSyntaxParser.createDefault(); });
afterAll(() => parser.dispose());

it.each(['', '()'])('keeps late static and Trait self construction distinct from literal invalid targets: %s', args => {
  const uri = 'file:///Relative.php', workspace = new SemanticWorkspace(parser);
  try {
    const source = `<?php abstract class Base {public static function make(){return new static${args};}
      public static function wrong(){return new self${args};}} class Child extends Base {}
      trait Maker {public static function make(){return new self${args};} public static function later(){return new static${args};}}
      class Made {use Maker;} new Base${args}; new Maker${args};`;
    workspace.update(uri, source, true);
    expect(workspace.invalidInstantiations(uri).map(item => ({target:item.target, reason:item.reason})))
      .toEqual([{target:'Base',reason:'abstract-class'},{target:'Base',reason:'abstract-class'},{target:'Maker',reason:'trait'}]);
  } finally { workspace.dispose(); }
});

it.each(['self','parent','Base'] as const)('binds visible inherited protected constructor arguments for %s', name => {
  const uri = 'file:///Relative.php', workspace = new SemanticWorkspace(parser);
  try {
    const header = '<?php declare(strict_types=1); class Base {protected function __construct(int $value){}} class Child extends Base {';
    for (const args of ['', '()']) {
      const source = `${header} public static function make(){return new ${name}${args};}}`;
      workspace.update(uri, source, true);
      expect(workspace.inaccessibleInstantiations(uri)).toEqual([]);
      expect(workspace.missingRequiredArguments(uri).map(item => item.callable)).toEqual(['Base::__construct']);
    }
    const source = `${header} public static function make(){return new ${name}();}}`;
    workspace.update(uri, source, true);
    expect(workspace.signatures(uri, source.indexOf(`new ${name}(`)+`new ${name}(`.length))
      .toMatchObject([{fqcn:'Base::__construct', parameters:[{name:'value',nativeType:'int'}]}]);
    workspace.update(uri, `${header} public static function make(){return new ${name}('wrong');}}`, true);
    expect(workspace.incompatibleArguments(uri).map(item => item.parameter)).toEqual(['value']);
  } finally { workspace.dispose(); }
});

it.each(['', '()'])('does not impose an overridable constructor on late-static construction: %s', args => {
  const uri='file:///Late.php', workspace=new SemanticWorkspace(parser);
  try {
    const source=`<?php class Base {public function __construct(int $value){} public static function make(){return new static${args};}}
      class Child extends Base {public function __construct(){}}`;
    workspace.update(uri,source,true);
    expect(workspace.missingRequiredArguments(uri)).toEqual([]);
    workspace.update(uri,source.replace(`new static${args}`, "new static('wrong')"),true);
    expect(workspace.incompatibleArguments(uri)).toEqual([]);
  } finally {workspace.dispose();}
});

it.each(['final class Base {public', 'class Base {final public'])('retains proven late-static constructor contracts: %s', declaration => {
  const uri='file:///Final.php', workspace=new SemanticWorkspace(parser);
  try {
    for(const args of ['', '()']) {
      const source=`<?php ${declaration} function __construct(int $value){} public static function make(){return new static${args};}}`;
      workspace.update(uri,source,true);
      expect(workspace.missingRequiredArguments(uri).map(item=>item.callable)).toEqual(['Base::__construct']);
    }
  } finally {workspace.dispose();}
});

it.each(['', '()'])('keeps inherited private diagnostics exact while late binding can change the target: %s', args => {
  const uri='file:///Private.php', workspace=new SemanticWorkspace(parser);
  try {
    workspace.update(uri,`<?php class Base {private function __construct(){}} class Child extends Base {
      public static function exact(){return new self${args};} public static function later(){return new static${args};}}
      class GrandChild extends Child {public function __construct(){}}`,true);
    expect(workspace.inaccessibleInstantiations(uri).map(item=>item.target)).toEqual(['Child']);
  } finally {workspace.dispose();}
});

it('does not mistake enum-relative construction for a polymorphic class',()=>{
  const uri='file:///Enum.php',workspace=new SemanticWorkspace(parser);
  try {
    workspace.update(uri,'<?php enum Choice {case Yes; public static function wrong(){return new static;}}',true);
    expect(workspace.invalidInstantiations(uri).map(item=>item.reason)).toEqual(['enum']);
  } finally {workspace.dispose();}
});

it.each(['', '()'])('keeps protected outside access and private-final late binding rejected: %s', args => {
  const uri='file:///Outside.php',workspace=new SemanticWorkspace(parser);
  try {
    workspace.update(uri,`<?php class Base {protected function __construct(int $value){}} new Base${args};`,true);
    expect(workspace.inaccessibleInstantiations(uri).map(item=>item.visibility)).toEqual(['protected']);
    expect(workspace.missingRequiredArguments(uri)).toEqual([]);
    workspace.update(uri,`<?php class Base {final private function __construct(){}} class Child extends Base {
      public static function make(){return new static${args};}}`,true);
    expect(workspace.inaccessibleInstantiations(uri).map(item=>item.target)).toEqual(['Child']);
  } finally {workspace.dispose();}
});

it('does not impose a Trait constructor when a consuming class supplies its own',()=>{
  const uri='file:///TraitConstructor.php',workspace=new SemanticWorkspace(parser);
  try {
    workspace.update(uri,`<?php trait Maker {public function __construct(int $value){} public static function make(){return new self;}}
      class Child {use Maker; public function __construct(){}}`,true);
    expect(workspace.missingRequiredArguments(uri)).toEqual([]);
  } finally {workspace.dispose();}
});

it('refreshes protected parameter help after an unsaved visibility change and restoration',()=>{
  const uri='file:///Editing.php',workspace=new SemanticWorkspace(parser);
  const source='<?php class Base {protected function __construct(int $value){}} class Child extends Base {public static function make(){return new self();}}';
  try {
    for(const visibility of ['protected','private','protected']) {
      const edited=source.replace('protected function',`${visibility} function`);workspace.update(uri,edited,true);
      const offset=edited.indexOf('new self(')+'new self('.length;
      expect(workspace.signatures(uri,offset).map(item=>item.fqcn)).toEqual(visibility==='private'?[]:['Base::__construct']);
      expect(workspace.missingRequiredArguments(uri).map(item=>item.callable)).toEqual(visibility==='private'?[]:['Base::__construct']);
      expect(workspace.inaccessibleInstantiations(uri).map(item=>item.visibility)).toEqual(visibility==='private'?['private']:[]);
    }
  } finally {workspace.dispose();}
});

it.each(['restore','restoreDeclaration','restoreSourceDeclaration'] as const)('keeps final-constructor proofs current after %s',mode=>{
  const donor=new SemanticWorkspace(parser),workspace=new SemanticWorkspace(parser);
  const baseUri='file:///Base.php',callerUri='file:///Caller.php';
  const source='<?php class Base {public function __construct(int $value){}}';
  try {
    workspace.update(callerUri,'<?php class Child extends Base {public static function make(){return new static;}}',true);
    for(const isFinal of [false,true,false]) {
      donor.update(baseUri,isFinal?source.replace('public function','final public function'):source);
      const snapshot=mode==='restoreSourceDeclaration'?donor.sourceDeclarationSnapshot(baseUri)!:donor.snapshot(baseUri)!;
      expect(workspace[mode](structuredClone(snapshot),baseUri)).toBe(true);
      expect(workspace.missingRequiredArguments(callerUri).map(item=>item.callable)).toEqual(isFinal?['Base::__construct']:[]);
    }
  } finally {donor.dispose();workspace.dispose();}
});
