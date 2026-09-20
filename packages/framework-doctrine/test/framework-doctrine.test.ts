import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PhpSyntaxParser } from '@php-companion/parser';
import { analyzeDoctrineDocument, doctrineAssociationPropertyFacts, doctrineQueryMethodFacts, doctrineRepositoryMethodFacts, repositoryMethodReturnType } from '../src/index.js';

describe('static Doctrine facts', () => {
  let parser: PhpSyntaxParser;
  beforeAll(async () => { parser = await PhpSyntaxParser.createDefault(); });
  afterAll(() => parser.dispose());

  it('extracts attribute entities, repositories and proven association targets', () => {
    const source = `<?php namespace App; use Doctrine\\ORM\\Mapping as ORM; use Doctrine\\Bundle\\DoctrineBundle\\Repository\\ServiceEntityRepository;
      #[ORM\\Entity(repositoryClass: UserRepository::class)] class User {
        #[ORM\\ManyToOne] private ?Team $team;
        #[ORM\\OneToMany(targetEntity: Order::class, mappedBy: 'user')] private iterable $orders;
      }
      class UserRepository extends ServiceEntityRepository { function __construct($registry) { parent::__construct($registry, User::class); } }
    `;
    const facts = analyzeDoctrineDocument(parser, 'file:///Doctrine.php', source);
    expect(facts.entities).toMatchObject([{ fqcn: 'App\\User', repository: 'App\\UserRepository', associations: [
      { property: 'team', kind: 'many-to-one', target: 'App\\Team', many: false },
      { property: 'orders', kind: 'one-to-many', target: 'App\\Order', many: true },
    ] }]);
    expect(facts.repositories).toMatchObject([{ fqcn: 'App\\UserRepository', entity: 'App\\User' }]);
    expect(repositoryMethodReturnType(facts.repositories[0]!, 'findOneBy')).toBe('App\\User|null');
    expect(repositoryMethodReturnType(facts.repositories[0]!, 'findBy')).toBe('array<int, App\\User>');
    const methodFacts = doctrineRepositoryMethodFacts(facts.repositories[0]!);
    expect(methodFacts.slice(0, 4).map((item) => [item.name, item.returnType])).toEqual([
      ['find', 'App\\User|null'], ['findOneBy', 'App\\User|null'], ['findAll', 'array<int, App\\User>'], ['findBy', 'array<int, App\\User>'],
    ]);
    expect(methodFacts.slice(4)).toMatchObject([
      { ownerFqcn: 'App\\UserRepository', name: 'createQueryBuilder', returnType: '\\Doctrine\\ORM\\QueryBuilder<\\App\\User>', returnTypeTemplates: ['TEntity'] },
    ]);
    const queryFacts = doctrineQueryMethodFacts(facts.entities[0]!);
    expect(queryFacts.slice(0, 6)).toMatchObject([
      { ownerFqcn: 'Doctrine\\ORM\\EntityRepository', name: 'createQueryBuilder', returnType: '\\Doctrine\\ORM\\QueryBuilder<T>', receiverTypeTemplates: ['T'], returnTypeTemplates: ['TEntity'] },
      { ownerFqcn: 'Doctrine\\ORM\\QueryBuilder', name: 'getQuery', returnType: '\\Doctrine\\ORM\\Query<TEntity>', receiverTypeTemplates: ['TEntity'], returnTypeTemplates: ['TEntity'] },
      { ownerFqcn: 'Doctrine\\ORM\\Query', name: 'getResult', returnType: 'array<int, TEntity>', receiverTypeTemplates: ['TEntity'], defaultArgumentsOnly: true },
      { ownerFqcn: 'Doctrine\\ORM\\Query', name: 'getOneOrNullResult', returnType: 'TEntity|null', receiverTypeTemplates: ['TEntity'], defaultArgumentsOnly: true },
      { ownerFqcn: 'Doctrine\\ORM\\Query', name: 'getSingleResult', returnType: 'TEntity', receiverTypeTemplates: ['TEntity'], defaultArgumentsOnly: true },
      { ownerFqcn: 'Doctrine\\ORM\\Query', name: 'toIterable', returnType: 'iterable<int, TEntity>', receiverTypeTemplates: ['TEntity'], defaultArgumentsOnly: true },
    ]);
    expect(queryFacts.slice(6).map((item) => [item.name, item.returnType])).toEqual([
      ['select', '\\Doctrine\\ORM\\QueryBuilder'], ['from', '\\Doctrine\\ORM\\QueryBuilder'],
      ['delete', '\\Doctrine\\ORM\\QueryBuilder'], ['update', '\\Doctrine\\ORM\\QueryBuilder'],
    ]);
    expect(doctrineAssociationPropertyFacts(facts.entities[0]!).map((item) => [item.name, item.returnType])).toEqual([
      ['team', 'App\\Team|null'], ['orders', 'iterable<int, App\\Order>'],
    ]);
    expect(doctrineAssociationPropertyFacts(facts.entities[0]!)[1]).toMatchObject({ name: 'orders', iterableValueType: 'App\\Order', visibility: 'private' });
  });

  it('does not invent dynamic association or custom repository return types', () => {
    const source = `<?php namespace App; use Doctrine\\ORM\\Mapping as ORM; #[ORM\\Entity] class Item { #[ORM\\OneToMany(targetEntity: TARGET)] private iterable $children; }`;
    const facts = analyzeDoctrineDocument(parser, 'file:///Dynamic.php', source);
    expect(facts.entities).toMatchObject([{ associations: [] }]);
    expect(repositoryMethodReturnType({ fqcn: 'App\\Repo', entity: 'App\\Item', uri: '', start: 0, end: 0 }, 'customQuery')).toBeUndefined();
  });

  it('binds a literal entity repositoryClass without requiring a repository constructor pattern', () => {
    const source = `<?php namespace App;
      use Doctrine\\ORM\\Mapping as ORM;
      #[ORM\\Entity(repositoryClass: LanguageRepository::class)] class Language {}
      class LanguageRepository extends \\Doctrine\\ORM\\EntityRepository {}
    `;
    const facts = analyzeDoctrineDocument(parser, 'file:///CustomRepository.php', source);
    expect(facts.repositories).toMatchObject([{ fqcn: 'App\\LanguageRepository', entity: 'App\\Language' }]);
    expect(doctrineRepositoryMethodFacts(facts.repositories[0]!).slice(0, 4).map((item) => [item.name, item.returnType])).toEqual([
      ['find', 'App\\Language|null'], ['findOneBy', 'App\\Language|null'],
      ['findAll', 'array<int, App\\Language>'], ['findBy', 'array<int, App\\Language>'],
    ]);
  });

  it('binds an exact ServiceEntityRepository PHPDoc generic and rejects conflicting evidence', () => {
    const source = `<?php namespace App\\Repository;
      use App\\Entity\\Invoice;
      use App\\Entity\\Order;
      use Doctrine\\Bundle\\DoctrineBundle\\Repository\\ServiceEntityRepository as BaseRepository;
      /** @extends BaseRepository<Invoice> */
      class InvoiceRepository extends BaseRepository {}
      /** @phpstan-extends BaseRepository<Order> */
      class ConflictingRepository extends BaseRepository {
        public function __construct($registry) { parent::__construct($registry, Invoice::class); }
      }
      /** @extends UnknownBase<Order> */
      class UnrelatedRepository extends BaseRepository {}
    `;
    const facts = analyzeDoctrineDocument(parser, 'file:///GenericRepositories.php', source);
    expect(facts.repositories).toMatchObject([
      { fqcn: 'App\\Repository\\InvoiceRepository', entity: 'App\\Entity\\Invoice' },
    ]);
  });
});
