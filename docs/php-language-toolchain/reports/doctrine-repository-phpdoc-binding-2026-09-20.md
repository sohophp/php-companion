# Doctrine Repository PHPDoc 泛型绑定验收

日期：2026-09-20

## 目标

在不启动 Symfony Kernel、Composer autoloader、Doctrine ORM 或数据库的前提下，让直接继承 `ServiceEntityRepository` 且只用精确 PHPDoc 泛型声明实体的 Repository 进入既有实体返回类型链。

## 已实现边界

- 接受 `@extends`、`@phpstan-extends` 和 `@psalm-extends`。
- 接受 `ServiceEntityRepository` 的完整名称或明确 import alias。
- 泛型实参必须是单个静态类名。
- PHPDoc 与标准 `parent::__construct($registry, Entity::class)` 一致时采用该实体。
- 两类证据分歧、无关泛型基类、动态类型和复合类型保持 unknown。
- 已证明绑定继续复用现有 `find`、`findOneBy`、`findAll`、`findBy` 返回类型，不引入 DQL 或水合模式猜测。

## 验证

- `pnpm --filter @php-companion/framework-doctrine test`：4/4 通过。
- `pnpm --filter @php-companion/language-server exec vitest run test/stdio.test.ts -t "refreshes indexed PHP files after a watched disk change"`：1/1 通过；真实 stdio 索引后，`$repo->find()` 的结果可补全实体成员。
- `pnpm --filter @php-companion/language-server test`：196/196 通过。
- `pnpm typecheck` 与 `pnpm lint`：通过。
- `pnpm verify:packages`：24 个组件 tarball 在隔离消费者中通过。

Winstar 当前没有“直接继承 `ServiceEntityRepository` 且仅靠该 PHPDoc 绑定”的样本；其现有 Repository 多由实体 `repositoryClass` 或项目泛型基类绑定，原路径保持不变。因此本报告只声称自动化 fixture 和 stdio 编辑链路通过，不把它表述为 Winstar 现有代码命中。

## 后续

`createQueryBuilder()->getQuery()` 的实体结果依赖 select、join、partial/scalar/array hydration 等语义。后续只为可静态证明的对象水合子集提供结果类型；其他查询继续保持 unknown。
