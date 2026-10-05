import { afterAll, beforeAll, expect, it } from 'vitest';
import { PhpSyntaxParser } from '@php-companion/parser';
import { SemanticWorkspace } from '../src/index.js';

let parser: PhpSyntaxParser;
beforeAll(async () => { parser = await PhpSyntaxParser.createDefault(); });
afterAll(() => parser.dispose());

for (const retained of [true, false]) {
  it(`collects the declared function return dependency without a loaded class, retained=${retained}`, () => {
    const workspace = new SemanticWorkspace(parser);
    try {
      const uri = 'file:///Consumer.php', source = '<?php namespace App; function run(){ $value=rows(); consume($value); }';
      workspace.update('file:///rows.php', '<?php namespace App; /** @return Row */ function rows(){ return new Row(); }');
      workspace.update(uri, source, retained);
      const offset = source.lastIndexOf('$value') + 2;
      expect(workspace.variableValueOwnerTypeNamesAt(uri, offset)).toEqual(['App\\Row']);
      expect(workspace.variableValueAt(uri, offset)).toBeUndefined();
    } finally { workspace.dispose(); }
  });

  it.each([
    ['assignment', 'function run(){ $value=rows(); consume($va§lue); }', ['rows']],
    ['alias', 'function run(){ $value=rows(); $copy=$value; consume($co§py); }', ['rows']],
    ['function alias', 'use function Vendor\\rows as fetch; function run(){ $value=fetch(); consume($va§lue); }', ['Vendor\\rows']],
    ['namespace', 'namespace App; function run(){ $value=namespace\\rows(); consume($va§lue); }', ['App\\rows']],
    ['capture', 'function run(){ $value=rows(); $fn=function()use($value){ consume($va§lue); }; }', ['rows']],
    ['reference capture', 'function run(){ $value=rows(); $fn=function()use(&$value){ consume($va§lue); }; }', []],
    ['shadowed parameter', 'function run(){ $value=rows(); $fn=function($value){ consume($va§lue); }; }', []],
    ['sibling scope', 'function first(){ $value=rows(); } function second($value){ consume($va§lue); }', []],
    ['dynamic call', 'function run($factory){ $value=$factory(); consume($va§lue); }', []],
    ['comment', 'function run(){ $value=rows(); /* $va§lue */ }', []],
    ['HTML', '?> $va§lue <?php function run(){ $value=rows(); }', []],
  ] as const)(`collects %s variable function dependencies, retained=${retained}`, (_name, body, expected) => {
    const workspace = new SemanticWorkspace(parser);
    try {
      const uri = 'file:///QueryFunctions.php', source = `<?php ${body}`, offset = source.indexOf('§');
      workspace.update(uri, source.replace('§', ''), retained);
      const revision = workspace.revision(), snapshot = workspace.snapshot(uri);
      expect(workspace.variableValueFunctionNamesAt(uri, offset)).toEqual(expected);
      expect(workspace.variableValueAt(uri, offset)).toBeUndefined();
      expect(workspace.revision()).toBe(revision);
      expect(workspace.snapshot(uri)).toEqual(snapshot);
    } finally { workspace.dispose(); }
  });

  it.each([
    'function run(){ $value=rows(); $value->na§me(); }',
    'function run(){ rows()->name(§); }',
  ])(`collects member query dependencies beyond completion prefixes, retained=${retained}`, body => {
    const workspace = new SemanticWorkspace(parser);
    try {
      const uri = 'file:///MemberQuery.php', source = `<?php ${body}`, offset = source.indexOf('§');
      workspace.update(uri, source.replace('§', ''), retained);
      expect(workspace.memberReceiverFunctionNamesAt(uri, offset)).toEqual(['rows']);
      expect(workspace.memberAt(uri, offset)).toBeUndefined();
      expect(workspace.signatures(uri, offset)).toEqual([]);
    } finally { workspace.dispose(); }
  });
}
