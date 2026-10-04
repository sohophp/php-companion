import { expect, it } from 'vitest';
import { compositeTypeCompletionTail } from '../src/completionTypeTail.js';
it.each([
  ['public Foo|Ba', 7, 'Ba'],
  ['private Foo & ', 8, ''],
  ['private \\App\\Foo | Bar & Ba', 8, 'Ba'],
  ['private méta|Bé', 8, 'Bé'],
  ['function run(): Foo|Ba', 16, 'Ba'],
  ['public 1Foo|Ba', 8, 'Ba'],
  ['public Foo|Ba\n', undefined, undefined],
  ['private Foo\u00a0|\u2003Ba', 8, 'Ba'],
  ['public Foo|12Bar', undefined, undefined],
  ['public Foo|Ba $value', undefined, undefined],
  ["send(['enabled'=>shapePick", undefined, undefined],
  ['public Foo|Ba😀', undefined, undefined],
  ['Foo | 漢', undefined, undefined],
] as const)('keeps composite type suffix and absolute start: %s', (source, index, prefix) => {
  expect(compositeTypeCompletionTail(source)).toEqual(index === undefined ? undefined : { index, prefix });
});
it('does not impose a byte limit on type names, whitespace, or composite lists', () => {
  const name = 'A'.repeat(140000), source = `<?php public ${name}${' '.repeat(140000)}|Ba`;
  expect(compositeTypeCompletionTail(source)).toEqual({ index: '<?php public '.length, prefix: 'Ba' });
});
it('cannot match across punctuation in a large unrelated prefix', () => {
  const source = '<?php ' + '/** documentation */ const ENTRY=1;\n'.repeat(1500) + 'public Foo|Ba';
  expect(compositeTypeCompletionTail(source)).toEqual({ index: source.lastIndexOf('Foo|Ba'), prefix: 'Ba' });
});
