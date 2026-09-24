# C3 Safe Move 预览与应用快照

日期：2026-09-24。`Safe Move` 原来先请求不含文件操作的文本编辑用于预览，用户确认后又请求一次含文件操作的计划。两次请求之间源码或索引可能变化，第二次计划不一定是用户看到的内容。

命令现在只生成一次含文件操作的完整计划，预览从这份计划提取文本编辑，应用也使用同一个 `WorkspaceEdit`。命令记录移动源和所有被编辑文件的文档版本、内容与磁盘字节；预览前及最终应用前复核这些参与文件和目标路径。参与文件或目标路径变化时取消，提示重新执行。测试模式提供一个计划后、应用前的受控编辑点。

验证：Core 与宿主测试 TypeScript 检查、相关 ESLint、差异检查通过。Core + Symfony 源码 VS Code 1.139.0 Extension Host 完整回归退出码 0。受控测试在计划生成后修改一个引用文件，确认目标文件没有创建，原 PHP 类仍在原路径；日志记录 `Safe Move participants changed during planning. Retry the move.`。恢复该编辑后，正常移动、引用更新、Undo 和 Redo 通过。宿主输出：`/tmp/sophp-c3-safe-move-snapshot-20260924.log`。

本轮没有操作模态预览窗口，尚未证明用户能逐项看完所有差异和取消后无副作用。快照复核与 `workspace.applyEdit()` 之间仍由 VS Code 执行最终应用，真实用户界面的极窄并发时序及 Remote 文件系统尚待 C3/C4 验收。未修改业务项目，未打包 VSIX。
