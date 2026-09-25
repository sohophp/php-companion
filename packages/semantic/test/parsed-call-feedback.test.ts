import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PhpSyntaxParser } from '@php-companion/parser';
import { SemanticWorkspace } from '../src/index.js';

describe('feedback for calls with nested arguments', () => {
  let parser: PhpSyntaxParser;
  let workspace: SemanticWorkspace;
  const uri = 'file:///workspace/src/ArrayCalls.php';

  beforeAll(async () => { parser = await PhpSyntaxParser.createDefault(); workspace = new SemanticWorkspace(parser); });
  afterAll(() => { workspace.dispose(); parser.dispose(); });

  it('reports missing and unknown parameters and keeps parameter hints for outer calls', () => {
    const source = `<?php namespace App;
function dispatch(array $payload, string $mode): void {}
dispatch(array('x'));
dispatch(payload: array('x'), extra: 'dev');
dispatch(array('x'), 'dev');`;
    workspace.update(uri, source, true);
    expect(workspace.missingRequiredArguments(uri)).toContainEqual(expect.objectContaining({
      callable: 'App\\dispatch', parameters: ['mode'], start: source.indexOf('dispatch(array('),
    }));
    expect(workspace.missingRequiredArguments(uri, true)).toContainEqual(expect.objectContaining({
      callable: 'App\\dispatch', parameters: ['mode'],
    }));
    expect(workspace.unknownNamedArguments(uri)).toContainEqual(expect.objectContaining({
      callable: 'App\\dispatch', name: 'extra', start: source.indexOf('extra:'),
    }));
    expect(workspace.unknownNamedArguments(uri, true)).toContainEqual(expect.objectContaining({
      callable: 'App\\dispatch', name: 'extra',
    }));
    const hints = workspace.inlayParameterHints(uri, source.indexOf('dispatch(array('), source.length);
    expect(hints.filter((hint) => hint.position >= source.lastIndexOf('dispatch(array(')).map((hint) => hint.label))
      .toEqual(['$payload:', '$mode:']);
    workspace.remove(uri);
  });

  it('does not attach a nested callable signature to an unresolved outer call', () => {
    const source = `<?php namespace App;
function inner(string $required): void {}
unresolved(inner());`;
    workspace.update(uri, source, true);
    const outerStart = source.indexOf('unresolved(');
    expect(workspace.missingRequiredArguments(uri).filter((item) => item.start === outerStart)).toEqual([]);
    expect(workspace.inlayParameterHints(uri, outerStart, source.length)
      .filter((item) => item.position < source.indexOf('inner());'))).toEqual([]);
    workspace.remove(uri);
  });
});
