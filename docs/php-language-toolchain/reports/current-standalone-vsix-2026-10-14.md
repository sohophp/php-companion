# 当前冻结 VSIX 的独立打包流程

2026-10-14。本批运行原 Core/Symfony 独立打包入口的完整 `suite/index`；与 Open Source Profile 的完整组合分支分别记录。使用同一冻结 Core/Symfony VSIX、Linux VS Code 1.140.0，全部原断言和期限保持。

当前结论：**修正可见编辑器前提后的完整独立流程已执行并通过，严格终态审计退出 0**。实际原命令退出 0，耗时 421.19 秒；两个声明 F2 准备及占位符检查、后续 Safe Move、声明重命名、预览、取消、应用和 Undo/Redo 全部完成。原主动崩溃及恢复检查保留，终态记录一次关闭、恢复失败 0、待处理版本刷新 0，无重启进行中或排队。

3316 项冻结输入、两份包摘要和合计 16 份包内运行文件核对通过，105 份当前编译输出保持。驱动、原命令、实际服务器、所属进程组、测试项目和专属显示服务均已结束或清理；50 份通过归档与此前 50 份失败归档的原件、副本摘要分别复核。见[严格终态审计](../../../.vscode-test/current-standalone-vsix-visible-f2-2026-10-14/final-audit.json)、[独立追加复核](../../../.vscode-test/current-standalone-vsix-visible-f2-2026-10-14/post-audit.json)、[通过归档](../../../.vscode-test/current-standalone-vsix-visible-f2-2026-10-14/archive/manifest.json)及[结构化报告](current-standalone-vsix-2026-10-14.json)。以下为失败调查与执行期间的历史记录。

**已执行但失败**：首次原完整命令实际退出 1，耗时 394.49 秒。日志记录 `Rename preparation rejected: The PHP document changed while Rename was being prepared.`，随后渲染器报告 `TextModelPart is disposed!`。3316 项输入保持，原命令、监督、所属进程组、测试项目和专属显示服务清理核对通过；原测试源码、编译输出、日志及 50 份归档保留。见[失败终态核对](../../../.vscode-test/current-standalone-vsix-2026-10-14/failed-terminal-audit.json)和[失败归档](../../../.vscode-test/current-standalone-vsix-2026-10-14/failed-archive/manifest.json)。原命令资格不标通过，Extension Host 的退出 0 不能替代实际编辑器命令的退出 1。

原声明 F2 测试仅打开 `Runner.php` 和 `LogsActivity.php`，没有显示编辑器。当前本地 VS Code 的 `_executePrepareRename` 命中已存在模型时直接异步调用，不为该分支持有模型引用；这与本轮模型失效错误一致。原日志没有单独记录文档关闭与版本变化，具体分支仍属于推断。测试现先显示每个声明文档，符合实际 F2 的可见编辑器前提，随后执行原准备命令和占位符断言；没有修改产品的文档版本、关闭或取消保护。

**已执行并通过**：`pnpm exec tsc -p test/extension/tsconfig.json`、`pnpm exec eslint test/extension/suite/index.ts`。独立核对显示只有该测试源码与对应编译输出发生预期变化，105 份编译输出中的其它 104 份保持，生产 Core 摘要与冻结包保持。见[准备核对](../../../.vscode-test/current-standalone-vsix-visible-f2-2026-10-14/preparation-audit.json)。

**历史运行观察**：修正可见编辑器前提后的原完整流程冻结 3316 项输入。2026-10-13 22:25:15 UTC 的只读观察确认监督 `91483`（启动标识 `57885036`）和原命令 `91490`（`57885161`）当时存活。两者现已终态结束，原入口没有换成测试子集，没有放宽断言、期限或预算。见[独立启动](../../../.vscode-test/current-standalone-vsix-visible-f2-2026-10-14/launch.json)、[执行状态](../../../.vscode-test/current-standalone-vsix-visible-f2-2026-10-14/state.json)、[冻结输入](../../../.vscode-test/current-standalone-vsix-visible-f2-2026-10-14/inputs.json)。

本批独立打包入口的本地自动化资格已收口；修正属于测试前提，生产源码与冻结包保持。该通过记录不证明所有不稳定测试已经解决。真人 WSL、远程 CI、复杂 Controller 原 500/150 ms 预算及完整目标继续开放；新增功能暂缓。
