# C3 导入命令的磁盘快照

日期：2026-09-25。只修改 SoPHP Core 和独立测试夹具；未修改业务项目，也未打包 VSIX。

`Import Class` 与 `Resolve Pasted Imports` 原先只检查打开文档的版本。外部进程在导入计划生成后直接改写磁盘文件时，编辑器中的版本可能仍不变。现在两条命令和此前的 `Optimize Imports` 共用源文件守卫：记录文档版本与磁盘 SHA-256，在异步查询和应用编辑前复核。磁盘内容变化或文件缺失时，取消旧计划并显示既有提示；未命名文档继续按文档版本处理。旧索引路径的 `resolveDocumentImports` 也在应用前调用同一守卫。

独立 VS Code 1.139.0 Linux x64 C3 宿主与 10 项 Open Source Pack 源码组合宿主均通过外部写盘场景（`/tmp/sophp-c3-import-disk-20260925.log`、`/tmp/sophp-c3-pack-10-import-disk-20260925.log`，退出码均为 0）：两个命令都在计划完成后遭遇外部写盘，打开文档版本未变，命令没有插入旧 `use`，磁盘外部内容保留。随后独立宿主还通过两个命令在未变化文件上的正常导入及一次 Undo/Redo（`/tmp/sophp-c3-import-positive-20260925.log`，退出码 0）。根扩展与测试 TypeScript、相关 ESLint、`git diff --check` 通过。安装候选和 WSL Remote 仍待验收；生成文件的资源 Redo 缺口仍开放。
