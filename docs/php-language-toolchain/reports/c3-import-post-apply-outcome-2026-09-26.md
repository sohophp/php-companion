# C3：导入命令应用后的实际结果

日期：2026-09-26。独立 Composer 项目的 C3 宿主覆盖 `Import Class`、`Resolve Pasted Imports` 和 `Optimize Imports`。此前这三种命令只按 `workspace.applyEdit` 返回值报告结果；若编辑完整写入后 API 返回 `false` 或抛错，命令会误报失败。

现在应用前记录参与文档及完整预期文本，应用后逐份比较实际文本。只有全部达到预期且至少有一份文档确实改变时才报告成功；未应用、部分应用或结果不符时继续报告失败。预览、来源快照和磁盘变化检查仍在原有命令路径上执行。

验证：主扩展和测试的 TypeScript 编译、相关 ESLint、`git diff --check` 通过；VS Code 1.139.1 Linux x64 的完整 10 项 Open Source Pack C3 源码宿主退出码 0。宿主分别注入三种命令在**完整应用后**返回 `false` 和抛错，共六种情况，核对成功结果及一次 Undo/Redo；原有未应用时返回失败的四种情况也继续通过。没有打包 VSIX，没有修改业务项目；已安装候选和真实 WSL Remote 仍待 C4 验收。
