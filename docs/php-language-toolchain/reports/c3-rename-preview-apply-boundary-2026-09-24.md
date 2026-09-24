# C3 Rename 预览后应用边界

日期：2026-09-24。此前 Core 与 Symfony Rename 已在 Provider 返回 `WorkspaceEdit` 前验证打开文档版本和关闭目标文件的源码摘要。本轮检查返回之后仍可能发生什么。

在隔离 VS Code 1.139.0 Extension Host 的临时文本文件中，先生成把第 1 行 `alpha` 替换为 `omega` 的 `WorkspaceEdit`，再把磁盘内容从 `alpha\nbeta\n` 改成 `new\nalpha\nbeta\n`，最后调用 `workspace.applyEdit`。调用返回 `true`；打开的编辑缓冲区变成 `omega\nalpha\nbeta\n`，即旧范围改写了后来新增的首行。磁盘当时仍为 `new\nalpha\nbeta\n`，说明破坏先进入未保存缓冲区。探针代码已撤回，`/tmp/sophp-c3-stale-apply-probe.log` 保留观察输出；该轮宿主后续在导入请求暂停释放处失败，因此不计作完整 C3 套件通过。撤回探针后，定向 C3 宿主重新以退出码 0 结束（`/tmp/sophp-c3-post-probe.log`）。

这证明直接应用旧 `WorkspaceEdit` 不能作为安全兜底；它**没有**证明 VS Code 原生 Rename 预览面板的 Apply 也采取相同路径。扩展公开 `RenameProvider` 契约只返回编辑计划，未提供预览面板点击 Apply 时的复核回调。要满足 C3 的完整预览确认门槛，下一步应优先实现 SoPHP 自己控制“取计划 → 展示差异 → 再验全部参与文件 → 应用/取消”的 PHP Rename 命令，并在隔离宿主验证中途修改、正常应用、Undo/Redo 和 PSR-4 文件改名；随后再决定如何与用户熟悉的 F2 入口衔接。不能把请求返回前的快照保护记作预览后应用通过。

未生成 VSIX，也未修改业务项目。
