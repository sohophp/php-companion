import { afterAll, beforeAll, expect, it } from 'vitest';
import { PhpSyntaxParser } from '@php-companion/parser';
import { SemanticWorkspace } from '../src/index.js';

let parser: PhpSyntaxParser;
beforeAll(async () => { parser = await PhpSyntaxParser.createDefault(); });
afterAll(() => parser.dispose());

const uri = 'file:///RestoredFunction.php';
const source = '<?php function need($value) {} need();';
const configurations = ['7.2', '8.5'].flatMap(version =>
  ['full', 'deferred'].map(mode => ({ version, mode })));

function install(workspace: SemanticWorkspace, snapshot: NonNullable<ReturnType<SemanticWorkspace['snapshot']>>, mode: string): void {
  expect(mode === 'full' ? workspace.restore(snapshot, snapshot.declaration.uri)
    : workspace.restoreDeclaration(snapshot, snapshot.declaration.uri)).toBe(true);
}

it.each(configurations)('reads replacement records from a warmed restored function array (PHP $version, $mode)', ({ version, mode }) => {
  const donor = new SemanticWorkspace(parser), workspace = new SemanticWorkspace(parser);
  try {
    donor.update(uri, source, true);
    const snapshot = donor.snapshot(uri)!;
    workspace.setTargetPhpVersion(version);
    install(workspace, snapshot, mode);
    expect(workspace.missingRequiredArguments(uri).map(item => item.parameters)).toEqual([['value']]);
    const original = snapshot.declaration.callables[0]!;
    snapshot.declaration.callables[0] = { ...original,
      parameters: original.parameters.map(parameter => ({ ...parameter, defaultValue: '1' })) };
    expect(workspace.workspaceFunctions().find(item => item.name === 'need')!.parameters[0]!.defaultValue).toBe('1');
    expect(workspace.missingRequiredArguments(uri)).toEqual([]);
    workspace.remove(uri);
    install(workspace, snapshot, mode);
    expect(workspace.missingRequiredArguments(uri)).toEqual([]);
    snapshot.declaration.callables[0] = original;
    expect(workspace.missingRequiredArguments(uri).map(item => item.parameters)).toEqual([['value']]);
  } finally { donor.dispose(); workspace.dispose(); }
});

it.each(configurations)('sees declarations appended after a restored signature lookup (PHP $version, $mode)', ({ version, mode }) => {
  const donor = new SemanticWorkspace(parser), workspace = new SemanticWorkspace(parser);
  try {
    donor.update(uri, source, true);
    const snapshot = donor.snapshot(uri)!;
    workspace.setTargetPhpVersion(version);
    install(workspace, snapshot, mode);
    const offset = source.lastIndexOf('need(') + 'need('.length;
    expect(workspace.signatures(uri, offset)).toHaveLength(1);
    snapshot.declaration.callables.push({ ...snapshot.declaration.callables[0]! });
    expect(workspace.signatures(uri, offset)).toHaveLength(2);
    snapshot.declaration.callables.pop();
    expect(workspace.signatures(uri, offset)).toHaveLength(1);
  } finally { donor.dispose(); workspace.dispose(); }
});

it.each(configurations)('keeps restored function replacement visible to local query forks (PHP $version, $mode)', ({ version, mode }) => {
  const donor = new SemanticWorkspace(parser), workspace = new SemanticWorkspace(parser);
  const callee = 'file:///RestoredCallee.php', caller = 'file:///ForkCaller.php';
  let fork: SemanticWorkspace | undefined;
  try {
    donor.update(callee, '<?php function need($value) {}', true);
    const snapshot = donor.snapshot(callee)!;
    workspace.setTargetPhpVersion(version);
    install(workspace, snapshot, mode);
    workspace.update(caller, '<?php need();', true);
    fork = workspace.forkForLocalQuery(caller, '<?php /* local */ need();', new Set());
    expect(workspace.missingRequiredArguments(caller)).toHaveLength(1);
    expect(fork.missingRequiredArguments(caller)).toHaveLength(1);
    const original = snapshot.declaration.callables[0]!;
    snapshot.declaration.callables[0] = { ...original,
      parameters: original.parameters.map(parameter => ({ ...parameter, defaultValue: '1' })) };
    expect(workspace.missingRequiredArguments(caller)).toEqual([]);
    expect(fork.missingRequiredArguments(caller)).toEqual([]);
  } finally { fork?.dispose(); donor.dispose(); workspace.dispose(); }
});

it('keeps parameter changes visible in ordinary parsed function lookups', () => {
  const workspace = new SemanticWorkspace(parser);
  try {
    workspace.update(uri, source, true);
    expect(workspace.missingRequiredArguments(uri)).toHaveLength(1);
    workspace.workspaceFunctions().find(item => item.name === 'need')!.parameters[0]!.defaultValue = '1';
    expect(workspace.missingRequiredArguments(uri)).toEqual([]);
    workspace.update(uri, source, true);
    expect(workspace.missingRequiredArguments(uri)).toHaveLength(1);
  } finally { workspace.dispose(); }
});
