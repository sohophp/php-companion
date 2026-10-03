# C3 本地类型生成最终创建兜底收口

日期：2026-09-28。范围：当前未打包源码，Linux x64 VS Code 1.139.1 隔离 Extension Host。没有更改已安装 Profile。

上游 [`BulkFileEdits`](https://github.com/microsoft/vscode/blob/1.139.1/src/vs/workbench/contrib/bulkEdit/browser/bulkFileEdits.ts) 为 `createFile` 注册了文件撤销元素，并实现 Undo/Redo，但先前对 SoPHP 实际最终兜底的探针表明：一次普通 Undo 删除目标文件后，一次普通 Redo 未恢复文件。扩展公开 API 没有为该资源编辑指定撤销来源的入口。此前对内容、拆分编辑、窗口焦点和快捷键的试验都没有恢复结果。

本轮对 `file` URI 取消最后的 `WorkspaceEdit.createFile` 成功路径。命令先尝试系统暂存、工作区同级暂存、目标目录最近存在父目录暂存，全部通过 `WorkspaceEdit.renameFile` 移动。三次都未成功时返回 `false`、显示可操作的权限提示，不创建目标 PHP 文件。其它 URI scheme 继续原有 `createFile` 路径，因为它们没有同等的本地暂存策略；它们的标准 Redo 不计入本轮通过范围。

`PHP_COMPANION_TEST_C3_STAGE_ONLY=1 pnpm test:extension:c3` 退出码 0，日志 `/tmp/sophp-c3-undoable-only-20260928.log`。同一宿主检查三条成功移动链的一次 Undo/Redo，以及三次移动均注入拒绝后命令返回失败、未调用最终 `createFile`、目标和暂存文件均不存在。复用该次源码构建执行完整 `PHP_COMPANION_TEST_C3_ONLY=1 node scripts/run-extension-test.mjs ./dist-test/runTest.js`，退出码 0，日志 `/tmp/sophp-c3-undoable-full-20260928.log`；类型生成和其它 C3 流程继续通过。根扩展和 Extension Host TypeScript、改动文件 ESLint、`git diff --check` 均通过。由于这条变更是拒绝不可靠的最后兜底，结论是**本地生成命令不再报告一个无法可靠 Redo 的创建为成功**，不是 VS Code `createFile` Redo 缺陷已修复。

剩余边界：真实 WSL Remote、Windows/macOS、其它文件系统 scheme 和用户键盘操作尚未验收；所有移动都失败时创建能力会明确失败，用户可检查目录的写入和重命名权限后重试。既有失败探针与上游问题草稿保留作上游跟踪，不再作为本地产品成功路径运行。
