# C3 类型生成文件撤销/重做探针

日期：2026-09-24。环境：隔离的 VS Code 1.139.0 Linux x64 Extension Host，独立临时 Composer 项目。此探针只检查 VS Code `WorkspaceEdit.createFile` 的资源撤销行为；没有修改业务项目或发布候选。

## 最小重现

在 C3 宿主套件中，以 `WorkspaceEdit.createFile(uri, { contents })` 创建一个 PHP 文件，随后打开该文件，依次执行 VS Code 的 `undo` 和 `redo` 命令。`undo` 删除了文件；`redo` 返回后轮询约 2.5 秒，文件仍不存在。关闭生成预览、把结果标签固定为非临时标签、改为创建后文本插入、以及撤销后聚焦文件资源管理器，均未让同一次 `redo` 恢复文件。日志分别见 `/tmp/sophp-c3-resource-probe-20260924.log`、`/tmp/sophp-c3-resource-focus-20260924.log` 与本轮此前的生成实验日志。

作为对照，若创建后**不打开**新文件，当前其它编辑器中的一次 `undo` 没有删除该文件。由此推测命令作用于当前编辑器的撤销栈；创建文件的撤销关闭了该编辑器，随后 `redo` 无法再到达同一栈。这只是对宿主观察的解释，尚未证明 VS Code 所有版本和真实键盘操作都如此。

## 对实现的影响

后续源码已恢复类型生成预览：可以取消、应用，并用一次 Undo 删除文件；但一次 Redo 的 C3 门槛仍失败。当前 `src/generation/createType.ts` 使用 `WorkspaceEdit.createFile` 创建文件，并在应用后打开新文件。不能把类型生成标记为满足 C3；已安装的 0.4.5 候选也不能代表当前源码实现。

下一步应在独立宿主中找到可被标准 Undo/Redo 成对访问的文件创建交互，或明确把这项限制反馈到生成工作流设计。通过前，优先推进其它已具备完整撤销链的 C3 高频重构，不扩大未验证的生成实现。

2026-09-25 补充：[资源管理器优先及注入键盘事件对照](c3-generation-redo-phpunit-rename-2026-09-25.md)仍得到 Undo 删除、Redo 未恢复。此前“可能只是聚焦问题”的解释没有获得这组宿主证据支持，根因继续开放。

2026-09-25 多次 Redo 对照：VS Code 曾有[文件夹创建撤销后需要两次 Redo 的历史议题](https://github.com/microsoft/vscode/issues/111692)，因此在独立 C3 宿主增加受 `PHP_COMPANION_TEST_C3_REDO_PROBE=1` 控制的探针。对同一生成文件执行一次 Undo 后，连续第 1、2、3 次 Redo 均未恢复文件；完整宿主退出码 0，日志 `/tmp/sophp-c3-multi-redo-20260925.log`。这排除了“当前只是多按一次 Redo”作为解决办法；不证明其它 VS Code 版本也如此。产品生成命令未因该探针更改，Redo 门槛继续开放。

2026-09-25 同一宿主中的编辑锚点对照：Extract Interface 的一次 Undo/Redo 会恢复新文件，因为其工作区编辑同时修改已有源文件。临时探针尝试把资源创建与已有源文件上的空字符串插入、以及相同文本替换放进同一个 `WorkspaceEdit`，然后聚焦源编辑器执行标准 Undo/Redo。两种情况下 Undo 都**没有删除新文件**，Redo 后文件仍在，不能当作成功的撤销/重做链；对照日志 `/tmp/sophp-c3-linked-redo-probe-20260925.log` 与 `/tmp/sophp-c3-identical-redo-probe-20260925.log`，宿主均退出码 0。无效的临时探针已从测试源码移除，生成实现保持不变。下一步不向用户源码写入无意义文本来制造撤销锚点；继续调查编辑器资源操作的真实 Undo/Redo 路径，同时推进其它 C3 操作。

2026-09-25 同事务创建与插入对照：临时探针在一个 `WorkspaceEdit` 中先 `createFile` 空文件，再向新文件插入 PHP 内容，随后打开文件执行标准 Undo/Redo。Undo 删除了文件，Redo 后文件仍不存在；日志 `/tmp/sophp-c3-create-insert-redo-20260925.log`，宿主退出码 0。该探针已从测试源码移除，产品实现保持 `createFile({ contents })`，因为两种写法在本环境都没有通过一次 Redo 门槛。

2026-09-25 源码核对：VS Code 的 [`BulkFileEdits`](https://github.com/microsoft/vscode/blob/main/src/vs/workbench/contrib/bulkEdit/browser/bulkFileEdits.ts) 会把文件创建的反向操作放入工作区撤销元素，元素本身同时实现 `undo()` 和 `redo()`；撤销创建时，删除操作还会准备反向创建操作。由此只能推断本宿主的问题可能出在命令所选撤销栈或编辑器关闭后的重做路由，不能认定 VS Code 没有资源 Redo 实现。下一步应针对命令路由做最小、可观察的资源栈探针，而非继续改变创建内容或重复聚焦试验。

2026-09-25 URI 路由探针：在相同隔离 C3 宿主内，标准 `redo` 连续三次没有恢复文件；随后 `vscode.commands.executeCommand('redo', generatedUri)` 也没有恢复。完整 C3 宿主退出码 0，日志 `/tmp/sophp-c3-redo-uri-probe-20260925.log`。该公开命令传参方式未解决资源栈选择问题，临时探针已移除。VS Code 内部 `UndoRedoService.redo(resource)` 不能据此等同于公开命令接受 URI；下一步继续检查标准用户交互与资源栈保留条件，不能在 SoPHP 中调用未公开的内部服务。

2026-09-25 删除后重开文档探针：在一次 Undo 删除生成文件后，尝试用仍在内存中的 `TextDocument` 再次 `showTextDocument`，VS Code 返回“file was not found / Could NOT open editor”；随后三次标准 `redo` 均未恢复文件。`PHP_COMPANION_TEST_C3_REDO_PROBE=1 pnpm test:extension:c3` 的完整隔离宿主退出码 0，日志 `/tmp/sophp-c3-deleted-document-reopen-redo-20260925.log`。这排除了“先把已删除的同一文档重新显示，再从编辑器访问其 Redo 栈”作为当前可用路径；临时探针已移除。VS Code 官方[文件资源撤销测试计划](https://github.com/microsoft/vscode/issues/111015)把编辑器与资源管理器的焦点行为分开，而源码中的[文件撤销元素](https://github.com/microsoft/vscode/blob/main/src/vs/workbench/contrib/bulkEdit/browser/bulkFileEdits.ts)确实有 `redo()` 实现；本轮仍没有证明可由公开命令稳定到达该元素。后续若继续探索，应以新的可观察路由假设为前提，不再重复内容格式、聚焦或连续 Redo 的相同对照。

2026-09-25 命令清单探针：对 VS Code 1.139.0 的同一隔离宿主调用公开 `vscode.commands.getCommands(true)`，匹配 Undo/Redo 的已注册命令仅见通用 `undo`、`redo`、`default:undo`、`default:redo`、光标历史命令，以及 Chat/Git 等专用命令；没有文件资源专用的公开重做命令。同次生成文件的一次 Undo 成功删除文件，连续三次通用 Redo 均未恢复。C3 宿主退出码 0，日志 `/tmp/sophp-c3-redo-command-enumeration-20260925.log`。这只限定当前宿主可见的命令，不排除 VS Code 内部资源重做实现；临时枚举代码已移除。

2026-09-25 关闭自动关标签探针：根据 VS Code 的 [`workbench.editor.closeOnFileDelete` 设置用例](https://github.com/microsoft/vscode/issues/23350)，在隔离临时 Composer 工作区把该值设为 `false`，再运行原有生成文件 Undo/Redo 探针。VS Code 1.139.0 中一次 Undo 仍删除文件，连续第 1、2、3 次标准 Redo 均未恢复；C3 宿主其余操作通过且退出码 0，日志 `/tmp/sophp-c3-close-on-delete-probe-20260925.log`。临时设置注入代码已移除，产品与 Pack 默认设置未改。这排除了仅靠保留被删除文件编辑器标签解决当前 Redo 缺口；C3 类型生成仍未达到一次 Undo/Redo 门槛。

2026-09-25 缺失父目录探针与产品收紧：最小隔离宿主直接用 `WorkspaceEdit.createFile` 在不存在的父目录下创建文件，返回 `true`，文件和父目录都出现；其后将 `createPhpType` 中独立执行的 `workspace.fs.createDirectory` 移除，使预览确认前不会先建目录，文件及父目录统一由 VS Code 的资源编辑创建。新增真实生成命令的 C3 宿主场景验证预览期间目录仍不存在、确认后缺失父目录下的 PSR-4 类文件正确生成；完整独立 C3 宿主、根 TypeScript、相关 ESLint 与差异检查通过。临时最小探针已移除。这缩小了应用前的独立文件系统副作用，**没有解决**一次 Redo 无法恢复生成文件，也未证明 Undo 会删除自动创建的父目录。

2026-09-25 缺失的带点号 PSR-4 根目录：`directoryFromTarget` 原先用任意扩展名推断不存在的目标是文件，会把 `src/Future.With.Dot/` 当成文件路径，生成到其上一级。已有目标由文件系统类型判定；仅对不存在的目标，现只将 `.php` 后缀视为待生成文件路径，其它路径按目录处理。独立 C3 宿主在 Composer 映射 `App\\FutureDotted\\ → src/Future.With.Dot/` 且该目录不存在时，验证新类在该目录下生成并带正确命名空间；已有带点号目录及现存文件目标场景也继续通过。TypeScript、相关 ESLint、差异检查和完整 C3 宿主退出码 0。其它不存在的非 PHP 文件 URI 仍可能有目录/文件意图歧义；当前命令主要接收已存在的资源管理器目标或明确的 PHP 文件目标。Redo 缺口不因此关闭。

2026-09-25 同事务临时文件重命名探针：在一个 `WorkspaceEdit` 中先创建隐藏临时 PHP 文件，再把它重命名为目标文件；编辑应用成功，目标存在、临时文件不存在。但打开目标后执行标准 `undo`，目标仍存在，接着执行 `redo` 也没有形成可观察的恢复链。独立 C3 宿主退出码 0，日志 `/tmp/sophp-c3-create-rename-redo-probe-20260925.log`。这个结果不能作为类型生成的撤销方案；临时探针已从测试源码移除，产品仍使用直接创建文件。独立预先创建临时文件再移动会在 Undo 后留下临时资源，尚无证据能同时满足无残留与一次标准 Undo/Redo，故不移入产品。

2026-09-25 缺失父目录的 Undo 复核：独立 Composer 夹具在不存在的 `src/Service/C3NewDirectory/` 下经预览创建类文件，标准 Undo 确实删除该 PHP 文件，但 VS Code 自动创建的空父目录仍存在。隔离 C3 源码宿主两轮退出码 0；记录 `/tmp/sophp-c3-missing-parent-undo-20260925.log`。第二轮临时监听 `workspace.onDidDeleteFiles`，该事件确实包含被撤销的文件，父目录仍在；记录 `/tmp/sophp-c3-missing-parent-event-20260925.log`。监听并不能区分 Undo 与用户手动删除，因此没有在产品中加入“见到文件删除就清空目录”的行为，以免移除用户想保留的空目录。宿主回归现在检查 Undo 删除了文件，并记录父目录状态；试验监听已移除。该结果增加了 C3 生成流程的已知限制，不能据此关闭 Redo 阻断项。
