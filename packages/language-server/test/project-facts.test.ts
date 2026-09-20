import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createHash } from 'node:crypto';
import { PhpSyntaxParser } from '@php-companion/parser';
import { SemanticWorkspace } from '@php-companion/semantic';
import { semanticFacts } from '@php-companion/semantic-provider';
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
    expect(cached.checksums.source).toBe(createHash('sha256').update(source).digest('hex'));
    expect(cached).toMatchObject({ schema: 10, semantic: { schema: 77, declaration: { uri }, implementation: { uri, source,
      callables: [expect.objectContaining({ identity: 'app\\pagecontroller::show' })] } },
      checksums: { source: expect.stringMatching(/^[0-9a-f]{64}$/), declaration: expect.stringMatching(/^[0-9a-f]{64}$/),
        implementationFile: expect.stringMatching(/^[0-9a-f]{64}$/),
        callableImplementations: [{ identity: 'app\\pagecontroller::show', checksum: expect.stringMatching(/^[0-9a-f]{64}$/) }],
        layers: expect.stringMatching(/^[0-9a-f]{64}$/), facts: expect.stringMatching(/^[0-9a-f]{64}$/) } });
    const restored = restoreCachedProjectPhpFile(structuredClone(cached), uri);
    expect(restored?.facts.doctrineProperties).toEqual(facts.doctrineProperties);
    const checksum = createCachedProjectPhpFile(semantic, facts, cached.checksums.source);
    expect(checksum.checksums.source).toBe(cached.checksums.source);
    const wrongChecksum = createCachedProjectPhpFile(semantic, facts, '0'.repeat(64));
    expect(restoreCachedProjectPhpFile(wrongChecksum, uri)).toBeUndefined();
    expect(() => createCachedProjectPhpFile(semantic, facts, 'invalid')).toThrow(RangeError);
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
    expect(restoreCachedProjectPhpFile({ ...cached, schema: 9 }, uri)).toBeUndefined();
    workspace.dispose();
  });

  it('propagates an exact project QueryBuilder factory entity and erases it after select', () => {
    const workspace = new SemanticWorkspace(parser);
    workspace.update('file:///vendor/Doctrine.php', `<?php namespace Doctrine\\ORM;
      interface EntityManagerInterface { public function getRepository(string $class): EntityRepository {} }
      class EntityRepository { public function createQueryBuilder(string $alias): QueryBuilder {} }
      class QueryBuilder { public function andWhere(string $where): static {} public function select(string $select): static {} public function getQuery(): Query {} }
      class Query { public function getResult(): array {} public function getOneOrNullResult(): object|null {} }
    `);
    workspace.update('file:///src/User.php', '<?php namespace App; final class User { public function name(): string {} }');
    const uri = 'file:///src/ReadService.php';
    const source = `<?php namespace App;
      use Doctrine\\ORM\\EntityManagerInterface;
      use Doctrine\\ORM\\QueryBuilder;
      final class ReadService {
        public function __construct(private EntityManagerInterface $em) {}
        private function users(): QueryBuilder { return $this->em->getRepository(User::class)->createQueryBuilder('user')->andWhere('user.active = 1'); }
        public function inspect(): void {
          foreach ($this->users()->getQuery()->getResult() as $user) { $user->na; }
          $one = $this->users()->getQuery()->getOneOrNullResult(); $one?->na;
          foreach ($this->users()->select('user.id')->getQuery()->getResult() as $row) { $row->na; }
        }
      }`;
    workspace.update(uri, source);
    const facts = analyzeProjectPhpFileFacts(parser, uri, source);
    expect(facts.doctrineMethods).toContainEqual(expect.objectContaining({ ownerFqcn: 'App\\ReadService', name: 'users',
      returnType: '\\Doctrine\\ORM\\QueryBuilder<\\App\\User>' }));
    const cached = createCachedProjectPhpFile(workspace.snapshot(uri)!, facts);
    expect(restoreCachedProjectPhpFile(cached, uri)?.facts.doctrineMethods).toEqual(facts.doctrineMethods);
    const invalid = createCachedProjectPhpFile(workspace.snapshot(uri)!, { ...facts, doctrineMethods: [{
      ownerFqcn: 'App\\ReadService', name: 'invented', returnType: 'App\\User', uri, start: 237, end: 242,
    }] });
    expect(restoreCachedProjectPhpFile(invalid, uri)).toBeUndefined();
    expect(workspace.replaceExternalFacts(semanticFacts('doctrine', 'query-factory', { methods: facts.doctrineMethods }))).toBe(true);
    for (const marker of ['$user->na', '$one?->na']) {
      expect(workspace.completeMembers(uri, source.indexOf(marker) + marker.length).map((item) => item.name), marker).toEqual(['name']);
    }
    expect(workspace.completeMembers(uri, source.indexOf('$row->na') + '$row->na'.length)).toEqual([]);
    workspace.dispose();
  });
});
