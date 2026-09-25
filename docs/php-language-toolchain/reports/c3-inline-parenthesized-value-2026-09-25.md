# C3 Inline Variable：带括号的整值使用

日期：2026-09-25。SoPHP Core 源码与独立隔离 VS Code 1.139.0 Linux 宿主；未修改业务项目，未打包 VSIX。

此前 Inline Variable 只接受下一条语句直接 `return $value;` 或 `$target = $value;`。`return (($value));` 和 `$target = ($value);` 虽然仍是唯一整值使用，却不显示动作。语义层现在只逐层剥开无错误、恰有一个命名子节点的括号表达式，并替换内部变量；原有括号、注释、声明整行删除范围与其它安全门禁保持原样。`return ($value ?? fallback());` 仍拒绝，因为变量只是复杂表达式的一部分。

定向语义测试覆盖多层括号的 return、赋值右侧括号、复杂表达式拒绝以及原有注释/副作用反例，通过 1 项。语义包和语言服务器 TypeScript 构建、改动文件 ESLint、根扩展 bundle 构建及差异检查通过。隔离 VS Code C3 源码宿主把真实 Inline Variable 夹具改为 `return (($result));`，完成预览、取消、应用、一次 Undo/Redo，最终进程退出码 0。此证据不等于已安装 VSIX、Remote 或人工操作验收。
