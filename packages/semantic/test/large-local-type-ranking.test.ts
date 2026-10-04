import { afterAll, beforeAll, expect, it } from 'vitest';
import { PhpSyntaxParser } from '@php-companion/parser';
import { SemanticWorkspace } from '../src/index.js';
import { largeLocalRankingFixture } from '../../../test/extension/suite/largeLocalRankingFixture.js';

let parser: PhpSyntaxParser;
beforeAll(async () => { parser = await PhpSyntaxParser.createDefault(); });
afterAll(() => parser.dispose());

for (const retained of [true, false]) for (const kind of ['variable', 'blank', 'construction'] as const)
  it.each([31, 32, 33, 63, 64, 65, 100, 500])(
    `keeps compatible ${kind} values first with retained=${retained}, candidates=%i`, count => {
      const workspace = new SemanticWorkspace(parser), uri = 'file:///LargeLocalRanking.php';
      try {
        const fixture = largeLocalRankingFixture(kind, count);
        workspace.update(uri, fixture.source, retained);
        const snapshot = workspace.snapshot(uri), revision = workspace.revision();
        const names = kind === 'variable' ? workspace.completeVariables(uri, fixture.offset)?.names
          : kind === 'blank' ? workspace.completeBareExpressionVariables(uri, fixture.offset)?.map(item => item.name)
            : workspace.completeTypes(uri, fixture.offset).map(item => item.name);
        expect(names?.[0]).toBe(fixture.target);
        expect(names?.[1]).toBe(fixture.unknown);
        expect(names).toHaveLength(kind === 'variable' ? Math.min(count, 64) : count);
        expect(names).not.toContain('$offerOutside');
        expect(workspace.source(uri)).toBe(fixture.source);
        expect(workspace.snapshot(uri)).toEqual(snapshot); expect(workspace.revision()).toBe(revision);
      } finally { workspace.dispose(); }
    });

for (const retained of [true, false]) for (const kind of ['variable', 'blank'] as const)
  it(`ranks assigned locals and refreshes the expected contract: ${kind}, retained=${retained}`, () => {
    const workspace = new SemanticWorkspace(parser), uri = 'file:///LargeAssignedRanking.php';
    try {
      const fixture = largeLocalRankingFixture(kind, 100, true);
      const names = (source: string): string[] | undefined => {
        const offset = fixture.offset + source.length - fixture.source.length;
        workspace.update(uri, source, retained);
        return kind === 'variable' ? workspace.completeVariables(uri, offset)?.names
          : workspace.completeBareExpressionVariables(uri, offset)?.map(item => item.name);
      };
      expect(names(fixture.source)?.slice(0, 2)).toEqual([fixture.target, fixture.unknown]);
      expect(names(fixture.source.replace('consume(int $value)', 'consume(string $value)'))?.[0]).toBe('$offer000');
      expect(names(fixture.source)?.[0]).toBe(fixture.target);
      const untyped = names(fixture.source.replace('consume(int $value)', 'consume($value)'));
      if (kind === 'blank') expect(untyped).toBeUndefined();
      else expect(untyped).not.toContain('$offerOutside');
    } finally { workspace.dispose(); }
  });
