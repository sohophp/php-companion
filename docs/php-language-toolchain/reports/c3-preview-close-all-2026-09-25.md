# C3 重构预览关闭保护

日期：2026-09-25。对象是独立临时 Composer 项目的 Extract、Safe Move 和 Optimize Imports。

此前这三个命令在差异标签被关闭后，仍可能接受通知中的“应用”。现在它们在确认后核对本次操作的所有预览标签；关闭任意标签就取消应用并提示重新执行。Optimize Imports 的结果改用只读 PHP 快照，确认结束后关闭差异标签并清理快照；已有文件编辑、取消及 Undo/Redo 流程继续使用原来的计划。

验证：根扩展和扩展测试 TypeScript 检查、所改文件 ESLint 通过。VS Code 1.139.0 Linux 隔离 C3 宿主新增三条“关闭预览后点击应用”负例，均未修改源文件或创建/移动目标；退出码 0，日志 `/tmp/sophp-c3-preview-close-all.log`。完整 11 项 Open Source Pack 的 C3 宿主退出码 0，日志 `/tmp/sophp-c3-pack-all-preview-close.log`。原有完整扩展宿主回归退出码 0，日志 `/tmp/sophp-full-preview-close-all.log`，包含正常 Optimize Imports 预览、应用及 Undo/Redo。

这仍是源码 Profile 的自动证据；真实 VS Code 通知点击、WSL Remote 和已安装 VSIX 候选须另行验收。类型生成文件的 Redo 与完整 Change Signature 仍是 C3 开放项。没有修改业务项目或打包 VSIX。
