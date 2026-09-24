# Open Source Pack 的 C2 局部值反馈

日期：2026-09-24。用隔离 VS Code 1.139.0 Linux Profile 运行当前源码的 SoPHP Core、SoPHP Symfony、Open Source Pack，以及[冻结清单](../../../test/extension/open-source-profile.extensions.json)中的 9 个外部成员。PHP 与项目工具使用独立的 PHP 8.5.9、PHP CS Fixer 和 PHPUnit。测试工作区是宿主创建的 Composer 夹具；未修改业务项目，也未生成 VSIX。

在原有 Pack 组合操作之后，宿主打开两个 PHP 文件：源文件提供 `ProfileScalar::text(): string` 和 `accept(int $value)`，使用方把返回值赋给 `$value`，跨一行纯注释再传给 `accept()`。测试首先要求变量 Hover 显示 `string` 且参数类型诊断存在，再在**未保存**的源缓冲区连续 10 轮切换 `text()` 的原生返回类型 `int/string`。每轮都等待当前 Hover 类型与参数诊断同时匹配；10 轮均通过，声明缓冲区保持未保存，使用方版本仍为 1。

本机样本从 `WorkspaceEdit` 提交到诊断集合及 `vscode.executeHoverProvider` 同时匹配的 P95 和最大值均为 **145 ms**。它包含测试轮询、Extension Host 和 Provider 请求时间，只描述这 10 轮；没有测量鼠标悬停浮层绘制、长时间使用或跨平台分布。完整源码 Profile 宿主退出码 **0**，日志为 `/tmp/sophp-pack-c2-local-scalar-20260924.log`。同次组合套件还执行现有的 PHP/Symfony 导航、Twig/YAML/XML、格式化、调试和 PHPUnit 门禁。此结果证明当前 11 项**源码组合**在本机隔离宿主可完成这条编辑链；下一次冻结可安装候选时仍须重新核对三个 VSIX、成员版本和 WSL Remote 运行位置。
