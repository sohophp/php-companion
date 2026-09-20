# Doctrine 项目 QueryBuilder 工厂实体泛型验收

## 真实问题

Winstar 的读服务把重复查询封装为原生返回类型 `QueryBuilder` 的私有方法。`NewsAdminReadService::categoryQuery()` 直接返回 `EntityManagerInterface::getRepository(NewsCategories::class)->createQueryBuilder('category')`；`articleQuery()` 则先把相同来源赋给唯一局部 `$qb`，按条件追加 `andWhere()`/`setParameter()`，最后原样返回。原生 `QueryBuilder` 没有携带实体实参，所以调用方的 `getQuery()->getResult()` 与 `getOneOrNullResult()` 会丢失实体类型。

`@php-companion/framework-doctrine` 现在提取一个有界、静态且保守的项目工厂事实。方法必须声明原生 `Doctrine\ORM\QueryBuilder` 返回类型，repository 接收者必须是本类中声明为 `EntityManagerInterface` 或 `ObjectManager` 的属性，实体和 builder alias 必须都是字面量。支持直接返回链，或方法首条语句建立唯一局部 builder、只追加普通 builder 条件后原样返回。

以下情况整体保持 unknown：动态实体类、动态 alias、条件初始化、重赋值、局部别名、嵌套 closure 捕获、按引用或 `unset`、把 builder 传给未知调用、动态方法，以及 `select/from/delete/update` 等改变结果形状的操作。组件不执行项目 PHP、不启动 Doctrine，也不解析 DQL 猜测返回形状。

## 语义与缓存

分析结果通过既有 semantic-provider 原子事实进入语言服务器。项目方法返回 `QueryBuilder<TEntity>`，随后复用默认 `QueryBuilder<TEntity> -> Query<TEntity>` 链；无参数 `getResult()`、`getOneOrNullResult()`、`getSingleResult()` 和 `toIterable()` 保留实体，调用 `select/from/delete/update` 后撤销泛型。

项目 PHP 事实升级到 schema 5，Language Server wrapper/cache 升级到 schema 10/v58。旧 v57/schema 9 缓存会保守重建。10,000 文件持久缓存门禁结果：冷索引 18,880.92 ms，热恢复 5,834.18 ms，恢复 10,000/10,000、重新解析 0；19,999 条 callable 实现保持延迟，聚焦查询只装载 3 个实现，派生层或 callable 单记录损坏都只重建 1 个文件。

## 自动与真实项目证据

- framework-doctrine：6/6；Language Server：197/197。新增测试覆盖直接返回、唯一局部 builder、分支追加条件、动态输入、结果形状改变、重赋值、别名、未知调用逃逸和条件初始化。
- 语义主链测试证明项目 `users()` 工厂经 `getQuery()->getResult()` 与 `getOneOrNullResult()` 得到 `User` 成员；同一工厂调用 `select()` 后不再提供实体成员。
- 全仓 TypeScript、ESLint 和 24 个独立 tarball 的仓库外消费验证通过。
- Winstar 两个真实读服务共识别四个工厂：`NewsCategories`、`NewsArticles`、`SolutionCategory`、`SolutionArticle`。没有修改 Winstar 源码，也没有使用其 PHP 运行时或数据库。
- Winstar 只读审计载入 9,999 文件和 2,289 个项目类型，100/100 抽样声明、60 个跨文件样本、1,262 个返回位置，References p95 27.97 ms，冻结 Oracle 失败 0。原始数据见 [Winstar v59](real-workspace-winstar-v59-2026-09-20.json)。
- CoreRepo PHP 7.2 只读审计载入 9,999 文件和 1,128 个项目类型，100/100 抽样声明、70 个跨文件样本、1,562 个返回位置，References p95 20.98 ms，冻结 Oracle 失败 0。原始数据见 [CoreRepo v59](real-workspace-corerepo-v59-2026-09-20.json)。

两个真实项目均为 `projectComplete=true`；vendor 依赖受 10,000 文件预算截断且各有一个超过 512 KiB 的 Google API Client 文件，因此全依赖 `complete=false`，需要封闭世界的负向结论继续保持静默。

## Alpha 候选

功能提交为 `8f3ed0c`。候选目录 `artifacts/php-companion-alpha-0.4.5-8f3ed0cd/` 的 `SHA256SUMS` 四项均通过：

| 角色 | SHA-256 |
| --- | --- |
| PHP 核心 | `7b8f25ee9a6f338ffa49b76b1da58b5b178e24d067ed5b5df45b0ef412219ec6` |
| Symfony | `bb2f1c10b4321e4f3d11a8cfac5d35bfb3f35e7cd9b7ae9936f140bbb9958269` |
| Open Source Pack | `38bcbfdd886c5967bd096358a8a7f14adecf77096a2f6d69f6d04c3f5913b4e7` |
| Recommended Pack | `c1712378c7f67ffdaf8e9dcca992ebe1d269ca62d4e2f7f05e0cb8f832c11937` |

Winstar PHP 8.5 与 CoreRepo PHP 7.2 的确定性 WSL 预检均通过，见 [Winstar 预检](alpha-preflight-winstar-query-factories.json) 和 [CoreRepo 预检](alpha-preflight-corerepo-query-factories.json)。VS Code 1.138.0 打包 Extension Host 从 VSIX 同时加载核心与独立 Symfony 扩展，完成编辑、导航和重构门禁后以退出码 0 结束。后台预检不属于 VS Code WSL 集成终端，因此 Extension Host 所有权、竞争 Provider 和持续真实编辑仍须在 Alpha Profile 中人工确认。
