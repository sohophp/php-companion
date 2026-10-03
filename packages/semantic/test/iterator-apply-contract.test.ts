import { afterAll, beforeAll, expect, it } from 'vitest';
import { PhpSyntaxParser } from '@php-companion/parser';
import { SemanticWorkspace } from '../src/index.js';
import { builtinDocumentUri, builtinPhpStub } from '@php-companion/language-spec';
let parser: PhpSyntaxParser;
beforeAll(async () => { parser = await PhpSyntaxParser.createDefault(); });
afterAll(() => parser.dispose());
it.each(['7.2', '7.4', '8.1', '8.5'] as const)('accepts arbitrary iterator_apply args arrays at PHP %s', version => {
  const workspace = new SemanticWorkspace(parser); const uri = 'file:///IteratorApply.php';
  try {
    workspace.update(builtinDocumentUri(version), builtinPhpStub(version));
    for (const argsType of ['list<mixed>', 'array<string, mixed>', 'array<int, mixed>']) {
      for (const suffix of [', $args', ', null', '']) {
        const expression = `iterator_apply($iterator, $callback${suffix})`;
        const source = `<?php /** @param ${argsType} $args */ function read(Traversable $iterator, callable $callback, array $args): void { $count = ${expression}; }`;
        workspace.update(uri, source, true); const start = source.indexOf(expression);
        expect(workspace.provenExpressionType(uri, start, start + expression.length), argsType + suffix).toBe('int');
      }
    }
    for (const expression of ['iterator_apply($iterator, $callback, 42)', 'iterator_apply(42, $callback)', 'iterator_apply()']) {
      const source = `<?php function read(Traversable $iterator, callable $callback): void { $count = ${expression}; }`;
      workspace.update(uri, source, true); const start = source.indexOf(expression);
      expect(workspace.provenExpressionType(uri, start, start + expression.length), expression).toBeUndefined();
    }
    if (!version.startsWith('7.')) {
      const expression = 'iterator_apply(args: $args, callback: $callback, iterator: $iterator)';
      const source = `<?php /** @param array<string, mixed> $args */ function read(Traversable $iterator, callable $callback, array $args): void { $count = ${expression}; }`;
      workspace.update(uri, source, true); const start = source.indexOf(expression);
      expect(workspace.provenExpressionType(uri, start, start + expression.length)).toBe('int');
    }
  } finally { workspace.dispose(); }
}, 20000);
