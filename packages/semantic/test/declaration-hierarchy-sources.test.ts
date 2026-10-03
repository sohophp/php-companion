import { afterAll, beforeAll, expect, it } from 'vitest';
import { PhpSyntaxParser } from '@php-companion/parser';
import { SemanticWorkspace } from '../src/index.js';

let parser: PhpSyntaxParser;
beforeAll(async () => { parser = await PhpSyntaxParser.createDefault(); });
afterAll(() => parser.dispose());

it.each(['live', 'declarations', 'restored'])('tracks all inherited source inputs including aliases and nested Traits (%s)', mode => {
  const sources = new Map([
    ['file:///Leaf.php', '<?php namespace App; use Lib\\Middle as Alias; class Leaf extends Alias {}'],
    ['file:///Middle.php', '<?php namespace Lib; class Middle extends Root {}'],
    ['file:///Root.php', '<?php namespace Lib; class Root implements Contract { use Shared; }'],
    ['file:///Contract.php', '<?php namespace Lib; interface Contract extends Ancestor {}'],
    ['file:///Ancestor.php', '<?php namespace Lib; interface Ancestor {}'],
    ['file:///Shared.php', '<?php namespace Lib; trait Shared { use Nested; }'],
    ['file:///Nested.php', '<?php namespace Lib; trait Nested {}'],
  ]);
  const donor = new SemanticWorkspace(parser); const workspace = new SemanticWorkspace(parser);
  try {
    for (const [uri, source] of sources) {
      if (mode === 'declarations') workspace.updateDeclarations(uri, source);
      else if (mode === 'restored') {
        donor.update(uri, source); expect(workspace.restoreDeclaration(donor.snapshot(uri), uri)).toBe(true);
      } else workspace.update(uri, source);
    }
    expect(workspace.declarationHierarchySourceUris('App\\Leaf')).toEqual([...sources.keys()].sort());
    workspace.update('file:///Middle.php', '<?php namespace Lib; class Middle {}', true);
    expect(workspace.declarationHierarchySourceUris('App\\Leaf')).toEqual(['file:///Leaf.php', 'file:///Middle.php']);
    workspace.update('file:///Duplicate.php', '<?php namespace Lib; class Middle {}');
    expect(workspace.declarationHierarchySourceUris('App\\Leaf')).toBeUndefined();
    workspace.remove('file:///Duplicate.php'); workspace.remove('file:///Middle.php');
    expect(workspace.declarationHierarchySourceUris('App\\Leaf')).toBeUndefined();
  } finally { workspace.dispose(); donor.dispose(); }
});

it('refuses an unresolved or excessively large inheritance input graph', () => {
  const workspace = new SemanticWorkspace(parser);
  try {
    workspace.update('file:///Missing.php', '<?php class Missing { use Unknown; }');
    expect(workspace.declarationHierarchySourceUris('Missing')).toBeUndefined();
    for (let index = 0; index < 65; index++) workspace.update(`file:///Chain${index}.php`,
      `<?php class Chain${index}${index < 64 ? ` extends Chain${index + 1}` : ''} {}`);
    expect(workspace.declarationHierarchySourceUris('Chain0')).toBeUndefined();
    expect(workspace.declarationHierarchySourceUris('Chain1')).toHaveLength(64);
  } finally { workspace.dispose(); }
});
