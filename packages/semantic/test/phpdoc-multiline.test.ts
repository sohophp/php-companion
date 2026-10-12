import { afterAll, beforeAll, expect, it } from 'vitest';
import { PhpSyntaxParser } from '@php-companion/parser';
import { SemanticWorkspace } from '../src/index.js';
import { bindPhpDocTypeNames } from '../src/phpDocNameBinding.js';

let parser: PhpSyntaxParser;
beforeAll(async () => { parser = await PhpSyntaxParser.createDefault(); });
afterAll(() => parser.dispose());
const uri = 'file:///MultilineDefinitions.php', callerUri = 'file:///MultilineCaller.php';
const definitions = `<?php namespace Model;
class Row { public function name(): string {} }
class Other { public function otherOnly(): void {} }
/**
 * @return array{
 *   owner: Row,
 *   labels?: list<string>
 * }
 */
function rows() {}
`;
const marked = "<?php namespace Consumer; use function Model\\rows; function run(){ $value=rows(); $value['owner']->§name(); }";
const caller = marked.replace('§', ''), offset = marked.indexOf('§');

for (const retained of [true, false]) {
  it(`propagates multiline shapes and withdraws old owners after an edit, retained=${retained}`, () => {
    const workspace = new SemanticWorkspace(parser);
    try {
      workspace.update(uri, definitions, retained); workspace.update(callerUri, caller, retained);
      expect(workspace.completeMembers(callerUri, offset).map(member => member.name)).toEqual(['name']);
      const start = definitions.indexOf('name():');
      expect(workspace.definition(callerUri, offset).map(({ uri, start, end }) => ({ uri, start, end })))
        .toEqual([{ uri, start, end: start + 4 }]);
      workspace.update(uri, definitions.replace('owner: Row', 'owner: Other'), retained);
      expect(workspace.completeMembers(callerUri, offset).map(member => member.name)).toEqual(['otherOnly']);
      expect(workspace.definition(callerUri, offset)).toEqual([]);
      workspace.update(uri, definitions, retained);
      expect(workspace.completeMembers(callerUri, offset).map(member => member.name)).toEqual(['name']);
    } finally { workspace.dispose(); }
  });

  it(`uses multiline parameter shapes in the same unsaved document, retained=${retained}`, () => {
    const workspace = new SemanticWorkspace(parser);
    const marked = `<?php class Row { public function name(): string {} }
/**
 * @param array{
 *   owner: Row
 * } $input input description
 */
function run($input) { $input['owner']->§name(); }`;
    try {
      workspace.update(callerUri, marked.replace('§', ''), retained);
      expect(workspace.completeMembers(callerUri, marked.indexOf('§')).map(member => member.name)).toEqual(['name']);
    } finally { workspace.dispose(); }
  });

  it(`does not publish a return shape from an unfinished PHPDoc type, retained=${retained}`, () => {
    const workspace = new SemanticWorkspace(parser);
    try {
      workspace.update(uri, definitions.replace(' * }\n */', ' * @param string $label\n */'), retained);
      workspace.update(callerUri, caller, retained);
      expect(workspace.completeMembers(callerUri, offset)).toEqual([]);
      expect(workspace.definition(callerUri, offset)).toEqual([]);
    } finally { workspace.dispose(); }
  });
}

it.each(['restore', 'restoreDeclaration', 'restoreSourceDeclaration'] as const)(
  'preserves multiline return contracts after %s and rejects the old grammar snapshot', mode => {
    const donor = new SemanticWorkspace(parser), workspace = new SemanticWorkspace(parser);
    try {
      donor.update(uri, definitions);
      const snapshot = mode === 'restoreSourceDeclaration' ? donor.sourceDeclarationSnapshot(uri)! : donor.snapshot(uri)!;
      expect(snapshot.schema).toBe(mode === 'restoreSourceDeclaration' ? 10 : 93);
      expect(workspace[mode](JSON.parse(JSON.stringify(snapshot)), uri)).toBe(true);
      workspace.update(callerUri, caller);
      expect(workspace.completeMembers(callerUri, offset).map(member => member.name)).toEqual(['name']);
      expect(workspace[mode]({ ...snapshot, schema: mode === 'restoreSourceDeclaration' ? 9 : 91 }, uri)).toBe(false);
      expect(workspace.completeMembers(callerUri, offset).map(member => member.name)).toEqual(['name']);
    } finally { donor.dispose(); workspace.dispose(); }
  });

it('binds multiline comment names without modifying field names, literals or comment decoration', () => {
  const source = "array{\n * owner: Item,\n * literal: 'Item'\n * }";
  expect(bindPhpDocTypeNames(source, name => name === 'Item' ? '\\Model\\Item' : name, true))
    .toBe("array{\n * owner: \\Model\\Item,\n * literal: 'Item'\n * }");
  expect(bindPhpDocTypeNames('Collection<\n *\n>', name => name)).toBe('Collection<\n *\n>');
});

it('binds multiline inherited constructor parameters without leaving comment markers in the type', () => {
  const workspace = new SemanticWorkspace(parser);
  const source = `<?php namespace Model;
class Row {}
/** @template T */ class Box {
/**
 * @param array{
 *   item: T
 * } $input
 */
public function __construct($input) {}
}
/** @extends Box<Row> */ class Child extends Box {}
new Child();`;
  try {
    workspace.update(uri, source);
    const signature = workspace.signatures(uri, source.indexOf('new Child(') + 'new Child('.length)[0];
    expect(signature?.parameters[0]?.type).toContain('array{');
    expect(signature?.parameters[0]?.type).toContain('Model\\Row');
    expect(signature?.parameters[0]?.type).not.toContain('*');
  } finally { workspace.dispose(); }
});
