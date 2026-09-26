# 冒号后的局部变量补全

日期：2026-09-26。范围为 SoPHP Core 源码与独立 Composer 测试项目；没有修改业务项目。

## 用户可见问题

禁用 PHP 通用单词建议后，SoPHP 负责作用域内变量补全。此前只要 `$` 紧接冒号，就提前返回空结果。因此 `consume(value:$user)` 的命名实参和 `$flag ? 'fallback' :$user` 的三元表达式都没有局部 `$username` 建议。这个判断原本用于避开 `Store::$user` 静态属性上下文。

现在只在 `$` 前确有连续的 `::` 时保持排除；单个冒号及其后的空白不再阻止作用域变量建议。变量变量的原有排除保留。

## 验证

- 语义层先用命名实参和三元表达式写出失败用例，再修复；`Store::$user` 仍不返回局部变量补全。完整 semantic 测试 408/408 通过。
- Core 重建、测试宿主 TypeScript 和相关 ESLint 通过。VS Code 1.139.1 Linux x64 隔离 Core C1 宿主在 PHP 8.5 目标设置下检查两处实际建议列表，退出码 0：`/tmp/sophp-c1-colon-variable-20260926.log`。
- 同一 C1 操作在完整 10 项 Open Source Pack 源码 Profile 中通过，退出码 0：`/tmp/sophp-c1-colon-variable-pack-20260926.log`。TwigPlus 1.3.8 从源码路径加载，外部成员使用隔离扩展目录。

这是源码组合证据；旧 `15a5254` 候选未包含修复，真实 WSL Remote 和已安装候选仍待 C4 验收。
