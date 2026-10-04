import { afterAll, beforeAll, expect, it } from 'vitest';
import { PhpSyntaxParser } from '@php-companion/parser';
import { SemanticWorkspace } from '../src/index.js';

let parser: PhpSyntaxParser;
beforeAll(async () => { parser = await PhpSyntaxParser.createDefault(); });
afterAll(() => parser.dispose());

it('distinguishes readonly initialization before and after PHP 8.4 without losing private-set restrictions', () => {
  const project = new SemanticWorkspace(parser); const uri = 'file:///ReadonlyFamily.php';
  try {
    project.update(uri, `<?php
      class Base { function initialize(Child $value): void { $value->id = 1; } }
      class Child extends Base { public readonly int $id; }
      class Grandchild extends Child { function initializeSelf(): void { $this->id = 2; } }
      class PrivateState { public private(set) readonly int $locked; }
      class PrivateChild extends PrivateState { function initializeSelf(): void { $this->locked = 3; } }
      function outside(Child $value): void { $value->id = 4; }
      class IncompleteState extends MissingBase { public readonly int $unknown; }
      function incomplete(IncompleteState $value): void { $value->unknown = 5; }
    `);
    const assignments = project.readonlyPropertyAssignments(uri);
    expect(assignments.map(item => [item.name, item.maximumPhpVersion])).toEqual([
      ['id', '8.3'], ['id', '8.3'], ['locked', undefined], ['id', undefined],
    ]);
  } finally { project.dispose(); }
});

const declarations = `
class FamilyBase { protected function baseMethod(): string { return ''; } }
class FamilyChild extends FamilyBase {
    protected function childMethod(): string { return ''; }
    protected $childProperty;
    protected static function childStatic(): string { return ''; }
    protected static $childCounter;
    protected const CHILD_CONST = 1;
    private function childHidden(): void {}
    private $childHiddenProperty;
    private const CHILD_HIDDEN = 2;
}
class FamilySibling extends FamilyBase {}
`;

it('keeps proven repeated child readonly writes invalid after PHP 8.4', () => {
  const project = new SemanticWorkspace(parser); const uri = 'file:///ReadonlyRepeated.php';
  const source = `<?php
    class RepeatedBase { public readonly int $id; }
    class RepeatedChild extends RepeatedBase {
      function initialize(): void { $this->id = 1; $this->id = 2; }
    }
  `;
  try {
    project.update(uri, source);
    expect(project.readonlyPropertyAssignments(uri).map(item => [item.start, item.maximumPhpVersion])).toEqual([
      [source.indexOf('$this->id = 1') + 7, '8.3'],
      [source.indexOf('$this->id = 2') + 7, undefined],
    ]);
  } finally { project.dispose(); }
});

it.each([
  ['parent instance', 'FamilyBase', '$value->child§;', ['childMethod', 'childProperty']],
  ['child instance', 'FamilyChild', '$value->child§;', ['childHidden', 'childHiddenProperty', 'childMethod', 'childProperty']],
  ['sibling child instance', 'FamilySibling', '$value->child§;', []],
  ['unrelated child instance', 'OutsideFamily', '$value->child§;', []],
  ['parent static', 'FamilyBase', 'FamilyChild::child§;', ['CHILD_CONST', 'childCounter', 'childStatic']],
  ['parent static property', 'FamilyBase', 'FamilyChild::$child§;', ['CHILD_CONST', 'childCounter', 'childStatic']],
  ['sibling inherited', 'FamilySibling', '$value->base§;', ['baseMethod']],
] as const)('respects protected class-family scope for %s', (_name, scope, expression, expected) => {
  const uri = 'file:///Family.php';
  const body = `public function probe(FamilyChild $value): void { ${expression} }`;
  const marked = '<?php\n' + declarations.replace(`class ${scope} {`, `class ${scope} { ${body}`)
    .replace(`class ${scope} extends FamilyBase {`, `class ${scope} extends FamilyBase { ${body}`)
    + (scope === 'OutsideFamily' ? `class OutsideFamily { ${body} }` : '');
  expect(marked).toContain('§');
  const source = marked.replace('§', '');
  for (const mode of ['live', 'declarations', 'cache'] as const) {
    const project = new SemanticWorkspace(parser);
    try {
      if (mode === 'declarations') project.updateDeclarations(uri, source);
      else project.update(uri, source);
      const snapshot = project.snapshot(uri); expect(snapshot).toBeDefined();
      if (mode === 'cache') { project.remove(uri); expect(project.restore(snapshot, uri)).toBe(true); }
      expect(project.completeMembers(uri, marked.indexOf('§')).map(member => member.name).sort(), mode).toEqual([...expected].sort());
      if (_name.startsWith('parent')) {
        const changed = marked.replace('class FamilyChild extends FamilyBase', 'class FamilyChild');
        project.update(uri, changed.replace('§', ''));
        expect(project.completeMembers(uri, changed.indexOf('§')).map(member => member.name), mode).toEqual([]);
        project.remove(uri); expect(project.restore(snapshot, uri)).toBe(true);
        expect(project.completeMembers(uri, marked.indexOf('§')).map(member => member.name).sort(), mode).toEqual([...expected].sort());
      }
    } finally { project.dispose(); }
  }
});

it('agrees with inaccessible-member diagnostics without exposing private or sibling-owned members', () => {
  const project = new SemanticWorkspace(parser); const uri = 'file:///FamilyDiagnostics.php';
  const accesses = '$value->childMethod(); echo $value->childProperty; FamilyChild::childStatic(); FamilyChild::$childCounter = 1; echo FamilyChild::CHILD_CONST;';
  const privateAccesses = '$value->childHidden(); echo $value->childHiddenProperty; echo FamilyChild::CHILD_HIDDEN;';
  try {
    project.update(uri, '<?php\n' + declarations.replace('class FamilyBase {',
      `class FamilyBase { public function probe(FamilyChild $value): void { ${accesses} ${privateAccesses} }`));
    expect(project.inaccessibleMemberAccesses(uri).map(item => item.name).sort()).toEqual(['CHILD_HIDDEN', 'childHidden', 'childHiddenProperty'].sort());
    project.update(uri, '<?php\n' + declarations.replace('class FamilySibling extends FamilyBase {',
      `class FamilySibling extends FamilyBase { public function probe(FamilyChild $value): void { ${accesses} }`));
    expect(project.inaccessibleMemberAccesses(uri).map(item => item.name).sort()).toEqual(['CHILD_CONST', 'childCounter', 'childMethod', 'childProperty', 'childStatic'].sort());
  } finally { project.dispose(); }
});
