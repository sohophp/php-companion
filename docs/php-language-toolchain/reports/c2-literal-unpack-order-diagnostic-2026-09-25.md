# C2 字面量展开的参数顺序诊断

日期：2026-09-25。PHP 8.1 与 8.5 CLI 均确认 `configure(...['port' => 80, 'local'])` 在命名键之后出现位置元素时抛出 `Cannot use positional argument after named argument during unpacking`。此前 SoPHP 已保守撤回该表达式后续的参数提示，但没有定位错误元素。

语义层现在复用完整字面量展开扫描，精确标出 `'local'` 的源码范围，并沿用 `php.argument.positional-after-named` 错误诊断。动态键、显式数字键、嵌套展开与未完成数组仍保持未知，不据此制造确定诊断。该规则最低适用 PHP 8.1；真实 stdio 回归分别证明 PHP 8.0 不发布此代码、PHP 8.1 发布一次且位置正确。把数组改成 `...['local', 'port' => 80]` 后，诊断消失。

验证：语义包 391/391；定向真实 stdio 原有命名参数回归 1/1、版本门禁 2/2；VS Code 1.139.0 隔离 C2 源码宿主退出码 0，观察到诊断指向错误元素，并在未保存修正后撤回，日志 `/tmp/sophp-c2-literal-unpack-order-20260925.log`。相关 TypeScript、ESLint 和 `git diff --check` 通过。没有修改业务项目或打包 VSIX。

这是当前源码的 C2 反馈修复；已冻结 0.4.5 私有候选不含此改动。完整 Pack 安装、WSL Remote、跨平台与长会话仍在 C4 门槛。
