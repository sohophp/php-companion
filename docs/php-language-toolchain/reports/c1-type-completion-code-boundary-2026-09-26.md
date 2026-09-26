# C1：类名补全只在 PHP 代码位置触发

日期：2026-09-26。增量位于隔离分支 `feat/c1-interpolated-variable-completion`；冻结的 0.4.6 VSIX 不包含它。

独立 PHP 片段先复现：普通字符串中的 `new Inv` 被识别为类型补全上下文，并能触发 `Invoice` 候选。现在类型补全上下文、实际类候选和命名空间导入上下文都核对 PHP 代码位置；字符串、注释及混合文件的 HTML 文本不再进入这些路径，避免无效位置的按需候选加载。PHP 表达式中的 `new Inv` 与正常导入继续工作。

验证：新增字符串、注释与块注释里的 `use Inv` 正反例先失败后通过；`packages/semantic` 415/415、语义 TypeScript 检查、相关 ESLint 和 `git diff --check` 通过。完整 10 项 Open Source Pack 的 VS Code 1.139.1 Linux x64 C1 源码宿主退出码 0，实际补全请求检查 PHP 代码中的 Class 候选和字符串、注释中的缺席；日志为 `/tmp/sophp-c1-type-boundary-pack-20260926.log`。真实手工输入、安装候选及 WSL Remote 仍属于后续验收。
