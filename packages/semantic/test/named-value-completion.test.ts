import { afterAll, beforeAll, expect, it } from 'vitest';
import { PhpSyntaxParser } from '@php-companion/parser';
import { SemanticWorkspace } from '../src/index.js';
let parser: PhpSyntaxParser;
beforeAll(async () => { parser = await PhpSyntaxParser.createDefault(); });
afterAll(() => parser.dispose());
const header = '<?php enum State { case Ready; } function send(string $text, bool $flag, ?State $state = null): void {} #[\\Attribute] class Host { public function __construct(string $text, bool $flag, ?State $state = null) {} public function send(string $text, bool $flag): void {} } ';
const cases: Array<[string, string[]]> = [
  ['send(flag: tr§, text: "x");', ['true']],
  ['send(state: rea§, text: "x", flag: true);', ['State::Ready']],
  ['send(state: nu§, text: "x", flag: true);', ['null']],
  ['send(text: tr§, flag: true);', []],
  ['send(fl§: true, text: "x");', []],
  ['send(flag: !tr§, text: "x");', []],
  ['send(flag: (tr§), text: "x");', ['true']],
  ['send(flag: tr§', ['true']],
  ['new Host(flag: tr§, text: "x");', ['true']],
  ['function run(Host $host) { $host->send(flag: tr§, text: "x"); }', ['true']],
  ['#[Host(flag: tr§, text: "x")] class Tagged {}', ['true']],
  ['#[Host(flag: (tr§), text: "x")] class Tagged {}', ['true']],
  ['#[Host /* ctor */ (flag: tr§, text: "x")] class Tagged {}', ['true']],
  ['#[Host(text: "x", flag: true), Host(flag: tr§, text: "x")] class Tagged {}', ['true']],
  ['#[Host(state: rea§, text: "x", flag: true)] class Tagged {}', ['State::Ready']],
  ['#[Host(text: tr§, flag: true)] class Tagged {}', []],
  ['#[Unknown(flag: tr§)] class Tagged {}', []],
  ['#[Host(flag: send(text: tr§, flag: true), text: "x")] class Tagged {}', []],
  ['#[Host(flag: send(flag: tr§, text: "x"), text: "x")] class Tagged {}', ['true']],
  ['#[Host(flag: !tr§, text: "x")] class Tagged {}', []],
  ['#[Host(fl§: true, text: "x")] class Tagged {}', []],
  ['#[Host(flag: tr§', ['true']],
  ['#[Host /* ctor */ (flag: tr§', ['true']],
  ['#[Host(fl§', []],
];
for (const retained of [false, true]) it.each(cases)(`uses named value contracts with retained tree=${retained}: %s`, (tail, labels) => {
  const workspace = new SemanticWorkspace(parser), uri = 'file:///NamedValues.php';
  try {
    const marked = header + tail, offset = marked.indexOf('§');
    workspace.update(uri, marked.replace('§', ''), retained);
    expect(workspace.completeExpectedValues(uri, offset).map(item => item.label), tail).toEqual(labels);
    if (tail === '#[Host(flag: tr§' || tail === '#[Host /* ctor */ (flag: tr§') {
      expect(workspace.initializerCompletionContext(uri, offset)).toBe('attribute');
      expect(workspace.phpKeywordCompletionContext(uri, offset)?.kind).toBe('expression');
    }
    if (tail === '#[Host(fl§') expect(workspace.initializerCompletionContext(uri, offset)).toBeUndefined();
  } finally { workspace.dispose(); }
});
