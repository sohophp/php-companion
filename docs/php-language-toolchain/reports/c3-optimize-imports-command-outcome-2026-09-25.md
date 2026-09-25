# C3 Optimize Imports 命令结果与撤销链

日期：2026-09-25。只修改 SoPHP Core 和独立测试夹具；未修改业务项目，也未打包 VSIX。

`phpCompanion.optimizeImports` 现在只在 `workspace.applyEdit` 实际成功后返回 `true`。无可应用修改、取消或关闭预览、源文档在规划或预览期间改变，以及应用失败时返回 `false`；原有提示仍显示。共享的导入编辑应用函数同步返回布尔值，Import Class 与 Resolve Pasted Imports 的既有调用方式不变。

独立 VS Code 1.139.0 Linux x64 C3 宿主验证了预览取消和关闭均返回 `false` 且源文档不变；确认应用返回 `true`，删除未使用及重复导入，并可一次 Undo/Redo。独立 Core 宿主日志 `/tmp/sophp-c3-optimize-outcome-20260925.log`，10 项 Open Source Pack 源码组合日志 `/tmp/sophp-c3-pack-10-optimize-outcome-20260925.log`，两者退出码均为 0。根扩展和测试 TypeScript、相关 ESLint、`git diff --check` 均通过。`workspace.applyEdit` 抛错/返回 `false` 的返回值来自代码路径，尚未在宿主注入故障；安装候选与 Remote 仍待验证。类型生成文件的资源 Redo 缺口仍开放。
