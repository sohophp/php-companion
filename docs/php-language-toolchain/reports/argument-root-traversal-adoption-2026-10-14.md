# 只读根包装对象复用采用后的完整默认验证

2026-10-14。结论：**正常 8219 的原完整 `pnpm test` 和独立终态审计均已执行并通过，实际退出 0。** 本批完整默认资格已收口，功能范围保持。[四个原编辑器流程及独立终态审计](8219-editor-gates-2026-10-14.md)已收口，80 生成边界和 32 归档通过；原两小时稳定性正在执行，资格另行记录。

| 验证 | 实际结果 |
| --- | --- |
| 原正常构建、语义类型检查、ESLint | 三原命令均退出 0 |
| 正常运行资产 | 八文件与[获准私有原型](argument-root-traversal-prototype-2026-10-14.md)逐字一致 |
| 公共声明 | 语义包九份 `.d.ts` 采用前后相同，源映射变化另列 |
| 原完整 `pnpm test` | 2359.95 秒，实际退出 0 |
| 26 个 Vitest 阶段 | 26950 项通过、1 项既有条件跳过，无失败；原入口顺序保持 |
| 正常语义 / 语言服务器 | 191 文件/24145 项，142 文件/1652 项通过；条件跳过独立保留 |
| 原生回归 | 清理 2 项及索引运行时兼容 5 项通过，共 7 项、无失败 |
| Symfony / 根测试 | 13 / 121 项通过 |
| 冻结输入与资源 | 3316 输入保持，原命令及驱动结束，所属进程组清空 |
| 原件及归档 | 24 份逐项摘要核对通过 |

Core 为 `8219f6c6f816422e36ac0f4543aaefb2ee04cdb8337bbcdb37c8bc5aa3d14bea`。采用前未提交源码已保存；实际产品变化限定于语义源码、编译及源映射、服务器包，第三方 SDK、功能、版本、安装和发布保持。首次辅助核对错误地假定全部六个 JavaScript 包都会变化，失败记录保留；没有因此修改产品或重启原默认任务。

原正常语义阶段、中途实际存活核对及编辑器/两小时准备均保留各自时刻的状态，不替代本终态。顺序衔接取得实际默认及独立审计退出 0 后，已经启动 C1/onDemand、C2/onDemand、C3/onDemand、C3/progressive；原期限和两套 C3 共 80 个生成边界保持。此处记录启动时状态；四编辑器现已终态通过，真人 WSL 资格独立保留。

当前 8219 原两小时稳定性任务已启动，尚未取得终态；原 7200 秒/250 ms、连续未保存编辑、实际崩溃与缓存损坏、500/150 ms、384 MiB RSS/64 MiB 缓存预算保持。原脱离启动器和三类控制证据逐字一致，四编辑器独立审计实际退出 0 后才启动。

[局部 25 轮准入](argument-root-traversal-prototype-2026-10-14.md)诊断 22/25 轮更快、配对改善 12.97%，查询 P95 132.18 ms；诊断 P95 1528.01 ms 仍未达到原 500 ms，查询最大值 645.11 ms 保留。旧 b403 的编辑器、长会话、打包与平台/规模资格不自动转移到本候选。复杂诊断预算、真人 WSL、远程 CI 和完整计划仍开放，新增功能暂缓。

证据：[完整原日志](../../../.vscode-test/argument-root-traversal-adoption-2026-10-14/full-default.log)、[原监督终态](../../../.vscode-test/argument-root-traversal-adoption-2026-10-14/supervisor-state.json)、[实际阶段](../../../.vscode-test/argument-root-traversal-adoption-2026-10-14/state.json)、[独立审计结果](../../../.vscode-test/argument-root-traversal-adoption-2026-10-14/final-audit.json)、[独立审计实际退出码](../../../.vscode-test/argument-root-traversal-adoption-2026-10-14/audit-command-result.json)、[24 归档](../../../.vscode-test/argument-root-traversal-adoption-2026-10-14/archive-manifest.json)、[首次辅助核对失败](../../../.vscode-test/argument-root-traversal-adoption-2026-10-14/checkpoint-first-attempt-failure.json)、[编辑器当前任务](../../../.vscode-test/8219-editor-gates-2026-10-14/state.json)、[顺序衔接](../../../.vscode-test/8219-delivery-chain-2026-10-14/state.json)、[两小时准备](../../../.vscode-test/8219-long-session-2026-10-14/preparation-review.json)、[结构化报告](argument-root-traversal-adoption-2026-10-14.json)。

2026-10-14 06:30 UTC 的实际核对：C1/onDemand（117.43 秒）、C2/onDemand（145.88 秒）均退出 0，当前 C3/onDemand 仍在运行。后续原两小时任务的顺序等待已启动，其独立队列实际等待当前编辑器衔接进程；只有四编辑器及独立审计实际退出 0 后才启动原 7200 秒任务，再执行终态审计。原两小时基准尚未启动，源码及预算保持，见[两小时衔接启动](../../../.vscode-test/8219-long-session-chain-2026-10-14/launch.json)、[衔接状态](../../../.vscode-test/8219-long-session-chain-2026-10-14/state.json)和[实际存活核对](../../../.vscode-test/8219-long-session-chain-2026-10-14/live-checkpoint.json)。

2026-10-14 06:33 UTC：前三个原编辑器流程退出 0，C3/onDemand 298.78 秒、40 个生成边界通过。三流程的日志摘要、显示服务授权目录和实际测试项目清理已核对；最后 C3/progressive 的 PID/启动标识核实存活，仍无四流程整轮资格。见[三流程检查点](../../../.vscode-test/8219-editor-gates-2026-10-14/three-flow-checkpoint.json)。

2026-10-14 06:39 UTC：四原编辑器流程和独立审计全部退出 0，80 生成边界、3316 输入、105 编译输出、资源清理和 32 归档通过。随后原两小时任务已启动，监督驱动 3690/60838778 与原命令 4014/60839073 实际存活，初始 400 轮/2000 精确结果、陈旧 0；中途结果不替代两小时终态。

2026-10-14 06:54 UTC：原两小时任务的驱动和原命令身份核实存活，运行到 3300 轮/16500 项精确结果，陈旧 0；中途进度不算两小时通过。当前候选完整 12 扩展源目录组合的准备脚本和原运行/审计已备好，原 50/30 轮、9100 噪声文件及 150 ms 组合预算保持；复制 2482 运行文件和 105 编译输出的操作明确延后到当前两小时独立审计实际退出 0 后，尚无环境复制或编辑器执行。见[完整组合准备核对](../../../.vscode-test/8219-full-profile-2026-10-14/preparation-review.json)。
