import { afterAll, beforeAll, expect, it } from 'vitest';
import { builtinDocumentUri, builtinPhpExtensionStub } from '@php-companion/language-spec';
import { PhpSyntaxParser } from '@php-companion/parser';
import { SemanticWorkspace } from '../src/index.js';

let parser: PhpSyntaxParser;
beforeAll(async () => { parser = await PhpSyntaxParser.createDefault(); });
afterAll(() => parser.dispose());

it.each(['7.2', '7.4', '8.0', '8.5'] as const)('retains shipped Fileinfo constructor parameters at PHP %s', version => {
  for (const mode of ['source', 'restore', 'restoreDeclaration'] as const) {
    const workspace = new SemanticWorkspace(parser), donor = new SemanticWorkspace(parser);
    const uri = 'file:///FileinfoConstruction.php', builtinUri = builtinDocumentUri(version);
    try {
      const stub = '<?php\n' + builtinPhpExtensionStub(version, 'fileinfo');
      if (mode === 'source') workspace.update(builtinUri, stub);
      else {
        donor.update(builtinUri, stub);
        expect(workspace[mode](structuredClone(donor.snapshot(builtinUri)!), builtinUri)).toBe(true);
      }
      const source = '<?php class DerivedInfo extends finfo {} new finfo(';
      workspace.update(uri, source, true);
      expect(workspace.signature(uri, source.length)?.parameters.map(item => item.name), mode)
        .toEqual(version.startsWith('7.') ? ['options', 'arg'] : ['flags', 'magic_database']);
      const inherited = source.replace('new finfo(', 'new DerivedInfo(');
      workspace.update(uri, inherited, true);
      expect(workspace.signature(uri, inherited.length)?.parameters.map(item => item.name), mode)
        .toEqual(version.startsWith('7.') ? ['options', 'arg'] : ['flags', 'magic_database']);
      workspace.update(uri, '<?php class DerivedInfo extends finfo { public function __construct(string $label) {} } new DerivedInfo(', true);
      expect(workspace.signature(uri, workspace.source(uri)!.length)?.parameters.map(item => item.name), mode).toEqual(['label']);
    } finally { workspace.dispose(); donor.dispose(); }
  }
});

it('does not treat PHP 8, unversioned, user or namespaced same-name methods as constructors', () => {
  for (const builtinUri of ['php-companion-builtin:/common-core.php?php=8.5', 'php-companion-builtin:Unversioned.php', 'file:///User.php']) {
    const workspace = new SemanticWorkspace(parser);
    try {
      workspace.update(builtinUri, '<?php class Legacy { public function Legacy(int $wrong) {} }');
      const source = '<?php new Legacy('; workspace.update('file:///Consumer.php', source, true);
      expect(workspace.signatures('file:///Consumer.php', source.length), builtinUri).toEqual([]);
    } finally { workspace.dispose(); }
  }
  const workspace = new SemanticWorkspace(parser);
  try {
    workspace.update(builtinDocumentUri('7.2'), '<?php namespace Vendor; class Legacy { public function Legacy(int $wrong) {} }');
    const source = '<?php new \\Vendor\\Legacy('; workspace.update('file:///Consumer.php', source, true);
    expect(workspace.signatures('file:///Consumer.php', source.length)).toEqual([]);
  } finally { workspace.dispose(); }
});
