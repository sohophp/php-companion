# C3 单条 echo 的 Extract Method

日期：2026-09-25。类方法中完整选中单条 `echo $message;` 时，Extract Method 现在生成接收 `$message` 的私有方法，并在原位置调用它。仅接受一个 echo 表达式和单条选中语句；已证明的按值输入才进入参数列表。多表达式 echo、跨多条语句混合提取及无法证明的输入保持拒绝。

语义定向测试覆盖直接 `string $message` 正例和多表达式反例。VS Code 1.139.0 C3 源码宿主完成 Code Action、预览、应用、输入参数保留和一次 Undo/Redo；日志 `/tmp/sophp-c3-extract-method-echo-20260925.log`，退出码 0。语义包与扩展测试编译通过，相关 ESLint 与差异检查通过。

此项扩大了 C3 的常用 Extract Method 支持范围。它不关闭多输出、控制流提取或生成新文件的 Redo 缺口；安装候选及 WSL Remote 仍按 C4 验收。
