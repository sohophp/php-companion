import { afterAll, beforeAll, expect, it } from 'vitest';
import { PhpSyntaxParser } from '@php-companion/parser';
import { SemanticWorkspace } from '../src/index.js';

let parser: PhpSyntaxParser;
beforeAll(async () => { parser = await PhpSyntaxParser.createDefault(); });
afterAll(() => parser.dispose());

for (const retained of [true, false]) it.each([
  ['function run($value = §) {}', 'parameter'],
  ['class Host { public function __construct(public $value = §) {} }', 'parameter'],
  ['class Host { public $value = §; }', 'property'],
  ['const VALUE = §;', 'global-constant'],
  ['class Host { const VALUE = §; }', 'class-constant'],
  ['enum Host: int { case Value = §; }', 'enum-case'],
  ['function run() { static $value = §; }', 'static-local'],
  ['function run($value = /* default */ §) {}', 'parameter'],
  ['class Host { const VALUE = // default\n §; }', 'class-constant'],
  ['const VALUE = # default\r\n §;', 'global-constant'],
  ['function run($value =§) {}', 'parameter'],
  ['function run($value = §', 'parameter'],
  ['function run() { $value = §; }', undefined],
  ['function run() { if ($value == §) {} }', undefined],
  ['function run() { $value += §; }', undefined],
  ['const VALUE = // equal = §\n 1;', undefined],
  ['const VALUE = /* equal = § */ 1;', undefined],
  ['const VALUE = strl§;', 'global-constant'],
  ['const VALUE = fn§;', 'global-constant'],
  ['const VALUE = static fun§;', 'global-constant'],
  ['namespace Demo { const VALUE = /* value */ strl§; }', 'global-constant'],
  ['class Host { const VALUE = strl§; }', 'class-constant'],
  ['class Host { const VALUE = static fun§; }', 'class-constant'],
  ['class Host { const VALUE = fn§; }', 'class-constant'],
  ['interface Host { const VALUE = strl§; }', 'class-constant'],
  ['trait Host { const VALUE = strl§; }', 'class-constant'],
  ['enum Host { const VALUE = strl§; }', 'class-constant'],
  ['enum Host: int { case Value = strl§; }', 'enum-case'],
  ['#[Attr(strl§)] class Host {}', 'attribute'],
  ['#[Attr(value: strl§)] class Host {}', 'attribute'],
  ['#[Attr(va§lue: 1)] class Host {}', undefined],
  ['#[Att§r] class Host {}', undefined],
  ['#[Attr(static function() { return strl§; })] class Host {}', undefined],
  ['const VALUE = static function() { return strl§; };', undefined],
  ['const VALUE = static function($value = strl§) {};', 'parameter'],
  ['function run() { static $first = 1, $second = strl§; }', 'static-local'],
  ['function run() { static $value = fn§; }', 'static-local'],
  ['function run() { static $na§me = 1; }', undefined],
  ['function run() { static $value = static function() { return strl§; }; }', undefined],
  ['function run($value = new Host(na§me: 1)) {}', undefined],
  ['function run() { $value = strl§; }', undefined],
  ['function run() { return fn§; }', undefined],
] as const)(`identifies initializer kind without entering declaration names or closure code with retained tree=${retained}: %s`, (tail, kind) => {
  const workspace = new SemanticWorkspace(parser), uri = 'file:///InitializerContext.php';
  try {
    const marked = '<?php ' + tail, offset = marked.indexOf('§');
    workspace.update(uri, marked.replace('§', ''), retained);
    expect(workspace.initializerCompletionContext(uri, offset)).toBe(kind);
    if (kind) expect(workspace.phpKeywordCompletionContext(uri, offset)?.kind).toBe('expression');
  } finally { workspace.dispose(); }
});

for (const retained of [true, false]) it.each([
  'class Host { const VALUE = static fun§; }',
  'class Host { const VALUE = /* value */ §; }',
  'function run($value = §',
])(`does not publish recovered initializer facts with retained tree=${retained}: %s`, tail => {
  const workspace = new SemanticWorkspace(parser), uri = 'file:///InitializerRecovery.php';
  try {
    const marked = '<?php ' + tail, offset = marked.indexOf('§');
    const source = marked.replace('§', ''); workspace.update(uri, source, retained);
    const before = workspace.snapshot(uri);
    expect(workspace.initializerCompletionContext(uri, offset)).toBe(tail.startsWith('function') ? 'parameter' : 'class-constant');
    expect(workspace.phpKeywordCompletionContext(uri, offset)?.kind).toBe('expression');
    expect(workspace.source(uri)).toBe(source);
    expect(workspace.snapshot(uri)).toEqual(before);
    workspace.update(uri, '<?php function run() { return strlen("x"); }', retained);
    expect(workspace.initializerCompletionContext(uri, '<?php function run() { return strl'.length)).toBeUndefined();
  } finally { workspace.dispose(); }
});

for (const retained of [true, false]) it(`keeps the existing recovery size budget for blank values with retained tree=${retained}`, () => {
  const workspace = new SemanticWorkspace(parser), uri = 'file:///InitializerBudget.php';
  try {
    const marked = '<?php /* ' + 'x'.repeat(131_072) + ' */ function run($value = §) {}';
    workspace.update(uri, marked.replace('§', ''), retained);
    expect(workspace.initializerCompletionContext(uri, marked.indexOf('§'))).toBeUndefined();
  } finally { workspace.dispose(); }
});

for (const retained of [true, false]) it.each([
  ['class Host { private static function target() {} const VALUE = self::tar§; }', ['target']],
  ['class Host { private const TOKEN = 1; const VALUE = self::TO§; }', ['TOKEN']],
  ['class Host { private const TOKEN = 1; #[Attr(self::TO§)] public $value; }', ['TOKEN']],
  ['class Other { private const TOKEN = 1; } class Host { const VALUE = Other::TO§; }', []],
] as const)(`preserves initializer owner visibility with retained tree=${retained}: %s`, (tail, names) => {
  const workspace = new SemanticWorkspace(parser), uri = 'file:///InitializerOwner.php';
  try {
    const marked = '<?php ' + tail, offset = marked.indexOf('§');
    workspace.update(uri, marked.replace('§', ''), retained);
    expect(workspace.completeMembers(uri, offset).map(item => item.name)).toEqual(names);
  } finally { workspace.dispose(); }
});

for (const retained of [true, false]) it.each([
  ['class Host { const Closure VALUE = demo§; }', 0],
  ['enum Host: int { case Value = demo§; }', 2],
] as const)(`ranks constant callable references using Closure identity with retained tree=${retained}: %s`, (tail, rank) => {
  const workspace = new SemanticWorkspace(parser), uri = 'file:///InitializerCallable.php';
  try {
    workspace.update('php-companion-builtin:Closure.php', '<?php final class Closure {}', true);
    const marked = '<?php function demo(): int { return 1; } ' + tail, offset = marked.indexOf('§');
    workspace.update(uri, marked.replace('§', ''), retained);
    expect(workspace.completeFunctions(uri, offset).find(item => item.name === 'demo')?.compatibilityRank).toBe(rank);
  } finally { workspace.dispose(); }
});
