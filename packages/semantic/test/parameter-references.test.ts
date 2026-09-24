import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PhpSyntaxParser } from '@php-companion/parser';
import { SemanticWorkspace } from '../src/index.js';

describe('parameter References across a method family', () => {
  let parser: PhpSyntaxParser;
  let workspace: SemanticWorkspace;

  beforeAll(async () => {
    parser = await PhpSyntaxParser.createDefault();
    workspace = new SemanticWorkspace(parser);
  });
  afterAll(() => { workspace.dispose(); parser.dispose(); });

  it('includes implementations and resolved named arguments while local variables stay document scoped', () => {
    const contractUri = 'file:///workspace/src/Contract.php';
    const firstUri = 'file:///workspace/src/First.php';
    const secondUri = 'file:///workspace/src/Second.php';
    const callerUri = 'file:///workspace/src/Caller.php';
    const contract = '<?php namespace App; interface Contract { public function send(string $value): string; }';
    const first = '<?php namespace App; final class First implements Contract { public function send(string $payload): string { $copy = $payload; return $copy; } }';
    const second = '<?php namespace App; final class Second implements Contract { public function send(string $data): string { return $data; } }';
    const caller = '<?php namespace App; function callAll(Contract $contract, First $first, Second $second): void { $contract->send(value: "a"); $first->send(payload: "b"); $second->send(data: "c"); }';
    for (const [uri, source] of [[contractUri, contract], [firstUri, first], [secondUri, second], [callerUri, caller]])
      workspace.update(uri!, source!, true);

    const parameterOffset = contract.indexOf('$value') + 2;
    expect(workspace.referenceScope(contractUri, parameterOffset)).toBe('project');
    const references = workspace.references(contractUri, parameterOffset, true);
    expect(new Set(references.map((item) => item.uri))).toEqual(new Set([contractUri, firstUri, secondUri, callerUri]));
    expect(references.filter((item) => item.uri === callerUri).map((item) => caller.slice(item.start, item.end))).toEqual(['value', 'payload', 'data']);
    const namedOffset = caller.indexOf('value:') + 2;
    expect(workspace.references(callerUri, namedOffset, true)).toEqual(references);
    const withoutDeclarations = workspace.references(contractUri, parameterOffset, false);
    expect(workspace.references(callerUri, namedOffset, false)).toEqual(withoutDeclarations);
    for (const [uri, source, name] of [[contractUri, contract, 'value'], [firstUri, first, 'payload'], [secondUri, second, 'data']] as const)
      expect(withoutDeclarations).not.toContainEqual(expect.objectContaining({ uri, start: source.indexOf(`$${name}`) + 1 }));
    expect(workspace.referenceScope(firstUri, first.indexOf('$copy') + 2)).toBe('document');
  });
});
