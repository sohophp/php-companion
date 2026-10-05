import { afterAll, beforeAll, expect, it } from 'vitest';
import { PhpSyntaxParser } from '@php-companion/parser';
import { SemanticWorkspace } from '../src/index.js';

let parser: PhpSyntaxParser;
beforeAll(async () => { parser = await PhpSyntaxParser.createDefault(); });
afterAll(() => parser.dispose());
const uri = 'file:///C.php';
const renamed = (workspace: SemanticWorkspace, source: string, offset: number, name = 'Renamed'): string | undefined => {
  const plan = workspace.typeRename(uri, offset, name);
  if (!plan) return undefined;
  return [...plan.locations.map(location => ({ ...location, newText: name })), ...(plan.additionalEdits ?? [])]
    .filter(edit => edit.uri === uri).sort((a, b) => b.start - a.start)
    .reduce((text, edit) => text.slice(0, edit.start) + edit.newText + text.slice(edit.end), source);
};

it.each(['7.2', '7.3', '7.4', '8.0', '8.1', '8.2', '8.3', '8.4', '8.5'])('keeps class and effective constructor Rename consistent at PHP %s', version => {
  const workspace = new SemanticWorkspace(parser); workspace.setTargetPhpVersion(version);
  const source = '<?php class C {public function c(int $value){}} $c=new C(7); $c->c(8);';
  workspace.update(uri, source, true);
  try {
    const result = renamed(workspace, source, source.indexOf('class C') + 6)!;
    expect(result).toBe(version.startsWith('7.')
      ? '<?php class Renamed {public function Renamed(int $value){}} $c=new Renamed(7); $c->Renamed(8);'
      : '<?php class Renamed {public function c(int $value){}} $c=new Renamed(7); $c->c(8);');
    workspace.update(uri, result, true);
    expect(workspace.signatures(uri, result.indexOf('new Renamed(') + 12).map(item => item.parameters[0]?.name))
      .toEqual(version.startsWith('7.') ? ['value'] : []);
  } finally { workspace.dispose(); }
});

it('routes direct legacy constructor declaration Rename through the class', () => {
  const workspace = new SemanticWorkspace(parser); workspace.setTargetPhpVersion('7.2');
  const source = '<?php class C {public function C(int $value){}} new C(7);';
  workspace.update(uri, source, true);
  try {
    const offset = source.indexOf('function C') + 9;
    expect(workspace.typeRename(uri, offset)?.name).toBe('C');
    expect(renamed(workspace, source, offset)).toContain('class Renamed {public function Renamed');
    expect(workspace.methodRename(uri, offset, 'Other')).toBeUndefined();
  } finally { workspace.dispose(); }
});

it.each([
  ['local alias', 'trait Init {function seed(int $value){}} class C {use Init {seed as C;}}', 'seed as Renamed;'],
  ['shared Trait', 'trait Init {function C(int $value){}} class Other {use Init;} class C {use Init;}', 'use Init { Init::C as public Renamed; }'],
  ['nested Trait', 'trait Init {function C(int $value){}} trait Mid {use Init;} class C {use Mid;}', 'use Mid { Mid::C as public Renamed; }'],
  ['existing adaptations', 'trait Init {function C(int $value){}} class C {use Init {C as private;}}', 'Init::C as private Renamed;'],
] as const)('preserves %s constructor binding without changing shared methods', (_label, header, expected) => {
  const workspace = new SemanticWorkspace(parser); workspace.setTargetPhpVersion('7.2');
  const source = `<?php ${header} new C(7);`; workspace.update(uri, source, true);
  try {
    const result = renamed(workspace, source, source.indexOf('class C') + 6)!;
    expect(result).toContain(expected);
    if (!header.includes('seed')) expect(result).toContain('function C(int $value)');
    workspace.update(uri, result, true);
    if (header.includes('as private')) expect(workspace.inaccessibleInstantiations(uri).map(item => item.visibility)).toEqual(['private']);
    else expect(workspace.signatures(uri, result.indexOf('new Renamed(') + 12)[0]?.parameters[0]?.name).toBe('value');
  } finally { workspace.dispose(); }
});

it.each([
  'class C {function D(){}}',
  'class C {static function D(){}}',
  'class C {function C(){} function D(){}}',
  'trait Init {function D(){}} class C {use Init;}',
  'class Base {function Base(){}} class C extends Base {function D(){}}',
] as const)('rejects class Rename which changes effective construction: %s', header => {
  const workspace = new SemanticWorkspace(parser); workspace.setTargetPhpVersion('7.2');
  const source = `<?php ${header} new C();`; workspace.update(uri, source, true);
  try { expect(workspace.typeRename(uri, source.indexOf('class C') + 6, 'D')).toBeUndefined(); }
  finally { workspace.dispose(); }
});

it('preserves inherited constructors, modern precedence and namespaced ordinary methods', () => {
  const workspace = new SemanticWorkspace(parser); workspace.setTargetPhpVersion('7.2');
  try {
    for (const header of [
      'class Base {function Base(){}} class C extends Base {}',
      'class C {function C(){} function __construct(){}}',
      'namespace N; class C {function C(){}}',
    ]) {
      const source = `<?php ${header} new C();`; workspace.update(uri, source, true);
      const result = renamed(workspace, source, source.indexOf('class C') + 6)!;
      expect(result).toContain('class Renamed');
      if (header.includes('function C')) expect(result).toContain('function C()');
      else expect(result).toContain('function Base()');
    }
  } finally { workspace.dispose(); }
});

it('rejects standalone Trait and method-family Rename which disables legacy construction', () => {
  const workspace = new SemanticWorkspace(parser); workspace.setTargetPhpVersion('7.2');
  try {
    for (const header of [
      'trait Init {function C(){}} class C {use Init;}',
      'class C {function C(){}} class Child extends C {function C(){}}',
      'trait Init {function seed(){}} class C {use Init {seed as C;}}',
    ]) {
      const source = `<?php ${header} new C();`; workspace.update(uri, source, true);
      const offset = header.includes('seed as') ? source.indexOf('as C') + 3 : source.indexOf('function C') + 9;
      expect(workspace.methodRename(uri, offset, 'Other')).toBeUndefined();
      expect(workspace.methodRename(uri, offset)).toBeUndefined();
    }
  } finally { workspace.dispose(); }
});

it('retains constructor dependencies across separate files without editing the shared Trait', () => {
  const workspace = new SemanticWorkspace(parser); workspace.setTargetPhpVersion('7.2');
  const traitUri = 'file:///Init.php', source = '<?php class C {use Init;} new C(7);';
  workspace.update(traitUri, '<?php trait Init {function C(int $value){}}', true);
  workspace.update(uri, source, true);
  try {
    const plan = workspace.typeRename(uri, source.indexOf('class C') + 6, 'Renamed')!;
    expect(plan.checkedUris).toEqual(expect.arrayContaining([uri, traitUri]));
    expect(plan.locations.some(item => item.uri === traitUri)).toBe(false);
    expect(plan.additionalEdits?.some(item => item.uri === traitUri)).toBe(false);
    const revision = workspace.revision();
    workspace.update(traitUri, '<?php trait Init {static function C(int $value){}}', true);
    expect(workspace.changesOnlyIn(revision, new Set([uri]))).toBe(false);
    expect(workspace.typeRename(uri, source.indexOf('class C') + 6, 'Renamed')).toBeUndefined();
  } finally { workspace.dispose(); }
});

it('preserves a proved callable array and dynamic method name in the coupled class Rename', () => {
  const workspace = new SemanticWorkspace(parser); workspace.setTargetPhpVersion('7.2');
  const source = "<?php class C {function C(){}} $c=new C(); $call=[$c,'C']; $method='C'; $c->$method();";
  workspace.update(uri, source, true);
  try {
    const result = renamed(workspace, source, source.indexOf('class C') + 6)!;
    expect(result).toContain("$call=[$c,'Renamed']");
    expect(result).toContain("$method='Renamed'");
    expect(result).toContain('$c->$method()');
  } finally { workspace.dispose(); }
});

it('preserves comments, Unicode and CRLF when inserting a class-local Trait constructor alias', () => {
  const workspace = new SemanticWorkspace(parser); workspace.setTargetPhpVersion('7.2');
  const source = '<?php\r\n// 😀\r\ntrait Init {function C(){}}\r\nclass C {use Init {\r\n// keep 😀\r\nC as public other;\r\n}}\r\nnew C();';
  workspace.update(uri, source, true);
  try {
    const result = renamed(workspace, source, source.indexOf('class C') + 6)!;
    expect(result).toContain('// 😀\r\n'); expect(result).toContain('// keep 😀\r\n');
    expect(result).toContain('C as public other;\r\n Init::C as public Renamed; }');
    workspace.update(uri, result, true);
    expect(workspace.signatures(uri, result.indexOf('new Renamed(') + 12)[0]?.fqcn).toBe('Init::C');
  } finally { workspace.dispose(); }
});

it('retracts coupling on version changes without blocking unrelated incomplete declarations', () => {
  const workspace = new SemanticWorkspace(parser);
  const source = '<?php class C {private function C(){}} new C();';
  workspace.update('file:///Other.php', '<?php class Other extends Missing {}', true);
  workspace.update(uri, source, true);
  try {
    for (const version of ['7.2', '8.5', undefined, '7.4']) {
      workspace.setTargetPhpVersion(version);
      const result = renamed(workspace, source, source.indexOf('class C') + 6)!;
      expect(result).toContain(version?.startsWith('7.') ? 'private function Renamed' : 'private function C');
    }
  } finally { workspace.dispose(); }
});
