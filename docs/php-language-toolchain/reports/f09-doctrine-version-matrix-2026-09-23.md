# F09 Doctrine 2.20 / 3.6 按需查询版本探针

日期：2026-09-23。运行 `pnpm check:f09:doctrine`，只构建 Language Server 包并在两个真实 Composer 项目根启动独立 stdio 进程，不生成 VSIX。脚本会先核对各项目 `composer.lock` 中的 `doctrine/orm` 版本；版本变化时拒绝沿用旧结论。项目位置可由 `SOPHP_CORE_REPO_ROOT` 和 `SOPHP_WINSTAR_ROOT` 覆盖。

| 项目 | PHP 目标版本 | Doctrine ORM | 首次请求的字面量 Entity 查询 | 动态类反例 |
| --- | --- | --- | --- | --- |
| CoreRepo | 7.2 | 2.20.13 | `User::class` 的 `getResult()` foreach 元素补全 `getUsername(): ?string` | `$class` 不补全 `getUsername` |
| Winstar2024 | 8.5 | 3.6.8 | `SolutionPageCard::class` 的 `getResult()` foreach 元素补全 `getLinkUrl(): ?string` | `$class` 不补全 `getLinkUrl` |

每项在未写入磁盘的 PHP 文档中使用 `EntityManagerInterface::getRepository(Entity::class)->createQueryBuilder('item')->getQuery()->getResult()`；字面量 Entity 的成员补全是该进程的首个查询请求，没有 Repository 预热。动态 `$class` 使用同一查询链，检查没有把前一请求的实体类型错误套入未知 Repository。两个独立进程均退出码 0。此探针使用当前工作区实际安装的 Doctrine 声明和 Entity 源码，覆盖两个版本的这一条默认对象水合链；它不证明所有查询形态、其它 Doctrine/Symfony 版本、完整编辑器交互或 WSL Remote 人工验收。
