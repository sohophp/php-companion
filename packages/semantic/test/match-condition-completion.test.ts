import { afterAll, beforeAll, expect, it } from 'vitest';
import { PhpSyntaxParser } from '@php-companion/parser';
import { SemanticWorkspace } from '../src/index.js';
let parser: PhpSyntaxParser;
beforeAll(async () => { parser = await PhpSyntaxParser.createDefault(); });
afterAll(() => parser.dispose());
const header = '<?php enum Status { case Ready; case Waiting; } function text(string $value): string { return $value; } ';

it.each([true, false])('suggests enum cases for a match condition with retained tree=%s', retained => {
  const workspace = new SemanticWorkspace(parser); const uri = 'file:///MatchConditions.php';
  try {
    const marked = header + 'function choose(Status $status): string { return match($status) { rea§ => "ready", default => "other" }; }';
    const offset = marked.indexOf('§'); workspace.update(uri, marked.replace('§', ''), retained);
    expect(workspace.completeExpectedValues(uri, offset)).toMatchObject([{ label: 'Status::Ready', insertText: 'Status::Ready' }]);
  } finally { workspace.dispose(); }
});

it.each([true, false])('ranks condition variables using the match subject, not the result with retained tree=%s', retained => {
  const workspace = new SemanticWorkspace(parser); const uri = 'file:///MatchVariables.php';
  try {
    const marked = header + 'function choose(Status $status): string { $valueText = "x"; $valueStatus = Status::Ready; $valueFlag = true; return match($status) { $va§ => "ready", default => "other" }; }';
    const offset = marked.indexOf('§'); workspace.update(uri, marked.replace('§', ''), retained);
    const names = workspace.completeVariables(uri, offset)?.names;
    expect(names).toEqual(expect.arrayContaining(['$valueText', '$valueStatus', '$valueFlag']));
    expect(names?.[0]).toBe('$valueStatus');
  } finally { workspace.dispose(); }
});

it.each(['function choose(Status $status): string { return match($status) { rea§',
  'function choose(Status $status): string { return match($status) { Status::Waiting => "wait", rea§'])('recovers a trailing match condition: %s', tail => {
  const workspace = new SemanticWorkspace(parser); const uri = 'file:///TrailingMatch.php';
  try {
    const marked = header + tail; const offset = marked.indexOf('§'); workspace.update(uri, marked.replace('§', ''), true);
    const revision = workspace.revision(), snapshot = JSON.stringify(workspace.snapshot(uri));
    expect(workspace.completeExpectedValues(uri, offset).map(item => item.label)).toEqual(['Status::Ready']);
    expect(workspace.revision()).toBe(revision); expect(JSON.stringify(workspace.snapshot(uri))).toBe(snapshot);
  } finally { workspace.dispose(); }
});

it.each([
  'function choose($unknown): Status { return match($unknown) { rea§ => Status::Ready, default => Status::Waiting }; }',
  'function choose(Status $status): string { return match($status) { text(rea§) => "x", default => "other" }; }',
  'function choose(Status $status): string { return match($status) { !rea§ => "x", default => "other" }; }',
  'function choose(Status $status): string { return match($status) { default => rea§ }; }',
])('does not leak subject or outer return contracts: %s', expression => {
  const workspace = new SemanticWorkspace(parser); const uri = 'file:///MatchSafety.php';
  try {
    const marked = header + expression; const offset = marked.indexOf('§'); workspace.update(uri, marked.replace('§', ''), true);
    expect(workspace.completeExpectedValues(uri, offset)).toEqual([]);
  } finally { workspace.dispose(); }
});

it.each([
  ['Status $status', 'unknown($status);', 'rea', []],
  ['Status $status', 'unknown(value: $status);', 'rea', []],
  ['Status $status', 'function observe(Status $value): void {} observe(value: $status);', 'rea', ['Status::Ready']],
  ['Status $status', '$status = "x";', 'rea', []],
  ['bool $status', '', 'tr', ['true']],
  ['Status $status', '', 'rea§dy', ['Status::Ready']],
] as const)('uses current subject facts: %s / %s', (parameter, prefix, word, labels) => {
  const workspace = new SemanticWorkspace(parser); const uri = 'file:///CurrentMatch.php';
  try {
    const marked = header + `function choose(${parameter}): string { ${prefix} return match($status) { ${word.includes('§') ? word : word + '§'} => "x", default => "other" }; }`;
    const offset = marked.indexOf('§'); workspace.update(uri, marked.replace('§', ''), true);
    const items = workspace.completeExpectedValues(uri, offset);
    expect(items.map(item => item.label)).toEqual(labels);
    if (word.includes('§')) expect(items[0]?.end).toBe(offset + 2);
  } finally { workspace.dispose(); }
});
