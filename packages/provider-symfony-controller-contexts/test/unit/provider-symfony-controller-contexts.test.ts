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

  it('publishes named renderView context from an unsaved controller', async () => {
    const path = join(root, 'ViewController.php'); const uri = pathToFileURL(path).toString();
    const facts = await collectSymfonyControllerContexts(root, parser, { projectTypes: [], snapshotVersion: 'project', documents: [{
      uri, languageId: 'php', snapshotVersion: 'open:3',
      source: "<?php class ViewController { function show(User $user) { return $this->renderView(parameters: ['user' => $user], view: 'view.html.twig'); } }",
    }] });
    expect(facts.contexts).toMatchObject([{ template: 'view.html.twig', complete: true,
      variables: [{ name: 'user', type: { kind: 'named', name: 'User' }, sources: [{ uri, snapshotVersion: 'open:3' }] }] }]);
  });

  it('publishes a known compact parameter from an unsaved controller', async () => {
    const path = join(root, 'CompactController.php'); const uri = pathToFileURL(path).toString();
    const facts = await collectSymfonyControllerContexts(root, parser, { projectTypes: [], snapshotVersion: 'project', documents: [{
      uri, languageId: 'php', snapshotVersion: 'open:5',
      source: "<?php class CompactController { function show(User $user) { return $this->render('compact.html.twig', compact('user')); } }",
    }] });
    expect(facts.contexts).toMatchObject([{ template: 'compact.html.twig', complete: true,
      variables: [{ name: 'user', type: { kind: 'named', name: 'User' }, sources: [{ uri, snapshotVersion: 'open:5' }] }] }]);
  });

  it('publishes a directly assigned local compact variable from an unsaved controller', async () => {
    const path = join(root, 'LocalCompactController.php'); const uri = pathToFileURL(path).toString();
    const facts = await collectSymfonyControllerContexts(root, parser, { projectTypes: [], snapshotVersion: 'project', documents: [{
      uri, languageId: 'php', snapshotVersion: 'open:6',
      source: "<?php class LocalCompactController { function show() { $user = new User(); return $this->render('local.html.twig', compact('user')); } }",
    }] });
    expect(facts.contexts).toMatchObject([{ template: 'local.html.twig', complete: true,
      variables: [{ name: 'user', type: { kind: 'named', name: 'User' }, valueLocation: { uri, snapshotVersion: 'open:6' } }] }]);
  });

  it('publishes consecutive compact assignments from an unsaved controller', async () => {
    const path = join(root, 'MultipleCompactController.php'); const uri = pathToFileURL(path).toString();
    const facts = await collectSymfonyControllerContexts(root, parser, { projectTypes: [], snapshotVersion: 'project', documents: [{
      uri, languageId: 'php', snapshotVersion: 'open:7',
      source: "<?php class MultipleCompactController { function show() { $user = new User(); $title = 'Profile'; return $this->render('multiple.html.twig', compact('user', 'title')); } }",
    }] });
    expect(facts.contexts).toMatchObject([{ template: 'multiple.html.twig', complete: true, variables: [
      { name: 'user', type: { kind: 'named', name: 'User' }, valueLocation: { uri, snapshotVersion: 'open:7' } },
      { name: 'title', type: { kind: 'primitive', name: 'string' }, valueLocation: { uri, snapshotVersion: 'open:7' } },
    ] }]);
  });

  it('publishes an exact Template attribute without a render call', async () => {
    const path = join(root, 'AttributeController.php'); const uri = pathToFileURL(path).toString();
    const facts = await collectSymfonyControllerContexts(root, parser, { projectTypes: [], snapshotVersion: 'project', documents: [{
      uri, languageId: 'php', snapshotVersion: 'open:4',
      source: "<?php use Symfony\\Bridge\\Twig\\Attribute\\Template; class AttributeController { #[Template('attribute.html.twig')] public function show(User $user): array { return ['user' => $user]; } }",
    }] });
    expect(facts.contexts).toMatchObject([{ template: 'attribute.html.twig', complete: true,
      variables: [{ name: 'user', type: { kind: 'named', name: 'User' }, sources: [{ uri, snapshotVersion: 'open:4' }] }] }]);
  });

  it('rejects an open snapshot whose symlink resolves outside the project', async () => {
    const external = await mkdtemp(join(tmpdir(), 'symfony-controller-outside-'));
    try {
      const outsidePath = join(external, 'OutsideController.php');
      await writeFile(outsidePath, '<?php class OutsideController {}');
      const path = join(root, 'LinkedController.php');
      await symlink(outsidePath, path);
      const uri = pathToFileURL(path).toString();
      await expect(collectSymfonyControllerContexts(root, parser, { projectTypes: [], snapshotVersion: 'project', documents: [{
        uri, languageId: 'php', snapshotVersion: 'open:1',
        source: "<?php class LinkedController { function show() { return $this->render('outside.html.twig'); } }",
      }] })).rejects.toThrow('outside the project root');
    } finally { await rm(external, { recursive: true, force: true }); }
  });
});
