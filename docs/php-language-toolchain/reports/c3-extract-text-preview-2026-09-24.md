# C3 Extract Variable / Method 预览与版本保护

日期：2026-09-24。

SoPHP 的 Extract Variable 和 Extract Method 原先以 VS Code Code Action 直接携带 `WorkspaceEdit`。编辑器获取动作之后，用户若先修改同一缓冲区，旧编辑仍可能按过期位置应用。现将 PHP `refactor.extract` 动作统一交给 SoPHP 的预览命令：保留请求时的源版本与全文，展示源文件差异，确认前再次检查；取消、旧版本、关闭文档或目标冲突均不应用旧计划。应用成功后焦点返回源文件，便于直接 Undo/Redo。Extract Interface 仍沿用相同流程，包含新文件的第二份差异。

定向 C3 宿主在独立 Composer fixture 中验证 Extract Variable 的旧动作拒绝、预览、取消、应用、一次 Undo/Redo，并保留 Extract Interface 的相同门禁；TypeScript 类型检查及所改文件 ESLint 通过。完整扩展宿主验证了 Extract Variable、Extract Method 的普通输入和单输出两类编辑及各自的 Undo/Redo，退出码 0。随后把源版本/全文快照提前到等待 Language Server 响应之前，最终构建再次通过定向 C3 宿主；此快照时序的专门暂停测试仍待补充。日志：`/tmp/sophp-extension-extract-text-preview-20260924.log`、`/tmp/sophp-c3-extract-text-final-20260924.log`。

边界：其它 `refactor.inline`、`refactor.rewrite` 和 Quick Fix 仍走原有 Code Action 路径；本轮只处理提取类动作。确认后版本复核与 VS Code 实际应用之间的底层并发窗口仍需单独验证。
