import { afterAll, beforeAll, expect, it } from 'vitest';
import { PhpSyntaxParser } from '@php-companion/parser';
import { SemanticWorkspace } from '../src/index.js';
let parser: PhpSyntaxParser;
beforeAll(async () => { parser = await PhpSyntaxParser.createDefault(); });
afterAll(() => parser.dispose());
for (const deferred of [false, true]) it.each(['0o', '0O', '0o_7', '0O_7'])('rejects parameter reorder info until malformed %s recovers, deferred=' + deferred, literal => {
  const uri = 'file:///MalformedOctal.php', workspace = new SemanticWorkspace(parser);
  const prefix = '<?php class C { public function run(int $x, int $y): int { return $x+$y; } } $value=';
  try {
    for (const current of [literal, '0o755', literal, '0O7_55']) {
      const source = prefix + current + ';';
      if (deferred) workspace.updateDeclarations(uri, source); else workspace.update(uri, source, true);
      const info = workspace.methodParameterOrder(uri, source.indexOf('$x'));
      expect(info).toEqual(current === literal ? undefined : { names: ['x', 'y'], index: 0 });
      expect(workspace.source(uri)).toBe(source);
    }
  } finally { workspace.dispose(); }
});
