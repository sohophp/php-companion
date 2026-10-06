# D140 退出期间的内建刷新

## 当前状态与范围

基于 `8368d7ba` 的当轮未提交源码增量。处理多根版本／运行时通知引发的内建重解析，在 `shutdown` 到达后仍占用事件循环的路径；不改变 PHP 类型规则、缓存格式或 D139 的串行重启队列。D140 当轮 production bundle 为 `bc4f4f5b37f7775db9ed85aaf84f86ed94533d76f749cd47efb34e072fa28123`，此前 D138 完整 1153 项只覆盖旧 `2a3ff376`，不能转移为当前完整回归。

第二种源码方案已通过 29 项定向协议／缓存检查、另外六项取消／首个查询检查、类型检查和 ESLint。Linux 自动模式完整 C1 终态退出 0，原嵌套根与移除／重加根 Composer 链保持；整个当前 LSP 由 D141 单独取证，不标整阶段完成。没有打包、更新 Profile、提交或推送，goal 保持 active，原 C1–C4／R4 保持。

## 定位：修正最初的缓存等待假设

D139 日志显示客户端 2 秒停止超时、约 16 秒后缓存才写完。这只能确认缓存保存晚结束，不能区分期间发生的其它任务。

本轮对未改源码／bundle 的原 Linux C1 在移除目录后附加 Node Inspector，采集退出窗口约 8.33 秒 CPU、6815 个采样；完整宿主仍终态退出 0。按调用祖先归因，约 7.76 秒、93.1% 的采样来自 `refreshBuiltinForRoot → updateBuiltinForRoot → SemanticWorkspace.update/updateSource`。原 minified bundle 的 `N0`／`nC` 声明与源码逐项对照，属于版本／运行时变化的内建刷新，不是 `CallableFactCache.commit`。

采样为带 Inspector 开销的定位证据，不授予无采样性能资格。产品输入和两份 production bundle 保持原哈希。原始 profile、输入、宿主日志、真实 PID／时间与终态见 `.vscode-test/d140-shutdown-cpu/`。

独立真实 stdio 正例使用五个 Composer 根，从 PHP 7.2 批量切换到 8.5，随即发送 `shutdown`。原 bundle 在 onDemand／progressive 分别耗时 6700.93／6303.99 ms，两项都超过原客户端 2000 ms 停止期限。没有放宽此定向判定。

## 两种方案与结果

1. 在根刷新前让出事件循环，收到退出后停止未执行的刷新，保留缓存保存。退出／项目版本／缓存的首组 5 项通过；新增“版本通知后立即请求补全”在两模式都失败，返回了旧版本候选。此方案不能作为合格结果。
2. 按根记录并合并尚未完成的刷新；根查询先等待对应刷新。退出到达后撤回刷新，等待中的语义查询以标准 LSP `RequestCancelled` 结束，再执行原缓存保存与资源释放。根刷新让出两个协议调度轮次，使排队的退出消息先于昂贵的整批工作执行。

第二种方案的五根退出测量为 onDemand 23.68 ms、progressive 31.13 ms，均通过原 2000 ms 期限。29 项定向检查全部通过，包括两种模式的版本诊断／独立目录补全、紧跟通知的首个补全、可调用事实缓存的正例和损坏隔离，以及 PHP 7.2／8.5、两种索引模式下冷函数结果的首次查询／重启／未保存输入。

新增取消检查在同一批通知后提交补全，再提交退出；要求退出仍在 2000 ms 内，且等待中的补全返回标准取消码 `-32800`，不返回旧候选或释放后的结果。两模式各自的有／无等待补全四项全部通过，实测 10.96–24.19 ms；加上两项首个查询与项目隔离复测，共六项通过。这轮与完整 C1 宿主有并发活动，保留测量背景，不用它授予通用退出、热查询或可见 UI 预算资格。

## 证据与待关闭

- 原失败：`/tmp/sophp-d140-shutdown-before.json`（0／2），以及 `.vscode-test/d140-shutdown-cpu/shutdown.cpuprofile`。
- 第一种退出方案：`/tmp/sophp-d140-shutdown-after.json`（5／5）；首个查询反例 `/tmp/sophp-d140-immediate-query-before.json`（0／2）。
- 第二种方案：`/tmp/sophp-d140-final-protocol.json`（29／29）；测量 `.vscode-test/d140-shutdown-final-timings/`。
- 取消／首个查询：`/tmp/sophp-d140-cancel-protocol.json`，六项终态全部通过；测量 `.vscode-test/d140-shutdown-cancel-timings/`。
- 根宿主：`/tmp/sophp-d140-c1-auto.log`，2026-10-06T03:40:31 UTC 退出 0；根文档 version 1 的 CLI 7.2 → Composer 8.1 → CLI 7.2 → Composer 8.1 诊断／状态链通过。
- 编译／Lint／bundle：`/tmp/sophp-d140-final-typecheck.log`、`/tmp/sophp-d140-final-eslint.log`、`/tmp/sophp-d140-final-build.log`，均退出 0。
- 当前输入：`.vscode-test/d140-final-input.json`；须在终态再次核对。

退出过程仍可能受单个已经执行的同步分析、未完成初始解析、磁盘写入或其它任务影响，本批不宣称所有取消／退出场景均达到预算。当前完整 LSP、真实 WSL 长会话、普通编辑性能、缓存规模／内存和其它平台继续开放。定向退出测量不能关闭 150 ms 普通编辑或 100 ms 通用取消门槛。

## 完整回归等待期间的源码复核

复核没有修改被冻结的源码／构建输入，也没有并发运行新的运行时门禁。根刷新读取让出事件循环与 `semanticForRoot` 等待之后的当前版本／运行时状态；同步更新结束后，`finally` 只删除该根自己的待完成 Promise。两种索引模式的文档查询均经过等待刷新与退出检查。

没有归属项目目录的文档使用 `loose` workspace，fallback 版本变化仍走既有的独立同步刷新路径。本次五根退出与等待查询测试不覆盖该路径的退出性能。部分 Provider／内部任务直接调用 `semanticForRoot`，不全部经过文档查询的 `semanticForUri`；本次文档查询取消证据不能授予这些内部任务通用取消资格。这些是覆盖边界，尚未通过额外运行时复现认定为新缺陷。

复核记录 `.vscode-test/d140-source-review.json` 绑定当前源码 SHA-256，记录上述边界以及 3082 个 D141 冻结输入保持不变。它属于源码审查证据，不计为新增测试通过。

D141 完整回归之后发现退出诊断越界与查询调度反例，D143 已定向修正并与本报告一起收口为本地检查点，见 [生命周期恢复](shutdown-query-lifecycle-recovery-2026-10-06.md)。D140 的初始未提交状态、原 bundle 与失败／通过证据属于当轮记录，不授予后来组合完整资格。
