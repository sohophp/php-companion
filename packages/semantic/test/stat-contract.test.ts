import { afterAll, beforeAll, expect, it } from 'vitest';
import { PhpSyntaxParser } from '@php-companion/parser';
import { builtinDocumentUri, builtinPhpStub } from '@php-companion/language-spec';
import { SemanticWorkspace } from '../src/index.js';

let parser: PhpSyntaxParser;
beforeAll(async () => { parser = await PhpSyntaxParser.createDefault(); });
afterAll(() => parser.dispose());

it.each(['7.2', '8.5'] as const)('retains stat failures and only suggests keys after narrowing at PHP %s', version => {
  const workspace = new SemanticWorkspace(parser); const uri = 'file:///StatConsumer.php';
  try {
    workspace.update(builtinDocumentUri(version), builtinPhpStub(version));
    for (const name of ['stat', 'lstat']) {
      const expression = `${name}($path)`;
      const source = `<?php function read(string $path): void { $metadata = ${expression}; }`;
      workspace.update(uri, source, true); const start = source.indexOf(expression);
      expect(workspace.provenExpressionType(uri, start, start + expression.length), name).toContain('false');
      for (const guard of ['', 'if ($metadata === false) return;', 'if (!is_array($metadata)) return;']) {
        const marked = `<?php function read(string $path): void { $metadata = ${expression}; ${guard} $metadata['si§']; }`;
        workspace.update(uri, marked.replace('§', ''), true);
        expect(workspace.completeArrayAccessKeys(uri, marked.indexOf('§'))?.keys.map(item => item.name) ?? [], `${name}: ${guard}`)
          .toEqual(guard ? ['size'] : []);
      }
    }
  } finally { workspace.dispose(); }
}, 15_000);
