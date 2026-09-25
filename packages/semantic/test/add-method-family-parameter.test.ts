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

  it('adds new PHPDoc parameters after existing PHPStan and Psalm parameter annotations', () => {
    const annotatedContract = contract.replace('/** @param string $value */',
      '/**\n * @param string $value\n * @phpstan-param non-empty-string $value\n */');
    const annotatedFirst = first.replace('/** @param string $payload */',
      '/**\n * @param string $payload\n * @psalm-param non-empty-string $payload\n */');
    for (const [uri, source] of [[contractUri, annotatedContract], [firstUri, annotatedFirst],
      [secondUri, second], [callerUri, caller]]) workspace.update(uri!, source!, true);
    const plan = workspace.addMethodParameter(contractUri, annotatedContract.indexOf('send(string') + 1,
      'context', 'string', '"web"');
    expect(plan).toBeDefined();
    const apply = (uri: string, source: string): string => {
      let changed = source;
      for (const edit of plan!.edits.filter((item) => item.uri === uri).sort((left, right) => right.start - left.start))
        changed = `${changed.slice(0, edit.start)}${edit.newText}${changed.slice(edit.end)}`;
      return changed;
    };
    const changedContract = apply(contractUri, annotatedContract);
    const changedFirst = apply(firstUri, annotatedFirst);
    expect(changedContract.indexOf('@param string $context'))
      .toBeGreaterThan(changedContract.indexOf('@phpstan-param non-empty-string $value'));
    expect(changedFirst.indexOf('@param string $context'))
      .toBeGreaterThan(changedFirst.indexOf('@psalm-param non-empty-string $payload'));
    workspace.update(contractUri, contract, true);
    workspace.update(firstUri, first, true);
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
    const unrelated = '<?php namespace App\\Other; final class Notifier { public function send(string $value): void {} public function run(): void { $this->send("a"); $callback = $this->send(...); } }';
    workspace.update(unrelatedUri, unrelated, true);
    const plan = workspace.addMethodParameter(contractUri, contract.indexOf('send(string') + 1, 'context', 'string', '"web"');
    expect(plan).toBeDefined();
    expect(plan?.edits.some((edit) => edit.uri === unrelatedUri)).toBe(false);
    workspace.remove(unrelatedUri);
  });

  it('finds the outer method when its last argument uses legacy array syntax', () => {
    const uri = `${root}Service/ArrayService.php`;
    const source = `<?php namespace App\\Service;
final class ArrayService {
    public function dispatch(array $payload): void {}
    public function run(): void { $this->dispatch(array('x')); }
}`;
    workspace.update(uri, source, true);
    const plan = workspace.addMethodParameter(uri, source.indexOf('function dispatch') + 10,
      'context', 'string', '"web"');
    expect(plan?.edits).toHaveLength(2);
    expect(plan?.edits.some((edit) => edit.newText.includes('"web"'))).toBe(true);
    workspace.remove(uri);
  });

  it('finds the outer method when a leading comment contains parentheses', () => {
    const uri = `${root}Service/CommentedCall.php`;
    const source = `<?php namespace App\\Service;
final class CommentedCall {
    public function dispatch(string $payload): void {}
    public function run(): void { $this->dispatch(/* reason (optional) */ 'x'); }
}`;
    workspace.update(uri, source, true);
    const plan = workspace.addMethodParameter(uri, source.indexOf('function dispatch') + 10,
      'context', 'string', '"web"');
    expect(plan?.edits).toHaveLength(2);
    workspace.remove(uri);
  });

  it('does not mistake a comma inside trailing block comments for a trailing comma', () => {
    const uri = `${root}Service/TrailingComment.php`;
    const source = `<?php namespace App\\Service;
final class TrailingComment {
    public function dispatch(string $payload /* note, retained */): void {}
    public function run(): void { $this->dispatch('x' /* note, retained */); }
}`;
    workspace.update(uri, source, true);
    const plan = workspace.addMethodParameter(uri, source.indexOf('function dispatch') + 10,
      'context', 'string', '"web"');
    expect(plan).toBeDefined();
    let changed = source;
    for (const edit of [...plan!.edits].sort((left, right) => right.start - left.start))
      changed = `${changed.slice(0, edit.start)}${edit.newText}${changed.slice(edit.end)}`;
    expect(changed).toContain('string $payload /* note, retained */, string $context');
    expect(changed).toContain("'x' /* note, retained */, \"web\"");
    const parsed = parser.parse(changed);
    expect(parsed.errors).toEqual([]);
    parsed.tree.delete();
    const trailingComma = source.replace('$payload /* note, retained */)', '$payload,)')
      .replace("'x' /* note, retained */)", "'x',)");
    workspace.update(uri, trailingComma, true);
    expect(workspace.addMethodParameter(uri, trailingComma.indexOf('function dispatch') + 10,
      'context', 'string', '"web"')).toBeUndefined();
    workspace.remove(uri);
  });

  it('updates an interface, implementation and caller with trailing block comments', () => {
    const interfaceUri = `${root}Contract/CommentedAdd.php`;
    const implementationUri = `${root}Service/CommentedAdd.php`;
    const usageUri = `${root}Controller/CommentedAdd.php`;
    const declaration = `<?php namespace App\\Contract;
interface CommentedAdd { public function record(string $message /* note, retained */): void; }`;
    const implementation = `<?php namespace App\\Service;
use App\\Contract\\CommentedAdd;
final class CommentedAddService implements CommentedAdd {
    public function record(string $message /* note, retained */): void {}
}`;
    const usage = `<?php namespace App\\Controller;
use App\\Contract\\CommentedAdd;
final class CommentedAddCaller {
    public function run(CommentedAdd $store): void { $store->record('x' /* note, retained */); }
}`;
    workspace.update(interfaceUri, declaration, true);
    workspace.update(implementationUri, implementation, false);
    workspace.update(usageUri, usage, false);
    const plan = workspace.addMethodParameter(interfaceUri, declaration.indexOf('function record') + 10,
      'context', 'string', '"web"');
    expect(plan).toBeDefined();
    expect(new Set(plan!.edits.map((edit) => edit.uri))).toEqual(new Set([interfaceUri, implementationUri, usageUri]));
    for (const uri of [interfaceUri, implementationUri, usageUri]) workspace.remove(uri);
  });
});
