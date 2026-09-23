# Changelog

- Type Doctrine array, scalar and single-scalar hydration terminals with stable broad result containers without guessing DQL field names or concrete scalar types.
- Preserve the entity generic for exact project QueryBuilder factories built from an EntityManager/ObjectManager `createQueryBuilder()` with one literal entity root and an optional matching root selection; reject dynamic aliases, scalar/additional selections, multiple roots and mutation queries.
- Preserve the entity generic for exact project methods returning a native `QueryBuilder` from a declared EntityManager/ObjectManager property, while rejecting dynamic, escaping, reassigned, conditional and result-shaping builders.
- Resolve exact entity `repositoryClass` mappings through class-literal EntityManager/ObjectManager repository lookups without specializing dynamic class arguments.
- Preserve proven repository entity types through the default Doctrine QueryBuilder and Query object-hydration chain, including `getSingleResult()` and `toIterable()`, while dropping precision for shape-changing operations and explicit hydration modes.
- Bind exact `@extends ServiceEntityRepository<Entity>` repository generics while rejecting conflicts with constructor evidence.
- Bind the stable `find`, `findOneBy`, `findAll` and `findBy` entity return shapes from a literal `#[Entity(repositoryClass: Repository::class)]`, including custom repositories that do not use the official ServiceEntityRepository constructor pattern.
## Unreleased

- 公开事实类型实现独立 `@php-companion/semantic-provider` 契约，可由任意宿主组装而不依赖 semantic 实现。

This package uses Changesets for versioning.

## 0.1.0-alpha.1

- Initial independently consumable alpha API extracted from the PHP Companion monorepo.
