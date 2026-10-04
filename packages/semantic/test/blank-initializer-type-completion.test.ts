import { afterAll, beforeAll, expect, it } from 'vitest';
import { PhpSyntaxParser } from '@php-companion/parser';
import { SemanticWorkspace } from '../src/index.js';

let parser: PhpSyntaxParser;
beforeAll(async () => { parser = await PhpSyntaxParser.createDefault(); });
afterAll(() => parser.dispose());

const header = '<?php enum State { case Ready; case Waiting; } ';
for (const retained of [true, false]) it.each([
  ['function run(bool $value = §) {}', ['true', 'false']],
  ['function run(?bool $value = §) {}', ['true', 'false', 'null']],
  ['function run(State $value = §) {}', ['State::Ready', 'State::Waiting']],
  ['function run(bool|State $value = §) {}', ['true', 'false', 'State::Ready', 'State::Waiting']],
  ['function run(bool $value = /* value */ §) {}', ['true', 'false']],
  ['function run(bool $value = // value\n §) {}', ['true', 'false']],
  ['function run(bool $value = §', ['true', 'false']],
  ['class Host { public bool $value = §; }', ['true', 'false']],
  ['class Host { public ?bool $value = §; }', ['true', 'false', 'null']],
  ['class Host { public State $value = §; }', ['State::Ready', 'State::Waiting']],
  ['class Host { public bool $first = false, $second = §; }', ['true', 'false']],
  ['class Host { public function __construct(public bool $value = §) {} }', ['true', 'false']],
  ['class Host { const bool VALUE = §; }', ['true', 'false']],
  ['class Host { const ?bool VALUE = /* value */ §; }', ['true', 'false', 'null']],
  ['class Host { const State VALUE = §; }', ['State::Ready', 'State::Waiting']],
  ['function run($value = §): bool { return true; }', []],
  ['class Host { public bool $first = false, $second; public $other = §; }', []],
  ['class Host { const bool FIRST = false; const OTHER = §; }', []],
  ['const VALUE = §;', []],
  ['enum Text: string { case Ready = §; }', []],
] as const)(`recovers only the blank initializer native contract with retained tree=${retained}: %s`, (tail, labels) => {
  const workspace = new SemanticWorkspace(parser), uri = 'file:///BlankInitializerType.php';
  try {
    const marked = header + tail, offset = marked.indexOf('§'), source = marked.replace('§', '');
    workspace.update(uri, source, retained);
    const before = workspace.snapshot(uri);
    expect(workspace.completeExpectedValues(uri, offset).map(item => item.label).sort()).toEqual([...labels].sort());
    expect(workspace.source(uri)).toBe(source);
    expect(workspace.snapshot(uri)).toEqual(before);
  } finally { workspace.dispose(); }
});
