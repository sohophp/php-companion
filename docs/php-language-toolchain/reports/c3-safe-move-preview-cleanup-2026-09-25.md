# C3 Safe Move 应用后的预览清理失败

日期：2026-09-25。只修改 SoPHP 仓库；未修改业务项目，也未打包 VSIX。

Safe Move 原先在命令 `finally` 中直接关闭预览标签。若移动编辑已经成功，而 VS Code 关闭标签抛错，命令会从 `finally` 抛出异常，覆盖成功结果；预览快照清理也会被跳过。现在把关闭失败写入输出日志，并在 `finally` 中保证快照清理。已应用的移动仍返回 `true`；未应用的移动仍按原有失败路径返回 `false`。

隔离 VS Code 1.139.0 C3 源码宿主在移动成功后注入预览关闭异常，确认命令返回 `true`、源路径消失、目标文件命名空间正确，并完成一次 Undo/Redo。宿主退出码 0。根扩展与测试 TypeScript、改动文件 ESLint、`git diff --check` 通过。宿主输出出现一条与既有 `Service.With.Dot` 文件夹有关的 VS Code Explorer `TreeError`，未使断言或宿主退出失败；这条日志不能单独用于判断真实 Explorer 交互稳定性。

此场景验证源码宿主中的结果一致性；安装候选、WSL Remote 和真实编辑器可见提示仍待验收。生成新文件的一次 Redo 是独立开放项。
