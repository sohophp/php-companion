# C2 持续会话异常退出清理

2026-10-14。本批只修复已有 `scripts/benchmark-c2-session.mjs` 的异常进程回收，产品功能与原 20 秒协议超时保持。

已执行但失败的旧反例：启动工具所属真实服务器并发送 SIGSTOP；原协议超时后命令退出 1，但服务器仍残留，同一原生回归在“无需测试救援即可回收子进程”断言失败。旧源码和完整失败输出保留；测试的 finally 只救援其自有进程。

修复：启动时建立退出等待，正常关闭与异常清理复用它；异常清理先 SIGTERM，一秒后仍未退出则 SIGKILL，等待退出后清理项目。嵌套 finally 保证目录清理仍会执行。未改迭代次数、查询、诊断和新鲜度断言。

已执行并通过：

- 同一真实暂停故障回归，原 20 秒超时保持，约 21.43 秒完成；子进程自行退出且临时父目录为空，退出 0。
- 原工具正常 100 轮/500 项结果核对，陈旧 0，退出 0；没有启用内存观察、强制 GC 或仅编辑模式。
- 已接入默认 `pnpm test:benchmark-cleanup`，与已有编辑基准清理回归组成两项，实际两项通过、零失败与零跳过，退出 0。
- 两个修改/新增脚本的 ESLint 通过。此前冻结的 3186 项输入核对，仅本批工具和默认脚本配置两项有预期变更，产品 Core 保持 `f60765a4`；14 项原件与归档副本摘要一致。

证据：[旧失败](../../../.vscode-test/c2-session-exit-cleanup-2026-10-14/old-counterexample.log)、[修复回归](../../../.vscode-test/c2-session-exit-cleanup-2026-10-14/fixed-fault.log)、[正常会话](../../../.vscode-test/c2-session-exit-cleanup-2026-10-14/normal-session.log)、[默认入口](../../../.vscode-test/c2-session-exit-cleanup-2026-10-14/default-cleanup-entry.log)、[终态核对](../../../.vscode-test/c2-session-exit-cleanup-2026-10-14/final-audit.json)、[归档](../../../.vscode-test/c2-session-exit-cleanup-2026-10-14/archive/manifest.json)。

本批 Linux 工具清理资格已收口。完整默认 `pnpm test` 与远程 CI 本批未执行，前一完整默认 26950 项及 6 项原生回归保持其原快照统计；不将新增两项组合改写为完整默认统计。普通 100 轮功能通过不代表复杂 Controller 原 500/150 ms 性能达标，也不代替真人 WSL 或完整目标验收。
