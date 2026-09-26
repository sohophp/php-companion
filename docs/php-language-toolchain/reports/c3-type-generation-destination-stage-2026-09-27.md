# C3 类型生成的目标目录备用移动

日期：2026-09-27。仅修改 SoPHP 隔离源码和独立 VS Code 测试夹具；没有修改业务项目或打包 VSIX。

类型生成原先依次从系统临时目录、工作区同级目录移动预备文件。两次移动都失败后直接使用 `WorkspaceEdit.createFile`；VS Code 1.139.1 的一次标准 Undo 会删除文件，但 Redo 不恢复。现在对 `file` 工作区再尝试将隐藏的 `.sophp-type-stage-*.tmp` 写在目标目录，以资源移动编辑把它改名为最终 `.php` 文件。目标目录可能可写，即使工作区同级目录不可写；`.tmp` 后缀避免把暂存内容作为 PHP 源码索引。只有三次移动均未完成，才进入原有创建兜底。

完整 10 项 Open Source Pack 的隔离 VS Code 1.139.1 Linux x64 源码宿主中，测试强制前两次移动返回失败，第三次目标目录移动成功。Undo 删除目标并恢复隐藏 `.tmp`，Redo 恢复目标并移走 `.tmp`；宿主断言无残留暂存文件。它又强制三次移动全失败，确认暂存源清理及最终创建结果核对仍工作。定向宿主退出码 0，日志 `/tmp/sophp-c3-destination-stage-pack10-20260927.log`。包含其它 Rename、Safe Move、Extract、参数编辑与 Symfony 链的**完整 C3 Pack 宿主**也退出码 0，日志 `/tmp/sophp-c3-destination-stage-full-pack10-20260927.log`。根扩展、Symfony 与测试入口 TypeScript、改动文件 ESLint、`git diff --check` 通过。

最终 `createFile` 的预期失败探针仍在三次移动被拒绝后执行，记录 `C3 createFile fallback Redo: restored=false`，退出码 1，日志 `/tmp/sophp-c3-final-create-redo-probe-after-destination-stage-20260927.log`。该路径仍会用于目录不可写、非 `file` scheme 或资源移动被拒绝的情况，Redo 缺口没有关闭。第三次移动成功后若用户执行 Undo 而不执行 Redo，隐藏 `.tmp` 会留在项目目录以供 Redo；不能自动删除而破坏撤销栈。真实 WSL Remote、其它平台和长期文件事件交错仍需单独验收。

后续发现移动保留了旧暂存文件的 `0600` 权限；[生成文件权限修复](c3-generated-file-permissions-2026-09-27.md)已让最终文件遵循进程 umask，并在同一目标目录移动的 Undo/Redo 后完成宿主断言。
