import { afterAll, beforeAll, expect, it } from 'vitest';
import { PhpSyntaxParser } from '@php-companion/parser';
import { SemanticWorkspace } from '../src/index.js';

let parser: PhpSyntaxParser;
beforeAll(async () => { parser = await PhpSyntaxParser.createDefault(); });
afterAll(() => parser.dispose());

const header = '<?php function send(string $value):string{return $value;} ';
const bodies = [
  'function run(int $offerA,string $offerZ):string{$offerA="changed";$offerZ=42;return $offer§;}',
  'function run(int $offerA,string $offerZ){$offerA="changed";$offerZ=42;send($offer§);}',
  'class Host {public function run(int $offerA,string $offerZ){$offerA="changed";$offerZ=42;send($offer§);}}',
  '$callback=function(int $offerA,string $offerZ):string{$offerA="changed";$offerZ=42;return $offer§;};',
  '/** @param int $offerA @param string $offerZ */ function run($offerA,$offerZ){$offerA="changed";$offerZ=42;send($offer§);}',
] as const;
for (const retained of [true, false]) it.each(bodies)(
  `ranks parameter values using current assignment facts, retained=${retained}: %s`, body => {
    const workspace = new SemanticWorkspace(parser), uri = 'file:///ReassignedParameter.php';
    try {
      const marked = header + body, offset = marked.indexOf('§');
      workspace.update(uri, marked.replace('§', ''), retained);
      const snapshot = workspace.snapshot(uri), revision = workspace.revision();
      expect(workspace.completionVariableDetail(uri, offset, '$offerA')).toBe('$offerA: string');
      expect(workspace.completionVariableDetail(uri, offset, '$offerZ')).toBe('$offerZ: int');
      expect(workspace.completeVariables(uri, offset)?.names).toEqual(['$offerA', '$offerZ']);
      expect(workspace.snapshot(uri)).toEqual(snapshot); expect(workspace.revision()).toBe(revision);
    } finally { workspace.dispose(); }
  });

for (const retained of [true, false]) it.each(['send(§);', 'send(value: §);', 'return §;'])(
  `ranks blank values after parameter reassignment, retained=${retained}: %s`, tail => {
    const workspace = new SemanticWorkspace(parser), uri = 'file:///BlankReassignedParameter.php';
    try {
      const marked = header + 'function run(int $offerA,string $offerZ):string{$offerA="changed";$offerZ=42;' + tail + '}';
      const offset = marked.indexOf('§'); workspace.update(uri, marked.replace('§', ''), retained);
      expect(workspace.completeBareExpressionVariables(uri, offset)).toEqual([
        { name: '$offerA', compatibilityRank: 0 }, { name: '$offerZ', compatibilityRank: 2 },
      ]);
    } finally { workspace.dispose(); }
  });

for (const retained of [true, false]) {
  it.each([
    'if($condition){$offerA=42;}send(§);',
    '$offerA=unknown();send(§);',
  ])(`does not fall back to the declared type on an uncertain current value, retained=${retained}: %s`, tail => {
    const workspace = new SemanticWorkspace(parser), uri = 'file:///UncertainParameter.php';
    try {
      const marked = header + 'function run(string $offerA,int $offerZ,bool $condition){' + tail + '}';
      const offset = marked.indexOf('§'); workspace.update(uri, marked.replace('§', ''), retained);
      expect(workspace.completionVariableDetail(uri, offset, '$offerA')).toBeUndefined();
      expect(workspace.completeBareExpressionVariables(uri, offset)?.find(item => item.name === '$offerA')?.compatibilityRank).toBe(1);
    } finally { workspace.dispose(); }
  });
  it(`keeps nested-scope and not-yet-completed assignments separate, retained=${retained}`, () => {
    const workspace = new SemanticWorkspace(parser), uri = 'file:///ParameterScope.php';
    try {
      for (const tail of [
        '$callback=function(int $offerZ){$offerZ=42;};send($offer§);',
        '$offerZ=send($offer§);',
      ]) {
        const marked = header + 'function run(int $offerA,string $offerZ){' + tail + '}';
        const offset = marked.indexOf('§'); workspace.update(uri, marked.replace('§', ''), retained);
        expect(workspace.completeVariables(uri, offset)?.names).toEqual(['$offerZ', '$offerA']);
        // A nested parameter assignment does not change the caller's binding;
        // an unfinished assignment in the caller still suppresses its detail.
        expect(workspace.completionVariableDetail(uri, offset, '$offerZ'))
          .toBe(tail.startsWith('$callback') ? '$offerZ: string' : undefined);
      }
    } finally { workspace.dispose(); }
  });
  it(`does not reuse a declaration after an unproved assignment, retained=${retained}`, () => {
    const workspace = new SemanticWorkspace(parser), uri = 'file:///UnknownReassignedParameter.php';
    try {
      const marked = header + 'function run(string $offerA,int $offerZ){$offerA=unknown();send(§);}';
      const offset = marked.indexOf('§'); workspace.update(uri, marked.replace('§', ''), retained);
      expect(workspace.completionVariableDetail(uri, offset, '$offerA')).toBeUndefined();
      expect(workspace.completeBareExpressionVariables(uri, offset)).toEqual([
        { name: '$offerA', compatibilityRank: 1 }, { name: '$offerZ', compatibilityRank: 2 },
      ]);
    } finally { workspace.dispose(); }
  });
  it(`refreshes an unsaved assignment and ignores later assignments, retained=${retained}`, () => {
    const workspace = new SemanticWorkspace(parser), uri = 'file:///ReassignedParameterRefresh.php';
    try {
      const initial = header + 'function run(int $offerA,string $offerZ){send($offer§);$offerA="later";}';
      const query = (marked: string): string[] | undefined => {
        const offset = marked.indexOf('§'); workspace.update(uri, marked.replace('§', ''), retained);
        return workspace.completeVariables(uri, offset)?.names;
      };
      expect(query(initial)).toEqual(['$offerZ', '$offerA']);
      const changed = initial.replace('{send(', '{$offerA="changed";$offerZ=42;send(');
      expect(query(changed)).toEqual(['$offerA', '$offerZ']);
      expect(query(initial)).toEqual(['$offerZ', '$offerA']);
    } finally { workspace.dispose(); }
  });
}
