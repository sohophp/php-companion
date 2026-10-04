import { afterAll, beforeAll, expect, it } from 'vitest';
import { PhpSyntaxParser } from '@php-companion/parser';
import { SemanticWorkspace } from '../src/index.js';

let parser: PhpSyntaxParser;
beforeAll(async () => { parser = await PhpSyntaxParser.createDefault(); });
afterAll(() => parser.dispose());
const catalog = '<?php class RootImportEntity {} interface RootImportContract {} trait RootImportTrait {} '
  + 'function rootImportFunction():void{} const ROOT_IMPORT_CONST=1; '
  + 'namespace Vendor; class RootImportEntity {} function rootImportFunction():void{} const ROOT_IMPORT_CONST=2;';
const uri = 'file:///Consumer.php';

for (const retained of [false, true]) {
  it(`merges root type imports with namespace context without importing local names, retained=${retained}`, () => {
    const workspace = new SemanticWorkspace(parser);
    try {
      workspace.update('file:///Catalog.php', catalog);
      for (const header of ['<?php namespace Consumer; ', '<?php namespace Consumer { ',
        '<?php namespace Consumer; $text="quoted;😀"; /* 中文; before */\r\n',
        '<?php\n' + '// ordinary preceding code\n'.repeat(6_000) + 'namespace Consumer; ']) {
        for (const tail of ['use RootImportEn§tity;', 'use \\RootImportEn§tity;',
          'use Vendor\\RootImportEntity as Existing, RootImportEn§tity;', 'USE RootImportEn§tity;']) {
          const marked = header + tail, source = marked.replace('§', ''), offset = marked.indexOf('§');
          workspace.update(uri, source, retained);
          const revision = workspace.revision(), snapshot = JSON.stringify(workspace.snapshot(uri));
          expect(workspace.typeCompletionContext(uri, offset)).toMatchObject({ prefix: 'RootImportEn', namespace: '' });
          expect(workspace.namespaceImportContext(uri, offset)).toEqual({ qualifier: '', prefix: 'RootImportEn' });
          expect(workspace.completeTypes(uri, offset)).toMatchObject([{ fqcn: 'RootImportEntity', importFqcn: undefined }]);
          expect(workspace.completeFunctions(uri, offset)).toEqual([]);
          expect(workspace.completeConstants(uri, offset)).toEqual([]);
          expect(workspace.revision()).toBe(revision); expect(JSON.stringify(workspace.snapshot(uri))).toBe(snapshot);
        }
      }
    } finally { workspace.dispose(); }
  });

  it(`recognizes blank and qualified roots plus each comma clause, retained=${retained}`, () => {
    const workspace = new SemanticWorkspace(parser);
    try {
      workspace.update('file:///Catalog.php', catalog);
      for (const [tail, qualifier, prefix] of [['use §;', '', ''], ['use \\§;', '', ''],
        ['use RootImportEntity as Alias, §;', '', ''], ['use RootImportEntity, Vendor\\RootImportEn§tity;', 'Vendor', 'RootImportEn'],
        ['use /* statement; 😀 */ RootImportEn§tity;', '', 'RootImportEn'],
        ['use Vendor\\RootImportEntity /* ; */ as Existing, /* ; */ RootImportEn§tity;', '', 'RootImportEn']] as const) {
        const marked = '<?php namespace Consumer; ' + tail, offset = marked.indexOf('§');
        workspace.update(uri, marked.replace('§', ''), retained);
        expect(workspace.typeCompletionContext(uri, offset)).toMatchObject({ prefix, namespace: qualifier });
        expect(workspace.namespaceImportContext(uri, offset)).toEqual({ prefix, qualifier });
        const types = workspace.completeTypes(uri, offset);
        expect(types.map(item => item.fqcn)).toContain(qualifier ? 'Vendor\\RootImportEntity' : 'RootImportEntity');
        expect(types.every(item => item.fqcn.split('\\').slice(0, -1).join('\\') === qualifier && !item.importFqcn)).toBe(true);
      }
    } finally { workspace.dispose(); }
  });

  it(`keeps function and constant imports separate across comma clauses, retained=${retained}`, () => {
    const workspace = new SemanticWorkspace(parser);
    try {
      workspace.update('file:///Catalog.php', catalog);
      for (const [tail, kind, qualifier, prefix] of [
        ['use function rootImportF§unction;', 'function', '', 'rootImportF'],
        ['use function \\rootImportF§unction;', 'function', '', 'rootImportF'],
        ['use function Vendor\\rootImportFunction as Existing, rootImportF§unction;', 'function', '', 'rootImportF'],
        ['use const ROOT_IMPORT_C§ONST;', 'const', '', 'ROOT_IMPORT_C'],
        ['USE CONST Vendor\\ROOT_IMPORT_CONST AS Existing, ROOT_IMPORT_C§ONST;', 'const', '', 'ROOT_IMPORT_C'],
        ['use function /* ; */ rootImportFunction as Existing, /* ; */ Vendor\\rootImportF§unction;', 'function', 'Vendor', 'rootImportF'],
      ] as const) {
        const marked = '<?php namespace Consumer; ' + tail, offset = marked.indexOf('§');
        workspace.update(uri, marked.replace('§', ''), retained);
        expect(workspace.symbolImportContext(uri, offset)).toEqual({ kind, qualifier, prefix });
        expect(workspace.typeCompletionContext(uri, offset)).toBeUndefined();
        expect(workspace.namespaceImportContext(uri, offset)).toBeUndefined();
        expect(workspace.completeTypes(uri, offset)).toEqual([]);
        expect(workspace.completeFunctions(uri, offset)).toEqual([]); expect(workspace.completeConstants(uri, offset)).toEqual([]);
      }
    } finally { workspace.dispose(); }
  });

  it(`clears generic candidates in class and symbol alias names, retained=${retained}`, () => {
    const workspace = new SemanticWorkspace(parser);
    try {
      workspace.update('file:///Catalog.php', catalog);
      for (const tail of ['use RootImportEntity as rootImportF§;', 'use RootImportEntity as ROOT_IMPORT_C§;',
        'use RootImportEntity as pub§;', 'use Vendor\\RootImportEntity as Existing, RootImportEntity as rootImportF§;',
        'use function rootImportFunction as rootImportF§;', 'use const ROOT_IMPORT_CONST as ROOT_IMPORT_C§;']) {
        const marked = '<?php namespace Consumer; ' + tail, offset = marked.indexOf('§');
        workspace.update(uri, marked.replace('§', ''), retained);
        expect(workspace.typeCompletionContext(uri, offset)).toBeUndefined();
        expect(workspace.namespaceImportContext(uri, offset)).toBeUndefined();
        expect(workspace.symbolImportContext(uri, offset)).toBeUndefined();
        expect(workspace.phpKeywordCompletionContext(uri, offset)).toBeUndefined();
        expect(workspace.completeTypes(uri, offset)).toEqual([]);
        expect(workspace.completeFunctions(uri, offset)).toEqual([]); expect(workspace.completeConstants(uri, offset)).toEqual([]);
      }
    } finally { workspace.dispose(); }
  });

  it(`keeps grouped middle-word ranges through comment braces, retained=${retained}`, () => {
    const workspace = new SemanticWorkspace(parser);
    try {
      workspace.update('file:///Catalog.php', catalog);
      for (const [tail, kind, prefix] of [['RootImportEn§tity', 'class', 'RootImportEn'],
        ['function rootImportF§unction', 'function', 'rootImportF'], ['const ROOT_IMPORT_C§ONST', 'const', 'ROOT_IMPORT_C']] as const) {
        const marked = '<?php namespace Consumer; use Vendor\\{/* { ; 中文😀 } */\r\n' + tail + '};';
        const source = marked.replace('§', ''), offset = marked.indexOf('§'); workspace.update(uri, source, retained);
        const expected = { prefix, replacementStart: offset - prefix.length, replacementEnd: source.length - 2 };
        if (kind === 'class') expect(workspace.typeCompletionContext(uri, offset)).toMatchObject({ ...expected, namespace: 'Vendor' });
        else expect(workspace.symbolImportContext(uri, offset)).toEqual({ ...expected, kind, qualifier: 'Vendor' });
      }
    } finally { workspace.dispose(); }
  });
}
