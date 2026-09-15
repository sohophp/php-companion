# Callable 目标装载验收

日期：2026-09-15。范围：P3 热缓存实现记录按目标 callable 水合，以及无法证明局部边界时的完整性回退。

## 行为契约

- `restoreDeclaration()` 只注册声明与派生目录，文件级及 callable 实现事实保持延迟。
- 成员补全、Definition、Type Definition、Signature Help 在光标所在的最小唯一函数、方法或 Property Hook 记录中运行；区间 Inlay Hint 水合与区间相交的记录。查询视图同时包含文件级事实。
- 多次聚焦查询可以逐条累积已加载记录，`callableImplementationStates()` 分别报告 `loaded` 和 `deferred`。只要仍有记录未加载，文件级 `implementationState()` 继续为 `deferred`。
- 整文件诊断、重构、快照及未进入目标作用域的正文访问会先水合剩余记录。跨文件正文依赖没有明确局部作用域时同样完整加载，因此局部优化不会制造假阴性。
- 完整水合和快照重建继续按 parser 的规范顺序合并事实；更新、删除与 dispose 会清除对应延迟状态和查询作用域。

## 回归证据

- 专门 fixture 在同一文件声明 `Service::serve`、`Consumer::run` 与 `Consumer::untouched`。从 schema 74 声明恢复后，连续执行成员补全、Definition、Type Definition、Signature Help、类型和参数 Inlay Hint，只把 `cache\\consumer::run` 标记为 loaded；另两条记录保持 deferred。随后执行整文件参数诊断，文件状态转为 loaded。
- `pnpm typecheck`、`pnpm lint` 通过。
- `pnpm test` 通过：十六个组件 632 项，根扩展 35 项，共 667 项；Semantic 256 项，Language Server 168 项。
- `pnpm benchmark:persistence -- 10000`：冷索引 17,919.25 ms，热恢复 7,066.28 ms，热/冷比 0.3943；恢复 10,000/10,000、重解析 0。19,999 条 callable 记录初始全部延迟，聚焦补全只加载 `benchmark\\consumer::inspect`，同文件的 `untouched` 保持 deferred；后续完整 readonly 查询共装载 3 个相关文件。派生层和 callable 单条损坏仍分别只重建 1 个文件。
- `pnpm benchmark:editing -- 500 50`：500 轮无陈旧补全；诊断 P50/P95/最大值 2.11/3.97/10.32 ms，热补全 0.87/1.32/3.98 ms，取消 1.22 ms，最终 RSS 增长 0.11 MiB；损坏缓存与进程重启恢复通过。
- `pnpm verify:packages` 验证十六个组件 tarball 可由仓库外消费者安装、导入并执行 API smoke；`pnpm package:all` 与 `pnpm verify:vsix` 验证三个 VSIX 内容。`pnpm test:extension:packaged` 在 Linux VS Code 1.137.0 隔离 Profile 退出码为 0。
- 提交 `6a609ac` 的 [CI 34935803007](https://github.com/sohophp/php-companion/actions/runs/34935803007) 18/18 成功，覆盖三平台 Quality、打包 Extension Host、七扩展 Open Source Profile 与 PHP 7.2–8.5。最终私有候选目录为 `artifacts/php-companion-alpha-0.4.5-6a609ac1/`；SHA-256：主扩展 `561c15badc100f1b1671e2e06d84610865cd7333c99d1cf3b8508dd9c40d4d04`，Open Source Pack `2c4af966e36773f3e71f203efda310e62ac32e270f4a43bcaa1a1222f6931664`，Recommended Pack `c2a182232166ca69732e7d8d49939ee5319a4ddaa2b41832c204a2c1979b75fe`。

## 剩余边界

当前 schema 74 的 callable 记录在同一缓存 JSON 封装内完成反序列化，目标装载指把选中记录合并到活动语义视图，并不声称操作系统只读取了该记录的磁盘字节。若真实项目证明 JSON 解析或峰值内存仍是瓶颈，再把封装升级为独立二进制/分片文件；在此之前保持单文件原子写入与逐记录 SHA-256 校验更容易保证崩溃恢复正确性。
