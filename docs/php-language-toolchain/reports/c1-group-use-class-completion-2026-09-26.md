# C1 手写组导入中的类补全

日期：2026-09-26。仅修改 SoPHP 源码和独立 Composer/VS Code 夹具；未修改业务项目，未重新打包 VSIX。

`use Domain\\Billing\\{Inv}` 原先没有类补全上下文。现在组导入中的普通类成员复用限定命名空间候选，只建议 `Domain\\Billing` 下的类，不插入第二条 `use`；`use function`、`use const` 的成员以及类体中的 trait `use` 不走此类补全。组内已有前一成员时，完成后一成员仍保留前一成员和花括号。

首次 VS Code 宿主揭示仅返回类候选还不够：编辑器另有针对整个 `{Inv}` 的 Module 建议，默认接受时会删掉花括号而不补齐类名。尝试只替换类名、调整排序和预选均未解决。最终补全项明确以完整 `{...}` 为替换范围，生成保留已有成员的结果文本；匹配文本使用当前完整组内容。隔离宿主实际执行 `editor.action.triggerSuggest` 和 `acceptSelectedSuggestion`，单成员与已有前一成员的两种 `use` 行均得到准确结果。诊断用的设置覆盖和候选日志已移除。

语义包完整回归 350/350 通过；真实 stdio LSP 的独立 PSR-4 项目在默认 `onDemand` 下验证未打开类的候选、无额外导入，以及单成员和后续成员的完整文本编辑范围；定向用例 1/1 通过。VS Code 1.139.1 Linux x64 的 Core 源码宿主以明确 PHP 8.5 目标运行完整 C1 链，退出码 0，日志 `/tmp/sophp-c1-group-import-two-members-20260926.log`。相关 TypeScript、ESLint 和差异检查通过。

尚未覆盖只输入 `use Dom` 时的命名空间建议、真实 WSL Remote 人工键盘操作和长时间会话。本次增量未进入冻结候选 `15a5254`。
