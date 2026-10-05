import { afterAll, beforeAll, expect, it } from 'vitest';
import { PhpSyntaxParser } from '@php-companion/parser';
import { SemanticWorkspace } from '../src/index.js';

let parser: PhpSyntaxParser;
beforeAll(async () => { parser = await PhpSyntaxParser.createDefault(); });
afterAll(() => parser.dispose());

for (const retained of [true, false]) {
  it.each([
    ['variable', 'function run(){ $value=rows(); consume($va§lue); }'],
    ['captured variable', 'function run(){ $value=rows(); $fn=function()use($value){ consume($va§lue); }; }'],
    ['method return', 'function run(Api $api){ $api->rea§d(); }'],
    ['property', 'function run(Api $api){ consume($api->ro§w); }'],
  ])(`loads %s type sources without inventing a declaration, retained=${retained}`, (_name, body) => {
    const workspace = new SemanticWorkspace(parser);
    try {
      const uri = 'file:///Consumer.php', source = `<?php namespace App; ${body}`, offset = source.indexOf('§');
      workspace.update('file:///Api.php', '<?php namespace App; class Api { /** @var Row */ public $row; /** @return Row */ public function read(){} } /** @return Row */ function rows(){}');
      workspace.update(uri, source.replace('§', ''), retained);
      const revision = workspace.revision();
      expect(workspace.typeDefinitionOwnerTypeNamesAt(uri, offset)).toEqual(['App\\Row']);
      expect(workspace.typeDefinition(uri, offset)).toEqual([]);
      expect(workspace.revision()).toBe(revision);
      const rowUri = 'file:///Row.php', row = '<?php namespace App; class Row {}';
      workspace.update(rowUri, row);
      expect(workspace.typeDefinition(uri, offset)).toEqual([{ uri: rowUri, start: row.indexOf('Row'), end: row.indexOf('Row') + 3,
        name: 'Row', fqcn: 'App\\Row', kind: 'class' }]);
    } finally { workspace.dispose(); }
  });

  it.each([
    'function run($factory){ $value=$factory(); consume($va§lue); }',
    'function first(){ $value=rows(); } function second($value){ consume($va§lue); }',
    'function run(){ $value=rows(); $fn=function()use(&$value){ consume($va§lue); }; }',
    'function run(){ $value=rows(); /* $va§lue */ }',
    '?> $va§lue <?php function run(){ $value=rows(); }',
  ])(`keeps unsupported query sources conservative, retained=${retained}`, body => {
    const workspace = new SemanticWorkspace(parser);
    try {
      const uri = 'file:///Negative.php', source = `<?php ${body}`, offset = source.indexOf('§');
      workspace.update('file:///rows.php', '<?php /** @return Row */ function rows(){}');
      workspace.update(uri, source.replace('§', ''), retained);
      expect(workspace.typeDefinitionOwnerTypeNamesAt(uri, offset)).toEqual([]);
    } finally { workspace.dispose(); }
  });
}
