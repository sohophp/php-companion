import { afterAll, beforeAll, expect, it } from 'vitest';
import { PhpSyntaxParser } from '@php-companion/parser';
import { SemanticWorkspace } from '../src/index.js';
let parser: PhpSyntaxParser;
beforeAll(async () => { parser = await PhpSyntaxParser.createDefault(); });
afterAll(() => parser.dispose());
const header = '<?php namespace Catalog; class BuildBase {} interface BuildContract {} interface BuildOther {} trait BuildTrait {} enum BuildState { case Ready; } namespace Consumer; use Catalog as Types; ';
const cases = [
  { declaration: 'class Child extends', expected: ['BuildBase'] },
  { declaration: 'class Child implements', expected: ['BuildContract', 'BuildOther'] },
  { declaration: 'interface Child extends', expected: ['BuildContract', 'BuildOther'] },
  { declaration: 'interface Child extends Types\\BuildContract,', expected: ['BuildOther'] },
  { declaration: 'class Child implements Types\\BuildContract,', expected: ['BuildOther'] },
  { declaration: 'enum Child implements', expected: ['BuildContract', 'BuildOther'] },
];
it.each(cases.flatMap(item => [' /* } extends */ ', ' // } implements\n ', ' # } extends\r\n '].map(trivia => ({...item, trivia}))))(
  'keeps correct types in $declaration with $trivia', ({declaration, expected, trivia}) => {
    const workspace = new SemanticWorkspace(parser), uri = 'file:///Consumer.php';
    try {
      const marked = header + declaration + trivia + 'Types\\Build§ {}';
      workspace.update(uri, marked.replace('§', ''), true);
      expect(workspace.completeTypes(uri, marked.indexOf('§')).map(item => item.name)).toEqual(expected);
      expect(workspace.typeCompletionContext(uri, marked.indexOf('§'))).toMatchObject({prefix:'Build',namespace:'Catalog'});
    } finally { workspace.dispose(); }
  });
it.each(['// class Child extends Build§', 'class Child extends /* unfinished Build§', "echo 'class Child extends Build§';", '?> class Child extends Build§'])('ignores comment, string and HTML headers %s', tail => {
  const workspace = new SemanticWorkspace(parser), uri = 'file:///Consumer.php';
  try {
    const marked = header + tail;
    workspace.update(uri, marked.replace('§', ''), true);
    expect(workspace.completeTypes(uri, marked.indexOf('§'))).toEqual([]);
  } finally { workspace.dispose(); }
});
