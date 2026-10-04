import { afterAll, beforeAll, expect, it } from 'vitest';
import { PhpSyntaxParser } from '@php-companion/parser';
import { SemanticWorkspace } from '../src/index.js';
let parser: PhpSyntaxParser;
beforeAll(async () => { parser = await PhpSyntaxParser.createDefault(); });
afterAll(() => parser.dispose());
const header = '<?php enum Status { case Ready; case Waiting; } function text(string $value): string { return $value; } ';

it.each([true, false])('suggests enum cases for a switch condition with retained tree=%s', retained => {
  const workspace = new SemanticWorkspace(parser); const uri = 'file:///SwitchConditions.php';
  try {
    const marked = header + 'function choose(Status $status): string { switch($status) { case rea§: return "ready"; default: return "other"; }; }';
    const offset = marked.indexOf('§'); workspace.update(uri, marked.replace('§', ''), retained);
    expect(workspace.phpKeywordCompletionContext(uri, offset)?.kind).toBe('expression');
    expect(workspace.completeExpectedValues(uri, offset)).toMatchObject([{ label: 'Status::Ready', insertText: 'Status::Ready' }]);
  } finally { workspace.dispose(); }
});

it.each([true, false])('ranks condition variables using the switch subject, not the result with retained tree=%s', retained => {
  const workspace = new SemanticWorkspace(parser); const uri = 'file:///SwitchVariables.php';
  try {
    const marked = header + 'function choose(Status $status): string { $valueText = "x"; $valueStatus = Status::Ready; $valueFlag = true; switch($status) { case $va§: return "ready"; default: return "other"; }; }';
    const offset = marked.indexOf('§'); workspace.update(uri, marked.replace('§', ''), retained);
    const names = workspace.completeVariables(uri, offset)?.names;
    expect(names).toEqual(expect.arrayContaining(['$valueText', '$valueStatus', '$valueFlag']));
    expect(names?.[0]).toBe('$valueStatus');
  } finally { workspace.dispose(); }
});

it.each(['function choose(Status $status): string { switch($status) { case rea§',
  'function choose(Status $status): string { switch($status) { case Status::Waiting: return "wait"; case rea§'])('recovers a trailing switch condition: %s', tail => {
  const workspace = new SemanticWorkspace(parser); const uri = 'file:///TrailingSwitch.php';
  try {
    const marked = header + tail; const offset = marked.indexOf('§'); workspace.update(uri, marked.replace('§', ''), true);
    const revision = workspace.revision(), snapshot = JSON.stringify(workspace.snapshot(uri));
    expect(workspace.phpKeywordCompletionContext(uri, offset)?.kind).toBe('expression');
    expect(workspace.completeExpectedValues(uri, offset).map(item => item.label)).toEqual(['Status::Ready']);
    expect(workspace.revision()).toBe(revision); expect(JSON.stringify(workspace.snapshot(uri))).toBe(snapshot);
  } finally { workspace.dispose(); }
});

it.each([
  'function choose($unknown): Status { switch($unknown) { case rea§: return Status::Ready; default: return Status::Waiting; }; }',
  'function choose(Status $status): string { switch($status) { case text(rea§): return "x"; default: return "other"; }; }',
  'function choose(Status $status): string { switch($status) { case !rea§: return "x"; default: return "other"; }; }',
  'function choose(Status $status): string { switch($status) { default: return rea§; }; }',
])('does not leak subject or outer return contracts: %s', expression => {
  const workspace = new SemanticWorkspace(parser); const uri = 'file:///SwitchSafety.php';
  try {
    const marked = header + expression; const offset = marked.indexOf('§'); workspace.update(uri, marked.replace('§', ''), true);
    expect(workspace.completeExpectedValues(uri, offset)).toEqual([]);
  } finally { workspace.dispose(); }
});


it('offers bool values in PHP 7 compatible switch syntax', () => {
  const workspace = new SemanticWorkspace(parser); const uri = 'file:///BoolSwitch.php';
  try {
    const marked = '<?php function choose(bool $status): string { switch($status) { case tr§: return "yes"; default: return "no"; } }';
    const offset = marked.indexOf('§'); workspace.update(uri, marked.replace('§', ''), true);
    expect(workspace.completeExpectedValues(uri, offset).map(item => item.label)).toEqual(['true']);
  } finally { workspace.dispose(); }
});
