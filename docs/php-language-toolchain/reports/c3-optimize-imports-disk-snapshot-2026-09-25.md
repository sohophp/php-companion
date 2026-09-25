# C3 Optimize Imports 预览期间磁盘变化

日期：2026-09-25。只修改 SoPHP Core 与独立测试夹具；未修改业务项目，也未打包 VSIX。

`Optimize Imports` 原先只检查打开文档的版本。外部进程在预览期间直接改写磁盘文件时，文档版本可能仍不变，旧导入计划随后仍可进入应用。命令现保存源文件的 SHA-256，并在规划前后及预览确认后复核磁盘内容和文档版本。磁盘文件缺失或变化时返回 `false` 并显示已有的取消提示；未命名文档保持原有的文档版本检查。

独立 VS Code 1.139.0 Linux x64 C3 宿主和 10 项 Open Source Pack 源码组合宿主均通过（`/tmp/sophp-c3-optimize-disk-20260925.log`、`/tmp/sophp-c3-pack-10-optimize-disk-20260925.log`，退出码均为 0）。测试在预览回调中直接写磁盘，确认打开文档版本尚未变化，然后验证命令拒绝旧计划并保留外部内容。根扩展与测试 TypeScript、相关 ESLint 通过。安装候选和 WSL Remote 仍待验收；创建文件的资源 Redo 缺口仍开放。
