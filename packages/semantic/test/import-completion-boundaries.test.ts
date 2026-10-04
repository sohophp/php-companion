import { afterAll, beforeAll, expect, it } from 'vitest';
import { PhpSyntaxParser } from '@php-companion/parser';
import { SemanticWorkspace } from '../src/index.js';

let parser: PhpSyntaxParser;
beforeAll(async () => { parser = await PhpSyntaxParser.createDefault(); });
afterAll(() => parser.dispose());
const uri = 'file:///ImportBoundary.php';
const prefixes = [
  '<?php namespace App; ',
  '<?php namespace App { ',
  '<?php namespace App; $text="literal;😀"; /* 中文; comment */\r\n',
  '<?php namespace App; use Existing\\Done; /** ' + 'documentation; '.repeat(1000) + '*/\n',
];
const catalog = '<?php namespace Vendor\\Billing; class Invoice {} function createInvoice():void{} const API_KEY=1;';

for (const retained of [false, true]) {
  it(`keeps ordinary type and namespace imports through changing prefixes, retained=${retained}`, () => {
    const workspace = new SemanticWorkspace(parser);
    try {
      workspace.update('file:///Catalog.php', catalog);
      for (const prefix of prefixes) {
        const marked = prefix + 'use Vendor\\Billing\\Inv§oice;';
        workspace.update(uri, marked.replace('§', ''), retained);
        const offset = marked.indexOf('§');
        expect(workspace.typeCompletionContext(uri, offset)).toMatchObject({ namespace: 'Vendor\\Billing', prefix: 'Inv' });
        expect(workspace.completeTypes(uri, offset)).toMatchObject([{ fqcn: 'Vendor\\Billing\\Invoice', importFqcn: undefined }]);
        const namespace = prefix + 'use Vendor\\Bil§ling;';
        workspace.update(uri, namespace.replace('§', ''), retained);
        expect(workspace.namespaceImportContext(uri, namespace.indexOf('§'))).toEqual({ qualifier: 'Vendor', prefix: 'Bil' });
      }
    } finally { workspace.dispose(); }
  });

  it(`keeps absolute grouped replacement ranges after preceding semicolons, retained=${retained}`, () => {
    const workspace = new SemanticWorkspace(parser);
    try {
      workspace.update('file:///Catalog.php', catalog);
      for (const prefix of prefixes) {
        for (const [tail, kind, token] of [
          ['use function Vendor\\Billing\\{crea§};', 'function', 'crea'],
          ['use const Vendor\\Billing\\{API_§};', 'const', 'API_'],
          ['use Vendor\\Billing\\{Invoice, function crea§}', 'function', 'crea'],
          ['use Vendor\\Billing\\{function createInvoice, const API_§', 'const', 'API_'],
        ] as const) {
          const marked = prefix + tail, offset = marked.indexOf('§'), source = marked.replace('§', '');
          workspace.update(uri, source, retained);
          const revision = workspace.revision(), snapshot = JSON.stringify(workspace.snapshot(uri));
          expect(workspace.symbolImportContext(uri, offset)).toEqual({ kind, qualifier: 'Vendor\\Billing', prefix: token,
            replacementStart: offset - token.length, replacementEnd: offset });
          expect(workspace.completeFunctions(uri, offset)).toEqual([]);
          expect(workspace.completeConstants(uri, offset)).toEqual([]);
          expect(workspace.revision()).toBe(revision);
          expect(JSON.stringify(workspace.snapshot(uri))).toBe(snapshot);
        }
        const marked = prefix + 'use Vendor\\Billing\\{function createInvoice, Inv§};';
        const source = marked.replace('§', ''), offset = marked.indexOf('§');
        workspace.update(uri, source, retained);
        expect(workspace.typeCompletionContext(uri, offset)).toMatchObject({ namespace: 'Vendor\\Billing', prefix: 'Inv',
          replacementStart: offset - 'Inv'.length, replacementEnd: offset });
        expect(workspace.completeTypes(uri, offset)).toMatchObject([{ fqcn: 'Vendor\\Billing\\Invoice', importFqcn: undefined }]);
      }
    } finally { workspace.dispose(); }
  });

  it(`withdraws symbol candidates in import alias names, retained=${retained}`, () => {
    const workspace = new SemanticWorkspace(parser);
    try {
      workspace.update('file:///Catalog.php', catalog);
      for (const prefix of prefixes) for (const tail of [
        'use function Vendor\\Billing\\createInvoice as crea§;',
        'use const Vendor\\Billing\\API_KEY as API_§;',
        'use Vendor\\Billing\\{function createInvoice as crea§};',
        'use Vendor\\Billing\\{const API_KEY as API_§};',
      ]) {
        const marked = prefix + tail, offset = marked.indexOf('§');
        workspace.update(uri, marked.replace('§', ''), retained);
        expect(workspace.symbolImportContext(uri, offset)).toBeUndefined();
        expect(workspace.completeFunctions(uri, offset)).toEqual([]);
        expect(workspace.completeConstants(uri, offset)).toEqual([]);
      }
    } finally { workspace.dispose(); }
  });

  it(`retains native parameter context across a quoted default semicolon, retained=${retained}`, () => {
    const workspace = new SemanticWorkspace(parser);
    try {
      workspace.update('file:///Catalog.php', catalog);
      const marked = '<?php use Vendor\\Billing\\Invoice; function send(string $text=";", Inv§ $value):void{}';
      workspace.update(uri, marked.replace('§', ''), retained);
      expect(workspace.typeCompletionContext(uri, marked.indexOf('§'))).toMatchObject({ prefix: 'Inv' });
      expect(workspace.completeTypes(uri, marked.indexOf('§')).map(item => item.fqcn)).toEqual(['Vendor\\Billing\\Invoice']);
    } finally { workspace.dispose(); }
  });
}
