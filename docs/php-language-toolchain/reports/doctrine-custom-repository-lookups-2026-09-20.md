# Doctrine 自定义 Repository lookup 验收

日期：2026-09-20。

## 完成范围

- 实体明确使用 `#[ORM\Entity(repositoryClass: UserRepository::class)]` 时，`EntityManagerInterface::getRepository(User::class)` 与 `ObjectManager::getRepository(User::class)` 精确返回 `UserRepository`。
- 直接成员链和局部赋值均可补全、导航自定义 Repository 的公开方法。
- `getRepository($class)` 等动态参数不采用映射事实，继续保持原有通用泛型结果。
- 普通、没有 `repositoryClass` 的实体继续走既有 `EntityRepository<TEntity>` 泛型链，不影响 on-demand 依赖加载。

## 实现与缓存

parser 单独记录完全可证明的 `Class::class` 参数；semantic 先解析当前 namespace/import，再匹配原子外部字面量返回事实。只有方法名和规范实体 FQCN 都匹配时才解析接收者并覆盖返回类型，避免影响普通方法调用和渐进加载。

Language Server 项目事实升级为 schema 4，持久 wrapper 升级为 schema 9，缓存版本为 v57；旧 v56/schema 8 记录保守重建。

## 自动验证

- 全仓 TypeScript 与 ESLint 通过。
- parser 66 项、framework-doctrine 4 项、semantic 273 项通过。
- Language Server 聚焦 stdio 同时验证精确自定义 Repository、动态参数反例及普通泛型 on-demand 回归。
- Language Server 196 项完整回归通过。
- 10,000 文件持久缓存门禁冷索引 18,326.26 ms、热恢复 6,237.28 ms，热/冷比 0.3403；热恢复 10,000/10,000，19,999 条 callable 记录保持延迟，聚焦查询只加载 3 个实现，派生层或 callable 单记录损坏均只重建 1 个文件。

## 候选与 WSL

功能提交为 `e54250eaf962267d2682ed6da798b50c536a59d8`，候选目录为 `artifacts/php-companion-alpha-0.4.5-e54250ea/`。Core、Symfony、Open Source Pack、Recommended Pack SHA-256 分别为 `bc277f247c499730d7fd1a1a29d85098a814af5c85dfc407f17d8c23214bdafe`、`32aa752d44bcd7f873485b26181e3225546fea9530690de74ad5e92b3c7b052b`、`e42c5d220f2a3e60494799a80b92ffb773c099e60777ae909eb72a94f10d2455`、`a5a374b19806db75abadf95ad8b86772305f4d837d3c72002e07ffce75e9eb94`。

VS Code 1.138.0 隔离 Profile 的双扩展打包宿主退出码为 0；Winstar PHP 8.5 与 CoreRepo PHP 7.2 的确定性 WSL 预检通过。候选已原子更新到 WSL Alpha Profile，核心语言服务器摘要为 `2057d10b62788f70962bd0f79fc04b39621d5630f0f5c87daced4f9ebe51eb3b`，旧进程退出后客户端自动启动新进程。严格 Profile 与两小时真实编辑仍属于人工验收。
