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

24 个组件 tarball 均通过隔离消费者的安装、导入和导出边界验证。

## 候选与 WSL

功能提交为 `751d457a97617b9fe334b86dce5efa9d9ffe977f`，候选目录为 `artifacts/php-companion-alpha-0.4.5-751d457a/`。四份 VSIX 内容门禁通过；SHA-256 如下：

| 产物 | SHA-256 |
| --- | --- |
| Core | `606b2e8c919467ea3f3b9d4a54b564a8fb9f3b20fca019f3e89f51f4818c24b4` |
| Symfony | `a00584fa248d7f8ec1354a46e3b1f7333d50bec56560ddae08b2d2c0b9095760` |
| Open Source Pack | `6ab948fc1fbd0ae8e1d8887932685e398f9de2744a27af10c52f02b23f5d6b2a` |
| Recommended Pack | `3ad8d29723e707318e803fd19e26b955a42bc98800bf048281ef53f1f62b6983` |

VS Code 1.138.0 隔离 Profile 同时加载打包后的核心与独立 Symfony VSIX，完整编辑器回归完成，Extension Host 退出码为 0。Winstar PHP 8.5 与 CoreRepo PHP 7.2 的确定性 WSL 预检均通过；原始结果分别记录在 `alpha-preflight-winstar-2026-09-20-doctrine-terminals.json` 和 `alpha-preflight-corerepo-2026-09-20-doctrine-terminals.json`。

候选已原子更新到 WSL RockyLinux8 的现有 0.4.5 Alpha Profile。核心 `extension.js`/`language-server.js` 安装摘要分别与候选 `206bb2fbe7914a73c041e4ee38e7c4a255b07bab42dedefe8037a26e72953f9b`、`2726116567289cb137438cca1ef628279111ed45a3b92aec57f0ad0e9078b5c6` 一致；独立 Symfony 的 controller/event/service/static-route provider 摘要也逐文件与候选一致。旧语言服务器退出后，扩展客户端已自动启动新进程。

严格编辑器 Profile 预检必须从 VS Code WSL 集成终端运行；当前后台 shell 无法代表 Alpha Profile。竞争 PHP Provider、仅安装一个 Pack，以及 Winstar/CoreRepo 各两小时真实编辑仍属于人工验收。
