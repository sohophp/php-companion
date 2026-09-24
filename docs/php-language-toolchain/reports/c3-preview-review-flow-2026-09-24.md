# C3 可查看的预览与确认

日期：2026-09-24。`Safe Move` 和 `Optimize Imports` 原来打开差异编辑器后立即显示模态“应用”对话框。按 [VS Code 通知设计说明](https://code.visualstudio.com/api/ux-guidelines/notifications)，模态对话框在关闭前会阻止用户操作其外的界面，因此用户无法在确认时检查差异。Safe Move 连续打开多个差异时，默认预览标签也可能替换先前标签。

两个命令现按默认预览设置直接打开差异，并以 `preview: false` 保留每个差异标签。差异全部打开后，用非模态通知提供“应用”操作；关闭通知视为取消。用户可以切换差异标签查看，再决定应用。关闭预览设置时仍可直接应用；Safe Move 继续复核先前捕获的参与文件和目标路径，Optimize Imports 继续复核文档版本。

验证：Core 与扩展测试 TypeScript 检查、相关 ESLint 和差异检查通过。Core + Symfony 源码 VS Code 1.139.0 Extension Host 完整回归退出码 0，日志 `/tmp/sophp-c3-preview-20260924.log`。测试模式在差异打开后检查 Optimize Imports 的差异标签及 Safe Move 每个参与文件的差异标签均非临时预览；取消后无文件修改或移动；模拟确认应用后，原有结果与 Undo/Redo 均通过。

宿主通过测试回调选择“应用”或“取消”，没有代替真人点击非模态通知；通知在不同主题、窗口布局与 WSL Remote 中的可见性仍待独立 UI 验收。未修改业务项目，未打包 VSIX。
