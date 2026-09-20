# Doctrine 对象水合终端验收

日期：2026-09-20。

## 完成范围

- 默认 `Query<TEntity>::getSingleResult()` 返回 `TEntity`，可以继续成员补全与导航。
- 默认 `Query<TEntity>::toIterable()` 返回 `iterable<int, TEntity>`，直接 foreach 的循环变量保持实体类型。
- 两个方法都复用已证明的 Repository、QueryBuilder 和 Query 泛型，不启动 ORM、不连接数据库、不分析 DQL。
- 任何显式实参都会撤销外部实体返回覆盖；`getSingleResult(2)` 与 `toIterable([], 2)` 保持 unknown。

为保证门禁覆盖局部赋值，parser 的方法成员链和直接成员调用现在记录实参数量。semantic 在普通调用选择、完整复合成员链和局部赋值传播中统一应用 `defaultArgumentsOnly`，避免真实方法允许可选 hydration 参数时误用默认对象返回类型。

## 缓存与验证

Language Server 项目事实升级为 schema 8、缓存版本 v56，旧 schema 7/v55 记录保守重建。

- TypeScript 全仓检查与 ESLint 通过。
- parser 65 项、framework-doctrine 4 项、semantic 272 项、Language Server 196 项全部通过。
- stdio watcher 回归同时验证 `getSingleResult()`、`toIterable()` 及其显式 hydration 反例。
- 10,000 文件持久缓存基准冷索引 19,131.18 ms、热恢复 6,129.69 ms，热/冷比 0.3204；热恢复 10,000/10,000，19,999 条 callable 记录保持延迟，聚焦查询只加载 3 个实现，派生层或 callable 单记录损坏均只重建 1 个文件。

候选 VSIX、打包 Extension Host、双项目 WSL 预检与安装摘要将在功能提交后补充。
