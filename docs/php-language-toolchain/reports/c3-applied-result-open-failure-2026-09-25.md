# C3 编辑已应用后的打开失败

日期：2026-09-25。SoPHP 的预览重构和 Safe Rename 在 `workspace.applyEdit` 成功后会打开结果。此前若 VS Code 此时打开编辑器失败，命令可能抛错或返回 `false`，尽管文件改动已经发生。现在两条路径保留 `true` 结果，并明确提示“改动已应用，但 VS Code 无法打开结果”。预览标签清理失败也只记录告警，不覆盖已应用的命令结果。

独立 C3 宿主 `/tmp/sophp-c3-applied-open-result-20260925.log` 和当前 10 项 Open Source Pack 源码宿主 `/tmp/sophp-c3-applied-open-result-full-pack-20260925.log` 均退出码 0。测试在编辑应用后注入打开失败，核对两条命令返回 `true`、目标文本已变更，且一次 Undo/Redo 仍恢复正确内容。根扩展及测试 TypeScript、相关 ESLint 通过。

注入异常验证的是应用后打开阶段的命令语义，不等同于真实操作系统/Remote 的编辑器打开失败。安装候选和 WSL Remote 仍需单独核对。类型生成文件的一次 Redo 缺口仍开放。
