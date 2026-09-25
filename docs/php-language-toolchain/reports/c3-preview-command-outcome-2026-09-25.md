# C3：参数重构预览命令的结果反馈

日期：2026-09-25。只修改 SoPHP Core 源码、隔离扩展宿主断言和文档；未修改业务项目，未打包 VSIX。

## 问题与修复

`addMethodParameter`、`removeMethodParameter`、`reorderMethodParameters` 共用 `applyPreviewedExtract`。原先这三个外层命令在收到有效编辑计划后，忽略预览命令的结果并固定返回 `true`。用户取消预览、源/目标文件在预览前后变化，或 VS Code 拒绝编辑时，调用方因此仍看到“成功”返回值。

现在共用预览命令仅在 `workspace.applyEdit` 成功且完成应用路径后返回 `true`；取消、关闭预览、快照失效以及 `applyEdit` 返回 `false` 均返回 `false`，三个外层命令传递这一结果。`applyEdit` 抛错时记录原始错误并显示已有的本地化失败提示，返回 `false`；预览标签仍在 `finally` 中清理。文件内容是否变化仍以现有快照及 VS Code 编辑应用结果为准。

## 验证与边界

- 根扩展和扩展宿主 TypeScript 检查、改动文件 ESLint、`git diff --check` 通过。
- 独立 VS Code C3 扩展宿主退出码 0；取消、过期磁盘快照、应用与既有一次 Undo/Redo 场景均通过。日志：`/tmp/sophp-c3-preview-command-outcome-20260925.log`。
- 此轮没有在宿主中强制使 `workspace.applyEdit` 抛错，因此异常时的实际通知只经过静态检查；正常与取消路径有宿主证据。类型生成文件的一次 Redo 仍未恢复，C3 整体不据此标记完成。
