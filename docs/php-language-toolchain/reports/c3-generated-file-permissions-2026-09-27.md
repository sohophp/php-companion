# C3 生成文件遵循项目运行环境的 umask

日期：2026-09-27。只修改 SoPHP 隔离源码和测试；未修改业务项目或打包 VSIX。

类型生成的三条本地暂存移动路径共用 `moveStagedFile`。此前暂存文件固定以 `0600` 创建，资源移动会把权限带到最终 `.php` 文件。独立同文件系统对照在本环境得到：暂存移动后的生成文件 `0600`，普通新文件在 umask `0002` 下为 `0664`。这会让与编辑器不在同一 Unix 用户下运行的 PHP 进程无法读取新类。

暂存文件现在以 `0666` 请求创建，实际权限由进程 umask 收紧；仍使用独占 `wx` 防止覆盖。完整 10 项 Open Source Pack 的 VS Code 1.139.1 Linux x64 源码 C3 定向宿主断言：前两次移动失败后的目标目录移动经 Undo/Redo 恢复，最终 PHP 文件权限等于 `0666 & ~process.umask()`；最终 `createFile` 兜底及暂存清理断言仍通过。宿主退出码 0，日志 `/tmp/sophp-c3-generated-permissions-pack10-20260927.log`。根扩展与测试入口 TypeScript、相关 ESLint、差异检查通过。

该结果只覆盖本机文件系统和当前 umask。Windows、WSL Remote 上的项目用户/服务用户权限、ACL、已存在目录的默认 ACL 与其它文件系统尚未单独验收。最终 `createFile` 兜底 Redo 和偶发 VS Code `Canceled` 仍开放。
