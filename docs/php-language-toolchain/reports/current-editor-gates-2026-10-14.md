# 当前候选完整 Linux 编辑器流程

2026-10-14。本批补齐正常 Core `f60765a4` 的四个既有 Linux Extension Host 自动化流程：C1、C2、C3/onDemand、C3/progressive。此前 `8e1a08c7` 的编辑器资格保持其原快照，不自动转移到当前构建。功能范围、测试源码、断言和期限保持。

当前结论：**四个完整 Linux 编辑器流程均已执行并通过，独立终态核对通过**。3187 项冻结输入、105 份编译输出保持；驱动、全部阶段命令及所属进程组均已结束，四个专属显示服务与授权目录已清理。两套 C3 合计 80 个原完整生成边界，24 项原件与归档副本摘要核对通过。见[终态核对](../../../.vscode-test/current-editor-gates-2026-10-14/final-audit.json)和[完整归档](../../../.vscode-test/current-editor-gates-2026-10-14/archive/manifest.json)。

| 流程 | 实际命令退出码 | 耗时 | 生成边界 |
| --- | --- | --- | --- |
| C1/onDemand | 0 | 107.87 秒 | 原完整流程 |
| C2/onDemand | 0 | 126.86 秒 | 原完整流程 |
| C3/onDemand | 0 | 261.15 秒 | 40 |
| C3/progressive | 0 | 243.69 秒 | 40 |

分离驱动 `33601`（启动标识 `57484704`）已结束，每阶段保存原命令真实退出码，不以启动程序退出代替测试退出。C1 沿用原 PHP7.2 运行时和真实 UI 操作，C2 Core-only，C3 两模式使用真实 Core/Symfony。以下为各阶段完成时的观察记录，其中“正在执行”只适用于当时。

已执行并通过 `pnpm exec tsc -p test/extension/tsconfig.json`，105 份 JavaScript 输出与此前逐字相同。C1 完整流程已实际退出 0，耗时 107.87 秒；独立核对 3187 项冻结输入与 105 份编译输出保持，阶段命令与专属显示服务均退出、授权目录已删除，原日志摘要保持。见[C1 阶段核对](../../../.vscode-test/current-editor-gates-2026-10-14/c1-checkpoint.json)。当前同一驱动已进入 C2，后续按原顺序串行执行；每阶段核对输入、原编辑器退出及专属显示服务清理，两套 C3 分别要求原 40 个完整生成边界。

证据：[分离启动](../../../.vscode-test/current-editor-gates-2026-10-14/launch.json)、[真实阶段状态](../../../.vscode-test/current-editor-gates-2026-10-14/state.json)、[驱动输出](../../../.vscode-test/current-editor-gates-2026-10-14/driver.log)、[冻结输入](../../../.vscode-test/current-editor-gates-2026-10-14/inputs.json)、[编译输出摘要](../../../.vscode-test/current-editor-gates-2026-10-14/compiled-inputs.json)。

C2 完整流程亦已实际退出 0，耗时 126.86 秒；3187 项输入、105 份编译输出与原日志摘要保持，阶段命令与专属显示服务均退出、授权目录已删除。见[C2 阶段核对](../../../.vscode-test/current-editor-gates-2026-10-14/c2-checkpoint.json)。同一驱动已进入 C3/onDemand，两种 C3 尚无完整终态；C1/C2 资格按阶段分别记录，四流程资格仍未收口。

C3/onDemand 完整流程已实际退出 0，耗时 261.15 秒，原 40 个完整生成边界均有日志记录。3187 项输入、105 份编译输出与原日志摘要保持，阶段命令、专属显示服务及授权目录终态核对通过。见[C3 按需阶段核对](../../../.vscode-test/current-editor-gates-2026-10-14/c3-onDemand-checkpoint.json)。同一驱动已进入最后的 C3/progressive，四流程资格仍待其完整终态。

C3/progressive 最终退出 0，原 40 个生成边界、输入一致性和专属显示服务清理通过。至此当前 f607 本批四流程资格收口。

本批属于实际 Linux 编辑器中的自动化测试；真人 WSL 日常窗口的重载和操作链仍未执行，复杂 Controller 原 500/150 ms 预算及完整目标继续开放，功能扩展暂缓。
