import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PhpSyntaxParser } from '@php-companion/parser';
import { SemanticWorkspace } from '../src/index.js';

describe('Extract Method with nested call arguments', () => {
  let parser: PhpSyntaxParser;
  let workspace: SemanticWorkspace;

  beforeAll(async () => { parser = await PhpSyntaxParser.createDefault(); workspace = new SemanticWorkspace(parser); });
  afterAll(() => { workspace.dispose(); parser.dispose(); });

  it('keeps a proven by-value input when a later argument is a legacy array', () => {
    const uri = 'file:///workspace/src/ExtractArrayInput.php';
    const source = `<?php namespace App;
final class ExtractArrayInput {
    private function dispatch(string $label, array $payload): void {}
    public function run(string $label): void {
        $this->dispatch($label, array('x'));
    }
}`;
    workspace.update(uri, source, true);
    const start = source.indexOf("$this->dispatch($label, array('x'));");
    const plan = workspace.extractMethod(uri, start, start + "$this->dispatch($label, array('x'));".length);
    expect(plan?.parameters).toEqual(['label']);
    workspace.remove(uri);
  });

  it('retains a native output type from a call with a legacy array argument', () => {
    const uri = 'file:///workspace/src/ExtractArrayOutput.php';
    const source = `<?php namespace App;
function makeLabel(array $payload): string { return 'ready'; }
final class ExtractArrayOutput {
    public function run(): string {
        $result = makeLabel(array('x'));
        return $result;
    }
}`;
    workspace.update(uri, source, true);
    const start = source.indexOf("$result = makeLabel(array('x'));");
    const plan = workspace.extractMethod(uri, start, start + "$result = makeLabel(array('x'));".length);
    expect(plan?.methodText).toContain('): string');
    workspace.remove(uri);
  });
});
