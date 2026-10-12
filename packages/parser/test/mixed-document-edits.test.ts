import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createIncrementalEdit, PhpSyntaxParser, type ParsedPhpDocument } from '../src/index.js';

let incremental: PhpSyntaxParser, cold: PhpSyntaxParser;
beforeAll(async () => { incremental = await PhpSyntaxParser.createDefault(); cold = await PhpSyntaxParser.createDefault(); });
afterAll(() => { incremental.dispose(); cold.dispose(); });
function facts(parsed: ParsedPhpDocument): Omit<ParsedPhpDocument, 'tree'> {
  const { tree, ...data } = parsed;
  void tree;
  return data;
}
const declarationFields = ['namespace', 'declarations', 'callables', 'properties', 'constants', 'imports', 'commentRanges'] as const;
function mixedSource(eol: string): string {
  return ['<?php namespace View;', 'use Domain\\One as Alias;',
    'class First { public function read(Alias $row): Alias { return $row; } }', '?>',
    '<p title="class HtmlFake {}">namespace HtmlFake; 中文 😃</p>',
    '<?= "class EchoFake {}" ?>', '<?php namespace App;', 'use Domain\\Two as Another;',
    'class Second {}', 'function render(Another $row) { return $row; }', '?>',
    '<footer>function HtmlFunction() {} namespace FooterFake;</footer>'].join(eol);
}
function assertRanges(source: string, parsed: ParsedPhpDocument, expectedNames: string[]): void {
  expect(parsed.declarations.map(item => item.fqcn)).toEqual(expectedNames);
  for (const declaration of parsed.declarations) {
    expect(source.slice(declaration.start, declaration.end)).toBe(declaration.name);
    expect(source.slice(declaration.declarationStart, declaration.declarationEnd)).toContain('class ' + declaration.name);
  }
  for (const callable of parsed.callables) expect(source.slice(callable.start, callable.end)).toBe(callable.name);
  for (const ranges of [parsed.errors, parsed.stringRanges, parsed.commentRanges, parsed.memberAccesses, parsed.typeReferences]) {
    for (const range of ranges) {
      expect(range.start).toBeGreaterThanOrEqual(0); expect(range.end).toBeGreaterThanOrEqual(range.start);
      expect(range.end).toBeLessThanOrEqual(source.length);
    }
  }
  expect(parsed.rawNames.some(item => /HtmlFake|EchoFake|FooterFake|HtmlFunction/.test(item.text))).toBe(false);
}

describe('mixed PHP/HTML incremental document boundaries', () => {
  it('does not publish PHP raw names for an HTML-only document', () => {
    const parsed = incremental.parse('<p>new HtmlOnly FLAG class Pretend {}</p>');
    try {
      expect(parsed.rawNames).toEqual([]);
      expect(parsed.declarations).toEqual([]);
      expect(parsed.errors).toEqual([]);
    } finally { parsed.tree.delete(); }
  });

  it.each(['\n', '\r\n'])('recognizes real PHP islands when strings, comments and nowdoc contain tag lookalikes, eol=%j', eol => {
    const source = ['<?php class Known {}', '/** @var Known $value */',
      '$text = "?> fake <?php Known";', '$raw = <<<\'TXT\'', '?> Known', 'TXT;',
      '$value = new Known(); ?>', '<p>new HtmlOnly</p>', '<?= new Known() ?>'].join(eol);
    const parsed = incremental.parse(source);
    try {
      expect(parsed.errors).toEqual([]);
      expect(parsed.rawNames.filter(item => /Known|HtmlOnly/.test(item.text)).map(item => [item.text, item.context]))
        .toEqual([['Known', 'phpdoc'], ['Known', 'code'], ['Known', 'code']]);
      for (const raw of parsed.rawNames) expect(source.slice(raw.start, raw.end)).toBe(raw.text);
    } finally { parsed.tree.delete(); }
  });

  it.each(['\n', '\r\n'].flatMap(eol => ['file:///Mixed.php', 'vscode-remote://wsl+RockyLinux8/project/Mixed.php'].map(uri => ({ eol, uri }))))(
    'keeps all facts and exact source ranges across edits, eol=$eol uri=$uri', ({ eol, uri }) => {
      const base = mixedSource(eol);
      const unicode = base.replace('😃', '😄');
      const inserted = unicode.replace('<p ', '<section>😀</section>' + eol + '<p ');
      const renamed = inserted.replace('class First', 'class Renamed');
      const changedNamespace = renamed.replace('namespace View;', 'namespace OtherView;');
      const incomplete = changedNamespace.replace('return $row;', 'return $row->;');
      const restoredBody = incomplete.replace('return $row->;', 'return $row;');
      const stages = [
        { source: base, names: ['View\\First', 'App\\Second'], errors: false },
        { source: unicode, names: ['View\\First', 'App\\Second'], errors: false },
        { source: inserted, names: ['View\\First', 'App\\Second'], errors: false },
        { source: renamed, names: ['View\\Renamed', 'App\\Second'], errors: false },
        { source: changedNamespace, names: ['OtherView\\Renamed', 'App\\Second'], errors: false },
        { source: incomplete, names: ['OtherView\\Renamed', 'App\\Second'], errors: true },
        { source: restoredBody, names: ['OtherView\\Renamed', 'App\\Second'], errors: false },
        { source: base, names: ['View\\First', 'App\\Second'], errors: false },
      ];
      let previous: ParsedPhpDocument | undefined, previousSource = '';
      try {
        for (const stage of stages) {
          previous?.tree.edit(createIncrementalEdit(previousSource, stage.source));
          const parsed = incremental.parse(stage.source, previous?.tree, uri);
          previous?.tree.delete(); previous = parsed; previousSource = stage.source;
          const fresh = cold.parse(stage.source, undefined, uri);
          const declarations = cold.parseDeclarations(stage.source, uri);
          try {
            expect(facts(parsed)).toEqual(facts(fresh));
            expect(parsed.tree.rootNode.toString()).toBe(fresh.tree.rootNode.toString());
            expect(parsed.tree.rootNode.endIndex).toBe(stage.source.length);
            expect(parsed.tree.rootNode.hasError).toBe(stage.errors);
            assertRanges(stage.source, parsed, stage.names);
            for (const field of declarationFields) expect(declarations[field]).toEqual(parsed[field]);
          } finally { fresh.tree.delete(); declarations.tree.delete(); }
        }
      } finally { previous?.tree.delete(); }
    },
  );

  it.each(['\n', '\r\n'])('preserves original text ranges when legacy recovery is edited, eol=%j', eol => {
    const base = ['<?php namespace A;', 'class mixed {}', '?>', '<p>namespace HtmlFake;😀</p>',
      '<?php namespace B; class Visible {} function unfinished('].join(eol);
    const next = base.replace('class mixed', 'class never').replace('😀', '😀😀');
    const first = incremental.parse(base);
    try {
      first.tree.edit(createIncrementalEdit(base, next));
      const updated = incremental.parse(next, first.tree), fresh = cold.parse(next);
      try {
        expect(facts(updated)).toEqual(facts(fresh));
        assertRanges(next, updated, ['A\\never', 'B\\Visible']);
        expect(updated.errors.map(range => next.slice(range.start, range.end))).toEqual(['function unfinished(']);
        expect(updated.tree.rootNode.endIndex).toBe(next.length);
      } finally { updated.tree.delete(); fresh.tree.delete(); }
    } finally { first.tree.delete(); }
  });

  it.each(['\n', '\r\n'])('keeps tree-only queries aligned after an HTML prefix edit, eol=%j', eol => {
    const base = mixedSource(eol), next = base.replace('<p ', '<div>😃 中文</div>' + eol + '<p ');
    const first = incremental.parseTree(base);
    try {
      first.edit(createIncrementalEdit(base, next));
      const updated = incremental.parseTree(next, first), fresh = cold.parseTree(next);
      try {
        expect(updated.rootNode.toString()).toBe(fresh.rootNode.toString());
        for (const name of ['First', 'Second', 'render']) {
          const offset = next.indexOf(name), node = updated.rootNode.descendantForIndex(offset, offset + name.length);
          expect(node.startIndex).toBe(offset); expect(node.endIndex).toBe(offset + name.length);
          expect(next.slice(node.startIndex, node.endIndex)).toBe(name);
        }
      } finally { updated.delete(); fresh.delete(); }
    } finally { first.delete(); }
  });
});
