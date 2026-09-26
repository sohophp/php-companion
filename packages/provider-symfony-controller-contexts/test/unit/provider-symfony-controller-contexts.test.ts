import { mkdir, mkdtemp, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PhpSyntaxParser } from '@php-companion/parser';
import { collectSymfonyControllerContexts } from '../../src/index.js';

describe('Symfony controller context provider', () => {
  let parser: PhpSyntaxParser; let root: string;
  beforeAll(async () => { parser = await PhpSyntaxParser.createDefault(); root = await mkdtemp(join(tmpdir(), 'symfony-controller-provider-')); });
  afterAll(async () => { parser.dispose(); await rm(root, { recursive: true, force: true }); });

  it('reads bounded project sources and honors open snapshots', async () => {
    const path = join(root, 'PageController.php'); const uri = pathToFileURL(path).toString();
    await writeFile(path, "<?php class PageController { function show(User $user) { return $this->render('disk.html.twig', ['user' => $user]); } }");
    const projectTypes = [{ fqcn: 'PageController', kind: 'class' as const, abstract: false, path, uri, start: 12, end: 26 }];
    const facts = await collectSymfonyControllerContexts(root, parser, { projectTypes, snapshotVersion: 'disk', documents: [{
      uri, languageId: 'php', snapshotVersion: 'open:2',
      source: "<?php class PageController { function show(User $user) { return $this->render('open.html.twig', ['user' => $user]); } }",
    }] });
    expect(facts.sourceUris).toEqual([uri]);
    expect(facts.contexts).toMatchObject([{ template: 'open.html.twig', complete: true,
      variables: [{ name: 'user', type: { kind: 'named', name: 'User' } }],
      sources: [{ symbol: 'PageController::show', location: { snapshotVersion: 'open:2' } }] }]);
  });

  it('analyzes a new open document before it has a project type entry', async () => {
    const path = join(root, 'NewController.php'); const uri = pathToFileURL(path).toString();
    const facts = await collectSymfonyControllerContexts(root, parser, { projectTypes: [], snapshotVersion: 'project', documents: [{
      uri, languageId: 'php', snapshotVersion: 'open:1',
      source: "<?php class NewController { function show(User $user) { return $this->render('new.html.twig', ['user' => $user]); } }",
    }] });
    expect(facts.sourceUris).toEqual([uri]);
    expect(facts.contexts).toMatchObject([{ template: 'new.html.twig', sources: [{ location: { uri, snapshotVersion: 'open:1' } }] }]);
  });

  it('reads a controller through a project root alias', async () => {
    const realRoot = join(root, 'real'); const aliasRoot = join(root, 'alias');
    await mkdir(realRoot); await symlink(realRoot, aliasRoot, 'dir');
    const path = join(aliasRoot, 'AliasedController.php'); const uri = pathToFileURL(path).toString();
    await writeFile(path, "<?php class AliasedController { function show(User $user) { return $this->render('aliased.html.twig', ['user' => $user]); } }");
    const facts = await collectSymfonyControllerContexts(aliasRoot, parser, { projectTypes: [{
      fqcn: 'AliasedController', kind: 'class', abstract: false, path, uri, start: 12, end: 29,
    }], snapshotVersion: 'disk' });
    expect(facts.sourceUris).toEqual([uri]);
    expect(facts.contexts).toMatchObject([{ template: 'aliased.html.twig', complete: true }]);
  });
});
