import { afterAll, beforeAll, expect, it, vi } from 'vitest';
import { PhpSyntaxParser, type ParsedScope } from '@php-companion/parser';
import { SemanticWorkspace } from '../src/index.js';

let parser: PhpSyntaxParser;
beforeAll(async () => { parser = await PhpSyntaxParser.createDefault(); });
afterAll(() => parser.dispose());
const uri = 'file:///ScopeLookup/Functions.php';
const scopesFor = (workspace: SemanticWorkspace): ParsedScope[] =>
  (workspace as unknown as { files: Map<string, { scopes: ParsedScope[] }> }).files.get(uri)!.scopes;

it.each(['live', 'prepared'] as const)('bounds scope identity reads when enriching a large callable catalogue (%s)', mode => {
  const source = '<?php namespace ScopeLookup;\n' + Array.from({ length: 160 }, (_, index) =>
    `/** @param int $value */ function item${index}($value): void {}\n`).join('');
  let reads = 0, scopeCount = 0;
  const observe = (scopes: ParsedScope[]): void => {
    scopeCount = scopes.length;
    for (const scope of scopes) {
      const id = scope.id;
      Object.defineProperty(scope, 'id', { enumerable: true, get: () => { reads += 1; return id; } });
    }
  };
  const workspace = new SemanticWorkspace(parser);
  try {
    if (mode === 'prepared') {
      const prepared = parser.prepare(source, uri, false);
      expect(prepared.kind).toBe('full');
      if (prepared.kind !== 'full') throw new Error('Full facts required.');
      observe(prepared.facts.scopes);
      workspace.updatePrepared(uri, source, prepared);
    } else {
      const parse = parser.parse.bind(parser);
      vi.spyOn(parser, 'parse').mockImplementation((...args) => {
        const parsed = parse(...args); observe(parsed.scopes); return parsed;
      });
      workspace.update(uri, source);
    }
    expect(scopeCount).toBe(161);
    expect(reads).toBeLessThanOrEqual(scopeCount * 3);
    const scopes = scopesFor(workspace);
    expect(scopes.find(scope => scope.id === 'ScopeLookup\\item159')?.parameters[0]?.type).toBe('int');
  } finally { vi.restoreAllMocks(); workspace.dispose(); }
});

it.each(['live', 'prepared'] as const)('keeps the first exact duplicate and native parameters for unmatched scope identities (%s)', mode => {
  const source = `<?php namespace ScopeLookup;
/** @param int $first */ function same($first) {}
/** @param string $second */ function same($second) {}
/** @param bool $upper */ function SAME($upper) {}
$closure = function (string $fallback) {};
`;
  const workspace = new SemanticWorkspace(parser);
  try {
    if (mode === 'prepared') workspace.updatePrepared(uri, source, parser.prepare(source, uri, false));
    else workspace.update(uri, source);
    const scopes = scopesFor(workspace);
    const duplicate = scopes.filter(scope => scope.id === 'ScopeLookup\\same');
    expect(duplicate).toHaveLength(2);
    expect(duplicate.map(scope => scope.parameters.map(parameter => [parameter.name, parameter.type])))
      .toEqual([[['first', 'int']], [['first', 'int']]]);
    expect(scopes.find(scope => scope.id === 'ScopeLookup\\SAME')?.parameters.map(parameter => [parameter.name, parameter.type]))
      .toEqual([['upper', 'bool']]);
    expect(scopes.find(scope => scope.kind === 'closure')?.parameters.map(parameter => [parameter.name, parameter.type]))
      .toEqual([['fallback', 'string']]);
  } finally { workspace.dispose(); }
});
