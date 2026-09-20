import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PhpSyntaxParser } from '@php-companion/parser';
import { SemanticWorkspace } from '@php-companion/semantic';
import { analyzeProjectPhpFileFacts, createCachedProjectPhpFile, restoreCachedProjectPhpFile } from '../src/projectFacts.js';

describe('persistent project PHP facts', () => {
  let parser: PhpSyntaxParser;
  beforeAll(async () => { parser = await PhpSyntaxParser.createDefault(); });
  afterAll(() => parser.dispose());

  it('round-trips Doctrine facts without caching framework controller contexts', () => {
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
    const facts = analyzeProjectPhpFileFacts(parser, uri, source);
    expect(facts).not.toHaveProperty('controllerContexts'); expect(facts.doctrineProperties).toHaveLength(1);
    const cached = createCachedProjectPhpFile(semantic, facts);
    expect(cached).toMatchObject({ schema: 5, semantic: { schema: 77, declaration: { uri }, implementation: { uri, source,
      callables: [expect.objectContaining({ identity: 'app\\pagecontroller::show' })] } },
      checksums: { source: expect.stringMatching(/^[0-9a-f]{64}$/), declaration: expect.stringMatching(/^[0-9a-f]{64}$/),
        implementationFile: expect.stringMatching(/^[0-9a-f]{64}$/),
        callableImplementations: [{ identity: 'app\\pagecontroller::show', checksum: expect.stringMatching(/^[0-9a-f]{64}$/) }],
        layers: expect.stringMatching(/^[0-9a-f]{64}$/), facts: expect.stringMatching(/^[0-9a-f]{64}$/) } });
    const restored = restoreCachedProjectPhpFile(structuredClone(cached), uri);
    expect(restored?.facts.doctrineProperties).toEqual(facts.doctrineProperties);
    workspace.dispose();
  });

  it('rejects tampered facts, a mismatched URI, and an unsupported wrapper schema', () => {
    const uri = 'file:///src/Entity.php'; const source = '<?php namespace App; class Entity { public function run(): void {} }';
    const workspace = new SemanticWorkspace(parser); workspace.update(uri, source);
    const cached = createCachedProjectPhpFile(workspace.snapshot(uri)!, analyzeProjectPhpFileFacts(parser, uri, source));
    const tampered = structuredClone(cached); tampered.facts.doctrineMethods.push({
      ownerFqcn: 'App\\Repository', name: 'find', returnType: 'App\\Other|null', uri, start: 0, end: 5,
    });
    expect(restoreCachedProjectPhpFile(tampered, uri)).toBeUndefined();
    const tamperedDeclaration = structuredClone(cached); tamperedDeclaration.semantic.declaration.namespace = 'Other';
    expect(restoreCachedProjectPhpFile(tamperedDeclaration, uri)).toBeUndefined();
    const tamperedImplementation = structuredClone(cached); tamperedImplementation.semantic.implementation.source += ' ';
    expect(restoreCachedProjectPhpFile(tamperedImplementation, uri)).toBeUndefined();
    const tamperedCallable = structuredClone(cached); tamperedCallable.semantic.implementation.callables[0]!.facts.calls.push({ start: 0, end: 1 } as never);
    expect(restoreCachedProjectPhpFile(tamperedCallable, uri)).toBeUndefined();
    const tamperedLayers = structuredClone(cached); tamperedLayers.semantic.layers.referenceCandidates.keys.push('raw-ci:tampered');
    expect(restoreCachedProjectPhpFile(tamperedLayers, uri)).toBeUndefined();
    const tamperedRecordChecksum = structuredClone(cached); tamperedRecordChecksum.checksums.declaration = '0'.repeat(64);
    expect(restoreCachedProjectPhpFile(tamperedRecordChecksum, uri)).toBeUndefined();
    const tamperedCallableChecksum = structuredClone(cached); tamperedCallableChecksum.checksums.callableImplementations[0]!.checksum = '0'.repeat(64);
    expect(restoreCachedProjectPhpFile(tamperedCallableChecksum, uri)).toBeUndefined();
    const tamperedEnvelopeChecksum = structuredClone(cached); tamperedEnvelopeChecksum.checksum = '0'.repeat(64);
    expect(restoreCachedProjectPhpFile(tamperedEnvelopeChecksum, uri)).toBeUndefined();
    expect(restoreCachedProjectPhpFile(cached, 'file:///src/Other.php')).toBeUndefined();
    expect(restoreCachedProjectPhpFile(cached, uri, `${source}\n// unsaved`)).toBeUndefined();
    expect(restoreCachedProjectPhpFile({ ...cached, schema: 4 }, uri)).toBeUndefined();
    workspace.dispose();
  });
});
