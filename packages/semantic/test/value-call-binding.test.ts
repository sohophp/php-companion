import { afterAll, beforeAll, expect, it } from 'vitest';
import { PhpSyntaxParser } from '@php-companion/parser';
import { builtinDocumentUri, builtinPhpStub } from '@php-companion/language-spec';
import { SemanticWorkspace } from '../src/index.js';
let parser: PhpSyntaxParser;
beforeAll(async () => { parser = await PhpSyntaxParser.createDefault(); });
afterAll(() => parser.dispose());
it.each(['7.2', '8.5'] as const)('retains an object binding when optional reference outputs are not supplied at PHP %s', version => {
  const workspace = new SemanticWorkspace(parser); const uri = 'file:///ValueBinding.php';
  try {
    workspace.update(builtinDocumentUri(version), builtinPhpStub(version));
    const body = `<?php namespace App; $formatter = new \\IntlDateFormatter('en_US', 0, 0); datefmt_parse($formatter, '1/1/70'); $formatter->getErrorC;`;
    workspace.update(uri, body, true);
    expect(workspace.completeMembers(uri, body.indexOf('getErrorC;') + 9).map(item => item.name)).toEqual(['getErrorCode']);
  } finally { workspace.dispose(); }
}, 15000);
it.each([
  ['function', 'function observe($item, &$output = null) {}', 'observe($item);', true],
  ['constructor', 'class Observe { public function __construct($item, &$output = null) {} }', 'new Observe($item);', true],
  ['named output omitted', 'function observe($item, &$output = null) {}', 'observe(item: $item);', true],
  ['actual reference', 'function observe(&$item) {}', 'observe($item);', false],
  ['reference constructor', 'class Observe { public function __construct(&$item) {} }', 'new Observe($item);', false],
  ['unknown call', '', 'observe($item);', false],
  ['missing required reference argument', 'function observe($item, &$output) {}', 'observe($item);', false],
  ['missing required constructor argument', 'class Observe { public function __construct($item, &$output) {} }', 'new Observe($item);', false],
  ['literal unpack cannot rebind its element variable', 'function observe($item, &$output = null) {}', 'observe(...[$item]);', true],
])('protects local object completion after %s', (_name, declaration, call, available) => {
  const workspace = new SemanticWorkspace(parser); const uri = 'file:///ValueBinding.php';
  try {
    const source = `<?php class Item { public function itemOnly(): void {} } ${declaration} function read(): void { $item = new Item(); ${call} $item->itemO; }`;
    workspace.update(uri, source, true);
    expect(workspace.completeMembers(uri, source.indexOf('itemO;') + 5).map(item => item.name).includes('itemOnly')).toBe(available);
  } finally { workspace.dispose(); }
});
