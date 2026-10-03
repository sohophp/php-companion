import { afterAll, beforeAll, expect, it } from 'vitest';
import { PhpSyntaxParser } from '@php-companion/parser';
import { SemanticWorkspace } from '../src/index.js';
let parser: PhpSyntaxParser;
beforeAll(async () => { parser = await PhpSyntaxParser.createDefault(); });
afterAll(() => parser.dispose());
it.each([
 ['', '', 'extracted'],
 ['extract($params, EXTR_REFS);', '', undefined],
 ['\\extract($params, EXTR_REFS);', '', undefined],
 ['bindings($params, EXTR_REFS);', 'use function extract as bindings;', undefined],
 ['eval($code);', '', undefined],
 ['include $path;', '', undefined],
 ["$note = 'extract($params, EXTR_REFS)';", '', 'extracted'],
 ['$params["reader"] = function () use (&$extracted) { return $extracted; };', '', 'extracted2'],
 ['$extracted2 = 0; $params["reader"] = function () use (&$extracted) { return $extracted; };', '', 'extracted3'],
] as const)('protects extracted assignments from shared bindings: %s', (prefix, declarations, name) => {
 const project = new SemanticWorkspace(parser);
 try {
  const source=`<?php namespace App; ${declarations}
function run(array &$params): int {
 ${prefix}
 return 1 + 2;
}`;
  const uri='file:///ExtractBindings.php';project.update(uri,source,true);
  const start=source.indexOf('1 + 2');expect(project.extractVariable(uri,start,start+5)?.variable).toBe(name);
 } finally { project.dispose(); }
});
