import { afterAll, beforeAll, expect, it } from 'vitest';
import { PhpSyntaxParser } from '@php-companion/parser';
import { SemanticWorkspace } from '../src/index.js';
let parser: PhpSyntaxParser;
beforeAll(async () => { parser = await PhpSyntaxParser.createDefault(); });
afterAll(() => parser.dispose());
const header = '<?php enum State { case Ready; case Waiting; } ';
const cases: [string, string[]][] = [
  ['function run(bool $flag = tr§): void {}', ['true']],
  ['function run(?bool $flag = nu§): void {}', ['null']],
  ['function run(State $state = rea§): void {}', ['State::Ready']],
  ['class Host { public bool $first = false, $second = tr§; }', ['true']],
  ['class Host { public ?bool $flag = nu§; }', ['null']],
  ['class Host { public State $state = rea§; }', ['State::Ready']],
  ['class Host { public function __construct(public bool $flag = tr§) {} }', ['true']],
  ['class Host { public function run(bool $flag = fa§): State { return State::Ready; } }', ['false']],
  ['function run($flag = tr§): void {}', []],
  ['class Host { public $flag = tr§; }', []],
  ['class Host { public bool $flag = !tr§; }', []],
  ['function run(bool $flag = (tr§)): void {}', ['true']],
  ['function run(bool $flag = nu§ ?? true): void {}', ['null']],
  ['function run(bool|State $flag = rea§): void {}', ['State::Ready']],
  ['function text(string $value): string { return $value; } function run(bool $flag = text(tr§)): void {}', []],
];
for (const retained of [true, false]) it.each(cases)(`uses native declaration default types with retained tree=${retained}: %s`, (tail, labels) => {
  const workspace = new SemanticWorkspace(parser), uri = 'file:///Defaults.php';
  try {
      const marked = header + tail, offset = marked.indexOf('§');
      workspace.update(uri, marked.replace('§', ''), retained);
      expect(workspace.phpKeywordCompletionContext(uri, offset)?.kind, tail).toBe('expression');
      expect(workspace.completeExpectedValues(uri, offset).map(item => item.label), tail).toEqual(labels);
  } finally { workspace.dispose(); }
});

for (const retained of [true, false]) it.each([
  ['class Host { private const TOKEN = 1; public $value = self::TO§; }', ['TOKEN']],
  ['class Host { private static function target() {} public $callback = self::tar§; }', ['target']],
  ['class Other { private const TOKEN = 1; } class Host { public $value = Other::TO§; }', []],
] as const)(`resolves default self access without exposing outside private members with retained tree=${retained}: %s`, (tail, names) => {
  const workspace = new SemanticWorkspace(parser), uri = 'file:///DefaultOwner.php';
  try {
    const marked = '<?php ' + tail, offset = marked.indexOf('§');
    workspace.update(uri, marked.replace('§', ''), retained);
    expect(workspace.completeMembers(uri, offset).map(item => item.name)).toEqual(names);
  } finally { workspace.dispose(); }
});

for (const retained of [true, false]) it.each([
  ['function run(bool $flag = demo§) {}', { demoBool: 2, demoText: 2 }, false],
  ['function run(Closure $callback = demo§) {}', { demoBool: 0, demoText: 0 }, true],
  ['function run(Closure $callback = demo§) {}', { demoBool: 1, demoText: 1 }, false],
  ['function run(): bool { return demo§; }', { demoBool: 0, demoText: 2 }, false],
] as const)(`ranks default callable references as Closure rather than call results with retained tree=${retained}: %s`, (tail, expected, closureFact) => {
  const workspace = new SemanticWorkspace(parser), uri = 'file:///DefaultCallableRank.php';
  try {
    if (closureFact) workspace.update('php-companion-builtin:Closure.php', '<?php final class Closure {}', true);
    const marked = '<?php function demoBool(): bool { return true; } function demoText(): string { return "x"; } ' + tail;
    const offset = marked.indexOf('§'); workspace.update(uri, marked.replace('§', ''), retained);
    expect(Object.fromEntries(workspace.completeFunctions(uri, offset).map(item => [item.name, item.compatibilityRank]))).toEqual(expected);
  } finally { workspace.dispose(); }
});

for (const retained of [true, false]) it.each([
  ['function run($value = strl§) {}', 'parameter'],
  ['function run($value = [strl§]) {}', 'parameter'],
  ['class Host { public $value = strl§; }', 'property'],
  ['class Host { public function __construct(public $value = strl§) {} }', 'parameter'],
  ['class Host { public $callback = static function() { return strl§; }; }', undefined],
  ['class Host { public $callback = static function(bool $value = tr§) {}; }', 'parameter'],
  ['function run() { $value = strl§; }', undefined],
] as const)(`keeps the default boundary separate from closure code with retained tree=${retained}: %s`, (tail, expected) => {
  const workspace = new SemanticWorkspace(parser), uri = 'file:///DefaultBoundary.php';
  try {
    const marked = '<?php ' + tail, offset = marked.indexOf('§');
    workspace.update(uri, marked.replace('§', ''), retained);
    expect(workspace.declarationDefaultCompletionContext(uri, offset)).toBe(expected);
  } finally { workspace.dispose(); }
});
