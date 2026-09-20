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
- `pnpm candidate:alpha`：四份 VSIX 构建及内容校验通过，候选为 `artifacts/php-companion-alpha-0.4.5-76c53183/`。
- `pnpm test:extension:packaged`：VS Code 1.138.0 隔离 Profile 中核心与 Symfony 双扩展宿主退出码为 0。
- Winstar PHP 8.5 与 CoreRepo PHP 7.2 的 WSL Alpha preflight 均通过确定性门禁；编辑器 Profile 和两小时会话仍属于人工验收。

候选摘要：

- core：`2882859e396592e6621e1f225a5032ecc05286c74ecb60d62c008d004bd48c2b`
- Symfony：`c10d237da1637fdab30370a8f6346b23579b2b99e13eb1568bfb9c9ac033d047`
- Open Source Pack：`a2ddb288465ed82f3d34f4abda1301e3881c6283ceb2a1f9f20de73bbceb1afc`
- Recommended Pack：`36f027bfabef818d2386165e49b2c176d68f017da42b254a429cd4797645480a`

当前 VS Code Server 对同版本 `code --install-extension --force` 无输出等待超过两分钟，未改动安装目录，已终止该 CLI。随后只把候选中已校验的核心 `language-server.js` 原子覆盖到现有 WSL 扩展目录；安装后哈希为 `2571a7e63ad4ff6e9ef9de5949a96cd3377a06fe6f94839d3e84cd0a40630c7a`，旧进程退出后由扩展客户端自动启动新进程并重新载入 Composer 快照。Symfony bundle 本次无变化，安装目录与候选 `extension.js` 哈希均为 `1bb5d069e0214174d04c3555647676653956b2a290a8ac8dd8b4cf4c628b751a`。

Winstar 当前没有“直接继承 `ServiceEntityRepository` 且仅靠该 PHPDoc 绑定”的样本；其现有 Repository 多由实体 `repositoryClass` 或项目泛型基类绑定，原路径保持不变。因此本报告只声称自动化 fixture 和 stdio 编辑链路通过，不把它表述为 Winstar 现有代码命中。

## 后续

`createQueryBuilder()->getQuery()` 的实体结果依赖 select、join、partial/scalar/array hydration 等语义。后续只为可静态证明的对象水合子集提供结果类型；其他查询继续保持 unknown。
