# Callable 实现记录验收

日期：2026-09-15。范围：P3 的 callable 级磁盘记录、规范分区、独立校验和与可观察状态。

## 实现

- 语义快照升级到 schema 74。`implementation.file` 保存不属于唯一 callable 的文件级事实；`implementation.callables` 为每个身份唯一的函数、方法及含具体 Hook 的属性保存身份、种类、声明范围和实现事实。
- callable 内的类型使用、赋值、名称、成员访问、调用、scope、变量引用、return、收窄、控制流赋值位置、错误、注释与字符串范围进入同一记录。嵌套 closure/arrow 的事实归属最小外层稳定记录；重复 callable 身份没有可安全单独寻址的键，继续留在文件记录。
- 恢复会重组完整语义文件，再重新计算规范分区。身份、顺序、范围、事实归属或记录数量不一致均拒绝；把事实从 callable 移到文件记录、复制 callable 记录、越界控制流位置和旧 schema 均有回归。
- `callableImplementationStates(uri)` 暴露每条稳定记录的 `deferred`/`loaded` 状态。声明优先恢复后所有 callable 与文件实现一起延迟，首次正文查询目前仍按文件原子装载；该状态接口为下一增量按目标 callable 装载提供可验证边界。
- Language Server 缓存升级到 v46、封装 schema 3，分别校验源码、声明、文件级实现、每条 callable 实现、派生层和框架事实，并保留整体摘要。任一校验失败时只重建对应 PHP 文件，不接受部分或混合版本事实。

## 当前验证

- `pnpm typecheck`、`pnpm lint`：通过。
- `pnpm test`：十六个组件 631 项、根扩展 35 项，共 666 项通过；其中 Semantic 255 项、Language Server 168 项。缓存封装覆盖正常恢复、源码/声明/文件记录/callable 记录/派生层/框架事实篡改、URI 和打开文档源码不一致。
- 10,000 文件持久索引冷索引 18,608.96 ms、热恢复 7,660.08 ms，热/冷比 0.4116；热启动恢复 10,000/10,000、重解析 0，索引结束时 10,000 个文件实现及其中 19,997 条 callable 实现均保持延迟，一次传递 readonly 查询只装载 3 个文件。
- 框架事实、三条 Callable 工厂事实和传递依赖失效继续通过；单条派生层损坏与单条 callable 实现记录损坏分别只重建 1 个 PHP 文件。
- 500 轮编辑无陈旧补全；诊断 P50/P95/最大值 2.03/2.69/5.77 ms，热补全 0.81/1.09/2.25 ms，取消 1.15 ms，最终 RSS 比基线增加 14.73 MiB；损坏缓存与进程重启恢复通过。
- 十六个组件 tarball 通过仓库外消费者安装、导入和 API smoke；三个 VSIX 内容校验通过，Linux VS Code 1.137.0 打包 Extension Host 退出码 0。
- Windows Open Source Profile 首轮在 PHP 8.4 Property Hook 精确诊断的 5 秒等待处超时，同提交复跑通过；门禁随后改用 15 秒有界等待并在失败时输出最后诊断码。最终提交 `7e27eb9` 的 [CI 34932496049](https://github.com/sohophp/php-companion/actions/runs/34932496049) 18/18 成功，覆盖三平台 Quality、打包 Extension Host、七扩展完整组合和 PHP 7.2–8.5。
- 最新私有 Alpha 目录为 `artifacts/php-companion-alpha-0.4.5-7e27eb99/`，绑定完整提交 `7e27eb9988d6c31f8a3856b3625df13a643958ea`。候选 SHA-256：主扩展 `ff71098c897281b41c37c895ef5a0f3eae06351d42f025a25cbe41448cd8cc53`，Open Source Pack `b288fd9d8e43ac523667f64a5fe2b05580bd243a022014096e57381b5c935683`，Recommended Pack `417b49f52062c6edcd85058f49a6b0de28db3e8de0baf5a4810d799792c8cf34`。

## 边界与下一步

磁盘格式已经能独立识别与校验每条稳定 callable 实现，内存查询仍使用完整 `SemanticFile` 数组，因此首次正文请求会装载目标文件的全部记录。下一增量需要让正文查询先确定所属 callable，将目标记录及其明确需要的外层/被调用依赖合并到查询视图；无法证明依赖闭包时装载完整文件，以保持结果完整而不制造假阴性。
