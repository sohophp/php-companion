import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PhpSyntaxParser } from '@php-companion/parser';
import { SemanticWorkspace } from '../src/index.js';

describe('remove method family parameter', () => {
  let parser: PhpSyntaxParser;
  let workspace: SemanticWorkspace;
  const contractUri = 'file:///workspace/src/Contract/Message.php';
  const firstUri = 'file:///workspace/src/Service/First.php';
  const secondUri = 'file:///workspace/src/Service/Second.php';
  const callerUri = 'file:///workspace/src/Controller/Caller.php';
  const contract = `<?php namespace App\\Contract;
interface Message {
    /**
     * @param string $value
     * @param string $context
     */
    public function send(string $value, string $context): string;
}`;
  const first = `<?php namespace App\\Service;
use App\\Contract\\Message;
final class First implements Message {
    /**
     * @param string $payload
     * @param string $mode
     */
    public function send(string $payload, string $mode): string { return $payload; }
}`;
  const second = `<?php namespace App\\Service;
use App\\Contract\\Message;
final class Second implements Message {
    /**
     * @param string $data
     * @param string $source
     */
    public function send(string $data, string $source): string { return $data; }
}`;
  const caller = `<?php namespace App\\Controller;
use App\\Contract\\Message;
use App\\Service\\First;
use App\\Service\\Second;
final class Caller {
    public function run(Message $contract, First $first, Second $second): void {
        $contract->send(value: "a", context: "web");
        $first->send(payload: "b", mode: "web");
        $second->send("c", "web");
    }
}`;

  beforeAll(async () => { parser = await PhpSyntaxParser.createDefault(); workspace = new SemanticWorkspace(parser); });
  afterAll(() => { workspace.dispose(); parser.dispose(); });
  const load = (firstSource = first, callerSource = caller): void => {
    for (const [uri, source] of [[contractUri, contract], [firstUri, firstSource], [secondUri, second], [callerUri, callerSource]])
      workspace.update(uri!, source!, true);
  };

  it('removes the aligned parameter, PHPDoc and positional or named arguments from four files', () => {
    load();
    const plan = workspace.removeMethodParameter(contractUri, contract.indexOf('$context', contract.indexOf('function send')) + 2);
    expect(plan?.scope).toBe('workspace-method-family');
    expect(plan?.edits).toHaveLength(9);
    const sources = new Map([[contractUri, contract], [firstUri, first], [secondUri, second], [callerUri, caller]]);
    for (const [uri, source] of sources) {
      let changed = source;
      for (const edit of plan!.edits.filter((item) => item.uri === uri).sort((left, right) => right.start - left.start))
        changed = `${changed.slice(0, edit.start)}${edit.newText}${changed.slice(edit.end)}`;
      sources.set(uri, changed);
      const parsed = parser.parse(changed);
      expect(parsed.errors).toEqual([]);
      parsed.tree.delete();
    }
    expect(sources.get(contractUri)).toContain('send(string $value): string');
    expect(sources.get(firstUri)).toContain('send(string $payload): string');
    expect(sources.get(secondUri)).toContain('send(string $data): string');
    expect(sources.get(contractUri)).not.toContain('@param string $context');
    expect(sources.get(firstUri)).not.toContain('@param string $mode');
    expect(sources.get(secondUri)).not.toContain('@param string $source');
    expect(sources.get(callerUri)).toContain('send(value: "a")');
    expect(sources.get(callerUri)).toContain('send(payload: "b")');
    expect(sources.get(callerUri)).toContain('send("c")');
  });

  it('refuses use in an implementation and arguments whose evaluation matters', () => {
    const used = first.replace('return $payload;', 'return $payload . $mode;');
    load(used);
    expect(workspace.removeMethodParameter(contractUri, contract.indexOf('$context', contract.indexOf('function send')) + 2)).toBeUndefined();
    const effectful = caller.replace('context: "web"', 'context: sideEffect()');
    load(first, effectful);
    expect(workspace.removeMethodParameter(contractUri, contract.indexOf('$context', contract.indexOf('function send')) + 2)).toBeUndefined();
  });
});
