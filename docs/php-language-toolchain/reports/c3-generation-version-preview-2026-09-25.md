# C3 类型生成预览的目标 PHP 版本防护

日期：2026-09-25。工作范围为 SoPHP 仓库与隔离的临时 Composer 项目，没有修改业务项目或打包 VSIX。

类型生成现在在预览前按目标 PHP 版本验证类型名和 PSR-4 命名空间，但原应用路径只复核 Composer 文件。用户如果在预览期间切换 `phpCompanion.phpVersion` 或 `phpCompanion.phpExecutablePath`，原预览可能按旧版本创建文件。现在应用前复核这两项设置和 VersionManager 当前解析的目标版本；变化时提示重新执行命令，不创建文件。Composer 内容、目标文件冲突等原有检查继续保留。

独立 VS Code 1.139.0 Linux x64 C3 宿主新增场景：把目标设为 PHP 7.4，预览当时合法的 `class match`；确认前改为 PHP 8.5，断言文件没有创建，并在 `finally` 恢复测试工作区原版本设置。完整 C3 宿主退出码 0，日志 `/tmp/sophp-c3-version-preview-20260925.log`。源码和测试 TypeScript、相关 ESLint、`git diff --check` 均通过。

类型生成的一次 Undo 已通过；一次 Redo 恢复文件仍未通过，故 C3 生成体验尚未完成。[资源撤销探针](c3-type-generation-undo-redo-probe-2026-09-24.md)同时排除了空插入或同文本替换作为可用的撤销锚点。
