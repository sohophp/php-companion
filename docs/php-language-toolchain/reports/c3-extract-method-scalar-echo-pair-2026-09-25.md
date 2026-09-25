# C3 多表达式 echo 的安全 Extract Method

日期：2026-09-25。类方法中选中完整的 `echo $first, $second;`，且每个输出项都是有原生标量类型的直接参数变量时，SoPHP 现在可生成接收这两个参数的私有方法。调用处的参数顺序和新方法中的 echo 顺序与原文一致。

这个范围只接受 `string`、`int`、`float`、`bool`、`null`、`false`、`true` 及其可空或联合原生类型。含调用表达式或对象类型的多项 echo 继续拒绝，避免把可能有副作用的转字符串过程移到其它求值步骤之后。单项 echo 保持已有规则。

语义定向测试覆盖两个 `string` 参数的正例、混合方法调用及对象类型反例。VS Code 1.139.0 的当前 10 项 Open Source Pack 源码 Profile 完成 Code Action、预览、应用、参数与顺序检查，以及一次 Undo/Redo；日志 `/tmp/sophp-c3-extract-echo-pair-pack10-20260925.log`，退出码 0。语义包构建、扩展测试编译及相关 ESLint 均通过。

这仍是有界的 Extract Method 场景。多输出、控制流提取和生成新文件的资源 Redo 未因此完成；已安装候选及 WSL Remote 仍归 C4 验收。
