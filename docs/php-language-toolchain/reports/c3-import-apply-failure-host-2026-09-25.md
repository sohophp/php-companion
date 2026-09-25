# C3 导入命令的编辑应用失败宿主门禁

日期：2026-09-25。只修改 SoPHP Core 与测试夹具；未修改业务项目，也未打包 VSIX。

此前 Import Class、Resolve Pasted Imports 和 Optimize Imports 在 `workspace.applyEdit` 返回 `false` 或抛错时已显示本地化错误并返回 `false`，但隔离宿主尚未强制走过这些分支。这次为三条命令加入仅在 VS Code ExtensionMode.Test 下使用的编辑应用回调；正常模式继续直接调用 `workspace.applyEdit`。

隔离 VS Code 1.139.0 C3 源码宿主分别让 Import Class 返回 `false`、Resolve Pasted Imports 抛错、Optimize Imports 返回 `false` 和抛错。四次都到达编辑应用，命令返回 `false`，打开的文档及磁盘文件保持原样；同一宿主的正常导入、预览、一次 Undo/Redo 和其余 C3 序列继续通过，退出码 0。根扩展与扩展测试 TypeScript、相关 ESLint 和 `git diff --check` 通过。

宿主验证了命令结果与文件状态；通知弹窗的实际可见性没有自动断言。安装候选、WSL Remote 与生成新文件的一次 Redo 仍是独立门槛。
