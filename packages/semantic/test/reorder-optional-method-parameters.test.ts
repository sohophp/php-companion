import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PhpSyntaxParser } from '@php-companion/parser';
import { SemanticWorkspace } from '../src/index.js';

describe('reorder methods with default parameters', () => {
  let parser: PhpSyntaxParser;
  let workspace: SemanticWorkspace;
  const contractUri = 'file:///workspace/src/Contract/OptionalMessage.php';
  const firstUri = 'file:///workspace/src/Service/OptionalOne.php';
  const callerUri = 'file:///workspace/src/Controller/OptionalCaller.php';
  const contract = `<?php namespace App\\Contract;
interface OptionalMessage {
    /**
     * @param string $head
     * @param string $mode
     * @param int $count
     */
    public function combine(string $head, string $mode = 'web', int $count = 2): string;
}`;
  const first = `<?php namespace App\\Service;
use App\\Contract\\OptionalMessage;
final class OptionalOne implements OptionalMessage {
    public function combine(string $head, string $mode = 'web', int $count = 2): string { return $head; }
}`;
  const caller = `<?php namespace App\\Controller;
use App\\Contract\\OptionalMessage;
use App\\Service\\OptionalOne;
final class OptionalCaller {
    public function run(OptionalMessage $contract, OptionalOne $one): void {
        $contract->combine('x');
        $contract->combine('y', 'api', 3);
        $contract->combine(head: 'z', count: 4);
        $one->combine('p', mode: 'admin');
    }
}`;
  const offset = contract.indexOf('$count', contract.indexOf('function combine')) + 2;

  beforeAll(async () => { parser = await PhpSyntaxParser.createDefault(); workspace = new SemanticWorkspace(parser); });
  afterAll(() => { workspace.dispose(); parser.dispose(); });
  const load = (contractSource = contract, firstSource = first, callerSource = caller): void => {
    for (const [uri, source] of [[contractUri, contractSource], [firstUri, firstSource], [callerUri, callerSource]])
      workspace.update(uri!, source!, true);
  };

  it('moves optional declarations and PHPDoc while preserving omitted and named arguments', () => {
    load();
    const plan = workspace.reorderMethodParameters(contractUri, offset, 1);
    expect(plan).toBeDefined();
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
    expect(sources.get(contractUri)).toContain("combine(string $head, int $count = 2, string $mode = 'web')");
    expect(sources.get(firstUri)).toContain("combine(string $head, int $count = 2, string $mode = 'web')");
    expect(sources.get(callerUri)).toContain("combine('x')");
    expect(sources.get(callerUri)).toContain("combine('y', 3, 'api')");
    expect(sources.get(callerUri)).toContain("combine(head: 'z', count: 4)");
    expect(sources.get(callerUri)).toContain("combine(head: 'p', mode: 'admin')");
  });

  it('rejects partial positional calls that would bind a different optional parameter', () => {
    load(contract, first, caller.replace("combine('y', 'api', 3)", "combine('y', 'api')"));
    expect(workspace.reorderMethodParameters(contractUri, offset, 1)).toBeUndefined();
  });

  it('reorders supplied required arguments while leaving an omitted optional suffix alone', () => {
    const requiredContract = contract.replace("string $mode = 'web'", 'string $mode');
    const requiredFirst = first.replace("string $mode = 'web'", 'string $mode');
    const requiredCaller = caller.replace("combine('x')", "combine('x', 'web')")
      .replace("combine(head: 'z', count: 4)", "combine(head: 'z', mode: 'web', count: 4)");
    load(requiredContract, requiredFirst, requiredCaller);
    const modeOffset = requiredContract.indexOf('$mode', requiredContract.indexOf('function combine')) + 2;
    const plan = workspace.reorderMethodParameters(contractUri, modeOffset, 0);
    expect(plan).toBeDefined();
    let changed = requiredCaller;
    for (const edit of plan!.edits.filter((item) => item.uri === callerUri).sort((left, right) => right.start - left.start))
      changed = `${changed.slice(0, edit.start)}${edit.newText}${changed.slice(edit.end)}`;
    expect(changed).toContain("combine('web', 'x')");
    expect(changed).toContain("combine('api', 'y', 3)");
    expect(changed).toContain("combine(head: 'z', mode: 'web', count: 4)");
  });

  it('rejects moves across the required boundary and inconsistent defaults', () => {
    load();
    expect(workspace.reorderMethodParameters(contractUri, offset, 0)).toBeUndefined();
    load(contract, first.replace("string $mode = 'web'", 'string $mode'));
    expect(workspace.reorderMethodParameters(contractUri, offset, 1)).toBeUndefined();
  });
});
