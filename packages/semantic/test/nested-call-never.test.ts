import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PhpSyntaxParser } from '@php-companion/parser';
import { SemanticWorkspace } from '../src/index.js';

describe('native never calls with nested arguments', () => {
  let parser: PhpSyntaxParser;
  let workspace: SemanticWorkspace;

  beforeAll(async () => { parser = await PhpSyntaxParser.createDefault(); workspace = new SemanticWorkspace(parser); });
  afterAll(() => { workspace.dispose(); parser.dispose(); });

  it('proves only the compatible outer call in a same-file on-demand analysis', () => {
    const uri = 'file:///workspace/src/NestedNever.php';
    const source = `<?php namespace App;
function stop(array $payload): never { throw new \\Exception(); }
function ordinary(array $payload): void {}
function run(): void {
    stop(array('x')); afterStop();
    ordinary(array('x')); afterOrdinary();
}`;
    workspace.update(uri, source, true);
    expect(workspace.neverReturningCalls(uri, true).map((range) => source.slice(range.start, range.end)))
      .toEqual(["stop(array('x'))"]);
    workspace.remove(uri);
  });
});
