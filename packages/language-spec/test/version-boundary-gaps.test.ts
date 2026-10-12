import { afterAll, beforeAll, expect, it } from 'vitest';
import { createIncrementalEdit, PhpSyntaxParser } from '@php-companion/parser';
import { SUPPORTED_PHP_VERSIONS, unsupportedSyntax } from '../src/index.js';
import { BOUNDARY_FEATURES, VERSION_BOUNDARY_FIXTURES } from './version-boundary-fixtures.js';

let parser: PhpSyntaxParser;
beforeAll(async () => { parser = await PhpSyntaxParser.createDefault(); });
afterAll(() => parser.dispose());
const cases = SUPPORTED_PHP_VERSIONS.flatMap(version => ['recursive', 'native-candidates'].map(path => ({ version, path })));
it.each(cases)('checks octal, trailing lists and catch boundaries at PHP $version through $path', ({ version, path }) => {
  for (const fixture of VERSION_BOUNDARY_FIXTURES) {
    const prefix = '<?php // 中文 😀\n', body = fixture.source.slice(6);
    const marked = prefix + body, source = marked.replace('/*@*/', ''), start = marked.indexOf('/*@*/');
    const tree = parser.parseTree(source);
    try {
      if (fixture.valid) expect(tree.rootNode.hasError, fixture.name).toBe(false);
      const diagnostics = unsupportedSyntax(tree.rootNode, version, path === 'recursive' ? undefined : source).filter(d => BOUNDARY_FEATURES.includes(d.feature));
      expect(diagnostics, fixture.name).toEqual(fixture.feature && Number(version) < Number(fixture.minimum)
        ? [{ feature: fixture.feature, minimumVersion: fixture.minimum, start, end: start + fixture.length }] : []);
    } finally { tree.delete(); }
  }
});

it.each(['7.4', '8.1'] as const)('refreshes complete headers beside incomplete input at PHP %s', version => {
  let previous = '', tree: ReturnType<PhpSyntaxParser['parseTree']> | undefined;
  try {
    for (const [body, count, incomplete] of [
      ['function f($x) {} try {} catch(Exception $e){} $x=0755;', 0, false],
      ['function f($x,) {} try {} catch(Exception){} $x=0o755;', 3, false],
      ['function f($x,) {} try {} catch(Exception){} $x=0o755; function unfinished(', 3, true],
      ['function f($x) {} try {} catch(Exception $e){} $x=0755;', 0, false],
    ] as const) {
      const source = '<?php // 中文 😀\n' + body;
      tree?.edit(createIncrementalEdit(previous, source));
      const next = parser.parseTree(source, tree); tree?.delete(); tree = next;
      expect(tree.rootNode.hasError).toBe(incomplete);
      for (const input of [source, undefined]) expect(unsupportedSyntax(tree.rootNode, version, input).filter(d => BOUNDARY_FEATURES.includes(d.feature))).toHaveLength(version === '7.4' ? count : 0);
      previous = source;
    }
  } finally { tree?.delete(); }
});
