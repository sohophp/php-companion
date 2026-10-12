import { afterAll, beforeAll, expect, it } from 'vitest';
import { PhpSyntaxParser } from '@php-companion/parser';
import { SemanticWorkspace } from '../src/index.js';

let parser: PhpSyntaxParser;
beforeAll(async () => { parser = await PhpSyntaxParser.createDefault(); });
afterAll(() => parser.dispose());

it.each([false, true])('preserves conservative Generator signatures during recursive proof (deferred=%s)', deferred => {
  const workspace = new SemanticWorkspace(parser), uri = 'file:///SignatureProof.php';
  const source = String.raw`<?php
class Item {}
function values(): \Generator { yield 1; return new Item(); }
function accept(object $value): void {}
function run(): void { accept(values()); }
`;
  const offset = source.lastIndexOf('values()') + 'values('.length;
  const original = workspace.signatures;
  let observed = false;
  try {
    if (deferred) workspace.updateDeclarations(uri, source); else workspace.update(uri, source, true);
    workspace.signatures = function (...args): ReturnType<SemanticWorkspace['signatures']> {
      if (!observed) {
        observed = true;
        expect(original.call(this, uri, offset).map(item => item.returnType)).toEqual(['Generator<int, int, mixed, Item>']);
        // Model the state held by an actual nested Generator inference. A
        // synchronous diagnostic must retain that proof's conservative result.
        const guards = (this as unknown as { generatorInferenceInProgress: Set<string> }).generatorInferenceInProgress;
        guards.add(uri + ':values');
        try { expect(original.call(this, uri, offset).map(item => item.returnType)).toEqual(['\\Generator']); }
        finally { guards.delete(uri + ':values'); }
        expect(original.call(this, uri, offset).map(item => item.returnType)).toEqual(['Generator<int, int, mixed, Item>']);
      }
      return original.apply(this, args);
    };
    workspace.incompatibleArguments(uri);
    expect(observed).toBe(true);
  } finally { workspace.dispose(); }
});

it.each(['update', 'restoreDeclaration'] as const)('uses changed callable contracts within a diagnostic query (%s)', mode => {
  const workspace = new SemanticWorkspace(parser), donor = new SemanticWorkspace(parser);
  const uri = 'file:///SignatureCaller.php', declarationUri = 'file:///SignatureProvider.php';
  const caller = '<?php declare(strict_types=1); function accept(int $value): void {} function run(): void { accept(produce()); }';
  const first = '<?php function produce(): int { return 1; }';
  const changed = "<?php function produce(): string { return 'value'; }";
  const offset = caller.indexOf('produce()') + 'produce('.length;
  const original = workspace.signatures;
  let observed = false;
  try {
    workspace.setTargetPhpVersion('8.5');
    donor.update(declarationUri, changed);
    const snapshot = structuredClone(donor.snapshot(declarationUri)!);
    workspace.update(declarationUri, first); workspace.update(uri, caller, true);
    workspace.signatures = function (...args): ReturnType<SemanticWorkspace['signatures']> {
      if (!observed) {
        observed = true;
        expect(original.call(this, uri, offset).map(item => item.returnType)).toEqual(['int']);
        if (mode === 'update') this.update(declarationUri, changed);
        else expect(this.restoreDeclaration(snapshot, declarationUri)).toBe(true);
        expect(original.call(this, uri, offset).map(item => item.returnType)).toEqual(['string']);
      }
      return original.apply(this, args);
    };
    expect(workspace.incompatibleArguments(uri).map(item => item.parameter)).toEqual(['value']);
    expect(observed).toBe(true);
  } finally { workspace.dispose(); donor.dispose(); }
});
