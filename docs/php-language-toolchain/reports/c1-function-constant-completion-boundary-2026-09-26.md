# C1：函数与常量建议的 PHP 表达式边界

日期：2026-09-26。增量位于隔离分支 `feat/c1-interpolated-variable-completion`；冻结的 0.4.6 VSIX 不包含它。

独立 PHP 片段先复现：`customH` 在普通单引号字符串内仍建议 `customHelper`。函数和全局常量补全都按光标前的文字前缀查候选，未检查当前位置是否属于普通 PHP 表达式。现在两条候选路径都在注释、字符串和 PHP/HTML 混合文件的 HTML 文本中停止；普通 PHP 代码中的函数与常量建议保留。Symfony 路由名、服务 ID 等有专门上下文的字符串补全不使用这项普通表达式过滤。

验证：新增函数与常量正反例先失败后通过；`packages/semantic` 414/414、语义 TypeScript 检查、相关 ESLint 和 `git diff --check` 通过。隔离 VS Code 1.139.1 Linux x64 的完整 10 项 Open Source Pack C1 源码 Profile 退出码 0；日志为 `/tmp/sophp-c1-expression-pack-20260926.log`。宿主通过实际补全请求检查 PHP 代码中的 Function/Constant 候选，以及字符串和注释中的缺席。真实手工输入、已安装候选和 WSL Remote 仍属后续验收。
