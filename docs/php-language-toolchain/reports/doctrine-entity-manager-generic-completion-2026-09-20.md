# Doctrine EntityManager 泛型按需补全验证

日期：2026-09-20

## 目标与边界

标准 Doctrine 调用常从 `EntityManagerInterface::getRepository(Entity::class)` 取得 `EntityRepository<Entity>`。默认 `onDemand` 模式不会预先扫描 vendor，因此语言服务器需要先加载 `EntityManagerInterface`，再从专门化返回加载 `EntityRepository`，才能把 `find()` 的结果继续传播为实体。

本增量包含两条互相约束的能力：

- semantic 从真实方法的精确 `class-string<T>` 实参推断 Callable 模板，并在直接局部赋值中保留泛型返回；
- 成员补全为空时，Language Server 最多递进四层，仅加载当前文档未解析类型或当前成员接收者能够证明的 Composer PSR-4 owner。

Doctrine 实际 `EntityRepository::find()` 使用原生 `object|null` 和 `@phpstan-return ?T`。nullable 模板只有在 `T` 的 bound 与原生非空分支一致、且原生声明确实允许 `null` 时才覆盖原生类型。动态类字符串、冲突模板、无法定位的 owner、第五层以后及已取消或版本变化的请求保持 unknown。

## 自动化验证

- semantic 269 项通过。新增回归使用真实 Doctrine 形状：方法级 `@template T of object`、`class-string<T>`、泛型 Repository 返回，以及 `object|null` / `@phpstan-return ?TEntity`；字面量类可补全实体成员，动态字符串保持空结果。
- Language Server 188 项通过。独立 stdio 项目只声明 Composer dependency 映射，在 `onDemand` 模式直接请求 `$repository->fi`，验证第一层加载 EntityManager、第二层加载 Repository、`find` 显示实体 nullable 返回，并继续补全实体成员；动态字符串反例无结果。
- 此变更不增加持久事实，也不改变缓存数据结构，缓存版本保持 v51。

## 真实 Winstar 证据

使用 `/var/www/php/8.5/winstar2024` 的真实 Composer 图和源码运行 source Language Server。探针先建立项目上下文，再直接请求成员补全，没有用 Definition 预热 vendor 类型：

```text
Doctrine\\ORM\\EntityRepository::find(...): ?App\\Modules\\LocalLanguages\\ORM\\Entity\\Language
Language::getCode()
dynamic class-string entity completion count: 0
```

全新缓存冷执行 56.358 秒，复用同一缓存热执行 12.982 秒；两次均返回 9 个 Controller context。该结果证明精度来自字面量 `Language::class`、Doctrine 声明和精确 PSR-4 加载链，而不是依赖全量索引或前置导航请求。

## 发布门禁

功能提交：`1be85dd`。

候选目录：`artifacts/php-companion-alpha-0.4.5-1be85dd9/`。

| 产物 | SHA-256 |
| --- | --- |
| `php-companion-0.4.5.vsix` | `37dc935855f5cb86b61ba815c02719ca7f06335cf3070c2c65240ce169058283` |
| `php-companion-open-source-pack-0.4.5.vsix` | `7d9676c23f0d7fe9807fe6a03ba251751bd488b52b7ecc4313d3f12031320ede` |
| `php-companion-recommended-pack-0.4.5.vsix` | `f9d681bb6923c97921969d640c5b28b969a158db9bbc5f55dd97dea002ecae17` |

`sha256sum -c SHA256SUMS` 三项均为 OK。Winstar `bin/php-runtime` 确认为 PHP 8.5，CoreRepo `phpbin` 确认为 PHP 7.2；两个 Composer 项目的 WSL 确定性 Alpha 预检均通过。

完整发布前门禁包括全仓 TypeScript、ESLint、19 个组件 712 项测试、根扩展 39 项测试、19 个隔离 tarball、三份 VSIX 内容校验，以及 VS Code 1.138.0 隔离 Profile 中的打包 Extension Host；均通过。

核心 VSIX 已安装到 WSL RockyLinux8。安装目录与构建输出的哈希为：

- `dist/language-server.js`：`777f9f20d2b079afe0df7d3986ce25ea0f60395bbf72be8b0a4127805546045e`
- `dist/extension.js`：`116c624e95589f504f6b30821db1aa830a586deb2982e0134a1de5f41705babd`

安装 bundle 使用独立全新缓存冷执行 56.443 秒，随后热恢复 13.046 秒；两次均返回 9 个 Controller context、精确 `?Language`、`getCode` 及动态反例 0。安装后需要在 Alpha Profile 执行 `Developer: Reload Window`，让当前 Extension Host 切换到新 bundle。
