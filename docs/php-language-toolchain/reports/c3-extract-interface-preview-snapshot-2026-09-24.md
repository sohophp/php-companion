# C3 Extract Interface 预览与源文件快照

日期：2026-09-24。

## 复现的错误

隔离 VS Code 1.139.0 宿主先请求 `Extract Interface` Code Action，再于类声明前插入一行，最后应用旧动作。旧路径的 `workspace.applyEdit` 返回 `true`，创建了接口文件，并把 `implements C3ExtractableInterface` 插进 `namespace App\\Service;` 中间，产生无效 PHP。日志：`/tmp/sophp-c3-extract-stale-shift-20260924.log`。这证明仅依赖 Code Action 中的原始版本信息不足以保护由 VS Code 转换后的 `WorkspaceEdit`。

## 改动

Language Client 对会新建文件的 PHP `refactor.extract` 动作保留原编辑计划，并改由 SoPHP 命令执行。命令在展示差异前比较源文件版本和文本、确认目标文件尚不存在；分别显示源类修改与新接口内容的固定差异标签。用户取消不应用；确认后重新核对源与目标，再提交原工作区编辑。源文件或目标在等待期间改变时拒绝旧计划。

## 验证与边界

定向 C3 宿主通过：旧动作在调用前失效、预览中源文件改变、目标接口被并发创建、取消、正常应用以及一次 Undo/Redo 均通过；还核对了源类和新接口各有一个差异标签。应用后主动聚焦源类，用户可直接执行一次 Undo/Redo；新增定向宿主断言验证这一焦点。TypeScript 类型检查和所改文件 ESLint 通过。日志：`/tmp/sophp-c3-extract-preview-race-20260924.log`、`/tmp/sophp-c3-extract-target-conflict-20260924.log`、`/tmp/sophp-c3-extract-focus-20260924.log`，宿主退出码均为 0。

完整扩展宿主的第一轮在到达 Extract Interface 前，因 `AllowDynamicProperties` 声明诊断等待失败；隔离 C3 宿主用同一 fixture 完成 Quick Fix → Undo → Redo → Undo 后，源文本和四条诊断均恢复。第二轮全量宿主通过该诊断段，却发现 Extract Interface 应用后焦点仍在差异预览，直接 Undo 不能撤销。修复焦点后，第三轮完整扩展宿主退出码 0；日志依次为 `/tmp/sophp-extension-extract-preview-20260924.log`、`/tmp/sophp-extension-dynamic-undo-diagnose-20260924.log`、`/tmp/sophp-extension-extract-focus-20260924.log`。第一轮诊断等待的偶发原因尚未定位，后两轮不能证明长时间稳定性。应用前复核与 `workspace.applyEdit` 之间仍有极短竞态窗口，真正同时发生的底层文件修改仍需继续验证。其它直接应用的重构 Code Action 未被这次修改覆盖。
