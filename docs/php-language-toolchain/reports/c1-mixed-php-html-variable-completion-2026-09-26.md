# C1：混合 PHP/HTML 文件的变量补全边界

日期：2026-09-26。增量位于隔离分支 `feat/c1-interpolated-variable-completion`，没有进入 0.4.6 冻结候选。

在含 PHP 关闭标签的文件中，SoPHP 原本会把 HTML 文本中的 `$G` 当作 PHP 变量位置，返回 `$GLOBALS` 或同文件的 `$globalName`。这种建议来自语义工作区的顶层作用域，与实际 HTML 位置不符。

现在只对可能含 HTML 的文件查看解析树：光标位于 `text` 节点时不返回 SoPHP 变量候选；回到 `<?php ... ?>` 内仍可建议已声明变量。常规完整 PHP 文件无需为这项检查额外解析语法树，已打开的混合文件复用保留的解析树。

进一步的真实 Workbench 弹窗检查发现，VS Code 仍会把同文件的 `$G`、`$globalName` 作为 `Text` 类单词候选显示出来；此前 Core 和 Pack 仅设 `editor.wordBasedSuggestions: off` 未挡住该可见结果。在隔离 Profile 中验证 `editor.suggest.showWords: false` 能移除它且保留 SoPHP 的成员与类型建议后，Core 和 Pack 都将此设置纳入仅针对 `[php]` 的默认值。

验证：正反例先失败后通过；`packages/semantic` 完整测试 411/411、主扩展 TypeScript 检查、相关 ESLint 和 Pack manifest 测试 4/4 通过。隔离 VS Code 1.139.1 Linux x64、显式 PHP 8.5 的 C1 Core 宿主退出码 0，日志 `/tmp/sophp-c1-mixed-html-host-owned-20260926.log`。宿主测试核对 HTML 位置没有 SoPHP `Variable` 类建议，返回 PHP 后重新出现。产品默认设置下的 Workbench 可见弹窗及原有 C1 可见候选链也退出码 0，日志 `/tmp/sophp-c1-mixed-html-default-visible-20260926.log`。完整 10 项 Open Source Pack 源码 Profile 在加入默认配置断言后同样退出码 0，日志 `/tmp/sophp-c1-mixed-html-pack-source-default-20260926.log`。

`vscode.executeCompletionItemProvider` 仍可能返回同名 `Text` 类候选，因为该命令汇总提供者结果；现已额外直接检查 Workbench 建议弹窗，确认 PHP 默认配置下 HTML 位置不再显示它。人工真实 WSL Remote 长会话仍属于 C4 验收。
