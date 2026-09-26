# C1：插值字符串中的作用域变量补全

日期：2026-09-26。实现位于隔离分支 `feat/c1-interpolated-variable-completion`；0.4.6 冻结候选 `f394e41f` 不包含此增量。

Open Source Pack 关闭 PHP 通用单词建议后，SoPHP 独占 PHP 变量补全。原实现把所有字符串位置都排除，因此 `echo "Hello $user"`、`echo "Hello {$user}"` 和 heredoc 中无法建议当前作用域的 `$username`。

修复仅在语法树确认光标所在 token 是插值字符串、heredoc 或 shell 字符串中的 `variable_name` 时使用现有作用域候选。单引号、nowdoc、转义的 `$` 和注释仍不提供变量建议；光标位于名称中间时替换整个变量 token，不吞掉花括号。

验证：

- 新增语义正反例先失败后通过；`packages/semantic` 完整测试退出码 0。
- TypeScript 主扩展检查、三处变更文件的 ESLint 与 `git diff --check` 通过。
- 隔离 VS Code 1.139.1 Linux x64 Core C1 源码宿主在显式 PHP 8.5 和 7.2 目标下均退出码 0。测试从 `vscode.executeCompletionItemProvider` 取得 `$username`，核对替换范围，实际应用后保持 `{$username}`，并确认单引号与转义 `$` 不返回该候选。两次宿主日志分别是 `/tmp/sophp-c1-interpolation-host-85-20260926.log` 与 `/tmp/sophp-c1-interpolation-host-72-20260926.log`。

未指定目标版本的首轮 C1 宿主在后续 PHP 7.2 版本诊断断言失败：用例默认预期 7.2，实际没有得到所预期的三项 SoPHP 版本诊断。显式 7.2 与 8.5 均通过；该默认环境差异单独保留，不用本次插值补全结论覆盖。该源码改动还没有进入已打包 VSIX，真实 WSL Remote 与人工输入体验仍待 C4。
