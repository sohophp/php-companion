# 完整终止流不可达诊断验收

日期：2026-09-08。范围：`php.control-flow.unreachable` 对完整条件与异常流的精准扩展。

## 支持范围

- 直接 `return`、`throw`、`exit` 后的同块语句。
- 带 `else` 且 `if`、全部 `elseif`、`else` 分支均终止后的语句。
- try 主体与全部 catch 均终止后的语句。
- finally 自身必然终止后的语句。
- 存在 default 且每个 case 入口经自身或贯穿后续 case 都必然终止的 switch。
- 体内无 break/goto 的字面量 `while (true)`、`do ... while (true)` 和条件为空的 for；
  for 可包含初始化与更新表达式，空条件按顶层语法分隔符判断。

缺少 else、任一分支可继续、含 break 或缺少 default 的 switch、动态/可退出循环、
never 调用和跨函数流保持不推断。
分析共享 100,000 节点和 256 层预算；耗尽时撤销本轮全部不可达结果。

## 验证

- 分析专项 29 项通过，包含终止/继续反例和 300 层预算耗尽输入。
- 语言服务器完整 52 项测试通过。
- 相关 ESLint、TypeScript 构建及 `git diff --check` 通过。
- 新主扩展 VSIX 在 Open Source Profile 中退出码 0。冻结诊断清单要求恰好五条
  不可达诊断，范围分别为 `cleanup();`、`unreachableAfterConditional();` 和
  `unreachableAfterSwitch();`、`unreachableAfterInfiniteLoop();`；可继续的条件、
  `unreachableAfterInitializedFor();`；可继续的条件、switch 与 breakable loop 后
  语句不得出现。
- VSIX SHA-256：`fb34c85259464c87baf487f3c5ecee68c97bedc135a707de7c8144638cd88ba9`。

首次宿主运行发现 fixture 使用未解析的 `RuntimeException`，冻结清单也仍为旧数量，
因此退出码 1；改用已有内建桩的 `Exception` 并精确更新预期后复测通过。没有过滤
或关闭未解析类型诊断。最终宿主日志位于
`/tmp/php-unreachable-for-host.log`，完整 VS Code 日志位于
`/tmp/php-unreachable-for-vscode-logs`。最终运行中 AssertionError、ENOENT、
File Modified Since 和显式 EPIPE 均为零，`pnpm verify:vsix` 通过；外部 Symfony
连接流销毁造成一条 unknown error，不能列为无异常运行。

外部 Symfony Language Tools 0.19.0 的 EPIPE/连接流销毁为间歇性问题，本次以
`Cannot call write after a stream was destroyed` 再现。本报告不关闭其他平台或
F01–F14 总体验收。
