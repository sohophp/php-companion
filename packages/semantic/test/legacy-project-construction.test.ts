import { afterAll, beforeAll, expect, it } from 'vitest';
import { PhpSyntaxParser } from '@php-companion/parser';
import { SemanticWorkspace } from '../src/index.js';

let parser: PhpSyntaxParser;
beforeAll(async () => { parser = await PhpSyntaxParser.createDefault(); });
afterAll(() => parser.dispose());
const uri = 'file:///LegacyProject.php';
const cases = [
  ['direct', 'class C {public function C(int $value){}}', 'C::C', undefined],
  ['case-insensitive', 'class C {public function c(int $value){}}', 'C::c', undefined],
  ['inherited', 'class Base {public function Base(int $value){}} class C extends Base {}', 'Base::Base', undefined],
  ['child before modern parent', 'class Base {public function __construct(string $value){}} class C extends Base {public function C(int $value){}}', 'C::C', 'Base::__construct'],
  ['Trait method', 'trait Init {public function C(int $value){}} class C {use Init;}', 'Init::C', undefined],
  ['Trait alias', 'trait Init {public function seed(int $value){}} class C {use Init {seed as C;}}', 'Init::seed', undefined],
  ['nested Trait', 'trait Init {public function C(int $value){}} trait Mid {use Init;} class C {use Mid;}', 'Init::C', undefined],
  ['inherited Trait', 'trait Init {public function Base(int $value){}} class Base {use Init;} class C extends Base {}', 'Init::Base', undefined],
  ['modern wins', 'class C {public function C(string $unused){} public function __construct(int $value){}}', 'C::__construct', 'C::__construct'],
  ['own method overrides Trait', 'trait Init {public function C(string $value){}} class C {use Init; public function C(int $value){}}', 'C::C', undefined],
  ['namespace', 'namespace N; class C {public function C(int $value){}}', undefined, undefined],
  ['unrelated Trait name', 'trait Init {public function Init(int $value){}} class C {use Init;}', undefined, undefined],
  ['class legacy / Trait modern collision', 'trait Init {public function __construct(string $value){}} class C {use Init;public function C(int $value){}}', undefined, 'Init::__construct'],
  ['class modern / Trait legacy collision', 'trait Init {public function C(int $value){}} class C {use Init;public function __construct(string $value){}}', undefined, 'C::__construct'],
  ['two Trait constructor styles', 'trait Init {public function C(int $value){}} trait Modern {public function __construct(string $value){}} class C {use Init,Modern;}', undefined, 'Modern::__construct'],
  ['static class-name method', 'class C {public static function C(int $value){}}', undefined, undefined],
] as const;

it.each(['7.2', '7.4', '8.1', '8.5'])('binds ordinary project constructors using PHP %s', version => {
  const workspace = new SemanticWorkspace(parser);
  workspace.setTargetPhpVersion(version);
  try {
    for (const [name, header, php7, php8] of cases) {
      const expected = version.startsWith('7.') ? php7 : php8;
      const source = `<?php ${header} new C();`;
      workspace.update(uri, source, true);
      const signatures = workspace.signatures(uri, source.lastIndexOf('new C(') + 6);
      expect(signatures.map(item => item.fqcn), name).toEqual(expected ? [expected] : []);
      expect(workspace.missingRequiredArguments(uri).map(item => item.parameters), name).toEqual(expected ? [['value']] : []);
      if (expected) {
        const ranking = `<?php ${header} function run(string $offerA,int $offerZ){new C($offer);}`;
        workspace.update(uri, ranking, true);
        const offset = ranking.lastIndexOf('$offer)') + '$offer'.length;
        const intParameter = signatures[0]!.parameters[0]!.nativeType === 'int';
        expect(workspace.completeVariables(uri, offset)?.names[0], name).toBe(intParameter ? '$offerZ' : '$offerA');
      }
    }
  } finally { workspace.dispose(); }
});

it.each(['private', 'protected'])('keeps %s legacy constructor access at PHP 7, but ordinary methods at PHP 8', visibility => {
  const workspace = new SemanticWorkspace(parser);
  try {
    const source = `<?php class C {${visibility} function C(int $value){}} new C();`;
    workspace.update(uri, source, true);
    workspace.setTargetPhpVersion('7.2');
    expect(workspace.inaccessibleInstantiations(uri).map(item => item.visibility)).toEqual([visibility]);
    workspace.setTargetPhpVersion('8.5');
    expect(workspace.inaccessibleInstantiations(uri)).toEqual([]);
    expect(workspace.missingRequiredArguments(uri)).toEqual([]);
  } finally { workspace.dispose(); }
});

it('retracts signatures on version change, preserves no-op revisions and copies authority into query forks', () => {
  const workspace = new SemanticWorkspace(parser);
  const source = '<?php class C {public function C(int $value){}} new C();';
  workspace.update(uri, source, true);
  try {
    expect(workspace.missingRequiredArguments(uri)).toEqual([]);
    for (const version of ['7.2', '8.5', '7.4', undefined]) {
      const before = workspace.revision(); workspace.setTargetPhpVersion(version);
      expect(workspace.revision()).toBe(before + 1);
      expect(workspace.changesOnlyIn(before, new Set([uri]))).toBe(false);
      workspace.setTargetPhpVersion(version); expect(workspace.revision()).toBe(before + 1);
      const expected = version?.startsWith('7.') ? [['value']] : [];
      expect(workspace.missingRequiredArguments(uri).map(item => item.parameters)).toEqual(expected);
      const fork = workspace.forkForLocalQuery(uri, source, new Set());
      try { expect(fork.missingRequiredArguments(uri).map(item => item.parameters)).toEqual(expected); }
      finally { fork.dispose(); }
    }
  } finally { workspace.dispose(); }
});

it.each(['restore', 'restoreDeclaration', 'restoreSourceDeclaration'] as const)('uses current project authority after %s rather than persisting a constructor choice', mode => {
  const donor = new SemanticWorkspace(parser), restored = new SemanticWorkspace(parser);
  const source = '<?php class C {public function C(int $value){}} new C();';
  try {
    donor.setTargetPhpVersion('7.2'); donor.update(uri, source);
    const snapshot = mode === 'restoreSourceDeclaration' ? donor.sourceDeclarationSnapshot(uri)! : donor.snapshot(uri)!;
    expect(restored[mode](structuredClone(snapshot), uri)).toBe(true);
    restored.setTargetPhpVersion('7.4');
    expect(restored.missingRequiredArguments(uri).map(item => item.parameters)).toEqual([['value']]);
    restored.setTargetPhpVersion('8.5');
    expect(restored.missingRequiredArguments(uri)).toEqual([]);
  } finally { donor.dispose(); restored.dispose(); }
});
