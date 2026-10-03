import { afterAll, beforeAll, expect, it } from 'vitest';
import { PhpSyntaxParser } from '@php-companion/parser';
import { SemanticWorkspace } from '../src/index.js';
let parser: PhpSyntaxParser;
beforeAll(async () => { parser = await PhpSyntaxParser.createDefault(); });
afterAll(() => parser.dispose());
it.each([
 ["extract($params, EXTR_REFS);", '', false],
 ["\\extract($params, EXTR_REFS);", '', false],
 ["loadBindings($params, EXTR_REFS);", 'use function extract as loadBindings;', false],
 ["eval($code);", '', false],
 ["include $path;", '', false],
 ['$params["reader"] = function () use (&$value) { return $value; };', '', false],
 ['$params["reader"] = function () use (&$other) { return $other; };', '', true],
 ['$reader = function (array &$params) { extract($params, EXTR_REFS); };', '', true],
 ["// extract($params, EXTR_REFS);", '', true],
 ["$note = 'extract($params, EXTR_REFS)';", '', true],
 ["extract($params);", 'function extract(array $params): void {}', true],
] as const)('protects inline assignment from shared local bindings: %s', (prefix, declarations, allowed) => {
 const project = new SemanticWorkspace(parser);
 try {
  const source = `<?php namespace App; ${declarations}
function run(array &$params) {
 ${prefix}
 $value = 1;
 return $value;
}`;
  const uri='file:///InlineBindings.php'; project.update(uri,source,true);
  expect(Boolean(project.inlineVariable(uri,source.indexOf('$value =')+2))).toBe(allowed);
 } finally { project.dispose(); }
});
