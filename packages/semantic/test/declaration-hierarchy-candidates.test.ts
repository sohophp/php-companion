import { afterAll, beforeAll, expect, it } from 'vitest';
import { PhpSyntaxParser } from '@php-companion/parser';
import { SemanticWorkspace } from '../src/index.js';

let parser: PhpSyntaxParser;
beforeAll(async () => { parser = await PhpSyntaxParser.createDefault(); });
afterAll(() => parser.dispose());
const modes = ['live', 'declarations', 'restored', 'restored declarations', 'prepared', 'prepared declarations'] as const;
type Mode = (typeof modes)[number];
type Internals = {
  files: Map<string, { declarations: unknown }>;
  referenceCandidates: { remove(uri: string): void };
  unindexedReferenceCandidateUris: Set<string>;
};
const leaf = 'file:///Hierarchy/Leaf.php', root = 'file:///Hierarchy/Root.php', duplicate = 'file:///Hierarchy/Duplicate.php';
function install(workspace: SemanticWorkspace, donor: SemanticWorkspace, mode: Mode, uri: string, source: string): void {
  if (mode === 'declarations') workspace.updateDeclarations(uri, source);
  else if (mode === 'restored' || mode === 'restored declarations') {
    donor.update(uri, source);
    expect(mode === 'restored' ? workspace.restore(donor.snapshot(uri), uri)
      : workspace.restoreDeclaration(donor.snapshotForPersistence(uri)!, uri)).toBe(true);
  } else if (mode === 'prepared' || mode === 'prepared declarations')
    workspace.updatePrepared(uri, source, parser.prepare(source, uri, mode === 'prepared declarations'));
  else workspace.update(uri, source);
}

it.each(modes)('does not inspect unrelated declarations while proving an exact inherited source graph (%s)', mode => {
  const workspace = new SemanticWorkspace(parser), donor = new SemanticWorkspace(parser);
  const observed: Array<{ file: { declarations: unknown }; declarations: unknown }> = [];
  let unrelatedReads = 0;
  try {
    install(workspace, donor, mode, leaf, '<?php namespace App; use Lib\\Root as ParentAlias; class Leaf extends ParentAlias {}');
    install(workspace, donor, mode, root, '<?php namespace Lib; class Root {}');
    for (let index = 0; index < 8; index++) {
      const uri = `file:///Hierarchy/Noise${index}.php`;
      install(workspace, donor, mode, uri, `<?php namespace Noise${index}; class Root {} class Leaf {}`);
      const file = (workspace as unknown as Internals).files.get(uri)!, declarations = file.declarations;
      observed.push({ file, declarations });
      Object.defineProperty(file, 'declarations', { configurable: true, get: () => { unrelatedReads += 1; return declarations; } });
    }
    expect(workspace.declarationHierarchySourceUris('APP\\LEAF')).toEqual([leaf, root]);
    expect(unrelatedReads).toBe(0);
  } finally {
    for (const { file, declarations } of observed) Object.defineProperty(file, 'declarations', { configurable: true, value: declarations });
    workspace.dispose(); donor.dispose();
  }
});

it.each(modes)('retains ambiguity and refreshes inheritance after declaration replacement and removal (%s)', mode => {
  const workspace = new SemanticWorkspace(parser), donor = new SemanticWorkspace(parser);
  try {
    install(workspace, donor, mode, leaf, '<?php namespace App; class Leaf extends \\Lib\\Root {}');
    install(workspace, donor, mode, root, '<?php namespace Lib; class Root {}');
    expect(workspace.declarationHierarchySourceUris('App\\Leaf')).toEqual([leaf, root]);
    install(workspace, donor, mode, duplicate, '<?php namespace LIB; class ROOT {}');
    expect(workspace.declarationHierarchySourceUris('App\\Leaf')).toBeUndefined();
    workspace.remove(duplicate);
    expect(workspace.declarationHierarchySourceUris('App\\Leaf')).toEqual([leaf, root]);
    install(workspace, donor, mode, root, '<?php namespace Lib; class Root {} class ROOT {}');
    expect(workspace.declarationHierarchySourceUris('App\\Leaf')).toBeUndefined();
    install(workspace, donor, mode, root, '<?php namespace Other; class Root {}');
    expect(workspace.declarationHierarchySourceUris('App\\Leaf')).toBeUndefined();
    install(workspace, donor, mode, root, '<?php namespace Lib; class Root {}');
    workspace.update(leaf, '<?php namespace App; class Leaf {}', true);
    expect(workspace.declarationHierarchySourceUris('App\\Leaf')).toEqual([leaf]);
    workspace.remove(leaf);
    expect(workspace.declarationHierarchySourceUris('App\\Leaf')).toBeUndefined();
  } finally { workspace.dispose(); donor.dispose(); }
});

it.each(modes)('checks unindexed declaration owners and duplicates instead of treating missing index keys as absence (%s)', mode => {
  const workspace = new SemanticWorkspace(parser), donor = new SemanticWorkspace(parser);
  try {
    install(workspace, donor, mode, leaf, '<?php namespace App; class Leaf extends \\Lib\\Root {}');
    install(workspace, donor, mode, root, '<?php namespace Lib; class Root {}');
    const internal = workspace as unknown as Internals;
    internal.referenceCandidates.remove(root); internal.unindexedReferenceCandidateUris.add(root);
    expect(workspace.declarationHierarchySourceUris('App\\Leaf')).toEqual([leaf, root]);
    install(workspace, donor, mode, duplicate, '<?php namespace Lib; class ROOT {}');
    internal.referenceCandidates.remove(duplicate); internal.unindexedReferenceCandidateUris.add(duplicate);
    expect(workspace.declarationHierarchySourceUris('App\\Leaf')).toBeUndefined();
    workspace.remove(duplicate);
    expect(workspace.declarationHierarchySourceUris('App\\Leaf')).toEqual([leaf, root]);
    workspace.remove(root);
    expect(workspace.declarationHierarchySourceUris('App\\Leaf')).toBeUndefined();
  } finally { workspace.dispose(); donor.dispose(); }
});
