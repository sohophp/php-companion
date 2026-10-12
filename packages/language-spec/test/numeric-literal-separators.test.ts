import { afterAll, beforeAll, expect, it } from 'vitest';
import { createIncrementalEdit, PhpSyntaxParser } from '@php-companion/parser';
import { SUPPORTED_PHP_VERSIONS, unsupportedSyntax } from '../src/index.js';

let parser: PhpSyntaxParser;
beforeAll(async () => { parser = await PhpSyntaxParser.createDefault(); });
afterAll(() => parser.dispose());
const literals = ['1_000', '0xCAFE_F00D', '0b0101_1111', '0137_041', '1_000.5', '6.674_083e-11', '1e1_0', '1_2e3'];
const cases = SUPPORTED_PHP_VERSIONS.flatMap(version => ['recursive', 'native-candidates'].map(path => ({ version, path })));

it.each(cases)('checks all numeric separator forms at PHP $version through $path', ({ version, path }) => {
  for (const literal of literals) {
    const source = `<?php // 中文 😀\n$x = ${literal};`, tree = parser.parseTree(source);
    try {
      expect(tree.rootNode.hasError).toBe(false);
      expect(unsupportedSyntax(tree.rootNode, version, path === 'recursive' ? undefined : source)).toEqual(Number(version) < 7.4
        ? [{ feature: 'numeric literal separator', minimumVersion: '7.4', start: source.indexOf(literal), end: source.indexOf(literal) + literal.length }] : []);
    } finally { tree.delete(); }
  }
  const source = '<?php /* 1_000.5 */ $text="6.674_083e-11"; $a=1000.5; $b=6.674083e-11; $c=1e10;', tree = parser.parseTree(source);
  try { expect(tree.rootNode.hasError).toBe(false); expect(unsupportedSyntax(tree.rootNode, version, path === 'recursive' ? undefined : source)).toEqual([]); }
  finally { tree.delete(); }
});

it.each(['7.2', '7.4'] as const)('refreshes numeric separators across incremental recovery at PHP %s', version => {
  let previous = '', tree: ReturnType<PhpSyntaxParser['parseTree']> | undefined;
  try {
    for (const [body, separated, incomplete] of [
      ['$x=1000.5;', false, false], ['$x=1_000.5;', true, false],
      ['$x=1_000.5; function unfinished(', true, true], ['$x=1000.5;', false, false], ['$x=1_000.5;', true, false],
    ] as const) {
      const source = '<?php // 中文 😀\n' + body;
      tree?.edit(createIncrementalEdit(previous, source));
      const next = parser.parseTree(source, tree); tree?.delete(); tree = next;
      expect(tree.rootNode.hasError).toBe(incomplete);
      for (const input of [source, undefined]) expect(unsupportedSyntax(tree.rootNode, version, input)).toHaveLength(separated && version === '7.2' ? 1 : 0);
      previous = source;
    }
  } finally { tree?.delete(); }
});
