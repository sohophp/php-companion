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

四份 VSIX、打包 Extension Host、Winstar/CoreRepo 预检及安装摘要将在候选提交后补充。
