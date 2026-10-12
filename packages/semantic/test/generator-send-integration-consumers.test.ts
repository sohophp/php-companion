import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PhpSyntaxParser } from '@php-companion/parser';
import { builtinDocumentUri, builtinPhpStub } from '@php-companion/language-spec';
import { SemanticWorkspace } from '../src/index.js';
import { generatorSendMismatchMarkers, generatorSendSource, type GeneratorSendState } from '../../../test/extension/suite/generatorSendFixture.js';

let parser: PhpSyntaxParser;
beforeAll(async () => { parser = await PhpSyntaxParser.createDefault(); });
afterAll(() => parser.dispose());
const states: GeneratorSendState[] = ['command', 'other', 'mixed', 'null', 'undeclared', 'bounded'];
describe('Production Generator send fixture keeps every consumer and call order', () => {
  it.each(states.flatMap(state => [false, true].map(deferred => ({ state, deferred }))))('$state (deferred=$deferred)', ({ state, deferred }) => {
    const workspace = new SemanticWorkspace(parser); const uri = 'file:///GeneratorSendIntegration.php';
    const source = generatorSendSource('App', state);
    const offset = (marker: string): number => source.lastIndexOf(marker) + marker.indexOf('->') + 3;
    try {
      workspace.update(builtinDocumentUri('8.5'), builtinPhpStub('8.5'));
      if (deferred) workspace.updateDeclarations(uri, source); else workspace.update(uri, source, true);
      expect(workspace.memberAt(uri, offset('$received->execute()'))?.fqcn).toBe(state === 'command' || state === 'bounded' ? 'App\\Command::execute' : undefined);
      expect(workspace.memberAt(uri, offset('$received->wrong()'))?.fqcn).toBe(state === 'other' ? 'App\\Other::wrong' : undefined);
      expect(workspace.memberAt(uri, offset('$sent->name()'))?.fqcn).toBe('App\\Item::name');
      const line = (start: number): number => source.slice(0, start).split('\n').length - 1;
      const expected = generatorSendMismatchMarkers(state).map(marker => line(source.lastIndexOf(marker) + marker.indexOf('(') + 1)).sort((a, b) => a - b);
      expect(workspace.incompatibleArguments(uri).map(item => line(item.start)).sort((a, b) => a - b)).toEqual(expected);
      expect(workspace.source(uri)).toBe(source);
    } finally { workspace.dispose(); }
  });
});
