# C3 类型生成文件的一次 Undo/Redo

日期：2026-09-25。范围为 SoPHP Core、独立 Composer 夹具和当前 10 项 Open Source Pack 源码组合；未修改业务项目，未打包 VSIX。

## 结果

隔离 VS Code 1.139.0 Linux x64 的最小对照确认：对预先存在于系统临时目录的 PHP 文件执行 `WorkspaceEdit.renameFile`，移入项目后打开目标，一次标准 Undo 把文件移回临时目录，一次标准 Redo 又恢复项目目标。目标父目录原本不存在时，文件移动编辑也能创建它。两次完整 C3 宿主退出码均为 0；对照日志为 `/tmp/sophp-c3-preexisting-rename-redo-probe-20260925.log` 和 `/tmp/sophp-c3-preexisting-rename-missing-parent-20260925.log`。临时对照代码已移除。

类型生成命令现优先把生成内容写入权限受限的系统临时目录，再用一个 `WorkspaceEdit.renameFile` 移入目标路径；目标已存在时仍不覆盖。移动无法使用时，回退到原来的 `WorkspaceEdit.createFile`，保持生成可用。成功移动后不删除临时目录，因为 Undo 需要把文件移回该路径，Redo 才能再次移动到项目。未成功移动时立即尝试清理对应临时文件；清理失败不阻止原路径回退。

独立 C3 源码宿主对实际生成命令验证：普通目标和缺失父目录目标都通过预览、应用、一次 Undo 删除目标、一次 Redo 恢复目标、再次 Undo 删除目标；完整宿主退出码 0，日志 `/tmp/sophp-c3-generation-redo-staged-20260925.log`。当前 10 项 Open Source Pack 源码组合的相同 C3 序列也通过，退出码 0，日志 `/tmp/sophp-c3-generation-redo-pack-10-20260925.log`。根扩展构建、测试 TypeScript、改动文件 ESLint 通过。

随后在独立宿主受控拒绝预先准备文件的移动编辑：生成命令改走原 `createFile`，仍返回 `true`，目标 PHP 文件保留正确内容；其余 C3 序列继续通过。宿主退出码 0，日志 `/tmp/sophp-c3-generation-redo-fallback-20260925.log`。此场景验证的是移动 API 返回 `false` 后的可用性，不证明回退创建路径的一次 Redo；主路径仍由上述两个宿主验证。最终根扩展和宿主 TypeScript、相关 ESLint、`git diff --check` 通过。

## 开放边界

上述成功仅证明本机 Linux 文件 URI 和隔离源码宿主。跨文件系统、虚拟文件 URI 或移动失败时走原创建路径，不能声称这些环境的一次 Redo 已通过；Windows、macOS、真实 WSL Remote 和安装候选仍须验收。Undo 缺失父目录中的文件后，VS Code 自动建立的空父目录仍留下。成功移动后，若用户 Undo 后不再 Redo，生成的模板文件暂存于权限受限的系统临时目录；后续需要确定安全的过期清理策略，不能在 Redo 仍可用时提前删除。人工界面操作也尚未验收。

2026-09-26 补证：隔离宿主的 `onDidRenameFiles` 按“临时文件→项目文件→临时文件→项目文件→临时文件”报告生成、Undo、Redo、第二次 Undo，日志 `/tmp/sophp-c3-rename-event-probe-20260925.log`，宿主退出码 0。该序列可确认文件移动归属，但**无法证明空父目录由 SoPHP 创建**：预览结束与移动之间，外部进程仍可能创建同一路径。当前不根据文件事件自动删除空目录，以免删除用户有意保留的目录。事件探针已移除。

同日将临时文件改为共用一个权限受限的扩展宿主会话目录，避免每次生成都遗留独立目录；移动被拒绝时只清理该次临时文件。独立 C3 源码宿主再次通过生成、一次 Undo/Redo、失败回退和后续完整编辑链，退出码 0，日志 `/tmp/sophp-c3-shared-stage-root-20260926.log`。根扩展和宿主 TypeScript、相关 ESLint、差异检查通过。会话目录在 Undo 仍可能需要文件时不会提前删除；跨会话安全过期清理仍待设计。

2026-09-26 目录并发补证：生成预览原本只拒绝“预览前存在、确认前消失”的目标目录。现在记录预览前的目录状态；原本不存在的目录若在预览期间被其它操作创建，也拒绝旧预览，避免按过期的目标结构写入。隔离 VS Code 1.139.0 的当前 10 项 Open Source Pack C3 源码宿主覆盖该新场景及完整生成/撤销链，退出码 0；日志 `/tmp/sophp-c3-created-parent-race-pack10-20260926.log`。根扩展与宿主 TypeScript、相关 ESLint 通过。此项不改变真实 Remote、跨平台及临时文件清理的开放边界。
