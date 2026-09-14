import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PhpSyntaxParser } from '@php-companion/parser';
import { SemanticWorkspace } from '@php-companion/semantic';
import { analyzeProjectPhpFileFacts, createCachedProjectPhpFile, restoreCachedProjectPhpFile } from '../src/projectFacts.js';

describe('persistent project PHP facts', () => {
  let parser: PhpSyntaxParser;
  beforeAll(async () => { parser = await PhpSyntaxParser.createDefault(); });
  afterAll(() => parser.dispose());

  it('round-trips controller and Doctrine facts while rebasing the interop generation', () => {
    const uri = 'file:///src/PageController.php';
    const source = `<?php namespace App;
      use Doctrine\\ORM\\Mapping as ORM;
      #[ORM\\Entity]
      class PageController {
        #[ORM\\ManyToOne(targetEntity: User::class)] public ?User $owner;
        public function show(User $user): void { $this->render('page.html.twig', ['user' => $user]); }
      }`;
    const workspace = new SemanticWorkspace(parser); workspace.update(uri, source);
    const semantic = workspace.snapshot(uri)!;
    const facts = analyzeProjectPhpFileFacts(parser, uri, source, 'generation-1');
    expect(facts.controllerContexts).toHaveLength(1); expect(facts.doctrineProperties).toHaveLength(1);
    const cached = createCachedProjectPhpFile(semantic, facts);
    const restored = restoreCachedProjectPhpFile(structuredClone(cached), uri, 'generation-2');
    expect(restored?.facts.controllerContexts[0]?.sources[0]?.location.snapshotVersion).toBe('generation-2');
    expect(restored?.facts.controllerContexts[0]?.variables[0]?.sources?.[0]?.snapshotVersion).toBe('generation-2');
    expect(restored?.facts.doctrineProperties).toEqual(facts.doctrineProperties);
    workspace.dispose();
  });

  it('rejects tampered facts, a mismatched URI, and an unsupported wrapper schema', () => {
    const uri = 'file:///src/Entity.php'; const source = '<?php namespace App; class Entity {}';
    const workspace = new SemanticWorkspace(parser); workspace.update(uri, source);
    const cached = createCachedProjectPhpFile(workspace.snapshot(uri)!, analyzeProjectPhpFileFacts(parser, uri, source, 'one'));
    const tampered = structuredClone(cached); tampered.facts.doctrineMethods.push({
      ownerFqcn: 'App\\Repository', name: 'find', returnType: 'App\\Other|null', uri, start: 0, end: 5,
    });
    expect(restoreCachedProjectPhpFile(tampered, uri, 'two')).toBeUndefined();
    expect(restoreCachedProjectPhpFile(cached, 'file:///src/Other.php', 'two')).toBeUndefined();
    expect(restoreCachedProjectPhpFile(cached, uri, 'two', `${source}\n// unsaved`)).toBeUndefined();
    expect(restoreCachedProjectPhpFile({ ...cached, schema: 2 }, uri, 'two')).toBeUndefined();
    workspace.dispose();
  });
});
