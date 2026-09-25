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

  it('plans across implementations and calls that are indexed but unopened', () => {
    const closedWorkspace = new SemanticWorkspace(parser);
    try {
      closedWorkspace.update(contractUri, contract, true);
      closedWorkspace.update(firstUri, first, false);
      closedWorkspace.update(secondUri, second, false);
      closedWorkspace.update(callerUri, caller, false);
      const plan = closedWorkspace.removeMethodParameter(contractUri,
        contract.indexOf('$context', contract.indexOf('function send')) + 2);
      expect(plan).toBeDefined();
      expect(new Set(plan!.edits.map((edit) => edit.uri))).toEqual(new Set([contractUri, firstUri, secondUri, callerUri]));
    } finally { closedWorkspace.dispose(); }
  });

  it('refuses use in an implementation and arguments whose evaluation matters', () => {
    const used = first.replace('return $payload;', 'return $payload . $mode;');
    load(used);
    expect(workspace.removeMethodParameter(contractUri, contract.indexOf('$context', contract.indexOf('function send')) + 2)).toBeUndefined();
    const effectful = caller.replace('context: "web"', 'context: sideEffect()');
    load(first, effectful);
    expect(workspace.removeMethodParameter(contractUri, contract.indexOf('$context', contract.indexOf('function send')) + 2)).toBeUndefined();
  });

  it('ignores a first-class callable on an unrelated final method', () => {
    load();
    const unrelatedUri = 'file:///workspace/src/Audit/Logger.php';
    workspace.update(unrelatedUri, `<?php namespace App\\Audit;
final class Logger { public function send(string $message): void {} public function run(): void { $callback = $this->send(...); } }`, true);
    const plan = workspace.removeMethodParameter(contractUri, contract.indexOf('$context', contract.indexOf('function send')) + 2);
    expect(plan).toBeDefined();
    expect(plan?.edits.some((edit) => edit.uri === unrelatedUri)).toBe(false);
    workspace.remove(unrelatedUri);
  });

  it('finds the outer method when a later argument uses legacy array syntax', () => {
    const uri = 'file:///workspace/src/Service/ArrayRemove.php';
    const source = `<?php namespace App\\Service;
final class ArrayRemove {
    public function dispatch(string $label, array $payload): void {}
    public function run(): void { $this->dispatch('x', array('y')); }
}`;
    workspace.update(uri, source, true);
    const plan = workspace.removeMethodParameter(uri, source.indexOf('$label') + 2);
    expect(plan?.edits).toHaveLength(2);
    workspace.remove(uri);
  });

  it('keeps a comment attached to the retained argument when removing the last parameter', () => {
    const uri = 'file:///workspace/src/Service/CommentedRemove.php';
    const source = `<?php namespace App\\Service;
final class CommentedRemove {
    public function dispatch(string $label /* keep declaration */, string $context): void {}
    public function run(): void { $this->dispatch('a' /* keep label */, 'web'); }
}`;
    workspace.update(uri, source, true);
    const plan = workspace.removeMethodParameter(uri, source.indexOf('$context') + 2);
    expect(plan).toBeDefined();
    let edited = source;
    for (const edit of [...plan!.edits].sort((left, right) => right.start - left.start))
      edited = `${edited.slice(0, edit.start)}${edit.newText}${edited.slice(edit.end)}`;
    expect(edited).toContain("dispatch('a' /* keep label */)");
    expect(edited).toContain('dispatch(string $label /* keep declaration */)');
    const parsed = parser.parse(edited);
    expect(parsed.errors).toEqual([]);
    parsed.tree.delete();
    workspace.remove(uri);
  });
});
