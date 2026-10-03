import { afterAll, beforeAll, expect, it } from 'vitest';
import { PhpSyntaxParser } from '@php-companion/parser';
import { SemanticWorkspace } from '../src/index.js';
let parser: PhpSyntaxParser;
beforeAll(async () => { parser = await PhpSyntaxParser.createDefault(); });
afterAll(() => parser.dispose());
const declarations = `<?php interface BuildContract {} trait BuildTrait {} enum BuildState { case Ready; }
abstract class BuildAbstract {} class BuildPrivate { private function __construct() {} }
class BuildProtected { protected function __construct() {} } class BuildConcrete {} `;
it.each([' ', ' /* note */ ', ' // note\n ', ' # note\r\n ', ' /* new */ /* instanceof */ '])('keeps construction filtering with trivia %j', trivia => {
  const workspace = new SemanticWorkspace(parser); const uri = 'file:///Build.php';
  try {
    const marked = declarations + `function create(): void { new${trivia}Build§; }`;
    workspace.update(uri, marked.replace('§', ''), true);
    expect(workspace.completeTypes(uri, marked.indexOf('§')).map(type => type.name)).toEqual(['BuildConcrete']);
  } finally { workspace.dispose(); }
});
it('keeps abstract and interface references after instanceof comments', () => {
  const workspace = new SemanticWorkspace(parser); const uri = 'file:///References.php';
  try {
    const marked = declarations + 'function check($value): void { $value instanceof /* note */ Build§; }';
    workspace.update(uri, marked.replace('§', ''), true);
    const names = workspace.completeTypes(uri, marked.indexOf('§')).map(type => type.name);
    expect(names).toContain('BuildContract'); expect(names).toContain('BuildAbstract'); expect(names).not.toContain('BuildTrait');
  } finally { workspace.dispose(); }
});
it('keeps expected argument type ranking across constructor trivia', () => {
  const workspace = new SemanticWorkspace(parser); const uri = 'file:///ExpectedBuild.php';
  try {
    for (const trivia of [' ', ' /* note */ ']) {
      const marked = '<?php interface BuildExpected {} class BuildChoiceA {} class BuildChoiceZ implements BuildExpected {} function accept(BuildExpected $value): void {} function create(): void { accept(new' + trivia + 'BuildChoice§); }';
      workspace.update(uri, marked.replace('§', ''), true);
      expect(workspace.completeTypes(uri, marked.indexOf('§')).map(type => type.name)).toEqual(['BuildChoiceZ', 'BuildChoiceA']);
    }
  } finally { workspace.dispose(); }
});
it('does not invent a constructor context from comment text or an unfinished comment', () => {
  const workspace = new SemanticWorkspace(parser); const uri = 'file:///CommentBuild.php';
  try {
    for (const tail of ['/* new */ Build§', 'new /* unfinished Build§']) {
      const marked = declarations + 'function create(): void { ' + tail + '; }';
      workspace.update(uri, marked.replace('§', ''), true);
      expect(workspace.typeCompletionContext(uri, marked.indexOf('§'))?.constructKind).toBeUndefined();
      expect(workspace.completeTypes(uri, marked.indexOf('§'))).toEqual([]);
    }
  } finally { workspace.dispose(); }
});
