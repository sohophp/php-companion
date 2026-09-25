# C3 单项 echo 的 Extract Variable 与 CRLF

日期：2026-09-25。Extract Variable 现接受函数块内完整选择的单项 `echo buildLabel();` 表达式，生成 `$extracted = buildLabel(); echo $extracted;`。多项 `echo first(), second();` 仍拒绝，以免改变求值顺序；条件语句中的非块级内联 `echo`、部分表达式和有语法错误的选择也不自动编辑。

同一改动让生成的变量声明沿用源文件的 CRLF 或 LF 换行。独立语义定向测试覆盖单项正例和多项反例；VS Code 1.139.0 C3 源码宿主对 CRLF 文件完成 Code Action、预览、应用、一次 Undo/Redo，并检查没有插入孤立 LF。`pnpm build`、测试套件编译、相关 ESLint 与 `git diff --check` 通过；完整 C3 宿主日志 `/tmp/sophp-c3-extract-echo-crlf-20260925.log`，退出码 0。

本项扩大一个常用且可证明安全的 Extract Variable 场景。安装候选与 WSL Remote 仍待 C4 验收；生成新文件的一次 Redo 缺口不受此文本编辑改动影响。
