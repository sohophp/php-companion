import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PhpSyntaxParser } from '@php-companion/parser';
import { SemanticWorkspace } from '../src/index.js';

describe('reorder method family parameters', () => {
  let parser: PhpSyntaxParser;
  let workspace: SemanticWorkspace;
  const contractUri = 'file:///workspace/src/Contract/Message.php';
  const firstUri = 'file:///workspace/src/Service/First.php';
  const callerUri = 'file:///workspace/src/Controller/Caller.php';
  const contract = `<?php namespace App\\Contract;
interface Message {
    /**
     * @param string $value
     * @param string $context
     * @param int $count
     */
    public function send(string $value, string $context, int $count): string;
}`;
  const first = `<?php namespace App\\Service;
use App\\Contract\\Message;
final class First implements Message {
    /**
     * @param string $payload
     * @param string $mode
     * @param int $quantity
     */
    public function send(string $payload, string $mode, int $quantity): string { return $payload; }
}`;
  const caller = `<?php namespace App\\Controller;
use App\\Contract\\Message;
use App\\Service\\First;
final class Caller {
    public function run(Message $contract, First $first): void {
        $contract->send("a", "web", 2);
        $first->send(payload: "b", mode: "web", quantity: 3);
    }
}`;
  const offset = contract.indexOf('$count', contract.indexOf('function send')) + 2;

  beforeAll(async () => { parser = await PhpSyntaxParser.createDefault(); workspace = new SemanticWorkspace(parser); });
  afterAll(() => { workspace.dispose(); parser.dispose(); });
  const load = (callerSource = caller): void => {
    for (const [uri, source] of [[contractUri, contract], [firstUri, first], [callerUri, callerSource]])
      workspace.update(uri!, source!, true);
  };

  it('moves a parameter across declarations, PHPDoc and positional calls while preserving named calls', () => {
    load();
    expect(workspace.methodParameterOrder(contractUri, offset)).toEqual({ names: ['value', 'context', 'count'], index: 2 });
    const plan = workspace.reorderMethodParameters(contractUri, offset, 0);
    expect(plan?.scope).toBe('workspace-method-family');
    expect(plan?.edits).toHaveLength(5);
    const sources = new Map([[contractUri, contract], [firstUri, first], [callerUri, caller]]);
    for (const [uri, source] of sources) {
      let changed = source;
      for (const edit of plan!.edits.filter((item) => item.uri === uri).sort((left, right) => right.start - left.start))
        changed = `${changed.slice(0, edit.start)}${edit.newText}${changed.slice(edit.end)}`;
      const parsed = parser.parse(changed);
      expect(parsed.errors).toEqual([]);
      parsed.tree.delete();
      sources.set(uri, changed);
    }
    expect(sources.get(contractUri)).toContain('send(int $count, string $value, string $context)');
    expect(sources.get(firstUri)).toContain('send(int $quantity, string $payload, string $mode)');
    expect(sources.get(contractUri)!.indexOf('@param int $count')).toBeLessThan(sources.get(contractUri)!.indexOf('@param string $value'));
    expect(sources.get(callerUri)).toContain('send(2, "a", "web")');
    expect(sources.get(callerUri)).toContain('send(payload: "b", mode: "web", quantity: 3)');
  });

  it('refuses positional evaluation changes and mixed argument styles', () => {
    load(caller.replace('send("a", "web", 2)', 'send(sideEffect(), "web", 2)'));
    expect(workspace.reorderMethodParameters(contractUri, offset, 0)).toBeUndefined();
    load(caller.replace('send("a", "web", 2)', 'send("a", context: "web", count: 2)'));
    expect(workspace.reorderMethodParameters(contractUri, offset, 0)).toBeUndefined();
  });
});
