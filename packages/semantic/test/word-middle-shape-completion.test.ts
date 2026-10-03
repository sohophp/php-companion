import { afterAll, beforeAll, expect, it } from 'vitest';
import { PhpSyntaxParser } from '@php-companion/parser';
import { SemanticWorkspace } from '../src/index.js';
import { wordMiddleShapeCases } from '../../../test/extension/suite/wordMiddleShapeFixture.js';

let parser: PhpSyntaxParser;
beforeAll(async () => { parser = await PhpSyntaxParser.createDefault(); });
afterAll(() => parser.dispose());

it.each(wordMiddleShapeCases)('replaces the entire array literal word: $name', item => {
  const workspace = new SemanticWorkspace(parser), uri = 'file:///WordMiddleShape.php';
  const source = item.marked.replace('§', ''), offset = item.marked.indexOf('§');
  try {
    workspace.update(uri, source, true);
    const before = JSON.stringify(workspace.snapshot(uri)), revision = workspace.revision();
    const context = workspace.completionContext(uri, offset);
    const result = item.part === 'key' ? context.kind === 'shape-key' ? context.shapeKeys : undefined
      : context.kind === 'general' ? context.expectedValues[0] : undefined;
    const labels = item.part === 'key' ? context.kind === 'shape-key' ? context.shapeKeys.keys.map(key => key.name) : []
      : context.kind === 'general' ? context.expectedValues.map(value => value.label) : [];
    expect(labels).toEqual(item.labels);
    if (item.insertion) {
      expect(result?.end).toBe(item.end);
      if (item.part === 'key' && context.kind === 'shape-key') expect(context.shapeKeys.hasArrow).toBe(true);
      const accepted = source.slice(0, result!.start) + item.insertion + source.slice(item.end);
      expect(accepted.endsWith(source.slice(item.end))).toBe(true);
      expect(accepted.match(/=>/gu)?.length).toBe(source.match(/=>/gu)?.length);
      expect(parser.parse(accepted).errors).toEqual([]);
    } else {
      expect(workspace.completeArrayShapeKeys(uri, offset)?.keys ?? []).toEqual([]);
      expect(workspace.completeExpectedValues(uri, offset)).toEqual([]);
    }
    expect(workspace.source(uri)).toBe(source);
    expect(workspace.revision()).toBe(revision);
    expect(JSON.stringify(workspace.snapshot(uri))).toBe(before);
  } finally { workspace.dispose(); }
});
