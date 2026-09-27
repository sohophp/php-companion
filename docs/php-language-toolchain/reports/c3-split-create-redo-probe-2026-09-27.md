# C3：最终创建兜底的分步编辑 Redo 探针

日期：2026-09-27。只在 SoPHP 隔离测试夹具增加可选探针；没有修改 Winstar 或产品的类型生成流程。

已知 `WorkspaceEdit.createFile(uri, { contents })` 的最终兜底路径在 VS Code 1.139.1 Linux x64 中一次 Undo 后 Redo 不恢复文件。本次尝试在**同一个** `WorkspaceEdit` 中先 `createFile(uri)`、再 `insert(uri, position, source)`，仍记录 `C3 split createFile Redo: restored=false`，断言失败、宿主退出码 1。日志 `/tmp/sophp-c3-split-create-redo-probe-20260927.log`。通过 `PHP_COMPANION_TEST_C3_SPLIT_CREATE_REDO_PROBE=1 PHP_COMPANION_TEST_C3_STAGE_ONLY=1` 可重跑该预期失败探针；默认 C3 门禁不启用。

结果排除了“只需去掉 `contents` 参数”的修复假设。三种可用暂存文件移动路径在 0.4.9 打包 C3 宿主中通过一次 Undo/Redo；所有移动均被拒绝时，最终 `createFile` 路径仍能创建正确文件，但 Redo 缺口保持开放。下一次应调查 VS Code 资源编辑的撤销栈或跨平台表现，再决定可证明安全的替代流程。

后续审查了 [VS Code 1.139.1 的资源文件编辑实现](https://github.com/microsoft/vscode/blob/1.139.1/src/vs/workbench/contrib/bulkEdit/browser/bulkFileEdits.ts)：创建编辑与删除编辑会生成相反操作供 Undo/Redo 使用。源码本身不足以解释上述宿主失败，也没有证明另一种安全的公开编辑操作；本轮没有改变产品生成路径，继续保留最终兜底 Redo 门槛。
