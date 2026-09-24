# C3 Rename 预览关闭保护

日期：2026-09-24 至 25。对象是独立 Composer 夹具中的 SoPHP Safe Rename。

之前用户关闭差异标签后，确认通知仍可返回“应用”。Rename 现在在确认后检查所有差异标签是否仍然打开；关闭任意一组即拒绝整个旧计划。超过 3 个文件时使用 VS Code 的 `vscode.changes`，它没有固定标签选项；每组打开后执行 VS Code 的“保持打开”命令，确保下一组不会替换前一组。

隔离 VS Code 1.139.0 Linux Extension Host 验证单文件关闭预览后拒绝应用、22 文件拆成两组且两组固定、关闭其中一组后拒绝应用、正常应用和 Undo/Redo；`/tmp/sophp-c3-closed-group-preview.log` 退出码为 0。完整 11 项 Open Source Pack 的同一 C3 门禁也通过；`/tmp/sophp-c3-pack-closed-group-preview.log` 退出码为 0。此前一次 Pack 复测在原有动态属性 Quick Fix 断言处失败，未见 Rename 断言失败，随后同配置复跑通过。

类型生成文件的标准 Redo 仍未通过，Change Signature 也只覆盖已有的私有参数子集；这次结果不关闭 C3。没有修改业务项目或生成 VSIX。
