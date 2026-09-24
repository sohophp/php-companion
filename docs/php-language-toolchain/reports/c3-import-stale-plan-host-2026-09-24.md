# C3 导入命令旧计划宿主门禁

日期：2026-09-24。此前 Core 的 `Import Class`、`Resolve Pasted Imports` 和 `Optimize Imports` 已在异步链路中检查文档版本，但宿主只验证了正常应用与 Undo/Redo，缺少变化时的拒绝证据。

本轮在扩展测试模式下为三个命令加入“语言服务器返回计划后、版本检查前”的受控编辑点。宿主逐项修改当前 PHP 文档并断言：测试点实际到达、旧导入或整理编辑未应用、用户的编辑仍在；随后 Undo 该测试编辑，并继续验证原有正常命令及 Undo/Redo。测试点只在 `ExtensionMode.Test` 执行。

`pnpm exec tsc --noEmit`、`pnpm exec tsc -p test/extension/tsconfig.json`、相关 ESLint 和 `git diff --check` 通过。Core + Symfony 源码 VS Code 1.139.0 Extension Host 完整回归退出码 0，输出在 `/tmp/sophp-c3-import-race-20260924.log`。该套件的测试代码同时断言了三个测试点均被触发，因此退出码覆盖三条拒绝路径以及正常应用、Undo/Redo。

本轮控制的是服务器计划**已经返回**、客户端尚未应用的窗口。真正请求处理期间的编辑、QuickPick 或模态预览期间的输入、取消按钮的用户界面仍待单独验收；不能把本门禁当作 C3 完成。未打包 VSIX，未修改业务项目。
