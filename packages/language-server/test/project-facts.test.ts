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
    expect(cached).toMatchObject({ schema: 3, semantic: { schema: 75, declaration: { uri }, implementation: { uri, source,
      callables: [expect.objectContaining({ identity: 'app\\pagecontroller::show' })] } },
      checksums: { source: expect.stringMatching(/^[0-9a-f]{64}$/), declaration: expect.stringMatching(/^[0-9a-f]{64}$/),
        implementationFile: expect.stringMatching(/^[0-9a-f]{64}$/),
        callableImplementations: [{ identity: 'app\\pagecontroller::show', checksum: expect.stringMatching(/^[0-9a-f]{64}$/) }],
        layers: expect.stringMatching(/^[0-9a-f]{64}$/), facts: expect.stringMatching(/^[0-9a-f]{64}$/) } });
    const restored = restoreCachedProjectPhpFile(structuredClone(cached), uri, 'generation-2');
    expect(restored?.facts.controllerContexts[0]?.sources[0]?.location.snapshotVersion).toBe('generation-2');
    expect(restored?.facts.controllerContexts[0]?.variables[0]?.sources?.[0]?.snapshotVersion).toBe('generation-2');
    expect(restored?.facts.doctrineProperties).toEqual(facts.doctrineProperties);
    workspace.dispose();
  });

  it('rejects tampered facts, a mismatched URI, and an unsupported wrapper schema', () => {
    const uri = 'file:///src/Entity.php'; const source = '<?php namespace App; class Entity { public function run(): void {} }';
    const workspace = new SemanticWorkspace(parser); workspace.update(uri, source);
    const cached = createCachedProjectPhpFile(workspace.snapshot(uri)!, analyzeProjectPhpFileFacts(parser, uri, source, 'one'));
    const tampered = structuredClone(cached); tampered.facts.doctrineMethods.push({
      ownerFqcn: 'App\\Repository', name: 'find', returnType: 'App\\Other|null', uri, start: 0, end: 5,
    });
    expect(restoreCachedProjectPhpFile(tampered, uri, 'two')).toBeUndefined();
    const tamperedDeclaration = structuredClone(cached); tamperedDeclaration.semantic.declaration.namespace = 'Other';
    expect(restoreCachedProjectPhpFile(tamperedDeclaration, uri, 'two')).toBeUndefined();
    const tamperedImplementation = structuredClone(cached); tamperedImplementation.semantic.implementation.source += ' ';
    expect(restoreCachedProjectPhpFile(tamperedImplementation, uri, 'two')).toBeUndefined();
    const tamperedCallable = structuredClone(cached); tamperedCallable.semantic.implementation.callables[0]!.facts.calls.push({ start: 0, end: 1 } as never);
    expect(restoreCachedProjectPhpFile(tamperedCallable, uri, 'two')).toBeUndefined();
    const tamperedLayers = structuredClone(cached); tamperedLayers.semantic.layers.referenceCandidates.keys.push('raw-ci:tampered');
    expect(restoreCachedProjectPhpFile(tamperedLayers, uri, 'two')).toBeUndefined();
    const tamperedRecordChecksum = structuredClone(cached); tamperedRecordChecksum.checksums.declaration = '0'.repeat(64);
    expect(restoreCachedProjectPhpFile(tamperedRecordChecksum, uri, 'two')).toBeUndefined();
    const tamperedCallableChecksum = structuredClone(cached); tamperedCallableChecksum.checksums.callableImplementations[0]!.checksum = '0'.repeat(64);
    expect(restoreCachedProjectPhpFile(tamperedCallableChecksum, uri, 'two')).toBeUndefined();
    expect(restoreCachedProjectPhpFile(cached, 'file:///src/Other.php', 'two')).toBeUndefined();
    expect(restoreCachedProjectPhpFile(cached, uri, 'two', `${source}\n// unsaved`)).toBeUndefined();
    expect(restoreCachedProjectPhpFile({ ...cached, schema: 1 }, uri, 'two')).toBeUndefined();
    workspace.dispose();
  });
});
