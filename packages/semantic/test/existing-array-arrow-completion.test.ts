import { afterAll, beforeAll, expect, it } from 'vitest';
import { PhpSyntaxParser } from '@php-companion/parser';
import { SemanticWorkspace } from '../src/index.js';
import { existingShapeArrowCases } from '../../../test/extension/suite/existingShapeArrowFixture.js';

let parser: PhpSyntaxParser;
beforeAll(async () => { parser = await PhpSyntaxParser.createDefault(); });
afterAll(() => parser.dispose());

it.each(existingShapeArrowCases)('preserves an existing array arrow: $name', item => {
  const workspace = new SemanticWorkspace(parser), uri = 'file:///ExistingArrayArrow.php';
  const source = item.marked.replace('§', ''), offset = item.marked.indexOf('§');
  try {
    workspace.update(uri, source, true);
    const before = JSON.stringify(workspace.snapshot(uri)), revision = workspace.revision();
    const context = workspace.completionContext(uri, offset);
    expect(context.kind === 'shape-key' ? context.shapeKeys.keys.map(key => key.name) : []).toEqual(item.labels);
    if (item.insertion) {
      expect(context.kind).toBe('shape-key');
      if (context.kind !== 'shape-key') throw new Error('Expected proven array keys.');
      expect(context.shapeKeys.hasArrow).toBe(true);
      expect(context.shapeKeys.end).toBe(item.end);
      const accepted = source.slice(0, context.shapeKeys.start) + item.insertion + source.slice(item.end);
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
