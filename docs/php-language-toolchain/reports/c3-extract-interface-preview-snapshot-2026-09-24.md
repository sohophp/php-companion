# C3 Extract Interface 预览与源文件快照

日期：2026-09-24。

## 复现的错误

隔离 VS Code 1.139.0 宿主先请求 `Extract Interface` Code Action，再于类声明前插入一行，最后应用旧动作。旧路径的 `workspace.applyEdit` 返回 `true`，创建了接口文件，并把 `implements C3ExtractableInterface` 插进 `namespace App\\Service;` 中间，产生无效 PHP。日志：`/tmp/sophp-c3-extract-stale-shift-20260924.log`。这证明仅依赖 Code Action 中的原始版本信息不足以保护由 VS Code 转换后的 `WorkspaceEdit`。

## 改动

Language Client 对会新建文件的 PHP `refactor.extract` 动作保留原编辑计划，并改由 SoPHP 命令执行。命令在展示差异前比较源文件版本和文本、确认目标文件尚不存在；分别显示源类修改与新接口内容的固定差异标签。用户取消不应用；确认后重新核对源与目标，再提交原工作区编辑。源文件或目标在等待期间改变时拒绝旧计划。

## 验证与边界

定向 C3 宿主通过：旧动作在调用前失效、预览中源文件改变、目标接口被并发创建、取消、正常应用以及一次 Undo/Redo 均通过；还核对了源类和新接口各有一个差异标签。TypeScript 类型检查和所改文件 ESLint 通过。日志：`/tmp/sophp-c3-extract-preview-race-20260924.log`、`/tmp/sophp-c3-extract-target-conflict-20260924.log`，宿主退出码均为 0。

完整扩展宿主在到达 Extract Interface 场景前，因 `AllowDynamicProperties` 声明诊断等待失败而退出；该失败与本轮 Code Action 预览尚无已证实因果关系，因此不作为全量通过证据。日志：`/tmp/sophp-extension-extract-preview-20260924.log`。应用前复核与 `workspace.applyEdit` 之间仍有极短竞态窗口，当前 VS Code 扩展 API 未在这一层提供源文件版本约束；真正同时发生的底层文件修改仍需继续验证。其它直接应用的重构 Code Action 未被这次修改覆盖。
