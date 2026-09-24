# C3 导入命令的文档版本保护

日期：2026-09-24。检查 SoPHP 自身语言服务器驱动的 `Import Class`、`Resolve Pasted Imports` 和 `Optimize Imports` 命令。协议编辑经 `fromProtocolWorkspaceEdit()` 转为 VS Code `WorkspaceEdit` 时没有保留 LSP 文档版本；因此仅靠服务器按当时源码生成正确范围，无法阻止用户在候选查询、选择或预览期间继续编辑后应用旧范围。

这三个命令现在捕获启动时的文档版本，并在异步语言客户端启动、候选/代码操作查询、用户选择及最终编辑计划返回后核对文档仍打开且版本未变。`Optimize Imports` 在预览确认后也再次核对。已切换到旧索引路径的导入和整理命令同样在异步阶段或应用前检查关闭与版本变化；不匹配时显示准确的取消提示，不提交旧编辑。导入提示的英中文案现统一说明“PHP 文档发生变化”。

验证：TypeScript 类型检查、相关 ESLint 与差异检查通过；重新构建 Core 源码 bundle 后，完整 11 项 Open Source Pack 隔离宿主退出码 0。宿主执行了 `Import Class` 和 `Resolve Pasted Imports` 的应用、Undo、Redo；本轮又为 `Optimize Imports` 加上应用、一次 Undo 和 Redo 的断言，均通过。宿主日志为 `/tmp/sophp-pack-c3-import-undo-redo-20260924.log`。

这些运行证明正常命令和撤销链没有回归。当前宿主尚未可控地在候选请求或 VS Code 模态预览正进行时插入一次用户编辑，因此“变化时必定显示取消且绝不应用旧范围”仍主要由代码路径检查支持，需单独的可控时序门禁；预览窗口本身及取消按钮的真实 UI 操作也未因此验收。没有打包 VSIX，没有修改业务项目。
