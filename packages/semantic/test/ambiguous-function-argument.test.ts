import { afterAll, beforeAll, expect, it } from 'vitest';
import { PhpSyntaxParser } from '@php-companion/parser';
import { SemanticWorkspace } from '../src/index.js';

let parser: PhpSyntaxParser;
beforeAll(async () => { parser = await PhpSyntaxParser.createDefault(); });
afterAll(() => parser.dispose());

const caller = 'file:///AmbiguousArguments/Caller.php';
const first = 'file:///AmbiguousArguments/First.php';
const second = 'file:///AmbiguousArguments/Second.php';
const header = '<?php declare(strict_types=1); namespace AmbiguousArguments; ';
const primary = 'function accept(int $value): void {} ';
const duplicate = 'function ACCEPT(string $value, int $second): void {} ';
const invocation = "function inspect(): void { accept('bad'); }";
const configurations = ['7.2', '8.5'].flatMap(phpVersion =>
  ['retained', 'deferred', 'snapshot'].map(mode => ({ phpVersion, mode })));

function install(workspace: SemanticWorkspace, uri: string, source: string, mode: string, phpVersion: string): void {
  if (mode === 'deferred') { workspace.updateDeclarations(uri, source); return; }
  if (mode === 'snapshot') {
    const donor = new SemanticWorkspace(parser);
    try {
      donor.setTargetPhpVersion(phpVersion); donor.update(uri, source);
      expect(workspace.restoreDeclaration(donor.snapshot(uri)!, uri)).toBe(true);
    } finally { donor.dispose(); }
    return;
  }
  workspace.update(uri, source, true);
}

for (const local of [false, true]) it.each(configurations)(
  `withdraws a selected function argument error when declarations become ambiguous (local=${local}, PHP $phpVersion, $mode)`,
  ({ phpVersion, mode }) => {
    const workspace = new SemanticWorkspace(parser);
    const source = header + (local ? primary : '') + invocation;
    const diagnostics = (): ReturnType<SemanticWorkspace['incompatibleArguments']> => workspace.incompatibleArguments(caller, local);
    const editDuplicate = (declaration: string): void => install(workspace, local ? caller : second,
      local ? source + declaration : header + declaration, mode, phpVersion);
    try {
      workspace.setTargetPhpVersion(phpVersion);
      if (!local) install(workspace, first, header + primary, mode, phpVersion);
      install(workspace, caller, source, mode, phpVersion);
      expect(diagnostics()).toEqual([expect.objectContaining({ callable: 'AmbiguousArguments\\accept', expectedType: 'int' })]);
      editDuplicate(duplicate);
      expect(diagnostics()).toEqual([]);
      editDuplicate(duplicate.replace('ACCEPT', 'unrelated'));
      expect(diagnostics()).toHaveLength(1);
      editDuplicate(duplicate);
      expect(diagnostics()).toEqual([]);
      if (local) install(workspace, caller, source, mode, phpVersion); else workspace.remove(second);
      expect(diagnostics()).toHaveLength(1);
    } finally { workspace.dispose(); }
  },
);

it.each(configurations)('preserves native overload checks but rejects a project collision (PHP $phpVersion, $mode)', ({ phpVersion, mode }) => {
  const workspace = new SemanticWorkspace(parser);
  try {
    workspace.setTargetPhpVersion(phpVersion);
    install(workspace, 'php-companion-builtin:/ambiguous-arguments.php', header + primary + duplicate, mode, phpVersion);
    install(workspace, caller, header + invocation, mode, phpVersion);
    expect(workspace.incompatibleArguments(caller)).toHaveLength(1);
    install(workspace, second, header + 'function ACCEPT(string $value, int $second, int $third): void {}', mode, phpVersion);
    expect(workspace.incompatibleArguments(caller)).toEqual([]);
    workspace.remove(second);
    expect(workspace.incompatibleArguments(caller)).toHaveLength(1);
  } finally { workspace.dispose(); }
});

it.each(configurations)('includes an unindexed duplicate declaration in argument ambiguity (PHP $phpVersion, $mode)', ({ phpVersion, mode }) => {
  const workspace = new SemanticWorkspace(parser);
  try {
    workspace.setTargetPhpVersion(phpVersion);
    install(workspace, first, header + primary, mode, phpVersion);
    install(workspace, second, header + duplicate, mode, phpVersion);
    install(workspace, caller, header + invocation, mode, phpVersion);
    const internal = workspace as unknown as {
      referenceCandidates: { remove(uri: string): void };
      unindexedReferenceCandidateUris: Set<string>;
    };
    internal.referenceCandidates.remove(second); internal.unindexedReferenceCandidateUris.add(second);
    expect(workspace.incompatibleArguments(caller)).toEqual([]);
    workspace.remove(second);
    expect(workspace.incompatibleArguments(caller)).toHaveLength(1);
  } finally { workspace.dispose(); }
});
