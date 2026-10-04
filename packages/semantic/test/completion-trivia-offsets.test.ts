import { afterAll, beforeAll, expect, it } from 'vitest';
import { PhpSyntaxParser } from '@php-companion/parser';
import { SemanticWorkspace } from '../src/index.js';
import { commentMaskedSlice, maskCompletionTrivia } from '../src/completionTrivia.js';

it.each(['', '/** text */', '// 中文😀\r\n/* next\nline */', '\r\n\r\n', 'x'.repeat(140_000)])(
  'preserves source length and every line ending in trivia case %#', source => {
    const masked = maskCompletionTrivia(source);
    expect(masked.length).toBe(source.length);
    expect(masked).toBe(source.replace(/[^\r\n]/g, ' '));
  });

it('masks clipped and overlapping comment ranges without changing other text', () => {
  const source = "'/* literal */' /* 中文😀\r\nnext */ value";
  const start = source.indexOf('/* 中文'), end = source.indexOf(' value');
  const ranges = [{ start, end }, { start: start + 2, end: end - 1 }];
  expect(commentMaskedSlice(source, 0, source.length, ranges)).toBe(
    source.slice(0, start) + ' '.repeat('/* 中文😀'.length) + '\r\n' + ' '.repeat('next */'.length) + ' value');
  expect(commentMaskedSlice(source, start + 3, end - 2, ranges)).toBe(
    source.slice(start + 3, end - 2).replace(/[^\r\n]/g, ' '));
  expect(commentMaskedSlice(source, end, source.length, ranges)).toBe(' value');
});

let parser: PhpSyntaxParser;
beforeAll(async () => { parser = await PhpSyntaxParser.createDefault(); });
afterAll(() => parser.dispose());
for (const retained of [false, true]) {
  it.each(['/* 中文😀 */', '/* first\r\n中文😀\nlast */', '// 中文😀\r\n', '# 中文😀\n',
    '/** ' + 'documentation '.repeat(10_000) + '*/'])(
    `keeps literal replacement offsets and updates across trivia (retained=${retained}), case %#`, comment => {
      const workspace = new SemanticWorkspace(parser), uri = 'file:///TriviaOffsets.php';
      try {
        for (const [prefix, expected, contract] of [['fa', 'false', 'bool'], ['tr', 'true', 'bool'], ['nu', 'null', '?bool']] as const) {
          const source = `<?php $literal='/* stays literal 😀 */';\nfunction send(${contract} $value):void{}\n${comment}\nsend(${prefix}${expected.slice(2)});`;
          const start = source.lastIndexOf(prefix + expected.slice(2)), offset = start + prefix.length;
          workspace.update(uri, source, retained);
          const revision = workspace.revision(), snapshot = JSON.stringify(workspace.snapshot(uri));
          expect(workspace.completeExpectedValues(uri, offset)).toEqual([
            { label: expected, insertText: expected, start, end: start + expected.length },
          ]);
          expect(workspace.revision()).toBe(revision);
          expect(JSON.stringify(workspace.snapshot(uri))).toBe(snapshot);
        }
      } finally { workspace.dispose(); }
    });
}
