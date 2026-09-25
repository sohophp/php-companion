# C3 Inline Variable：普通赋值右侧

日期：2026-09-25。只修改 SoPHP 源码与独立测试夹具；未修改 Winstar 代码，未打包 VSIX。

Inline Variable 此前能把紧邻赋值的变量作为另一个赋值的**整个**右值，但拒绝 `$sum = 1 + 2; $result = $sum * 3;`。现在普通变量目标 `$result` 的右侧可以沿用返回表达式的受限最左侧规则，生成 `$result = (1 + 2) * 3;`。括号保留优先级；非短路运算的其它操作数只允许数值、布尔或 null 字面量，以免重排函数调用。

同时收紧原有整值场景：`$holder->item = $value` 等属性或下标赋值目标可能在右值前执行代码，内联会把原赋值表达式移到目标求值之后，因此不再提供此操作。仍可在普通变量赋值、整值 `return` 与已验证的安全最左侧表达式中使用。

验证：语义包 389 项测试通过，包含新赋值正例及属性目标反例；语义 TypeScript、改动文件 ESLint、扩展测试 TypeScript 和差异检查通过。隔离 VS Code 1.139.0 C3 源码宿主通过真实 Code Action 的应用、一次 Undo/Redo 与完整 C3 序列，退出码 0，日志 `/tmp/sophp-c3-inline-assignment-20260925.log`。已安装候选、WSL Remote 和新文件生成 Redo 仍未由此验收。
