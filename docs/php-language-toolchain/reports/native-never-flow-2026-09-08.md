# 原生 never 调用终止流验收

日期：2026-09-08。范围：PHP 8.1+ 原生 `never` 函数与方法调用后的不可达诊断。

## 精确边界

语义工作区仅返回完整独立语句中的调用，并要求：目标解析为唯一函数、实例方法或
静态方法；声明具有原生 `never` 返回类型；调用语法完整；实参按现有类型、具名参数
和可见性规则兼容。语言服务器只在目标 PHP 版本至少为 8.1 且项目索引完整时消费。

PHPDoc-only never、重复命名函数、类型不兼容、构造器、赋值或其他嵌套调用、动态或
未解析目标均保持静默。调用事实按表达式精确范围传给有界控制流分析，因此可参与
完整 if/switch/try 分支，但不会把普通同名调用当成终止点。

本报告记录的是首个独立调用增量的历史边界；赋值、参数和其他必经嵌套表达式已由
[后续增量](nested-native-never-flow-2026-09-08.md)接管，短路等非必经位置仍静默。

## 验证

- 语义完整 180 项测试通过，正例覆盖函数、实例方法和静态方法；反例覆盖 PHPDoc、
  重复声明、错误实参和嵌套赋值。
- 语言服务器完整 54 项测试通过；真实 stdio 只为兼容的原生 never 调用发布一条
  `php.control-flow.unreachable`，其他三类反例保持静默。
- 相关构建、ESLint、Extension Host TypeScript、打包、VSIX 内容校验和
  `git diff --check` 通过。
- Open Source Profile 冻结诊断集增至六条精确范围，其中新增范围为
  `unreachableAfterNeverCall();`；完整宿主退出码 0。

主 VSIX：`php-companion-0.4.5.vsix`；SHA-256：
`473c39a987b1ff2db5b78d6b44869789755fa2fcb18fa14830fdbb8f3c13258d`。
本轮没有重建两个 Pack，也没有公开发布。

最终宿主日志位于 `/tmp/php-never-flow-host.log`，完整 VS Code 日志位于
`/tmp/php-never-flow-vscode-logs`。AssertionError、ENOENT、File Modified Since、
EPIPE 和 unknown error 均为零。单次未复现不关闭此前外部 Symfony 插件的间歇性
连接问题，也不关闭其他平台或 F01–F14 总体验收。
