import { afterAll, beforeAll, expect, it } from 'vitest';
import { PhpSyntaxParser } from '@php-companion/parser';
import { SemanticWorkspace } from '../src/index.js';
import { largeRankingFixture, type LargeRankingKind } from '../../../test/extension/suite/largeRankingFixture.js';

let parser: PhpSyntaxParser;
beforeAll(async () => { parser = await PhpSyntaxParser.createDefault(); });
afterAll(() => parser.dispose());

for (const retained of [true, false]) for (const kind of ['function', 'constant', 'method'] as const)
  for (const exact of [false, true]) it.each([63, 64, 65, 70, 500])(
    `prioritizes compatible ${kind} values with retained=${retained}, exact=${exact}, candidates=%i`, count => {
      const workspace = new SemanticWorkspace(parser), uri = 'file:///LargeRanking.php';
      try {
        const fixture = largeRankingFixture(kind, count, exact);
        workspace.update(uri, fixture.source, retained);
        const snapshot = workspace.snapshot(uri);
        const method = ({ function: 'completeFunctions', constant: 'completeConstants', method: 'completeMembers' } as const)[kind as LargeRankingKind];
        const items = workspace[method](uri, fixture.offset);
        expect(items).toHaveLength(count + Number(exact));
        expect(items[0]?.name).toBe(exact ? fixture.exactName : fixture.target);
        expect(items[Number(exact)]?.name).toBe(fixture.target);
        expect(items[Number(exact) + 1]?.name).toBe(fixture.unknown);
        expect(items.some(item => item.name === 'offerPrivate')).toBe(false);
        expect(workspace.source(uri)).toBe(fixture.source);
        expect(workspace.snapshot(uri)).toEqual(snapshot);
      } finally { workspace.dispose(); }
    });
