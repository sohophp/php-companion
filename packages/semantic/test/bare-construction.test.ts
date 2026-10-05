import { afterAll, beforeAll, expect, it } from 'vitest';
import { builtinDocumentUri, builtinPhpStub } from '@php-companion/language-spec';
import { PhpSyntaxParser } from '@php-companion/parser';
import { SemanticWorkspace } from '../src/index.js';

let parser: PhpSyntaxParser;
beforeAll(async () => { parser = await PhpSyntaxParser.createDefault(); });
afterAll(() => parser.dispose());

it.each(['new R;', 'new /*🙂*/ R;', 'consume(new R);', 'new Alias;', 'new Child;'])(
  'binds omitted construction to its own constructor: %s', expression => {
    const workspace = new SemanticWorkspace(parser), uri = 'file:///Bare.php';
    const source = '<?php class R {public function __construct(int $required){}} class Child extends R {} '
      + 'use R as Alias; function consume(object $value){} ' + expression;
    try {
      workspace.update(uri, source, true);
      expect(workspace.missingRequiredArguments(uri).map(item => ({ callable: item.callable, parameters: item.parameters })))
        .toEqual([{ callable: 'R::__construct', parameters: ['required'] }]);
      const signatures = workspace.signatures(uri, source.lastIndexOf(';') - (expression.startsWith('consume') ? 1 : 0));
      expect(signatures.map(item => item.fqcn)).toEqual(expression.startsWith('consume') ? ['consume'] : []);
    } finally { workspace.dispose(); }
  },
);

it.each(['7.2', '8.5'] as const)('keeps versioned abstract and private constructor diagnostics at PHP %s', version => {
  const workspace = new SemanticWorkspace(parser), uri = 'file:///Bare.php';
  try {
    workspace.update(builtinDocumentUri(version), builtinPhpStub(version));
    workspace.update(uri, '<?php new \\ReflectionType; new \\ReflectionNamedType;', true);
    expect(workspace.invalidInstantiations(uri).map(item => item.target)).toEqual(version === '7.2' ? [] : ['ReflectionType']);
    workspace.update(uri, '<?php class P {private function __construct(){}} new P;', true);
    expect(workspace.inaccessibleInstantiations(uri).map(item => item.target)).toEqual(['P']);
    workspace.update(uri, '<?php class R {public function __construct(int $value=0){}} new R; new Unknown;', true);
    expect(workspace.missingRequiredArguments(uri)).toEqual([]);
  } finally { workspace.dispose(); }
});

it('keeps method parameter edits away from a constructor with the same source name', () => {
  const workspace = new SemanticWorkspace(parser), uri = 'file:///Bare.php';
  const source = '<?php class C {public function C(){}} $value=new C; $value->C();';
  try {
    workspace.update(builtinDocumentUri('8.5'), builtinPhpStub('8.5'));
    workspace.update(uri, source, true);
    const plan = workspace.addMethodParameter(uri, source.indexOf('function C') + 'function '.length, 'value', 'int', '1');
    expect(plan).toBeDefined();
    let changed = source;
    for (const edit of [...plan!.edits].sort((a, b) => b.start - a.start)) changed = changed.slice(0, edit.start) + edit.newText + changed.slice(edit.end);
    expect(changed).toContain('new C;');
    expect(changed).toContain('$value->C(1);');
  } finally { workspace.dispose(); }
});

it('materializes arguments for a legacy constructor with an explicit stub version authority', () => {
  const workspace = new SemanticWorkspace(parser), uri = builtinDocumentUri('7.2');
  const source = '<?php class C {public function C(){}} $value=new C; $value->C();';
  try {
    workspace.update(uri, source, true);
    const plan = workspace.addMethodParameter(uri, source.indexOf('function C') + 'function '.length, 'value', 'int', '1');
    expect(plan).toBeDefined();
    let changed = source;
    for (const edit of [...plan!.edits].sort((a, b) => b.start - a.start)) changed = changed.slice(0, edit.start) + edit.newText + changed.slice(edit.end);
    expect(changed).toContain('new C(1);');
    expect(changed).toContain('$value->C(1);');
  } finally { workspace.dispose(); }
});

it.each(['restore', 'restoreDeclaration', 'restoreSourceDeclaration'] as const)('preserves bare construction after %s', mode => {
  const donor = new SemanticWorkspace(parser), workspace = new SemanticWorkspace(parser), uri = 'file:///Restored.php';
  const source = '<?php class R {public function __construct(int $value){}} new R;';
  try {
    donor.update(uri, source);
    const snapshot = mode === 'restoreSourceDeclaration' ? donor.sourceDeclarationSnapshot(uri)! : donor.snapshot(uri)!;
    expect(workspace[mode](structuredClone(snapshot), uri)).toBe(true);
    expect(workspace.missingRequiredArguments(uri).map(item => item.callable)).toEqual(['R::__construct']);
    if (mode !== 'restoreSourceDeclaration') expect(workspace[mode]({ ...snapshot, schema: 83 }, uri)).toBe(false);
    workspace.update(uri, source.replace('new R;', 'new R(1);'), true);
    expect(workspace.missingRequiredArguments(uri)).toEqual([]);
    workspace.update(uri, source, true);
    expect(workspace.missingRequiredArguments(uri).map(item => item.callable)).toEqual(['R::__construct']);
  } finally { donor.dispose(); workspace.dispose(); }
});

it.each(['public', 'private'] as const)('keeps aliases and inherited legacy construction edits valid (%s)', visibility => {
  const workspace = new SemanticWorkspace(parser), uri = builtinDocumentUri('7.2');
  const source = `<?php use C as Alias; class C {${visibility} function C(){} public function create(){return new Alias;}} `
    + (visibility === 'public' ? 'class Child extends C {} new Child; consume(new C); function consume($value){}' : '');
  try {
    workspace.update(uri, source, true);
    const offset = source.indexOf('function C') + 'function '.length;
    const plan = visibility === 'public' ? workspace.addMethodParameter(uri, offset, 'value', 'int', '1')
      : workspace.addPrivateParameter(uri, offset, 'value', 'int', '1');
    expect(plan).toBeDefined();
    let changed = source;
    for (const edit of [...plan!.edits].sort((a, b) => b.start - a.start)) changed = changed.slice(0, edit.start) + edit.newText + changed.slice(edit.end);
    expect(changed).toContain('new Alias(1);');
    if (visibility === 'public') {
      expect(changed).toContain('new Child(1);');
      expect(changed).toContain('consume(new C(1));');
    }
    const parsed = parser.parse(changed);
    try { expect(parsed.errors).toEqual([]); } finally { parsed.tree.delete(); }
  } finally { workspace.dispose(); }
});

it('retains the existing magic constructor refactoring restriction', () => {
  const workspace = new SemanticWorkspace(parser), uri = 'file:///Restricted.php';
  const source = '<?php class C {public function __construct(){}} new C;';
  try {
    workspace.update(uri, source, true);
    expect(workspace.addMethodParameter(uri, source.indexOf('__construct'), 'value', 'int', '1')).toBeUndefined();
  } finally { workspace.dispose(); }
});
