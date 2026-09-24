import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PhpSyntaxParser } from '@php-companion/parser';
import { SemanticWorkspace } from '../src/index.js';

describe('add method family parameter', () => {
  let parser: PhpSyntaxParser;
  let workspace: SemanticWorkspace;
  const root = 'file:///workspace/src/';
  const contractUri = `${root}Contract/Message.php`;
  const firstUri = `${root}Service/First.php`;
  const secondUri = `${root}Service/Second.php`;
  const callerUri = `${root}Controller/Caller.php`;
  const contract = '<?php namespace App\\Contract; interface Message { /** @param string $value */ public function send(string $value): string; }';
  const first = '<?php namespace App\\Service; use App\\Contract\\Message; final class First implements Message { /** @param string $payload */ public function send(string $payload): string { return $payload; } }';
  const second = '<?php namespace App\\Service; use App\\Contract\\Message; final class Second implements Message { /** @param string $data */ public function send(string $data): string { return $data; } }';
  const caller = '<?php namespace App\\Controller; use App\\Contract\\Message; use App\\Service\\First; use App\\Service\\Second; final class Caller { public function run(Message $contract, First $first, Second $second): void { $contract->send(value: "a"); $first->send(payload: "b"); $second->send("c"); } }';

  beforeAll(async () => { parser = await PhpSyntaxParser.createDefault(); workspace = new SemanticWorkspace(parser); });
  afterAll(() => { workspace.dispose(); parser.dispose(); });

  it('updates every declaration and positional or named call', () => {
    for (const [uri, source] of [[contractUri, contract], [firstUri, first], [secondUri, second], [callerUri, caller]])
      workspace.update(uri!, source!, true);
    const plan = workspace.addMethodParameter(contractUri, contract.indexOf('send(string') + 1, 'context', 'string', '"web"');
    expect(plan?.scope).toBe('workspace-method-family');
    expect(plan?.edits).toHaveLength(9);
    const edits = plan!.edits;
    const changed = new Map([[contractUri, contract], [firstUri, first], [secondUri, second], [callerUri, caller]]);
    for (const [uri, source] of changed) {
      let next = source;
      for (const edit of edits.filter((item) => item.uri === uri).sort((left, right) => right.start - left.start))
        next = `${next.slice(0, edit.start)}${edit.newText}${next.slice(edit.end)}`;
      changed.set(uri, next);
      const parsed = parser.parse(next);
      expect(parsed.errors).toEqual([]);
      parsed.tree.delete();
    }
    expect(changed.get(contractUri)).toContain('send(string $value, string $context)');
    expect(changed.get(contractUri)).toContain('* @param string $context');
    expect(changed.get(firstUri)).toContain('send(string $payload, string $context)');
    expect(changed.get(firstUri)).toContain('* @param string $context');
    expect(changed.get(secondUri)).toContain('send(string $data, string $context)');
    expect(changed.get(secondUri)).toContain('* @param string $context');
    expect(changed.get(callerUri)).toContain('send(value: "a", context: "web")');
    expect(changed.get(callerUri)).toContain('send(payload: "b", context: "web")');
    expect(changed.get(callerUri)).toContain('send("c", "web")');
  });

  it('refuses an indirect callable or a family with a conflicting new name', () => {
    const indirectCaller = caller.replace('$contract->send(value: "a");', '$callback = [$contract, "send"]; $callback("a");');
    workspace.update(callerUri, indirectCaller, true);
    expect(workspace.addMethodParameter(contractUri, contract.indexOf('send(string') + 1, 'context', 'string', '"web"')).toBeUndefined();
    workspace.update(callerUri, caller, true);
    expect(workspace.addMethodParameter(contractUri, contract.indexOf('send(string') + 1, 'value', 'string', '"web"')).toBeUndefined();
  });

  it('leaves an unrelated method with the same short name alone', () => {
    const unrelatedUri = `${root}Other/Notifier.php`;
    const unrelated = '<?php namespace App\\Other; final class Notifier { public function send(string $value): void {} public function run(): void { $this->send("a"); } }';
    workspace.update(unrelatedUri, unrelated, true);
    const plan = workspace.addMethodParameter(contractUri, contract.indexOf('send(string') + 1, 'context', 'string', '"web"');
    expect(plan?.edits.some((edit) => edit.uri === unrelatedUri)).toBe(false);
    workspace.remove(unrelatedUri);
  });
});
