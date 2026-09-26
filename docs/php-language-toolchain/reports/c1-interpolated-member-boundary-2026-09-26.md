# C1：插值字符串成员补全边界

日期：2026-09-26。增量位于隔离分支 `feat/c1-interpolated-variable-completion`；已冻结的 0.4.6 VSIX 不包含此修复。

独立 PHP 片段复现：类参数 `$item` 的 `"{$item->ti}"` 和 `"plain $item->ti"` 应建议 `title`，而单引号、转义字符串、nowdoc、行注释、块注释及 HTML 中的相同文本不应给出 PHP 属性候选。原实现仅按光标前的 `->ti` 文本寻找对象，导致单引号与注释内也返回 `title` 和 `titleCase`。

语义工作区现在先核对 PHP/HTML 边界、注释范围，以及字符串范围与解析树位置；在 `string_content`、普通字符串、nowdoc、注释和 HTML 文本中停止成员解析，在真正的 PHP 代码与插值表达式中保留现有补全。改动同时阻止无效位置触发按需成员所有者加载。

验证：新增语义正反例先失败后通过；`packages/semantic` 413/413、TypeScript 类型检查、相关 ESLint 与 `git diff --check` 通过。隔离 VS Code 1.139.1 Linux x64 的 Core C1 宿主和完整 10 项 Open Source Pack C1 源码 Profile 均退出码 0；加入注释及 HTML 边界后完整组合复测日志为 `/tmp/sophp-c1-noncode-pack-20260926.log`。宿主通过 `vscode.executeCompletionItemProvider` 核对字符串与注释处的属性候选种类；HTML 正反例在语义层通过，现有完整 C1 宿主另检查 HTML 中不返回 PHP 变量和函数候选。这些证明 Provider 结果，真实 Workbench 手工输入、安装候选与 WSL Remote 仍属于后续验收。
