import { afterAll, beforeAll, expect, it } from 'vitest';
import { PhpSyntaxParser } from '@php-companion/parser';
import { SemanticWorkspace } from '../src/index.js';

let parser: PhpSyntaxParser;
beforeAll(async () => { parser = await PhpSyntaxParser.createDefault(); });
afterAll(() => parser.dispose());

for (const retained of [false, true]) for (const version of ['7.2', '8.5']) {
  it.each([
    ['$result = (s§);', 'string'],
    ['$result = (str§);', 'string'],
    ['$result = (str§ing) $value;', 'string'],
    ['$result = (STRING§) $value;', 'string'],
    ['$result = (/* cast */ str§ ) $value;', 'string'],
    ['$result = (str§', 'string'],
    ['return (str§);', 'string'],
    ['echo (str§);', 'string'],
    ['consume((str§) $value);', 'string'],
    ['$result = (in§) $value;', 'int'],
    ['$result = (bo§) $value;', 'bool'],
    ['$result = (fl§) $value;', 'float'],
    ['$result = (ar§) $value;', 'array'],
    ['$result = (ob§) $value;', 'object'],
  ])('recognizes cast %s PHP ' + version + ' retained=' + retained, (tail, expected) => {
    const w = new SemanticWorkspace(parser), uri = 'file:///CastCompletion.php';
    try {
      w.setTargetPhpVersion(version);
      const marked = '<?php function consume($value) {} function run($value) { ' + tail + ' }';
      const offset = marked.indexOf('§'), source = marked.replace('§', '');
      w.update(uri, source, retained);
      const revision = w.revision(), snapshot = JSON.stringify(w.snapshot(uri));
      const context = w.completionContext(uri, offset);
      expect(context.kind).toBe('cast');
      if (context.kind !== 'cast') return;
      expect(context.cast.names).toContain(expected);
      expect(context.cast.names.every(name => name.startsWith(context.cast.prefix.toLowerCase()))).toBe(true);
      expect(source.slice(context.cast.start, context.cast.end).toLowerCase()).toMatch(/^(?:s|str|string|in|bo|fl|ar|ob)$/u);
      expect(w.revision()).toBe(revision);
      expect(JSON.stringify(w.snapshot(uri))).toBe(snapshot);
    } finally { w.dispose(); }
  });

  it.each([
    'consume(str§);', 'consume(str§', 'if (str§) {}', 'while (str§) {}',
    'function typed(str§ $value) {}', '$value->str§;', 'new Str§();',
    '$result = "(str§)";', '// (str§)\n', '/* (str§) */',
    '$result = (str§ange());', '$result = (STR§_VALUE);', '$result = (\\str§);',
    '$result = ($str§);', '$result = (str§ + 1);', '$result = (str§, 1);',
  ])('preserves other contexts %s PHP ' + version + ' retained=' + retained, tail => {
    const w = new SemanticWorkspace(parser), uri = 'file:///NotCastCompletion.php';
    try {
      w.setTargetPhpVersion(version);
      const marked = '<?php function run($value) { ' + tail + ' }', offset = marked.indexOf('§');
      w.update(uri, marked.replace('§', ''), retained);
      expect(w.completionContext(uri, offset).kind).not.toBe('cast');
    } finally { w.dispose(); }
  });
}
