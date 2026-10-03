import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createHash } from 'node:crypto';
import { deflateRawSync } from 'node:zlib';
import { PhpSyntaxParser } from '@php-companion/parser';
import { SemanticWorkspace } from '@php-companion/semantic';
import { semanticFacts } from '@php-companion/semantic-provider';
import { analyzeProjectPhpFileFacts, compressCachedProjectPhpFile, compressCachedSourceDeclaration, createCachedProjectPhpFile,
  decompressCachedProjectPhpFile, restoreCachedProjectPhpFile, restoreCachedSourceDeclaration } from '../src/projectFacts.js';

describe('persistent project PHP facts', () => {
  let parser: PhpSyntaxParser;
  beforeAll(async () => { parser = await PhpSyntaxParser.createDefault(); });
  afterAll(() => parser.dispose());

  it('restores checked source declarations lazily and rejects corrupt or stale cache entries', () => {
    const uri = 'file:///CachedDeclarations.php';
    const source = '<?php namespace Cached; class Target { function get(): int { return 1; } } function run(Target $target): int { return $target->get(); }';
    const workspace = new SemanticWorkspace(parser); const restored = new SemanticWorkspace(parser);
    try {
      workspace.updateDeclarations(uri, source);
      const snapshot = workspace.sourceDeclarationSnapshot(uri)!;
      expect(workspace.implementationState(uri)).toBe('deferred');
      const hash = createHash('sha256').update(source).digest('hex');
      const payload = compressCachedSourceDeclaration(snapshot, hash);
      const decoded = restoreCachedSourceDeclaration(payload, uri, hash);
      expect(decoded).toEqual(snapshot);
      const legacy = structuredClone(snapshot);
      (legacy as { schema: number }).schema = 1;
      expect(restoreCachedSourceDeclaration(compressCachedSourceDeclaration(legacy, hash), uri, hash)).toBeUndefined();
      expect(restored.restoreSourceDeclaration(decoded, uri)).toBe(true);
      expect(restored.implementationState(uri)).toBe('deferred');
      expect(restored.restoreSourceDeclaration({ ...decoded, schema: -1 }, uri)).toBe(false);
      expect(restored.restoreSourceDeclaration(decoded, 'file:///Wrong.php')).toBe(false);
      expect(restored.references(uri, source.indexOf('get()') + 1, false)).toHaveLength(1);
      expect(restored.snapshot(uri)).toEqual(workspace.snapshot(uri));
      expect(restoreCachedSourceDeclaration(payload, 'file:///Wrong.php', hash)).toBeUndefined();
      expect(restoreCachedSourceDeclaration(payload, uri, '0'.repeat(64))).toBeUndefined();
      expect(restoreCachedSourceDeclaration({ ...payload, bytes: payload.bytes + 1 }, uri, hash)).toBeUndefined();
      const damaged = decompressCachedProjectPhpFile(payload) as { snapshot: { declaration: { namespace: string } } };
      damaged.snapshot.declaration.namespace = 'Wrong';
      const bytes = Buffer.from(JSON.stringify(damaged));
      expect(restoreCachedSourceDeclaration({ schema: 1, bytes: bytes.length, data: deflateRawSync(bytes).toString('base64') }, uri, hash)).toBeUndefined();
    } finally { workspace.dispose(); restored.dispose(); }
  });

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
    expect(cached).toMatchObject({ schema: 12, semantic: { schema: 83, declaration: { uri }, implementation: { uri, source,
      callables: [expect.objectContaining({ identity: 'app\\pagecontroller::show' })] } },
      checksums: { source: expect.stringMatching(/^[0-9a-f]{64}$/), declaration: expect.stringMatching(/^[0-9a-f]{64}$/),
        implementationFile: expect.stringMatching(/^[0-9a-f]{64}$/),
        callableImplementations: [{ identity: 'app\\pagecontroller::show', checksum: expect.stringMatching(/^[0-9a-f]{64}$/) }],
        layers: expect.stringMatching(/^[0-9a-f]{64}$/), facts: expect.stringMatching(/^[0-9a-f]{64}$/) } });
    const legacy = structuredClone(semantic);
    (legacy as { schema: number }).schema = 82;
    expect(restoreCachedProjectPhpFile(createCachedProjectPhpFile(legacy, facts), uri)).toBeUndefined();
    const restored = restoreCachedProjectPhpFile(structuredClone(cached), uri);
    expect(restored?.facts.doctrineProperties).toEqual(facts.doctrineProperties);
    const compressed = compressCachedProjectPhpFile(cached);
    expect(restoreCachedProjectPhpFile(decompressCachedProjectPhpFile(compressed), uri)).toEqual(cached);
    expect(decompressCachedProjectPhpFile({ ...compressed, bytes: compressed.bytes + 1 })).toBeUndefined();
    expect(decompressCachedProjectPhpFile({ ...compressed, data: 'invalid!' })).toBeUndefined();
    expect(decompressCachedProjectPhpFile({ ...compressed, bytes: 16 * 1024 * 1024 + 1 })).toBeUndefined();
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
    expect(restoreCachedProjectPhpFile({ ...cached, schema: 11 }, uri)).toBeUndefined();
    workspace.dispose();
  });

  it('propagates an exact project QueryBuilder factory entity and erases it after select', () => {
    const workspace = new SemanticWorkspace(parser);
    workspace.update('file:///vendor/Doctrine.php', `<?php namespace Doctrine\\ORM;
      interface EntityManagerInterface { public function getRepository(string $class): EntityRepository {} public function createQueryBuilder(): QueryBuilder {} }
      class EntityRepository { public function createQueryBuilder(string $alias): QueryBuilder {} }
      class QueryBuilder { public function andWhere(string $where): static {} public function select(string $select): static {} public function from(string $class, string $alias): static {} public function getQuery(): Query {} }
      class Query { public function getResult(): array {} public function getOneOrNullResult(): object|null {} }
    `);
    workspace.update('file:///src/User.php', '<?php namespace App; final class User { public function name(): string {} } final class Order { public function number(): string {} }');
    const uri = 'file:///src/ReadService.php';
    const source = `<?php namespace App;
      use Doctrine\\ORM\\EntityManagerInterface;
      use Doctrine\\ORM\\QueryBuilder;
      final class ReadService {
        public function __construct(private EntityManagerInterface $em) {}
        private function users(): QueryBuilder { return $this->em->getRepository(User::class)->createQueryBuilder('user')->andWhere('user.active = 1'); }
        private function orders(): QueryBuilder { return $this->em->createQueryBuilder()->select('orders')->from(Order::class, 'orders')->andWhere('orders.active = 1'); }
        public function inspect(): void {
          foreach ($this->users()->getQuery()->getResult() as $user) { $user->na; }
          $one = $this->users()->getQuery()->getOneOrNullResult(); $one?->na;
          foreach ($this->orders()->getQuery()->getResult() as $order) { $order->nu; }
          foreach ($this->users()->select('user.id')->getQuery()->getResult() as $row) { $row->na; }
        }
      }`;
    workspace.update(uri, source);
    const facts = analyzeProjectPhpFileFacts(parser, uri, source);
    expect(facts.doctrineMethods).toContainEqual(expect.objectContaining({ ownerFqcn: 'App\\ReadService', name: 'users',
      returnType: '\\Doctrine\\ORM\\QueryBuilder<\\App\\User>' }));
    expect(facts.doctrineMethods).toContainEqual(expect.objectContaining({ ownerFqcn: 'App\\ReadService', name: 'orders',
      returnType: '\\Doctrine\\ORM\\QueryBuilder<\\App\\Order>' }));
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
    expect(workspace.completeMembers(uri, source.indexOf('$order->nu') + '$order->nu'.length).map((item) => item.name)).toEqual(['number']);
    expect(workspace.completeMembers(uri, source.indexOf('$row->na') + '$row->na'.length)).toEqual([]);
    workspace.dispose();
  });
});
