import { afterAll, beforeAll, expect, it } from 'vitest';
import { PhpSyntaxParser } from '@php-companion/parser';
import { SemanticWorkspace } from '../src/index.js';

let parser: PhpSyntaxParser;
beforeAll(async () => { parser = await PhpSyntaxParser.createDefault(); });
afterAll(() => parser.dispose());
const cases = ['7.2', '8.5'].flatMap(phpVersion => ['retained', 'temporary', 'deferred', 'snapshot']
  .map(mode => ({ phpVersion, mode })));
const uri = 'file:///UnsetBinding.php';

function install(workspace: SemanticWorkspace, source: string, mode: string): void {
  if (mode === 'deferred') workspace.updateDeclarations(uri, source);
  else if (mode === 'snapshot') {
    const donor = new SemanticWorkspace(parser);
    try {
      donor.update(uri, source);
      expect(workspace.restoreDeclaration(donor.snapshot(uri), uri)).toBe(true);
    } finally { donor.dispose(); }
  } else workspace.update(uri, source, mode === 'retained');
}

it.each(cases)('withdraws unset scalar input types at PHP $phpVersion ($mode)', ({ phpVersion, mode }) => {
  const workspace = new SemanticWorkspace(parser);
  const source = '<?php function take(int $input): void {} function run(int $value): void {'
    + 'take($value); unset($value); take($value); }';
  const first = source.indexOf('$value', source.indexOf('{', source.indexOf('function run')));
  const last = source.lastIndexOf('$value');
  try {
    workspace.setTargetPhpVersion(phpVersion); install(workspace, source, mode);
    expect(workspace.provenExpressionType(uri, last, last + 6)).toBeUndefined();
    expect(workspace.provenExpressionType(uri, first, first + 6)).toBe('int');
    expect(workspace.provenExpressionType(uri, last, last + 6)).toBeUndefined();
    expect(workspace.undefinedVariables(uri).map(item => [item.name, item.start])).toEqual([['value', last]]);

    const rebound = source.replace('unset($value);', "unset($value); $value = 'changed';");
    install(workspace, rebound, mode);
    expect(workspace.provenExpressionType(uri, rebound.lastIndexOf('$value'), rebound.lastIndexOf('$value') + 6)).toBe('string');
    expect(workspace.incompatibleArguments(uri).map(item => [item.actualType, item.expectedType])).toEqual([['string', 'int']]);
    const output = '<?php /** @param-out string $output */ function fill(&$output): void { $output = \'changed\'; } '
      + 'function run(int $value): void { unset($value); fill($value); echo $value; }';
    install(workspace, output, mode);
    expect(workspace.provenExpressionType(uri, output.lastIndexOf('$value'), output.lastIndexOf('$value') + 6)).toBe('string');
    const unrelated = source.replace('unset($value)', 'unset($other)');
    install(workspace, unrelated, mode);
    expect(workspace.provenExpressionType(uri, unrelated.lastIndexOf('$value'), unrelated.lastIndexOf('$value') + 6)).toBe('int');
  } finally { workspace.dispose(); }
});

it.each(cases)('withdraws unset object members at PHP $phpVersion ($mode)', ({ phpVersion, mode }) => {
  const workspace = new SemanticWorkspace(parser);
  const prefix = '<?php /* 中文 🧭 */ class Row { function keep(int $input): void {} } '
    + 'class Other { function changed(): void {} } function run(Row $value): void {';
  const bound = prefix + '$value->keep(1); }';
  const unset = prefix + 'UnSeT /* between tokens */ ($value); $value->keep(1); }';
  const check = (source: string, member: string | undefined): void => {
    install(workspace, source, mode);
    const name = source.lastIndexOf('keep'), variable = source.lastIndexOf('$value');
    expect(workspace.memberAt(uri, name + 1)?.fqcn).toBe(member);
    expect(workspace.signature(uri, source.lastIndexOf('keep(') + 'keep('.length)?.fqcn).toBe(member);
    expect(workspace.provenExpressionType(uri, variable, variable + 6)).toBe(member ? 'Row' : undefined);
  };
  try {
    workspace.setTargetPhpVersion(phpVersion);
    check(bound, 'Row::keep');
    check(prefix + 'unset($value); $value->keep(1); }', undefined);
    check(unset, undefined);
    check(prefix + 'unset($value); /* keep the binding removed */ $value->keep(1); }', undefined);
    check(prefix + "echo 'unset($value)'; /* unset($value); */ $value->keep(1); }", 'Row::keep');
    const rebound = prefix + 'unset($value); $value = new Other; $value->changed(); }';
    install(workspace, rebound, mode);
    expect(workspace.memberAt(uri, rebound.lastIndexOf('changed') + 1)?.fqcn).toBe('Other::changed');
    check(unset, undefined); check(bound, 'Row::keep');
  } finally { workspace.dispose(); }
});
