import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
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
    public function run(Message $contract, First $first, string $value, string $context, int $count): void {
        $localValue = $value;
        $localContext = $context;
        $localCount = $count;
        $contract->send("a", "web", 2);
        $contract->send($value, $context, $count);
        $contract->send($localValue, $localContext, $localCount);
        $first->send(payload: "b", mode: "web", quantity: 3);
        $first->send("c", mode: "api", quantity: 4);
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
    expect(plan?.edits).toHaveLength(8);
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
    expect(sources.get(callerUri)).toContain('send($count, $value, $context)');
    expect(sources.get(callerUri)).toContain('send($localCount, $localValue, $localContext)');
    expect(sources.get(callerUri)).toContain('send(payload: "b", mode: "web", quantity: 3)');
    expect(sources.get(callerUri)).toContain('send(payload: "c", mode: "api", quantity: 4)');
  });

  it('moves PHPStan and Psalm parameter annotations with their declared parameters', () => {
    const annotatedContract = contract.replace('     * @param int $count',
      '     * @param int $count\n     * @phpstan-param positive-int $count');
    const annotatedFirst = first.replace('     * @param int $quantity',
      '     * @param int $quantity\n     * @psalm-param positive-int $quantity');
    workspace.update(contractUri, annotatedContract, true);
    workspace.update(firstUri, annotatedFirst, true);
    workspace.update(callerUri, caller, true);
    const annotatedOffset = annotatedContract.indexOf('$count', annotatedContract.indexOf('function send')) + 2;
    const plan = workspace.reorderMethodParameters(contractUri, annotatedOffset, 0);
    expect(plan).toBeDefined();
    const apply = (uri: string, source: string): string => {
      let changed = source;
      for (const edit of plan!.edits.filter((item) => item.uri === uri).sort((left, right) => right.start - left.start))
        changed = `${changed.slice(0, edit.start)}${edit.newText}${changed.slice(edit.end)}`;
      return changed;
    };
    const changedContract = apply(contractUri, annotatedContract);
    const changedFirst = apply(firstUri, annotatedFirst);
    expect(changedContract.indexOf('@phpstan-param positive-int $count'))
      .toBeLessThan(changedContract.indexOf('@param string $value'));
    expect(changedFirst.indexOf('@psalm-param positive-int $quantity'))
      .toBeLessThan(changedFirst.indexOf('@param string $payload'));
  });

  it('converts mixed arguments for matching method-family names', () => {
    const sameNames = first.replaceAll('$payload', '$value').replaceAll('$mode', '$context').replaceAll('$quantity', '$count');
    const sameCaller = caller.replace('send(payload: "b", mode: "web", quantity: 3)',
      'send(value: "b", context: "web", count: 3)')
      .replace('send("c", mode: "api", quantity: 4)', 'send("c", context: "api", count: 4)')
      .replace('send("a", "web", 2)', 'send("a", context: "web", count: 2)');
    load(sameCaller);
    workspace.update(firstUri, sameNames, true);
    const plan = workspace.reorderMethodParameters(contractUri, offset, 0);
    expect(plan).toBeDefined();
    let changed = sameCaller;
    for (const edit of plan!.edits.filter((item) => item.uri === callerUri).sort((left, right) => right.start - left.start))
      changed = `${changed.slice(0, edit.start)}${edit.newText}${changed.slice(edit.end)}`;
    expect(changed).toContain('send(value: "a", context: "web", count: 2)');
    expect(changed).toContain('send(value: "c", context: "api", count: 4)');
    const parsed = parser.parse(changed);
    expect(parsed.errors).toEqual([]);
    parsed.tree.delete();
  });

  it('refuses positional evaluation changes and mixed arguments with unstable parameter names', () => {
    load(caller.replace('send("a", "web", 2)', 'send(sideEffect(), "web", 2)'));
    expect(workspace.reorderMethodParameters(contractUri, offset, 0)).toBeUndefined();
    load(caller.replace('send("a", "web", 2)', 'send("a", context: "web", count: 2)'));
    expect(workspace.reorderMethodParameters(contractUri, offset, 0)).toBeUndefined();
    workspace.update(firstUri, first.replaceAll('$payload', '$value'), true);
    expect(workspace.reorderMethodParameters(contractUri, offset, 0)).toBeUndefined();
    load(caller.replace('send($value, $context, $count)', 'send($unknown, $context, $count)'));
    expect(workspace.reorderMethodParameters(contractUri, offset, 0)).toBeUndefined();
    load(caller.replace('$localValue = $value;', 'if ($count > 0) { $localValue = $value; }'));
    expect(workspace.reorderMethodParameters(contractUri, offset, 0)).toBeUndefined();
    load(caller.replace('$contract->send($localValue, $localContext, $localCount)',
      'unset($localValue);\n        $contract->send($localValue, $localContext, $localCount)'));
    expect(workspace.reorderMethodParameters(contractUri, offset, 0)).toBeUndefined();
  });

  it('ignores an unrelated final method callable and non-code text, but rejects target or unknown callables', () => {
    const loggerUri = 'file:///workspace/src/Audit/Logger.php';
    workspace.update(loggerUri, `<?php namespace App\\Audit;
final class Logger { public function send(string $message): void {} }`, true);
    const withLogger = caller.replace('int $count): void', 'int $count, \\App\\Audit\\Logger $logger): void')
      .replace('$first->send(payload: "b", mode: "web", quantity: 3);',
        '$callback = $logger->send(...);\n        $first->send(payload: "b", mode: "web", quantity: 3);');
    load(withLogger);
    expect(workspace.reorderMethodParameters(contractUri, offset, 0)).toBeDefined();
    load(caller.replace('$first->send(payload: "b", mode: "web", quantity: 3);',
      '// $unknown->send(...);\n        $first->send(payload: "b", mode: "web", quantity: 3);'));
    expect(workspace.reorderMethodParameters(contractUri, offset, 0)).toBeDefined();
    load(caller.replace('$first->send(payload: "b", mode: "web", quantity: 3);',
      '$text = \'$unknown->send(...)\';\n        $first->send(payload: "b", mode: "web", quantity: 3);'));
    expect(workspace.reorderMethodParameters(contractUri, offset, 0)).toBeDefined();
    load(caller.replace('$first->send(payload: "b", mode: "web", quantity: 3);',
      '$callback = $contract->send(...);\n        $first->send(payload: "b", mode: "web", quantity: 3);'));
    expect(workspace.reorderMethodParameters(contractUri, offset, 0)).toBeUndefined();
    load(caller.replace('$first->send(payload: "b", mode: "web", quantity: 3);',
      '$callback = $contract->send(/* reason */ ...);\n        $first->send(payload: "b", mode: "web", quantity: 3);'));
    expect(workspace.reorderMethodParameters(contractUri, offset, 0)).toBeUndefined();
    load(caller.replace('$first->send(payload: "b", mode: "web", quantity: 3);',
      '$callback = $unknown->send(...);\n        $first->send(payload: "b", mode: "web", quantity: 3);'));
    expect(workspace.reorderMethodParameters(contractUri, offset, 0)).toBeUndefined();
  });

  it('reuses one temporary parse for repeated local calls in a closed file', () => {
    const countCallerParses = (source: string, expectedEdits: number): number => {
      load(source);
      workspace.update(callerUri, source, false);
      const parseTree = vi.spyOn(parser, 'parseTree');
      try {
        expect(workspace.reorderMethodParameters(contractUri, offset, 0)?.edits).toHaveLength(expectedEdits);
        return parseTree.mock.calls.filter(([parsedSource]) => parsedSource === source).length;
      } finally {
        parseTree.mockRestore();
      }
    };
    const parameterOnly = caller.replace('send($localValue, $localContext, $localCount)', 'send($value, $context, $count)');
    expect(countCallerParses(caller, 8) - countCallerParses(parameterOnly, 8)).toBe(1);
    const localCall = '$contract->send($localValue, $localContext, $localCount);';
    const repeatedLocal = caller.replace(localCall, Array(20).fill(localCall).join('\n        '));
    const parameterCall = '$contract->send($value, $context, $count);';
    const repeatedParameter = caller.replace(localCall, Array(20).fill(parameterCall).join('\n        '));
    expect(countCallerParses(repeatedLocal, 27) - countCallerParses(repeatedParameter, 27)).toBe(1);
  });

  it('reorders literal array arguments without moving calls nested inside arrays', () => {
    const arrayUri = 'file:///workspace/src/Service/ArrayConsumer.php';
    const source = `<?php namespace App\\Service;
final class ArrayConsumer {
    public function dispatch(array $payload, array $options, array $flags): void {}
    public function run(): void { $this->dispatch(['a'], ['mode' => ['fast', 1]], [true, null]); }
}`;
    workspace.update(arrayUri, source, true);
    const position = source.indexOf('$flags', source.indexOf('function dispatch')) + 2;
    const plan = workspace.reorderMethodParameters(arrayUri, position, 0);
    expect(plan).toBeDefined();
    let changed = source;
    for (const edit of plan!.edits.filter((item) => item.uri === arrayUri).sort((left, right) => right.start - left.start))
      changed = `${changed.slice(0, edit.start)}${edit.newText}${changed.slice(edit.end)}`;
    expect(changed).toContain("dispatch([true, null], ['a'], ['mode' => ['fast', 1]])");
    const legacySource = source.replace("$this->dispatch(['a'], ['mode' => ['fast', 1]], [true, null])",
      "$this->dispatch(array('a'), array('mode' => array('fast', 1)), array(true, null))");
    workspace.update(arrayUri, legacySource, true);
    const legacyPlan = workspace.reorderMethodParameters(arrayUri, position, 0);
    expect(legacyPlan).toBeDefined();
    let legacyChanged = legacySource;
    for (const edit of legacyPlan!.edits.filter((item) => item.uri === arrayUri).sort((left, right) => right.start - left.start))
      legacyChanged = `${legacyChanged.slice(0, edit.start)}${edit.newText}${legacyChanged.slice(edit.end)}`;
    expect(legacyChanged).toContain("dispatch(array(true, null), array('a'), array('mode' => array('fast', 1)))");
    workspace.update(arrayUri, source.replace("['mode' => ['fast', 1]]", "['mode' => compute()]"), true);
    expect(workspace.reorderMethodParameters(arrayUri, position, 0)).toBeUndefined();
    workspace.update(arrayUri, source.replace("['mode' => ['fast', 1]]", "[...$items]"), true);
    expect(workspace.reorderMethodParameters(arrayUri, position, 0)).toBeUndefined();
    workspace.update(arrayUri, legacySource.replace("array('mode' => array('fast', 1))",
      "array('mode' => compute())"), true);
    expect(workspace.reorderMethodParameters(arrayUri, position, 0)).toBeUndefined();
    workspace.update(arrayUri, legacySource.replace("array('mode' => array('fast', 1))",
      'array(...$items)'), true);
    expect(workspace.reorderMethodParameters(arrayUri, position, 0)).toBeUndefined();
  });
});
