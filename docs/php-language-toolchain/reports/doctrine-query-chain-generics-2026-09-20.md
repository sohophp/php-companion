# Doctrine 默认查询链泛型验收

日期：2026-09-20。

## 行为边界

- 已证明 `Repository<Entity>` 后，默认链传播为 `QueryBuilder<Entity>` 和 `Query<Entity>`。
- 无参数 `getResult()` 返回 `array<int, Entity>`；无参数 `getOneOrNullResult()` 返回 `Entity|null`。
- 自定义 Repository、`EntityManagerInterface::getRepository(Entity::class)`、局部赋值 foreach 和直接 foreach 使用同一语义链。
- `select`、`from`、`delete`、`update` 会擦除实体泛型；`getArrayResult()` 与带显式 hydration 参数的调用保持 unknown。
- 不启动 Doctrine ORM、不连接数据库，也不解析 DQL 推测结果形状。

## 实现与缓存

`@php-companion/semantic-provider` 的方法事实可声明返回对象的模板槽、接收者所需模板及仅限默认参数的返回覆盖。semantic 将外部返回事实合并到真实方法签名，因此参数校验、签名帮助和返回类型传播仍以实际声明为准。直接复合成员链现在也会用真实调用实参专门化方法级模板。

Language Server 项目事实升级为 schema 7、缓存版本 v55。旧 schema 6/v54 记录会重建，避免缺失新查询链事实。

## 自动验证

- TypeScript 全仓检查和 ESLint 通过。
- 24 个组件共 746 项测试通过，其中 parser 65 项、semantic-provider 8 项、framework-doctrine 4 项、semantic 272 项、Language Server 196 项。
- Language Server watcher stdio 用例验证自定义 Repository、EntityManager 直接链及三个保守反例。
- 10,000 文件持久缓存基准：冷索引 20,602.17 ms，热恢复 6,326.88 ms，热/冷比 0.3071；热恢复 10,000/10,000，19,999 条 callable 记录保持延迟，聚焦查询仅装载 3 个实现，派生层或 callable 单记录损坏均只重建 1 个文件。

## 候选与 WSL

功能提交为 `d6d9598bbc1cb6042fb6d19b9af9922b45ebe1ee`，候选目录为 `artifacts/php-companion-alpha-0.4.5-d6d9598b/`。四份 VSIX 内容门禁通过；SHA-256 如下：

| 产物 | SHA-256 |
| --- | --- |
| Core | `e89b91838b9cf72899a3283bdd3ed9ba96248e4cc1555889f03e6cc7fef6a4cd` |
| Symfony | `9a9f372465bdffd2644daca55aa22b643aaa1ad639e1a4b978c7bce0fced8220` |
| Open Source Pack | `460c5ac4fdb25d3e31894f4c95dbc7e7b8e926be04bb1b169a5d119eebe23502` |
| Recommended Pack | `1930f9eeb4be4c719c8b72a8fb14e8023d9c3c2a72d0cfacdf428f63dade7c61` |

VS Code 1.138.0 隔离 Profile 同时加载打包后的核心与独立 Symfony VSIX，完整编辑器回归完成，Extension Host 退出码为 0。Winstar PHP 8.5 与 CoreRepo PHP 7.2 的确定性 WSL 预检均通过。

候选 `language-server.js` 已原子覆盖到 WSL RockyLinux8 的现有 0.4.5 核心扩展目录，安装摘要与候选均为 `61ee0d6586fb4023aa2c737b79f3441708113da2003511d11f03618b50d8fd6c`；旧进程退出后扩展客户端已自动启动新进程。独立 Symfony 扩展入口未变化，安装摘要与候选均为 `1bb5d069e0214174d04c3555647676653956b2a290a8ac8dd8b4cf4c628b751a`。

严格编辑器 Profile 预检必须从 VS Code WSL 集成终端运行；当前后台 shell 无法代表 Alpha Profile。竞争 PHP Provider、仅安装一个 Pack，以及 Winstar/CoreRepo 各两小时真实编辑仍属于人工验收。
