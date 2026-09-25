# C3 Inline Variable：返回表达式最左侧使用

日期：2026-09-25。只修改 SoPHP 源码与独立测试夹具；未修改 Winstar 代码，未重新打包 VSIX。

此前 Inline Variable 只接受变量占据整个返回值或赋值右侧的情况。紧邻的 `$value = build(); return $value ?? fallback();` 会被拒绝，即使变量仅使用一次且中间没有可执行语句。

现在允许变量位于 `return` 的二元表达式最左侧。内联时给原赋值表达式加括号：`$sum = 1 + 2; return $sum * 3;` 生成 `return (1 + 2) * 3;`，保留优先级；`return ($value ?? fallback());` 生成 `return ((build()) ?? fallback());`。非短路运算的右操作数只接受数值、布尔或 null 字面量；`$early * anotherEffect()` 等求值顺序不确定的调用继续拒绝。声明后到返回前仍不能有可执行语句，变量仍须在同一作用域恰好出现两次；变量处于右操作数（例如 `anotherEffect() + $value`）也继续拒绝。引用赋值、嵌套赋值及尾随声明注释仍由既有安全检查拒绝。

验证：语义包 389 项测试通过，包含上述正反例；语义 TypeScript、改动文件 ESLint、`git diff --check` 通过。隔离 VS Code 1.139.0 C3 源码宿主通过真实 Code Action 的预览应用与一次 Undo/Redo，完整 C3 序列退出码 0；在收紧右操作数条件后的复测日志为 `/tmp/sophp-c3-inline-leftmost-restricted-20260925.log`。此证据不覆盖已安装旧 0.4.5、WSL Remote 或长时间人工编辑。生成新文件的一次标准 Redo 仍是独立开放项。
