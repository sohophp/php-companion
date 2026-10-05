import { afterAll, beforeAll, expect, it } from 'vitest';
import { PhpSyntaxParser } from '@php-companion/parser';
import { SemanticWorkspace } from '../src/index.js';

let parser: PhpSyntaxParser;
beforeAll(async () => { parser = await PhpSyntaxParser.createDefault(); });
afterAll(() => parser.dispose());

for (const retained of [true, false]) it.each([
  ['unknown($value);', undefined],
  ['unknown(value:$value);', undefined],
  ['mutate($value);', undefined],
  ['', 'string'],
  ['observe($value);', 'string'],
  ['unknown($other);', 'string'],
] as const)(`shares stable guard facts with Hover and argument diagnostics, retained=${retained}: %s`, (mutation, type) => {
  const workspace = new SemanticWorkspace(parser), uri = 'file:///FlowConsistency.php';
  try {
    workspace.update('php-companion-builtin:flow-consistency', '<?php function is_string($value):bool{}');
    const marked = '<?php declare(strict_types=1); function send(int $value):void{} function mutate(&$value):void{} '
      + 'function observe($value):void{} function run(?string $value,$other){if(is_string($value)){'
      + mutation + 'send(§$value);}}';
    const offset = marked.indexOf('§'); workspace.update(uri, marked.replace('§', ''), retained);
    const snapshot = workspace.snapshot(uri), revision = workspace.revision();
    expect(workspace.completionVariableDetail(uri, offset, '$value')).toBe(type ? `$value: ${type}` : undefined);
    expect(workspace.variableValueAt(uri, offset)?.type).toBe(type);
    expect(workspace.provenExpressionType(uri, offset, offset + 6)).toBe(type);
    expect(workspace.incompatibleArguments(uri).filter(item => item.start === offset)).toHaveLength(type ? 1 : 0);
    expect(workspace.snapshot(uri)).toEqual(snapshot); expect(workspace.revision()).toBe(revision);
  } finally { workspace.dispose(); }
});

for (const retained of [true, false]) it.each([
  ['?string $value', 'unknown($value);', undefined],
  ['?string $value', 'unknown(value:$value);', undefined],
  ['?string $value', 'unknown($value);if(is_string($value))', 'string'],
  ['$value', 'if(is_string($value))', 'string'],
  ['?string $value', 'unknown($value);$value="fresh";', 'string'],
] as const)(`does not reuse stale entry types and accepts fresh proof, retained=${retained}: %s %s`, (parameter, body, type) => {
  const workspace = new SemanticWorkspace(parser), uri = 'file:///FreshFlowConsistency.php';
  try {
    workspace.update('php-companion-builtin:flow-consistency', '<?php function is_string($value):bool{}');
    const call = body.endsWith(')') ? '{send(§$value);}' : 'send(§$value);';
    const marked = `<?php declare(strict_types=1); function send(int $value):void{} function run(${parameter}){${body}${call}}`;
    const offset = marked.indexOf('§'); workspace.update(uri, marked.replace('§', ''), retained);
    expect(workspace.completionVariableDetail(uri, offset, '$value')).toBe(type ? `$value: ${type}` : undefined);
    expect(workspace.variableValueAt(uri, offset)?.type).toBe(type);
    expect(workspace.incompatibleArguments(uri).filter(item => item.start === offset)).toHaveLength(type ? 1 : 0);
  } finally { workspace.dispose(); }
});
