import { afterAll, beforeAll, expect, it } from 'vitest';
import { PhpSyntaxParser } from '@php-companion/parser';
import { SemanticWorkspace } from '../src/index.js';

let parser: PhpSyntaxParser;
beforeAll(async () => { parser = await PhpSyntaxParser.createDefault(); });
afterAll(() => parser.dispose());

const definitions = `<?php
class Child {
  public bool $flag;
  private bool $hidden;
  public readonly bool $locked;
}
class Holder {
  public Child $child;
  /** @var array<int, Child> */ public array $items;
  public static bool $staticFlag;
  public function child(): Child { return new Child(); }
  public static function create(): Child { return new Child(); }
}
function make(): Child { return new Child(); }
function requiredMake(int $id): Child { return new Child(); }
function scalar(): string { return 'text'; }
function pickA(): string { return 'text'; }
function pickZ(): bool { return true; }
function pickUnknown() {}
function takeText(string $value): void {}
`;

const targets = [
  '$holder->child->flag',
  '$holder /* owner */ -> child /* path */ -> flag',
  '$holder->child()->flag',
  'Holder::create()->flag',
  '($holder->child)->flag',
  'make()->flag',
  '(new Child())->flag',
  '$items[0]->flag',
  '$holder->items[0]->flag',
  'Holder::$staticFlag',
] as const;

for (const retained of [true, false]) it.each(targets)(
  `uses the actual assignment target contract, retained=${retained}: %s`, target => {
    const workspace = new SemanticWorkspace(parser), uri = 'file:///AssignmentTarget.php';
    try {
      for (const value of ['pick§', 'pick§Z', '$offer§', '§', 'tr§', '(pick§)', 'null ?? pick§']) {
        const marked = definitions + `/** @param array<int, Child> $items */ function run(Holder $holder,array $items,string $offerA,bool $offerZ){${target} = ${value};}`;
        const source = marked.replace('§', ''), offset = marked.indexOf('§');
        workspace.update(uri, source, retained);
        const snapshot = workspace.snapshot(uri), revision = workspace.revision();
        if (value === '$offer§') expect(workspace.completeVariables(uri, offset)?.names).toEqual(['$offerZ', '$offerA']);
        else if (value === '§') {
          expect(workspace.completeBareExpressionVariables(uri, offset)?.find(item => item.name === '$offerZ')?.compatibilityRank).toBe(0);
          expect(workspace.completeBareExpressionVariables(uri, offset)?.find(item => item.name === '$offerA')?.compatibilityRank).toBe(2);
        } else if (value === 'tr§') expect(workspace.completeExpectedValues(uri, offset).map(item => item.label)).toEqual(['true']);
        else expect(workspace.completeFunctions(uri, offset).map(item => [item.name, item.compatibilityRank])).toEqual([
          ['pickZ', 0], ['pickUnknown', 1], ['pickA', 2],
        ]);
        expect(workspace.snapshot(uri)).toEqual(snapshot);
        expect(workspace.revision()).toBe(revision);
        expect(workspace.source(uri)).toBe(source);
      }
    } finally { workspace.dispose(); }
  },
);

for (const retained of [true, false]) it.each([
  '$holder->child->hidden', '$holder->child->locked', '$unknown->flag',
  '$holder->child->missing', '$holder?->child->flag', '$holder->child?->flag',
  'requiredMake()->flag', 'scalar()->flag',
] as const)(`does not invent a writable contract, retained=${retained}: %s`, target => {
  const workspace = new SemanticWorkspace(parser), uri = 'file:///AssignmentUnknown.php';
  try {
    const marked = definitions + `function run(Holder $holder,$unknown){${target}=pick§;}`;
    workspace.update(uri, marked.replace('§', ''), retained);
    expect(workspace.completeFunctions(uri, marked.indexOf('§')).map(item => [item.name, item.compatibilityRank]))
      .toEqual([['pickA', undefined], ['pickUnknown', undefined], ['pickZ', undefined]]);
  } finally { workspace.dispose(); }
});

for (const retained of [true, false]) it.each([
  ['takeText($holder->child->flag=pick§);', ['pickZ', 'pickUnknown', 'pickA']],
  ['takeText($unknown->flag=pick§);', ['pickA', 'pickUnknown', 'pickZ']],
  ['$holder->child->flag=takeText(pick§);', ['pickA', 'pickUnknown', 'pickZ']],
  ['$holder->child->flag=unknown(pick§);', ['pickA', 'pickUnknown', 'pickZ']],
  ['$holder->child->flag=!pick§;', ['pickA', 'pickUnknown', 'pickZ']],
  ['$holder->child->flag=$ready ? pick§ : false;', ['pickZ', 'pickUnknown', 'pickA']],
  ['$holder->child->flag=pick§ ? true : false;', ['pickA', 'pickUnknown', 'pickZ']],
] as const)(`keeps the innermost value contract, retained=${retained}: %s`, (body, expected) => {
  const workspace = new SemanticWorkspace(parser), uri = 'file:///AssignmentBoundary.php';
  try {
    const marked = definitions + `function run(Holder $holder,bool $ready,$unknown){${body}}`;
    workspace.update(uri, marked.replace('§', ''), retained);
    expect(workspace.completeFunctions(uri, marked.indexOf('§')).map(item => item.name)).toEqual(expected);
  } finally { workspace.dispose(); }
});

for (const retained of [true, false]) it('refreshes target types and navigation without saving, retained=' + retained, () => {
  const workspace = new SemanticWorkspace(parser), uri = 'file:///AssignmentRefresh.php';
  try {
    for (const target of ['make()->flag', '$holder->items[0]->flag', '($holder->child)->flag']) {
      for (const type of ['bool', 'string', 'bool']) {
        const marked = definitions.replace('public bool $flag;', `public ${type} $flag;`)
          + `function run(Holder $holder){${target}=pick§;} function unfinished(`;
        const source = marked.replace('§', ''), offset = marked.indexOf('§');
        workspace.update(uri, source, retained);
        const propertyOffset = source.lastIndexOf('flag=') + 1;
        expect(workspace.memberAt(uri, propertyOffset)).toMatchObject({ kind: 'property', name: 'flag', returnType: type });
        expect(workspace.definition(uri, propertyOffset).map(({ uri: targetUri, start, end }) => ({ uri: targetUri, start, end })))
          .toEqual([{ uri, start: source.indexOf('$flag;'), end: source.indexOf('$flag;') + '$flag'.length }]);
        expect(workspace.completeFunctions(uri, offset).map(item => item.name))
          .toEqual(type === 'bool' ? ['pickZ', 'pickUnknown', 'pickA'] : ['pickA', 'pickUnknown', 'pickZ']);
      }
    }
  } finally { workspace.dispose(); }
});

for (const retained of [true, false]) it.each(['make()', '(new Child())', '$holder->items[0]', '$holder->child()'] as const)(
  `starts member completion on a proven expression receiver, retained=${retained}: %s`, receiver => {
    const workspace = new SemanticWorkspace(parser), uri = 'file:///ExpressionReceiver.php';
    try {
      for (const prefix of ['', 'fl']) {
        const marked = definitions + `function run(Holder $holder){${receiver}->${prefix}§;} function unfinished(`;
        workspace.update(uri, marked.replace('§', ''), retained);
        expect(workspace.completeMembers(uri, marked.indexOf('§')).map(item => item.name))
          .toEqual(prefix ? ['flag'] : ['flag', 'locked']);
      }
    } finally { workspace.dispose(); }
  },
);
