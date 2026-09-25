# C3 单项 echo 的 Inline Variable

日期：2026-09-25。函数块中紧邻的 `$echoed = buildLabel(); echo $echoed;` 现在可预览并内联为 `echo buildLabel();`。两条语句之间的注释保留在 `echo` 前。只有该变量恰好被声明和使用各一次、且 `echo` 只有一个表达式时才提供动作；多项 `echo first(), $value;` 仍拒绝，避免改变求值顺序。

独立语义定向测试通过；VS Code 1.139.0 C3 源码宿主完成 Code Action、预览、应用、注释保留及一次 Undo/Redo。语义包编译、扩展测试编译、相关 ESLint 和 `git diff --check` 通过。完整 C3 宿主日志 `/tmp/sophp-c3-inline-echo-20260925.log`，退出码 0。

此项与[单项 echo 的 Extract Variable](c3-extract-single-echo-crlf-2026-09-25.md)形成对应的文本编辑流程。安装候选与 WSL Remote 仍待 C4 验收；生成新文件的一次 Redo 缺口不受影响。
